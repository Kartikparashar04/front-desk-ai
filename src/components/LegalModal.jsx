import React, { useState } from "react";

export default function LegalModal({ isOpen, onClose, initialTab = "privacy" }) {
  const [tab, setTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(6px)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="legal-title"
    >
      <div className="card-surface" style={{
        maxWidth: "680px",
        width: "100%",
        maxHeight: "88vh",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border-strong)",
        position: "relative",
        padding: "1.75rem"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div className="headline-mono" style={{ color: "var(--accent-lime)" }} id="legal-title">
            Front Desk AI Compliance & Trust
          </div>
          <button
            onClick={onClose}
            aria-label="Close legal compliance dialog"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "1.3rem",
              cursor: "pointer",
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="segmented-control" style={{ marginBottom: "1.25rem", flexShrink: 0 }}>
          <button
            type="button"
            className={`segmented-btn ${tab === "privacy" ? "active" : ""}`}
            onClick={() => setTab("privacy")}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            className={`segmented-btn ${tab === "terms" ? "active" : ""}`}
            onClick={() => setTab("terms")}
          >
            Terms of Service
          </button>
          <button
            type="button"
            className={`segmented-btn ${tab === "refunds" ? "active" : ""}`}
            onClick={() => setTab("refunds")}
          >
            Refund & Fair Use
          </button>
          <button
            type="button"
            className={`segmented-btn ${tab === "cookies" ? "active" : ""}`}
            onClick={() => setTab("cookies")}
          >
            Cookies & Data
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{
          overflowY: "auto",
          paddingRight: "0.5rem",
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          lineHeight: "1.65"
        }}>
          {tab === "privacy" && (
            <div>
              <h4 style={{ color: "var(--text-primary)", fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                1. Data Minimization & Privacy Architecture
              </h4>
              <p style={{ marginBottom: "0.75rem" }}>
                Front Desk AI strictly adheres to privacy by design under the Digital Personal Data Protection Act (DPDPA), 2023. We only collect essential dimensional measurements (Chest, Waist, Height) required strictly to calculate pattern garment tolerances.
              </p>
              <h4 style={{ color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: "0.35rem" }}>
                2. No Sensitive Personal Data or Third-Party Brokers
              </h4>
              <p style={{ marginBottom: "0.75rem" }}>
                We do not sell, license, or monetize your body metrics. Your data is not shared with ad trackers, data brokers, or marketing networks. All analytics and tracking SDKs have been completely audited and removed.
              </p>
              <h4 style={{ color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: "0.35rem" }}>
                3. Age Restriction & Child Safety
              </h4>
              <p style={{ marginBottom: "0.75rem" }}>
                Front Desk AI is intended for users aged 16 and above. We do not knowingly collect personal data from minors without verifiable parental or guardian consent.
              </p>
              <h4 style={{ color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: "0.35rem" }}>
                4. Right to Erasure (Data Deletion)
              </h4>
              <p>
                You retain complete ownership of your measurements. You can immediately wipe all stored account records and body specs at any time via the "Delete My Account & All Data" action in your profile or by emailing compliance@frontdeskai.shop.
              </p>
            </div>
          )}

          {tab === "terms" && (
            <div>
              <h4 style={{ color: "var(--text-primary)", fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                Terms of Service
              </h4>
              <p style={{ marginBottom: "0.75rem" }}>
                <strong>No Dark Patterns & Zero Hidden Fees:</strong> Front Desk AI is a transparent size recommendation utility. There are no recurring auto-renewing hidden charges, dark UX traps, forced upsells, or disguised subscription loops.
              </p>
              <p style={{ marginBottom: "0.75rem" }}>
                <strong>Recommendation Accuracy Disclaimer:</strong> Sizing suggestions are deterministic approximations based on brand-provided or published pattern size specifications and user-input skin dimensions. Real-world fit may vary based on garment shrinkage, fabric composition, and manufacturing tolerances.
              </p>
              <p>
                <strong>Zero Unsupported Claims:</strong> Front Desk AI does not manufacture garments, nor do we present simulated demonstration charts as official endorsements by featured fashion houses.
              </p>
            </div>
          )}

          {tab === "refunds" && (
            <div>
              <h4 style={{ color: "var(--text-primary)", fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                Refund & Guarantee Policy
              </h4>
              <p style={{ marginBottom: "0.75rem" }}>
                Front Desk AI core size calculation and link inspection tools are offered free of charge with full transparency. Any optional future premium enterprise sizing API integrations carry a clear, no-questions-asked 14-day refund window.
              </p>
              <p>
                <strong>Unsubscribe & Communications:</strong> We do not spam. Any transactional or service notifications include a direct one-click unsubscribe mechanism.
              </p>
            </div>
          )}

          {tab === "cookies" && (
            <div>
              <h4 style={{ color: "var(--text-primary)", fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                Cookie Usage & Local Storage
              </h4>
              <p style={{ marginBottom: "0.75rem" }}>
                We do NOT use cross-site tracking cookies, surveillance beacons, or third-party advertising cookies. We exclusively use essential browser LocalStorage to keep you logged in and persist your entered body specs so you do not have to re-enter them on every visit.
              </p>
              <p>
                <strong>Licensed Assets:</strong> All typefaces (Plus Jakarta Sans, Syne, JetBrains Mono) are licensed under SIL Open Font License (OFL). No copyrighted stock imagery is utilized.
              </p>
            </div>
          )}
        </div>

        {/* Footer Business Identification */}
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "1rem",
          marginTop: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          fontSize: "0.72rem",
          fontFamily: "var(--font-mono)",
          color: "var(--text-tertiary)"
        }}>
          <span>FRONT DESK AI · FRONTDESKAI.SHOP</span>
          <button className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={onClose}>
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
