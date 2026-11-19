import React from "react";

export default function MobileNavDrawer({ isOpen, onClose, onNavigate, currentUser, onOpenAuth, onLogout }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 2500,
        display: "flex",
        flexDirection: "column"
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "1.5rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="headline-mono" style={{ color: "var(--accent-lime)" }}>
            Front Desk AI Menu
          </div>
          <button
            onClick={onClose}
            aria-label="Close mobile navigation"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "1.3rem",
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <button
            className="ghost-back-btn"
            style={{ fontSize: "1rem", color: "var(--text-primary)" }}
            onClick={() => { onNavigate("landing"); onClose(); }}
          >
            🏠 Home & Link Sizer
          </button>
          <button
            className="ghost-back-btn"
            style={{ fontSize: "1rem", color: "var(--text-primary)" }}
            onClick={() => { onNavigate("catalog"); onClose(); }}
          >
            👕 Garment Archive (5 Brands)
          </button>
          <button
            className="ghost-back-btn"
            style={{ fontSize: "1rem", color: "var(--text-primary)" }}
            onClick={() => { onNavigate("profile"); onClose(); }}
          >
            📐 Body Calibration Profile
          </button>
        </nav>

        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {currentUser ? (
            <div>
              <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Signed in with{" "}
                <strong style={{ color: "var(--accent-lime)" }}>
                  {currentUser.name && currentUser.name !== "User" && !currentUser.name.startsWith("User ")
                    ? currentUser.name
                    : (currentUser.phone ? `+91 ${currentUser.phone.replace(/\D/g, "").slice(-10)}` : "Member")}
                </strong>
                {currentUser.phone && currentUser.name && currentUser.name !== "User" && !currentUser.name.startsWith("User ") && (
                  <span style={{ color: "var(--text-muted)", marginLeft: "0.35rem", fontSize: "0.78rem" }}>
                    (+91 {currentUser.phone.replace(/\D/g, "").slice(-10)})
                  </span>
                )}
                {currentUser.email && !currentUser.email.includes("@phone.") && (
                  <span style={{ color: "var(--text-muted)", marginLeft: "0.35rem", fontSize: "0.78rem" }}>
                    ({currentUser.email})
                  </span>
                )}
              </div>
              <button
                className="btn-danger-ghost"
                style={{ padding: "0.4rem 0", color: "var(--danger)" }}
                onClick={() => { onLogout(); onClose(); }}
              >
                Sign Out of Account →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { onOpenAuth("login"); onClose(); }}
              >
                Log In
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => { onOpenAuth("signup"); onClose(); }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dimmed backdrop area to tap-away */}
      <div style={{ flex: 1 }} onClick={onClose} />
    </div>
  );
}
