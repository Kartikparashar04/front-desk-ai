import React, { useState, useEffect } from "react";
import { recommendSize } from "../utils/sizing.js";
import { getAIFitAnalysis, getAIFabricStretchAnalysis, askAIFitAssistant } from "../utils/ai.js";
import { buildAffiliateUrl } from "../data/realProducts.js";
import { parseRawSizeChartText } from "../utils/sizeChartParser.js";

export default function ProductDetail({ product, profile, onBack, onFeedback, currentFeedback }) {
  const [feedbackConfirmed, setFeedbackConfirmed] = useState(false);

  // Local interactive override so user can paste/sync a blocked store's table right on this page
  const [customChart, setCustomChart] = useState(null);
  const [customPrice, setCustomPrice] = useState(null);
  const [customImage, setCustomImage] = useState(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showInlineSync, setShowInlineSync] = useState(false);
  const [inlineChartText, setInlineChartText] = useState("");
  const [inlineSyncError, setInlineSyncError] = useState("");

  // Table Unit Toggle State (cm or in) - defaults to user profile unit or cm
  const [tableUnit, setTableUnit] = useState(profile?.units || "cm");

  // AI states
  const [aiInsight, setAiInsight] = useState("");
  const [fabricAnalysis, setFabricAnalysis] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);

  useEffect(() => {
    setCustomChart(null);
    setCustomPrice(null);
    setCustomImage(null);
    setShowImageEditor(false);
    setImageUrlInput("");
    setShowInlineSync(false);
    setInlineChartText("");
    setInlineSyncError("");
  }, [product?.id]);

  if (!product) return null;

  const activeSizeChart = customChart || product.sizeChart;
  const activePrice = customPrice || product.price;
  const activeImage = customImage || product.image;
  const activeProduct = { ...product, sizeChart: activeSizeChart, price: activePrice, image: activeImage };

  const result = recommendSize(profile, activeSizeChart, profile?.fit || "regular", activeProduct);

  // Determine external affiliate link
  const storeUrl = product.affiliateUrl || product.externalStoreUrl || product.url || "#";
  const finalRedirectUrl = buildAffiliateUrl(storeUrl, import.meta.env.VITE_AFFILIATE_TAG || "");

  useEffect(() => {
    let isMounted = true;
    setIsAiLoading(true);

    Promise.all([
      getAIFitAnalysis({ product: activeProduct, profile, deterministicRec: result }),
      getAIFabricStretchAnalysis({ product: activeProduct, profile })
    ])
      .then(([insight, fabric]) => {
        if (isMounted) {
          setAiInsight(insight);
          setFabricAnalysis(fabric);
          setIsAiLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsAiLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [product.id, customChart, profile?.chest, profile?.bust, profile?.waist, profile?.fit]);

  const handleApplyInlineChart = (e) => {
    e.preventDefault();
    const parsed = parseRawSizeChartText(inlineChartText);
    if (!parsed.sizeChart || parsed.sizeChart.length === 0) {
      setInlineSyncError("Could not detect size rows — copy the full Size Guide table including headers (Shoulder, Chest, Length).");
      return;
    }
    setInlineSyncError("");
    setCustomChart(parsed.sizeChart);
    if (parsed.extractedPrice) setCustomPrice(parsed.extractedPrice);
    if (parsed.unitDetected) setTableUnit(parsed.unitDetected);
    setShowInlineSync(false);
  };

  const handleFeedbackClick = (type) => {
    onFeedback(product.id, type);
    setFeedbackConfirmed(true);
    setTimeout(() => {
      setFeedbackConfirmed(false);
    }, 3500);
  };

  const handleAskAi = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isAskingAi) return;

    const query = inputQuery.trim();
    setInputQuery("");
    const newHistory = [...chatMessages, { sender: "user", text: query }];
    setChatMessages(newHistory);
    setIsAskingAi(true);

    try {
      const answer = await askAIFitAssistant({
        question: query,
        product,
        profile,
        deterministicRec: result,
        chatHistory: newHistory
      });
      setChatMessages((prev) => [...prev, { sender: "ai", text: answer }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Unable to process query at this moment. Please check connectivity or API key." }
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  // Helper to format values according to selected tableUnit (cm or inches)
  const formatMeasure = (valInCm) => {
    if (!valInCm || isNaN(valInCm)) return "—";
    if (tableUnit === "in") {
      return `${(valInCm / 2.54).toFixed(1)} in`;
    }
    return `${valInCm} cm`;
  };

  return (
    <div className="product-detail-view">
      <div className="nav-actions">
        <button className="ghost-back-btn" onClick={onBack}>
          ← Back to Catalog
        </button>
      </div>

      {/* Garment Header Card with Product Visual */}
      <div className="card-surface" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ position: "relative" }}>
            <img
              src={activeImage}
              alt={product.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80";
              }}
              style={{
                width: "130px",
                height: "130px",
                objectFit: "cover",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--border-subtle)",
                display: "block"
              }}
            />
            <button
              type="button"
              onClick={() => setShowImageEditor(!showImageEditor)}
              style={{
                marginTop: "0.4rem",
                width: "100%",
                background: "transparent",
                border: "1px dashed var(--border-subtle)",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.68rem",
                padding: "0.25rem 0.4rem",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer"
              }}
            >
              {showImageEditor ? "✕ Close" : "📷 Change Photo"}
            </button>
          </div>

          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
              <span className="product-brand-tag">{product.brandName} · {product.platform}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", color: "var(--accent-lime)", fontWeight: 700 }}>
                {activePrice}
              </span>
            </div>
            <h1 className="headline-lg" style={{ marginBottom: "0.35rem", fontSize: "1.35rem" }}>{product.name}</h1>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>
              {product.color} · {product.material} · {product.fitCut}
            </div>
            {(customChart || product.sourceNotice) && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                  color: "var(--accent-lime)",
                  marginBottom: "0.85rem"
                }}
              >
                ● {customChart ? "Updated from your pasted store Size Guide — recommendation recalculated live ✓" : product.sourceNotice}
              </div>
            )}

            {/* Direct Store Buy Button + Quick Action Buttons */}
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
              {finalRedirectUrl && finalRedirectUrl !== "#" && (
                <a
                  href={finalRedirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ padding: "0.7rem 1.25rem", width: "auto", display: "inline-flex", textDecoration: "none" }}
                >
                  Go to {product.brandName} to Buy {result.size ? `Size ${result.size}` : ""} ↗
                </a>
              )}
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "0.7rem 1rem", fontSize: "0.78rem" }}
                onClick={() => {
                  setShowInlineSync(!showInlineSync);
                  document.getElementById("pattern-measurements-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {customChart ? "Edit Custom Size Table" : "Paste Store Size Table"}
              </button>
            </div>

            {/* Interactive Image Override Sheet */}
            {showImageEditor && (
              <div style={{ marginTop: "0.85rem", padding: "0.75rem", background: "var(--bg-elevated)", border: "1px solid var(--accent-lime-border)", borderRadius: "var(--radius-xs)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--accent-lime)", marginBottom: "0.4rem" }}>
                  Set Exact Product Photo:
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  <input
                    type="url"
                    className="input-stealth"
                    style={{ flex: "1 1 200px", fontSize: "0.78rem", padding: "0.4rem 0.6rem" }}
                    placeholder="Paste image URL (right-click product image > Copy Image Address)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", width: "auto" }}
                    onClick={() => {
                      if (imageUrlInput.trim()) {
                        setCustomImage(imageUrlInput.trim());
                        setShowImageEditor(false);
                      }
                    }}
                  >
                    Apply URL
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                    Or upload screenshot:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setCustomImage(evt.target.result);
                            setShowImageEditor(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Sizing Engine Hero */}
      <div className="rec-hero">
        <div className="rec-hero-badge">
          <span>●</span> Recommended Order Size
        </div>

        <div className="rec-hero-main">
          <div className="rec-size-display">
            {result.size || "—"}
          </div>

          <div className="rec-meta-group">
            <div className="rec-fit-tag">
              Estimated Fit: <strong style={{ color: "var(--text-primary)" }}>{result.fitEstimate}</strong>
            </div>

            <div className="confidence-indicator">
              <span className={`confidence-dot ${result.confidence}`} />
              <span>Confidence: {result.confidence}</span>
            </div>
          </div>
        </div>

        <div className="rec-explanation">
          {result.explanation}
        </div>
      </div>

      {/* AI Tailor & Textile Analysis Card */}
      <div className="card-surface" style={{ borderLeft: "3px solid var(--accent-lime)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <div className="headline-mono" style={{ color: "var(--accent-lime)" }}>
            AI Drape & Fabric Insight
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
            {isAiLoading ? "Analyzing..." : "Gemini Textile Engine"}
          </span>
        </div>

        <p className="body-muted" style={{ fontSize: "0.88rem", lineHeight: "1.6", color: "var(--text-primary)", marginBottom: fabricAnalysis ? "1rem" : "0" }}>
          {isAiLoading ? "Synthesizing fabric weights, ease margins, and regional climate tolerances..." : aiInsight}
        </p>

        {/* Gemini AI Fabric Elasticity & Care Grid */}
        {fabricAnalysis && !isAiLoading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
              paddingTop: "0.85rem",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "0.78rem"
            }}
          >
            <div>
              <div style={{ color: "var(--accent-lime)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", marginBottom: "0.15rem" }}>
                Stretch & Give
              </div>
              <div style={{ color: "var(--text-primary)" }}>{fabricAnalysis.stretchFactor}</div>
            </div>

            <div>
              <div style={{ color: "var(--accent-lime)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", marginBottom: "0.15rem" }}>
                Waistband & Silhouette Fall
              </div>
              <div style={{ color: "var(--text-secondary)" }}>{fabricAnalysis.waistbandBehavior}</div>
            </div>

            <div>
              <div style={{ color: "var(--accent-lime)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", marginBottom: "0.15rem" }}>
                Shrinkage & Wash Care
              </div>
              <div style={{ color: "var(--text-secondary)" }}>{fabricAnalysis.washAdvice}</div>
            </div>

            <div>
              <div style={{ color: "var(--accent-lime)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", marginBottom: "0.15rem" }}>
                Indian Climate Suitability
              </div>
              <div style={{ color: "var(--text-secondary)" }}>{fabricAnalysis.climateScore}</div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive AI Fit Advisor Chat */}
      <div className="card-surface">
        <div className="headline-mono" style={{ marginBottom: "0.35rem" }}>
          Ask Technical Fit Advisor
        </div>
        <p className="body-muted" style={{ fontSize: "0.8rem", marginBottom: "1rem" }}>
          Ask about fabric shrinkage, chest tightness, or whether to size up for oversized styling.
        </p>

        {chatMessages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1rem" }}>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  background: msg.sender === "user" ? "var(--bg-elevated)" : "var(--bg-subtle)",
                  border: `1px solid ${msg.sender === "user" ? "var(--border-strong)" : "var(--accent-lime-border)"}`,
                  color: "var(--text-primary)",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "0.82rem",
                  maxWidth: "85%",
                  lineHeight: "1.45"
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAskAi} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            className="input-stealth"
            style={{ fontSize: "0.85rem", padding: "0.7rem 0.9rem" }}
            placeholder="e.g. Will this shrink in wash or feel tight at armpits?"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn-secondary"
            style={{ padding: "0.7rem 1.1rem", whiteSpace: "nowrap" }}
            disabled={isAskingAi}
          >
            {isAskingAi ? "..." : "Ask AI"}
          </button>
        </form>
      </div>

      {/* Pattern Size Table with CM / INCHES Interactive Switcher & Inline Sync */}
      <div id="pattern-measurements-card" className="card-surface">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.65rem" }}>
          <div className="headline-mono" style={{ margin: 0 }}>
            {product.brandName} Pattern Measurements
          </div>

          {/* Interactive Unit Toggle (cm / in) + Inline Sync */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <button
              type="button"
              className="ghost-back-btn"
              style={{
                fontSize: "0.72rem",
                color: showInlineSync || product.liveStatus === "blocked" ? "#fbbf24" : "var(--text-tertiary)",
                borderBottom: "1px dotted currentColor"
              }}
              onClick={() => setShowInlineSync(!showInlineSync)}
            >
              {showInlineSync ? "Close Size Guide Paste" : "Different chart on site? Paste Exact Table"}
            </button>

            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
              Units:
            </span>
            <div className="segmented-control" style={{ width: "auto", padding: "2px", gap: "2px" }}>
              <button
                type="button"
                className={`segmented-btn ${tableUnit === "cm" ? "active" : ""}`}
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.72rem" }}
                onClick={() => setTableUnit("cm")}
              >
                Centimetres (cm)
              </button>
              <button
                type="button"
                className={`segmented-btn ${tableUnit === "in" ? "active" : ""}`}
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.72rem" }}
                onClick={() => setTableUnit("in")}
              >
                Inches (in)
              </button>
            </div>
          </div>
        </div>

        {showInlineSync && (
          <form
            onSubmit={handleApplyInlineChart}
            style={{
              background: "var(--bg-elevated)",
              padding: "0.75rem",
              borderRadius: "var(--radius-xs)",
              border: "1px dashed var(--accent-lime-border)",
              marginBottom: "0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}
          >
            <label className="field-label" style={{ fontSize: "0.72rem", margin: 0 }}>
              Copy & Paste Size Guide table straight from {product.platform} (works for horizontal OR vertical tables in cm/in):
            </label>
            {inlineSyncError && (
              <div style={{ fontSize: "0.72rem", color: "#f87171" }}>{inlineSyncError}</div>
            )}
            <textarea
              className="input-stealth"
              rows={4}
              style={{ width: "100%", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
              placeholder={`Example:\nSize\tBrand Size\tShoulder\tChest\tLength\nS\tS\t44.45\t104.14\t67.56`}
              value={inlineChartText}
              onChange={(e) => setInlineChartText(e.target.value)}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn-primary" style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.78rem" }}>
                Update Chart & Recalculate Size →
              </button>
            </div>
          </form>
        )}

        <div className="table-wrap">
          <table className="editorial-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Chest</th>
                <th>Waist</th>
                <th>Shoulder</th>
                <th>Length</th>
              </tr>
            </thead>
            <tbody>
              {activeSizeChart.map((row) => {
                const isSelected = row.size === result.size;
                return (
                  <tr key={row.size} className={isSelected ? "highlight-size" : ""}>
                    <td>
                      {row.size} {isSelected ? "◀ YOUR RECOMMENDED SIZE" : ""}
                    </td>
                    <td>{formatMeasure(row.chest)}</td>
                    <td>{formatMeasure(row.waist)}</td>
                    <td>{formatMeasure(row.shoulder)}</td>
                    <td>{formatMeasure(row.length)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fit Feedback Section */}
      <div className="feedback-container">
        <div className="headline-mono">Personal Experience Feedback</div>
        <p className="body-muted" style={{ marginTop: "0.25rem", fontSize: "0.82rem" }}>
          Have you tried this style from {product.brandName}? Log real-world wear to refine our weighting algorithms.
        </p>

        <div className="feedback-options">
          <button
            type="button"
            className={`feedback-btn ${currentFeedback === "too-tight" ? "active" : ""}`}
            onClick={() => handleFeedbackClick("too-tight")}
          >
            Too Tight
          </button>
          <button
            type="button"
            className={`feedback-btn ${currentFeedback === "fit-well" ? "active" : ""}`}
            onClick={() => handleFeedbackClick("fit-well")}
          >
            Fit Well
          </button>
          <button
            type="button"
            className={`feedback-btn ${currentFeedback === "too-loose" ? "active" : ""}`}
            onClick={() => handleFeedbackClick("too-loose")}
          >
            Too Loose
          </button>
        </div>

        {feedbackConfirmed && (
          <div className="alert-box alert-success" style={{ marginTop: "1rem" }} role="alert">
            ✓ Fit feedback recorded locally for this product.
          </div>
        )}
      </div>
    </div>
  );
}
