import { useState, useCallback } from 'react';
import { extractKeyword } from '../utils/extractKeywords';

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs/search';

// In-memory cache so repeated keywords don't re-fetch
const gifCache = new Map();

/**
 * Returns { fetchGifsForScenes, gifs, loading, error }
 *
 * gifs is an array parallel to `scenes`:
 *   [{ url: string, webpUrl: string, title: string }, ...]
 */
export function useGiphy() {
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchGifsForScenes = useCallback(async (scenes) => {
        setLoading(true);
        setError(null);

        try {
            const results = await Promise.all(
                scenes.map(async (sentence) => {
                    const keyword = extractKeyword(sentence);
                    const query = `CAT ${keyword}`;

                    // Check cache first
                    if (gifCache.has(query)) {
                        return gifCache.get(query);
                    }

                    const params = new URLSearchParams({
                        api_key: GIPHY_API_KEY,
                        q: query,
                        limit: 5,
                        rating: 'g',
                        // fixed_height_small keeps file sizes small for mobile
                        media_filter: 'minimal',
                    });

                    const res = await fetch(`${GIPHY_BASE}?${params}`);
                    if (!res.ok) throw new Error(`Giphy error: ${res.status}`);

                    const json = await res.json();
                    const data = json.data;

                    if (!data || data.length === 0) {
                        // Fallback: generic "cat" search
                        return getFallbackGif();
                    }

                    // Pick a random result from top 5 for variety
                    const pick = data[Math.floor(Math.random() * data.length)];
                    const gif = {
                        url: pick.images.fixed_height_small.url,
                        webpUrl: pick.images.fixed_height_small.webp,
                        mp4Url: pick.images.fixed_height_small.mp4,
                        title: pick.title,
                        keyword,
                    };

                    gifCache.set(query, gif);
                    return gif;
                })
            );

            setGifs(results);
        } catch (err) {
            console.error('Giphy fetch failed:', err);
            setError(err.message);
            // Populate with fallbacks so the app still works
            setGifs(scenes.map(() => getFallbackGif()));
        } finally {
            setLoading(false);
        }
    }, []);

    return { fetchGifsForScenes, gifs, loading, error };
}

function getFallbackGif() {
    // A safe, known-good placeholder cat GIF (hosted on Giphy CDN)
    return {
        url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
        webpUrl: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.webp',
        mp4Url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.mp4',
        title: 'Cute cat fallback',
        keyword: 'cat',
    };
}