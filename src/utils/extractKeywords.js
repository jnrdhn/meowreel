import nlp from 'compromise';

/**
 * Priority order for keyword extraction:
 *   1. Verbs  (action gives the best GIF results)
 *   2. Nouns
 *   3. Adjectives
 *   4. Fallback: first word
 *
 * @param {string} sentence
 * @returns {string} single keyword (lowercase, trimmed)
 */
export function extractKeyword(sentence) {
    const doc = nlp(sentence);

    const verbs = doc.verbs().out('array');
    if (verbs.length > 0) return cleanWord(verbs[0]);

    const nouns = doc.nouns().out('array');
    if (nouns.length > 0) return cleanWord(nouns[0]);

    const adjectives = doc.adjectives().out('array');
    if (adjectives.length > 0) return cleanWord(adjectives[0]);

    // Last resort: first meaningful word
    const words = sentence.split(/\s+/);
    return cleanWord(words[0] || 'happy');
}

/**
 * Strips punctuation and normalises to lowercase.
 * Handles compound nouns by taking the last word (e.g., "birthday party" → "party").
 */
function cleanWord(word) {
    return word
        .replace(/[^a-zA-Z\s]/g, '')
        .trim()
        .split(/\s+/)
        .pop()
        .toLowerCase();
}