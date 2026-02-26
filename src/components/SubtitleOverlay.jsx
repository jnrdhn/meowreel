/**
 * SubtitleOverlay
 * Renders the current sentence as a styled, high-contrast subtitle
 * centered at the bottom of the player.
 */
export default function SubtitleOverlay({ text, visible }) {
    if (!visible || !text) return null;

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '12%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '88%',
                textAlign: 'center',
                zIndex: 10,
                // High-contrast black pill background
                background: 'rgba(0, 0, 0, 0.72)',
                borderRadius: '8px',
                padding: '8px 14px',
                // White text with subtle shadow
                color: '#FFFFFF',
                fontFamily: "'Segoe UI', Arial, sans-serif",
                fontWeight: '700',
                fontSize: 'clamp(14px, 4vw, 20px)',
                lineHeight: 1.4,
                letterSpacing: '0.01em',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                // Smooth fade in/out
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none', // Don't block GIF clicks
            }}
        >
            {text}
        </div>
    );
}