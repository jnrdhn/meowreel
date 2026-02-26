/**
 * Converts scene timing data into an SRT subtitle string.
 *
 * @param {Array<{text: string, startMs: number, endMs: number}>} scenes
 * @returns {string} SRT formatted string
 */
export function generateSRT(scenes) {
    return scenes
        .map((scene, index) => {
            const start = msToSrtTime(scene.startMs);
            const end = msToSrtTime(scene.endMs);
            return `${index + 1}\n${start} --> ${end}\n${scene.text}`;
        })
        .join('\n\n');
}

/**
 * Converts milliseconds to SRT timestamp format: HH:MM:SS,mmm
 */
function msToSrtTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;

    return [
        String(hours).padStart(2, '0'),
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0'),
    ].join(':') + `,${String(milliseconds).padStart(3, '0')}`;
}