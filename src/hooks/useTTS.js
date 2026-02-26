import { useRef, useState, useCallback } from 'react';
import { estimateDuration } from '../utils/parseStory';

/**
 * useTTS — controls browser TTS with per-sentence callbacks.
 *
 * Returns:
 *  speak(sentences, onSentenceStart)  — starts narration
 *  stop()                             — cancels narration
 *  isSpeaking                         — boolean
 *  isSupported                        — boolean
 */
export function useTTS() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef(null);
    const isCancelledRef = useRef(false);

    const isSupported =
        typeof window !== 'undefined' && 'speechSynthesis' in window;

    const stop = useCallback(() => {
        isCancelledRef.current = true;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    /**
     * Speaks all sentences sequentially.
     *
     * @param {string[]} sentences
     * @param {(index: number, startMs: number) => void} onSentenceStart
     *   Called when each sentence begins speaking.
     * @param {object} options  - { rate, pitch, volume, voiceURI }
     * @returns {Promise<Array<{text, startMs, endMs}>>}  timing data for SRT
     */
    const speak = useCallback(
        (sentences, onSentenceStart, options = {}) => {
            return new Promise((resolve) => {
                if (!isSupported) {
                    console.warn('TTS not supported in this browser.');
                    resolve([]);
                    return;
                }

                window.speechSynthesis.cancel();
                isCancelledRef.current = false;
                setIsSpeaking(true);

                const { rate = 0.95, pitch = 1.0, volume = 1.0 } = options;
                const timings = [];
                let globalStartMs = Date.now();

                // Chain utterances manually so we can track per-sentence timing
                let sentenceIndex = 0;

                const speakNext = () => {
                    if (
                        isCancelledRef.current ||
                        sentenceIndex >= sentences.length
                    ) {
                        setIsSpeaking(false);
                        resolve(timings);
                        return;
                    }

                    const text = sentences[sentenceIndex];
                    const utter = new SpeechSynthesisUtterance(text);
                    utter.rate = rate;
                    utter.pitch = pitch;
                    utter.volume = volume;

                    // Optionally set a specific voice
                    if (options.voiceURI) {
                        const voices = window.speechSynthesis.getVoices();
                        const voice = voices.find((v) => v.voiceURI === options.voiceURI);
                        if (voice) utter.voice = voice;
                    }

                    const startMs = Date.now() - globalStartMs;
                    onSentenceStart?.(sentenceIndex, startMs);

                    utter.onstart = () => {
                        // startMs is captured above — noop here
                    };

                    utter.onend = () => {
                        const endMs = Date.now() - globalStartMs;
                        timings.push({ text, startMs, endMs });
                        sentenceIndex++;
                        speakNext();
                    };

                    utter.onerror = (e) => {
                        // Skip failed utterance and continue
                        console.warn(`TTS error on sentence ${sentenceIndex}:`, e);
                        const endMs = Date.now() - globalStartMs;
                        timings.push({
                            text,
                            startMs,
                            endMs: startMs + estimateDuration(text, rate),
                        });
                        sentenceIndex++;
                        speakNext();
                    };

                    utteranceRef.current = utter;
                    window.speechSynthesis.speak(utter);
                };

                // Some browsers need a tiny delay before speaking
                setTimeout(speakNext, 100);
            });
        },
        [isSupported]
    );

    /**
     * Returns available voices — must be called after voices are loaded.
     */
    const getVoices = useCallback(() => {
        return window.speechSynthesis?.getVoices() ?? [];
    }, []);

    return { speak, stop, isSpeaking, isSupported, getVoices };
}