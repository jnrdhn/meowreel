import { useState } from 'react';
import { parseStory } from '../utils/parseStory';

const MAX_CHARS = 1000;
const PLACEHOLDER =
    "A tiny cat woke up feeling brave. She climbed the tallest bookshelf. Everyone gasped. She sat down and napped immediately.";

/**
 * StoryInput
 *
 * Props:
 *  onSubmit: (sentences: string[]) => void
 *  disabled: boolean
 */
export default function StoryInput({ onSubmit, disabled }) {
    const [text, setText] = useState('');
    const [preview, setPreview] = useState([]);

    const handleChange = (e) => {
        const val = e.target.value.slice(0, MAX_CHARS);
        setText(val);
        // Live scene preview
        setPreview(parseStory(val));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const sentences = parseStory(text);
        if (sentences.length === 0) return;
        onSubmit(sentences);
    };

    const charPercent = (text.length / MAX_CHARS) * 100;

    return (
        <form className="story-form" onSubmit={handleSubmit}>
            <label htmlFor="story-input" className="story-label">
                ✍️ Your Story
            </label>

            <textarea
                id="story-input"
                className="story-textarea"
                value={text}
                onChange={handleChange}
                placeholder={PLACEHOLDER}
                disabled={disabled}
                rows={6}
                aria-describedby="char-count scene-preview"
            />

            {/* Character count bar */}
            <div className="char-bar-wrap" id="char-count" aria-live="polite">
                <div
                    className="char-bar-fill"
                    style={{
                        width: `${charPercent}%`,
                        background: charPercent > 90 ? '#e74c3c' : '#f5a623',
                    }}
                />
                <span className="char-count-text">
                    {text.length} / {MAX_CHARS}
                </span>
            </div>

            {/* Live scene list preview */}
            {preview.length > 0 && (
                <div className="scene-preview" id="scene-preview">
                    <p className="scene-preview-title">
                        🎬 {preview.length} scene{preview.length !== 1 ? 's' : ''} detected:
                    </p>
                    <ol className="scene-list">
                        {preview.map((s, i) => (
                            <li key={i} className="scene-item">
                                {s}
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={disabled || preview.length === 0}
            >
                🐱 Generate MeowReel
            </button>
        </form>
    );
}