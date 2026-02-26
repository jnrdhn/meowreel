/**
 * ProgressBar — used during FFmpeg export.
 *
 * Props:
 *  progress: number (0–100)
 *  label:    string
 */
export default function ProgressBar({ progress, label }) {
    return (
        <div className="progress-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-track">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="progress-label">
                {label ?? `Encoding… ${progress}%`}
            </p>
        </div>
    );
}