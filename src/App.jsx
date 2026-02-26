import { useState, useCallback } from 'react';
import StoryInput from './components/StoryInput';
import ScenePlayer from './components/ScenePlayer';
import ExportButton from './components/ExportButton';
import { useGiphy } from './hooks/useGiphy';

export default function App() {
  const [scenes, setScenes] = useState([]);
  const [timings, setTimings] = useState([]);
  const [step, setStep] = useState('input'); // 'input' | 'player' | 'export'

  const { fetchGifsForScenes, gifs, loading: gifLoading, error: gifError } = useGiphy();

  // ── When user submits story ──
  const handleStorySubmit = useCallback(
    async (sentences) => {
      setScenes(sentences);
      setTimings([]);
      setStep('player');
      await fetchGifsForScenes(sentences);
    },
    [fetchGifsForScenes]
  );

  // ── When TTS finishes playing ──
  const handleTimingsReady = useCallback((t) => {
    setTimings(t);
    if (t.length > 0) setStep('export');
  }, []);

  const handleReset = () => {
    setScenes([]);
    setGifs?.([]);
    setTimings([]);
    setStep('input');
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <h1 className="app-title">🐱 MeowReel</h1>
        <p className="app-subtitle">
          Turn your story into a cat-powered video — entirely in your browser.
        </p>
      </header>

      <main className="app-main">
        {/* ── Step 1: Story input ── */}
        <section className="card">
          <h2 className="card-title">
            <span className="step-badge">1</span> Write Your Story
          </h2>
          <StoryInput
            onSubmit={handleStorySubmit}
            disabled={gifLoading}
          />
        </section>

        {/* ── Step 2: Preview Player ── */}
        {(step === 'player' || step === 'export') && (
          <section className="card">
            <h2 className="card-title">
              <span className="step-badge">2</span> Preview
            </h2>

            {gifLoading && (
              <div className="loading-banner">
                🐱 Fetching cat GIFs… hang tight!
              </div>
            )}
            {gifError && (
              <div className="error-banner">
                ⚠️ Giphy issue: {gifError}. Using fallback cats.
              </div>
            )}

            <ScenePlayer
              scenes={scenes}
              gifs={gifs}
              onTimingsReady={handleTimingsReady}
            />
          </section>
        )}

        {/* ── Step 3: Export ── */}
        {step === 'export' && timings.length > 0 && (
          <section className="card">
            <h2 className="card-title">
              <span className="step-badge">3</span> Export MP4
            </h2>
            {/* <ExportButton
              scenes={scenes}
              gifs={gifs}
              timings={timings}
            /> */}
            Export coming soon...
          </section>
        )}

        {/* ── Reset ── */}
        {step !== 'input' && (
          <button className="btn btn-ghost" onClick={handleReset}>
            ↩ Start Over
          </button>
        )}
      </main>

      <footer className="app-footer">
        Built with ❤️ · Giphy · Web Speech API · FFmpeg.wasm · Zero servers
      </footer>
    </div>
  );
}