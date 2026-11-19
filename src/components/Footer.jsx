import React from "react";

export default function Footer({ onOpenLegal, onNavigate }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: "auto",
        paddingTop: "3rem",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        fontSize: "0.78rem",
        color: "var(--text-tertiary)",
        width: "100%"
      }}
      role="contentinfo"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
        {/* Brand Column with Clickable Contact */}
        <div style={{ minWidth: "220px", flex: 1 }}>
          <button
            onClick={() => onNavigate("landing")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: "var(--text-primary)",
              fontSize: "1.05rem",
              marginBottom: "0.4rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
            aria-label="Front Desk AI Home link"
          >
            <span style={{ width: "10px", height: "10px", background: "var(--accent-lime)", display: "inline-block" }} />
            FRONT DESK AI
          </button>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", maxWidth: "340px", lineHeight: "1.45", marginBottom: "0.75rem" }}>
            Deterministic anatomical pattern matching and AI apparel sizing at <strong>frontdeskai.shop</strong>. Clean, zero-tracker size intelligence.
          </div>

          {/* Clickable Business Contact Phone & Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
            <span>
              Web:{" "}
              <a
                href="https://frontdeskai.shop"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                onMouseOver={(e) => (e.target.style.color = "var(--accent-lime)")}
                onMouseOut={(e) => (e.target.style.color = "var(--text-secondary)")}
              >
                frontdeskai.shop
              </a>
            </span>
            <span>
              Support:{" "}
              <a
                href="mailto:support@frontdeskai.shop"
                style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                onMouseOver={(e) => (e.target.style.color = "var(--accent-lime)")}
                onMouseOut={(e) => (e.target.style.color = "var(--text-secondary)")}
              >
                support@frontdeskai.shop
              </a>
            </span>
          </div>
        </div>

        {/* Quick App Navigation Links (No broken links) */}
        <div>
          <div className="headline-mono" style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Platform
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <button
              onClick={() => onNavigate("landing")}
              className="ghost-back-btn"
              style={{ padding: 0, fontSize: "0.76rem" }}
            >
              Size Engine Home
            </button>
            <button
              onClick={() => onNavigate("catalog")}
              className="ghost-back-btn"
              style={{ padding: 0, fontSize: "0.76rem" }}
            >
              Garment Archive (5 Labels)
            </button>
            <button
              onClick={() => onNavigate("profile")}
              className="ghost-back-btn"
              style={{ padding: 0, fontSize: "0.76rem" }}
            >
              Body Calibration
            </button>
          </div>
        </div>

        {/* Legal Links */}
        <div>
          <div className="headline-mono" style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Trust & Governance
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <button
              onClick={() => onOpenLegal("privacy")}
              className="ghost-back-btn"
              style={{ padding: 0, fontSize: "0.76rem" }}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onOpenLegal("terms")}
              className="ghost-back-btn"
              style={{ padding: 0, fontSize: "0.76rem" }}
            >
              Terms of Service
            </button>
            <button
              onClick={() => onOpenLegal("refunds")}
              className="ghost-back-btn"
              style={{ padding: 0, fontSize: "0.76rem" }}
            >
              Refund Policy
            </button>
            <button
              onClick={() => onOpenLegal("cookies")}
              className="ghost-back-btn"
              style={{ padding: 0, fontSize: "0.76rem" }}
            >
              Cookie Policy
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Stamping & Dynamic Accurate Year */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        paddingTop: "1rem",
        fontFamily: "var(--font-mono)",
        fontSize: "0.7rem"
      }}>
        <span>© {currentYear} FRONT DESK AI · FRONTDESKAI.SHOP</span>
        <span>DPDPA & WCAG AA ACCESSIBLE · ZERO TRACKING</span>
      </div>
    </footer>
  );
}
