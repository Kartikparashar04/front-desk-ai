import React, { useState } from "react";
import { calibrateProfileFromPastGarment } from "../utils/reverseCalibration.js";
import { identifyPlatform } from "../utils/urlAnalyzer.js";

export default function PastGarmentCalibrator({ onProfileCalibrated, onCancel }) {
  const [url, setUrl] = useState("");
  const [wornSize, setWornSize] = useState("M");
  const [fitPreference, setFitPreference] = useState("regular");
  const [units, setUnits] = useState("cm");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState("");
  const [showCustomChart, setShowCustomChart] = useState(false);
  const [customChartText, setCustomChartText] = useState("");

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    if (val.trim()) {
      setDetectedPlatform(identifyPlatform(val));
    } else {
      setDetectedPlatform("");
    }
  };

  const handleCalibrate = async (e) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const result = await calibrateProfileFromPastGarment({
        url: url.trim(),
        wornSize,
        preferredFit: fitPreference,
        units,
        customChartText
      });

      onProfileCalibrated(result.profile, result.garmentDetails);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Could not reverse-engineer measurements from this link. Try manual profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-surface" style={{ border: "1px solid var(--accent-lime-border)", marginBottom: "1.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div className="headline-mono" style={{ color: "var(--accent-lime)" }}>
          Reverse Size Calibration
        </div>
        {detectedPlatform && (
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            background: "var(--accent-lime-dim)",
            color: "var(--accent-lime)",
            padding: "0.2rem 0.5rem",
            borderRadius: "var(--radius-xs)"
          }}>
            {detectedPlatform} Detected
          </span>
        )}
      </div>

      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-primary)" }}>
        Don't Know Your Measurements?
      </h3>
      <p className="body-muted" style={{ fontSize: "0.84rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
        Paste a link to any shirt, T-shirt, or clothing item you already own that fits you nicely, select what size you bought, and our engine will reverse-calculate your body metrics automatically!
      </p>

      {errorMsg && (
        <div className="alert-box alert-error" role="alert" style={{ marginBottom: "1rem" }}>
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      <form onSubmit={handleCalibrate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="field-unit">
          <label className="field-label">1. Product Link of Clothes You Own</label>
          <input
            type="text"
            className="input-stealth"
            placeholder="Paste Myntra, Zara, H&M, Snitch link..."
            value={url}
            onChange={handleUrlChange}
            required
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="field-unit">
            <label className="field-label">2. What Size Did You Wear? (S/38, M/40, L/42, XL/44)</label>
            <div className="segmented-control">
              {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`segmented-btn ${wornSize === s ? "active" : ""}`}
                  style={{ paddingInline: "0.35rem", fontSize: "0.75rem" }}
                  onClick={() => setWornSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="field-unit">
            <label className="field-label">3. How Did It Fit You?</label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${fitPreference === "slim" ? "active" : ""}`}
                onClick={() => setFitPreference("slim")}
              >
                Slim
              </button>
              <button
                type="button"
                className={`segmented-btn ${fitPreference === "regular" ? "active" : ""}`}
                onClick={() => setFitPreference("regular")}
              >
                Regular
              </button>
              <button
                type="button"
                className={`segmented-btn ${fitPreference === "relaxed" ? "active" : ""}`}
                onClick={() => setFitPreference("relaxed")}
              >
                Relaxed
              </button>
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="ghost-back-btn"
            style={{ fontSize: "0.74rem", color: showCustomChart ? "var(--accent-lime)" : "var(--text-tertiary)" }}
            onClick={() => setShowCustomChart(!showCustomChart)}
          >
            {showCustomChart ? "▼ Hide Exact Size Chart Input" : "+ Store blocked (Ajio/Zara)? Paste Owned Shirt's Size Guide (Optional)"}
          </button>

          {showCustomChart && (
            <div style={{ marginTop: "0.5rem", background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "var(--radius-xs)", border: "1px dashed var(--border-strong)" }}>
              <textarea
                className="input-stealth"
                rows={3}
                style={{ width: "100%", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                placeholder={`Paste copied Size Chart from the store tab (e.g.\nSize  Brand Size  Chest (in)  Shoulder (in)\n44    XL          48.3        19.3)`}
                value={customChartText}
                onChange={(e) => setCustomChartText(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Quick Sample Selector for Instant Test */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
            Or try with sample link:
          </span>
          <button
            type="button"
            className="ghost-back-btn"
            style={{ fontSize: "0.72rem", borderBottom: "1px dotted var(--text-tertiary)" }}
            onClick={() => {
              const sample = "https://www.snitch.co.in/products/oversized-heavyweight-box-tee";
              setUrl(sample);
              setWornSize("M");
              setDetectedPlatform(identifyPlatform(sample));
            }}
          >
            Snitch Oversized (Size M)
          </button>
          <button
            type="button"
            className="ghost-back-btn"
            style={{ fontSize: "0.72rem", borderBottom: "1px dotted var(--text-tertiary)" }}
            onClick={() => {
              const sample = "https://www.zara.com/in/en/man-tailored-mercerized-tee-p0188.html";
              setUrl(sample);
              setWornSize("L");
              setDetectedPlatform(identifyPlatform(sample));
            }}
          >
            Zara Man (Size L)
          </button>
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: "0.75rem" }}
          disabled={isLoading}
        >
          {isLoading ? "Calibrating Body Measurements..." : "Reverse-Engineer & Save My Size →"}
        </button>
      </form>
    </div>
  );
}
