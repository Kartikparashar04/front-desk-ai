import React, { useState, useEffect } from "react";

const COOKIE_CONSENT_KEY = "frontdeskai_cookie_consent_status";
const LEGACY_CONSENT_KEY = "fitform_cookie_consent_status";

export default function CookieConsentBanner({ onOpenLegal }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY) || localStorage.getItem(LEGACY_CONSENT_KEY);
    if (consent) {
      localStorage.setItem(COOKIE_CONSENT_KEY, consent);
      return;
    }
    if (!consent) {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptEssential = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential_only");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie & Storage Consent"
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "1rem",
        right: "1rem",
        maxWidth: "640px",
        margin: "0 auto",
        background: "var(--bg-elevated)",
        border: "1px solid var(--accent-lime-border)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
        borderRadius: "var(--radius-sm)",
        padding: "1.25rem 1.5rem",
        zIndex: 1500,
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div className="headline-mono" style={{ color: "var(--accent-lime)", marginBottom: "0.25rem" }}>
            Zero Tracker Guarantee
          </div>
          <p className="body-muted" style={{ fontSize: "0.82rem", lineHeight: "1.5", margin: 0 }}>
            We only use essential local storage to remember your measurements and authentication session. We run <strong>zero third-party marketing SDKs, zero cross-site ad beacons, and zero hidden tracking</strong>.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => onOpenLegal("privacy")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            textDecoration: "underline",
            fontSize: "0.78rem",
            cursor: "pointer",
            padding: 0
          }}
        >
          Read Privacy & Cookie Policy
        </button>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: "0.55rem 1.1rem", fontSize: "0.8rem", width: "auto" }}
            onClick={handleAcceptEssential}
          >
            Accept Essential Storage
          </button>
        </div>
      </div>
    </aside>
  );
}
