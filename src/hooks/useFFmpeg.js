import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useFFmpeg() {
    const ffmpegRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        // Prevent double-loading
        if (ffmpegRef.current && loaded) return true;
        if (loading) return false;

        setLoading(true);
        setError(null);

        try {
            const ffmpeg = new FFmpeg();

            ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg]', message);
            });

            ffmpeg.on('progress', ({ progress: p }) => {
                setProgress(Math.round(p * 100));
            });

            // ── Strategy: Try 3 sources in order ──────────────────────────────

            // 1. Local /public files (best for GitHub Pages — avoids CDN CORS)
            //    Build the correct path using import.meta.env.BASE_URL
            const base = import.meta.env.BASE_URL; // e.g. "/MeowReel/" or "/"

            // Ensure base ends with slash, then append filename
            const normalizedBase = base.endsWith('/') ? base : `${base}/`;
            const localCoreJS = `${normalizedBase}ffmpeg-core.js`;
            const localCoreWasm = `${normalizedBase}ffmpeg-core.wasm`;

            console.log('[FFmpeg] Attempting to load from:', localCoreJS);

            let loadSuccess = false;

            // ── Attempt 1: Local public folder ──
            try {
                await ffmpeg.load({
                    coreURL: await toBlobURL(localCoreJS, 'text/javascript'),
                    wasmURL: await toBlobURL(localCoreWasm, 'application/wasm'),
                });
                loadSuccess = true;
                console.log('[FFmpeg] Loaded from local public folder ✓');
            } catch (localErr) {
                console.warn('[FFmpeg] Local load failed:', localErr.message);
            }

            // ── Attempt 2: unpkg CDN ──
            if (!loadSuccess) {
                try {
                    const CDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                    await ffmpeg.load({
                        coreURL: await toBlobURL(`${CDN}/ffmpeg-core.js`, 'text/javascript'),
                        wasmURL: await toBlobURL(`${CDN}/ffmpeg-core.wasm`, 'application/wasm'),
                    });
                    loadSuccess = true;
                    console.log('[FFmpeg] Loaded from unpkg CDN ✓');
                } catch (unpkgErr) {
                    console.warn('[FFmpeg] unpkg CDN load failed:', unpkgErr.message);
                }
            }

            // ── Attempt 3: jsDelivr CDN ──
            if (!loadSuccess) {
                try {
                    const CDN2 = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
                    await ffmpeg.load({
                        coreURL: await toBlobURL(`${CDN2}/ffmpeg-core.js`, 'text/javascript'),
                        wasmURL: await toBlobURL(`${CDN2}/ffmpeg-core.wasm`, 'application/wasm'),
                    });
                    loadSuccess = true;
                    console.log('[FFmpeg] Loaded from jsDelivr CDN ✓');
                } catch (jsdelivrErr) {
                    console.warn('[FFmpeg] jsDelivr CDN load failed:', jsdelivrErr.message);
                }
            }

            if (!loadSuccess) {
                throw new Error(
                    'All FFmpeg load sources failed. Check your network and COOP/COEP headers.'
                );
            }

            ffmpegRef.current = ffmpeg;
            setLoaded(true);
            return true;

        } catch (err) {
            console.error('[FFmpeg] Fatal load error:', err);
            setError(`Failed to load encoder: ${err.message}`);
            return false;
        } finally {
            setLoading(false);
        }
    }, [loaded, loading]);

    const encode = useCallback(async (frames, audio, fps = 15) => {
        // Guard: must be loaded before encoding
        if (!ffmpegRef.current) {
            throw new Error('FFmpeg not loaded. Call load() first.');
        }

        const ffmpeg = ffmpegRef.current;
        setProgress(0);

        try {
            console.log(`[FFmpeg] Writing ${frames.length} frames...`);

            // Write frames to FFmpeg virtual filesystem
            for (let i = 0; i < frames.length; i++) {
                const name = `frame${String(i).padStart(5, '0')}.png`;
                await ffmpeg.writeFile(name, await fetchFile(frames[i]));
            }

            // Write audio
            await ffmpeg.writeFile('audio.wav', await fetchFile(audio));

            console.log('[FFmpeg] Running encode command...');

            // Run encode
            await ffmpeg.exec([
                '-framerate', String(fps),
                '-i', 'frame%05d.png',
                '-i', 'audio.wav',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-shortest',
                '-movflags', '+faststart',
                'output.mp4',
            ]);

            const data = await ffmpeg.readFile('output.mp4');
            console.log('[FFmpeg] Encode complete ✓');

            // Cleanup virtual filesystem to free memory
            for (let i = 0; i < frames.length; i++) {
                try {
                    await ffmpeg.deleteFile(`frame${String(i).padStart(5, '0')}.png`);
                } catch (_) { /* ignore cleanup errors */ }
            }
            try { await ffmpeg.deleteFile('audio.wav'); } catch (_) { }
            try { await ffmpeg.deleteFile('output.mp4'); } catch (_) { }

            return new Blob([data.buffer], { type: 'video/mp4' });

        } catch (err) {
            console.error('[FFmpeg] Encode failed:', err);
            throw err;
        }
    }, []);

    return { load, encode, loaded, loading, progress, error };
}