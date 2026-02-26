/**
 * Splits a story string into an array of sentence-level "scenes."
 * Handles common edge cases: abbreviations, ellipsis, trailing whitespace.
 *
 * @param {string} story - Raw user input
 * @returns {string[]}   - Array of clean sentence strings
 */
export function parseStory(story) {
    if (!story || typeof story !== 'string') return [];

    // Normalize whitespace
    const normalized = story.trim().replace(/\s+/g, ' ');

    // Split on sentence-ending punctuation followed by whitespace or end-of-string
    // Negative lookbehind prevents splitting on abbreviations like "Mr." or "U.S."
    const raw = normalized.split(/(?<=[.!?…])(?:\s+|$)/);

    return raw
        .map((s) => s.trim())
        .filter((s) => s.length > 2); // Remove empty/tiny fragments
}

/**
 * Estimates how long (in ms) TTS will take for a given sentence.
 * Used as a fallback when onboundary events are unavailable.
 *
 * Rule of thumb: ~150 words per minute at normal rate.
 * We add 600ms of padding for GIF transition.
 *
 * @param {string} sentence
 * @param {number} rate - SpeechSynthesis rate (0.1–10), default 1
 * @returns {number} milliseconds
 */
export function estimateDuration(sentence, rate = 1) {
    const words = sentence.split(/\s+/).length;
    const wordsPerMs = (150 * rate) / 60000;
    return Math.max(2000, words / wordsPerMs + 600);
}