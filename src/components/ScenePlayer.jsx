import { useRef, useState, useEffect, useCallback } from 'react';
import SubtitleOverlay from './SubtitleOverlay';
import { useTTS } from '../hooks/useTTS';

/**
 * ScenePlayer
 *
 * Props:
 *  scenes  {string[]}   - array of sentence strings
 *  gifs    {object[]}   - array of gif objects from useGiphy
 *  onTimingsReady  (timings) => void   - called when TTS finishes with timing data
 */
export default function ScenePlayer({ scenes, gifs, onTimingsReady }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timings, setTimings] = useState([]);
    const containerRef = useRef(null);

    const { speak, stop, isSpeaking } = useTTS();

    // When scene changes, preload the next GIF to avoid flash
    useEffect(() => {
        const nextIndex = currentIndex + 1;
        if (gifs[nextIndex]) {
            const img = new Image();
            img.src = gifs[nextIndex].url;
        }
    }, [currentIndex, gifs]);

    const handlePlay = useCallback(async () => {
        if (scenes.length === 0 || gifs.length === 0) return;
        setIsPlaying(true);
        setCurrentIndex(0);

        const collected = await speak(
            scenes,
            (index) => setCurrentIndex(index), // Advance GIF on each sentence
        );

        setTimings(collected);
        onTimingsReady?.(collected);
        setIsPlaying(false);
    }, [scenes, gifs, speak, onTimingsReady]);

    const handleStop = useCallback(() => {
        stop();
        setIsPlaying(false);
        setCurrentIndex(0);
    }, [stop]);

    const currentGif = gifs[currentIndex];
    const currentScene = scenes[currentIndex];

    return (
        <div className="scene-player">
            {/* ── Viewport ── */}
            <div ref={containerRef} className="player-viewport">
                {currentGif ? (
                    <img
                        key={currentGif.url} /* Key change forces re-render on scene change */
                        src={currentGif.url}
                        alt={currentGif.title}
                        crossOrigin="anonymous"  /* Required for cross-origin isolation */
                        className="gif-display"
                    />
                ) : (
                    <div className="gif-placeholder">🐱</div>
                )}

                {/* Scene counter badge */}
                {scenes.length > 0 && (
                    <div className="scene-badge">
                        {currentIndex + 1} / {scenes.length}
                    </div>
                )}

                {/* Subtitles */}
                <SubtitleOverlay text={currentScene} visible={isPlaying} />
            </div>

            {/* ── Controls ── */}
            <div className="player-controls">
                {!isPlaying ? (
                    <button
                        className="btn btn-primary"
                        onClick={handlePlay}
                        disabled={scenes.length === 0}
                    >
                        ▶ Play Preview
                    </button>
                ) : (
                    <button className="btn btn-danger" onClick={handleStop}>
                        ■ Stop
                    </button>
                )}
            </div>

            {/* Keyword debug badge (dev only) */}
            {import.meta.env.DEV && currentGif && (
                <p className="keyword-badge">
                    🔍 keyword: <code>{currentGif.keyword}</code>
                </p>
            )}
        </div>
    );
}