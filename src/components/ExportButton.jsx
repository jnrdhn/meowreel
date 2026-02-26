import { useRef, useState, useCallback } from 'react';
import { useFFmpeg } from '../hooks/useFFmpeg';
import ProgressBar from './ProgressBar';
import { generateSRT } from '../utils/srtGenerator';

const CANVAS_W = 720;
const CANVAS_H = 1280;
const FPS = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob returned null'));
        }, 'image/png');
    });
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

function drawSubtitle(ctx, text, canvasW, canvasH) {
    const padding = 20;
    const fontSize = 38;
    ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';

    const maxWidth = canvasW * 0.82;
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = fontSize * 1.35;
    const blockH = lines.length * lineHeight + padding * 2;
    const blockY = canvasH - blockH - canvasH * 0.06;

    // Dark pill background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    roundRect(ctx, canvasW * 0.09, blockY, canvasW * 0.82, blockH, 12);

    // White text
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    lines.forEach((line, i) => {
        ctx.fillText(
            line,
            canvasW / 2,
            blockY + padding + fontSize + i * lineHeight
        );
    });
    ctx.shadowBlur = 0;
}

/** Minimal PCM → WAV encoder */
function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const ab = new ArrayBuffer(44 + dataLength);
    const view = new DataView(ab);

    const writeStr = (off, str) =>
        [...str].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);              // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let c = 0; c < numChannels; c++) {
            const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
            view.setInt16(offset, s * 0x7fff, true);
            offset += 2;
        }
    }
    return ab;
}

/** Trigger a file download from a Blob */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke so Safari has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ExportButton
 *
 * Props:
 *   scenes:  string[]
 *   gifs:    object[]  — from useGiphy
 *   timings: Array<{ text, startMs, endMs }>  — from useTTS
 */
export default function ExportButton({ scenes, gifs, timings }) {
    const {
        load,
        encode,
        loaded,
        loading: ffmpegLoading,
        progress,
        error: ffmpegError,
    } = useFFmpeg();

    const [exporting, setExporting] = useState(false);
    const [status, setStatus] = useState('');

    // Reuse a single off-screen canvas across all frames
    const canvasRef = useRef(null);
    const getCanvas = () => {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
            canvasRef.current.width = CANVAS_W;
            canvasRef.current.height = CANVAS_H;
        }
        return canvasRef.current;
    };

    // ── Render one scene to PNG frames ──────────────────────────────────────────
    const renderSceneFrames = useCallback(async (sentence, gif, durationMs) => {
        const canvas = getCanvas();
        const ctx = canvas.getContext('2d');
        const frameCount = Math.max(1, Math.ceil((durationMs / 1000) * FPS));
        const frames = [];

        let img;
        try {
            img = await loadImage(gif.url);
        } catch (err) {
            console.warn('Could not load GIF, using blank frame:', err.message);
            img = null;
        }

        for (let f = 0; f < frameCount; f++) {
            // Background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            // GIF (centered, letterboxed into top 75% of canvas)
            if (img) {
                const scale = Math.min(
                    CANVAS_W / img.naturalWidth,
                    (CANVAS_H * 0.75) / img.naturalHeight
                );
                const w = img.naturalWidth * scale;
                const h = img.naturalHeight * scale;
                const x = (CANVAS_W - w) / 2;
                const y = CANVAS_H * 0.05;
                ctx.drawImage(img, x, y, w, h);
            }

            // Subtitle bar
            drawSubtitle(ctx, sentence, CANVAS_W, CANVAS_H);

            const blob = await canvasToBlob(canvas);
            frames.push(blob);
        }

        return frames;
    }, []);

    // ── Generate silent WAV matching TTS duration ────────────────────────────────
    const buildSilentAudio = useCallback(async () => {
        const totalMs = timings.length > 0
            ? Math.max(...timings.map((t) => t.endMs))
            : scenes.length * 2500; // fallback estimate

        const totalSeconds = Math.max(1, totalMs / 1000);
        const sampleRate = 44100;
        const numSamples = Math.ceil(totalSeconds * sampleRate);

        const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);

        // Silent oscillator — just to produce a rendered buffer of the right length
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(0, 0); // volume = 0 (silent)
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(0);
        osc.stop(totalSeconds);

        const rendered = await offlineCtx.startRendering();
        const wav = audioBufferToWav(rendered);
        return new Blob([wav], { type: 'audio/wav' });
    }, [timings, scenes]);

    // ── Main export handler ──────────────────────────────────────────────────────
    const handleExport = useCallback(async () => {
        setExporting(true);
        setStatus('');

        try {
            // Step 1 — Load FFmpeg (skipped if already loaded)
            if (!loaded) {
                setStatus('⏳ Loading encoder (one-time ~5MB download)…');
                const success = await load();
                if (!success) {
                    // Error message already set inside useFFmpeg
                    setExporting(false);
                    return;
                }
            }

            // Step 2 — Render all canvas frames
            let allFrames = [];
            for (let i = 0; i < scenes.length; i++) {
                const timing = timings[i] ?? {
                    startMs: i * 2500,
                    endMs: (i + 1) * 2500,
                };
                const duration = Math.max(1000, timing.endMs - timing.startMs);

                setStatus(`🎨 Rendering scene ${i + 1} / ${scenes.length}…`);
                const frames = await renderSceneFrames(scenes[i], gifs[i], duration);
                allFrames = allFrames.concat(frames);
            }

            if (allFrames.length === 0) {
                throw new Error('No frames were rendered.');
            }

            console.log(`[Export] Total frames: ${allFrames.length}`);

            // Step 3 — Build audio track
            setStatus('🔊 Generating audio track…');
            const audioBlob = await buildSilentAudio();

            // Step 4 — FFmpeg encode
            setStatus('🎬 Encoding MP4… (this can take 30–90 seconds)');
            const mp4Blob = await encode(allFrames, audioBlob, FPS);

            // Step 5 — Download MP4
            downloadBlob(mp4Blob, 'MeowReel.mp4');

            // Step 6 — Download SRT subtitles (bonus)
            if (timings.length > 0) {
                const srt = generateSRT(timings);
                const srtBlob = new Blob([srt], { type: 'text/plain' });
                downloadBlob(srtBlob, 'MeowReel.srt');
            }

            setStatus('✅ Done! Check your downloads folder.');

        } catch (err) {
            console.error('[Export] Pipeline failed:', err);
            setStatus(`❌ Export failed: ${err.message}`);
        } finally {
            setExporting(false);
        }
    }, [
        loaded,
        load,
        encode,
        scenes,
        gifs,
        timings,
        renderSceneFrames,
        buildSilentAudio,
    ]);

    // ── Render ───────────────────────────────────────────────────────────────────
    const canExport =
        scenes.length > 0 && gifs.length === scenes.length && timings.length > 0;

    const isBusy = exporting || ffmpegLoading;

    return (
        <div className="export-section">
            <button
                className="btn btn-export"
                onClick={handleExport}
                disabled={!canExport || isBusy}
            >
                {isBusy ? '⏳ Working…' : '⬇️ Export MP4'}
            </button>

            {/* Progress bar — shown while loading FFmpeg or encoding */}
            {isBusy && (
                <ProgressBar
                    progress={progress}
                    label={status || 'Working…'}
                />
            )}

            {/* Status message after export finishes */}
            {status && !isBusy && (
                <p
                    className={
                        status.startsWith('❌') ? 'export-error' : 'export-status'
                    }
                >
                    {status}
                </p>
            )}

            {/* FFmpeg load error (separate from export error) */}
            {ffmpegError && (
                <p className="export-error">⚠️ Encoder error: {ffmpegError}</p>
            )}

            {/* Warning if export button is disabled */}
            {!canExport && !isBusy && (
                <p className="export-note">
                    ▶ Play the preview all the way through first, then export.
                </p>
            )}

            <p className="export-note">
                ⚠️ Export runs entirely in your browser. It may take 30–90 seconds
                depending on story length and your device speed.
            </p>
        </div>
    );
}