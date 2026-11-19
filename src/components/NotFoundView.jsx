import React from "react";

export default function NotFoundView({ onGoHome }) {
  return (
    <div className="not-found-view card-surface" role="alert">
      <div className="headline-mono" style={{ color: "var(--accent-lime)", marginBottom: "0.5rem" }}>
        HTTP 404 · SPECIFICATION NOT FOUND
      </div>
      <h1 className="headline-xl" style={{ marginBottom: "0.75rem" }}>
        Page Pattern Missing
      </h1>
      <p className="body-muted" style={{ maxWidth: "420px", marginBottom: "2rem" }}>
        The garment view, pattern link, or calibration route you are looking for does not exist in our archive or has been repositioned.
      </p>
      <div>
        <button className="btn-primary" onClick={onGoHome} style={{ width: "auto", padding: "0.85rem 1.75rem" }}>
          Return to Front Desk AI Home →
        </button>
      </div>
    </div>
  );
}
