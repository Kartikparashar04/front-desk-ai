import React from "react";
import UrlSizeInspector from "./UrlSizeInspector.jsx";

export default function Landing({ onStart, onOpenCatalog, hasProfile, profile, onProductReady }) {
  return (
    <div className="landing-view">
      <div className="headline-mono">Front Desk AI · Size Intelligence Protocol</div>
      <h1 className="headline-xl">
        Stop Guessing Your Size Online.
      </h1>
      
      <p className="body-lead">
        A Medium at Zara fits like a Small, while a Medium at Snitch fits like an XL. Paste any shopping link from Myntra, Ajio, Zara, H&amp;M, Bewakoof, or Snitch below to instantly get Front Desk AI&apos;s exact size recommendation before ordering.
      </p>

      {/* Primary Use-case: Universal URL Sizer (Above the fold) */}
      <UrlSizeInspector
        userProfile={profile}
        onProductReady={onProductReady}
        onEditProfile={onStart}
      />

      {/* Editorial Comparison Strip demonstrating real problem */}
      <div className="comparison-strip">
        <div className="comparison-item">
          <span className="comparison-brand">Snitch Oversized</span>
          <span className="comparison-size">M</span>
          <span className="comparison-metric">Chest 110cm · Drop Shoulder</span>
        </div>
        <div className="comparison-item">
          <span className="comparison-brand">Zara Man Slim</span>
          <span className="comparison-size">L</span>
          <span className="comparison-metric">Chest 104cm · Tailored European</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "2rem" }}>
        <button className="btn-primary" onClick={onStart}>
          {hasProfile && profile?.chest
            ? `Review / Edit Saved Profile (${profile.chest}${profile.units}) →`
            : "Build My Size Profile →"}
        </button>
        <button className="btn-secondary" onClick={onOpenCatalog}>
          Browse Trending Verified Styles & Recommendations ↗
        </button>
      </div>

      <div className="demo-stamp" style={{ marginTop: "3rem", textAlign: "center" }}>
        FRONT DESK AI · FRONTDESKAI.SHOP · LIVE BRAND PATTERN MATCHING
      </div>
    </div>
  );
}
