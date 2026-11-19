import React, { useState, useEffect } from "react";
import { analyzeGarmentUrl, identifyPlatform } from "../utils/urlAnalyzer.js";
import { parseRawSizeChartText, buildChartFromTableMatrix } from "../utils/sizeChartParser.js";

function buildClipperBookmarklet(appOrigin) {
  const fn = () => {
    try {
      const h1 = document.querySelector("h1")?.innerText?.trim() || document.title;
      const ogImg = document.querySelector('meta[property="og:image"]')?.content || document.querySelector("img")?.src || "";
      const bodyTxt = document.body.innerText || "";
      const priceM = bodyTxt.match(/(?:₹|Rs\.?)\s*[\d,]+/i);
      const tbls = [...document.querySelectorAll("table")];
      let rows = [];
      for (const t of tbls) {
        const trs = [...t.querySelectorAll("tr")].map((tr) =>
          [...tr.querySelectorAll("th,td")].map((c) => c.innerText.replace(/\s+/g, " ").trim())
        );
        if (trs.some((r) => r.some((c) => /chest|shoulder|waist|length/i.test(c)))) {
          rows = trs;
          break;
        }
      }
      const payload = {
        url: location.href,
        title: h1,
        price: priceM ? priceM[0] : "",
        image: ogImg,
        table: rows
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      window.open("__APP_ORIGIN__/#clip=" + encoded, "_blank");
    } catch (e) {
      alert("Front Desk AI Clipper: Open the product Size Chart first, then click again.");
    }
  };
  return `javascript:(${fn.toString().replace("__APP_ORIGIN__", appOrigin)})();`;
}

export default function UrlSizeInspector({ userProfile, onProductReady, onEditProfile }) {
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState("");

  // Quick Calibration Option: user can paste text from size chart or use browser clipper
  const [showDirectPaste, setShowDirectPaste] = useState(false);
  const [chartTextInput, setChartTextInput] = useState("");
  const [copiedClipper, setCopiedClipper] = useState(false);

  const bookmarkletHref = typeof window !== "undefined" ? buildClipperBookmarklet(window.location.origin) : "#";

  const handleInputChange = (e) => {
    const val = e.target.value;
    setUrlInput(val);
    if (val.trim()) {
      setDetectedPlatform(identifyPlatform(val));
    } else {
      setDetectedPlatform("");
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!urlInput.trim() || isLoading) return;

    if (!userProfile) {
      setErrorMsg("Please create your anatomical profile first so we can compare measurements.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const parsedProduct = await analyzeGarmentUrl(urlInput.trim(), userProfile);

      // If user provided exact pasted text from brand size chart, parse columns & price intelligently
      if (chartTextInput.trim()) {
        const parsedCustom = parseRawSizeChartText(chartTextInput);
        if (parsedCustom.sizeChart.length > 0) {
          parsedProduct.sizeChart = parsedCustom.sizeChart;
          parsedProduct.liveStatus = "live-chart";
          parsedProduct.sourceNotice = "Calibrated directly from your pasted brand size chart ✓";
        }
        if (parsedCustom.extractedPrice) {
          parsedProduct.price = parsedCustom.extractedPrice;
        }
      }

      const productPayload = {
        id: parsedProduct.id,
        name: parsedProduct.productName,
        code: `${parsedProduct.platform.toUpperCase().slice(0, 4)}-LINK`,
        brandName: parsedProduct.brandName,
        origin: parsedProduct.platform,
        platform: parsedProduct.platform,
        color: parsedProduct.color || "Store Selection",
        material: parsedProduct.material,
        price: parsedProduct.price,
        image: parsedProduct.image,
        fitCut: parsedProduct.fitCut,
        sizeChart: parsedProduct.sizeChart,
        externalUrl: parsedProduct.url,
        externalStoreUrl: parsedProduct.url,
        affiliateUrl: parsedProduct.affiliateUrl,
        isCustomUrl: true,
        liveStatus: parsedProduct.liveStatus,
        sourceNotice: parsedProduct.sourceNotice
      };

      onProductReady(productPayload);
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not parse clothing link. Please check the URL and retry.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-surface" style={{ border: "1px solid var(--accent-lime-border)", marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div className="headline-mono" style={{ color: "var(--accent-lime)" }}>
          Universal URL Sizer
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

      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
        Paste Any Clothing Link
      </h3>
      <p className="body-muted" style={{ fontSize: "0.82rem", marginBottom: "1.25rem" }}>
        Paste a link from <strong>Myntra, Bewakoof, The Souled Store, Snitch, Ajio, Zara, H&M</strong>. Live product price, photo & garment size charts are fetched automatically whenever the store allows it.
      </p>

      {errorMsg && (
        <div className="alert-box alert-error" role="alert" style={{ marginBottom: "1rem" }}>
          <span>⚠️</span> {errorMsg}
          {!userProfile && (
            <button
              onClick={onEditProfile}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                textDecoration: "underline",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem"
              }}
            >
              Set Profile Now →
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleAnalyze} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <input
            type="text"
            className="input-stealth"
            style={{ flex: "1 1 240px", fontSize: "0.88rem" }}
            placeholder="https://www.myntra.com/... or bewakoof.com / ajio.com..."
            value={urlInput}
            onChange={handleInputChange}
            required
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ flex: "0 0 auto", width: "auto", padding: "0.85rem 1.4rem" }}
            disabled={isLoading}
          >
            {isLoading ? "Fetching Live Specs..." : "Check My Size →"}
          </button>
        </div>

        {/* Optional 100% Exact Override via Copy-Paste or 1-Click Bookmarklet (for 403 stores like Ajio/Zara) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
          <button
            type="button"
            className="ghost-back-btn"
            style={{ fontSize: "0.75rem", color: showDirectPaste ? "var(--accent-lime)" : "var(--text-tertiary)" }}
            onClick={() => setShowDirectPaste(!showDirectPaste)}
          >
            {showDirectPaste ? "▼ Hide Exact Size Chart / Store Clipper" : "+ Store blocked (Ajio/Zara)? Paste Size Guide or Use 1-Click Clipper"}
          </button>
        </div>

        {showDirectPaste && (
          <div style={{ background: "var(--bg-elevated)", padding: "0.85rem", borderRadius: "var(--radius-xs)", border: "1px dashed var(--border-strong)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label className="field-label" style={{ marginBottom: "0.35rem", fontSize: "0.72rem" }}>
                Paste copied text directly from any brand&apos;s Size Guide modal (auto-detects Chest, Shoulder, Waist, Length, in/cm & Price):
              </label>
              <textarea
                className="input-stealth"
                rows={4}
                style={{ width: "100%", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                placeholder={`Paste straight from Myntra / Ajio / Zara Size Chart, e.g.:\nSize\tBrand Size\tChest (in)\tFront Length (in)\tAcross Shoulder (in)\n38\tS\t39.5\t29.0\t17.0`}
                value={chartTextInput}
                onChange={(e) => setChartTextInput(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                <strong>1-Click Tab Clipper:</strong> Drag to your Bookmarks Bar (or copy) — click it on an open Ajio/Zara/H&amp;M tab with Size Guide open:
              </span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <a
                  href={bookmarkletHref}
                  onClick={(e) => e.preventDefault()}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    padding: "0.3rem 0.65rem",
                    borderRadius: "var(--radius-xs)",
                    background: "var(--accent-lime-dim)",
                    border: "1px solid var(--accent-lime-border)",
                    color: "var(--accent-lime)",
                    textDecoration: "none",
                    cursor: "grab"
                  }}
                >
                  ⚡ Front Desk AI Grabber
                </a>
                <button
                  type="button"
                  className="ghost-back-btn"
                  style={{ fontSize: "0.7rem" }}
                  onClick={() => {
                    navigator.clipboard?.writeText(bookmarkletHref);
                    setCopiedClipper(true);
                    setTimeout(() => setCopiedClipper(false), 2000);
                  }}
                >
                  {copiedClipper ? "✓ Copied" : "Copy URL"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Quick Demo Links */}
      <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
          Try sample links:
        </span>
        <button
          type="button"
          className="ghost-back-btn"
          style={{ fontSize: "0.72rem", borderBottom: "1px dotted var(--text-tertiary)" }}
          onClick={() => {
            const sample = "https://www.ajio.com/neonomad-men-embroidered-regular-fit-shirt/p/704103370_blue";
            setUrlInput(sample);
            setDetectedPlatform(identifyPlatform(sample));
          }}
        >
          Ajio Neonomad Shirt (Live)
        </button>
        <button
          type="button"
          className="ghost-back-btn"
          style={{ fontSize: "0.72rem", borderBottom: "1px dotted var(--text-tertiary)" }}
          onClick={() => {
            const sample = "https://www.myntra.com/shirts/roadster/roadster-men-white-classic-regular-fit-cotton-casual-shirt/17091614/buy";
            setUrlInput(sample);
            setDetectedPlatform(identifyPlatform(sample));
          }}
        >
          Myntra Roadster Shirt (Live)
        </button>
        <button
          type="button"
          className="ghost-back-btn"
          style={{ fontSize: "0.72rem", borderBottom: "1px dotted var(--text-tertiary)" }}
          onClick={() => {
            const sample = "https://www.bewakoof.com/p/mens-green-wakanda-forever-graphic-printed-oversized-t-shirt";
            setUrlInput(sample);
            setDetectedPlatform(identifyPlatform(sample));
          }}
        >
          Bewakoof Oversized Tee (Live)
        </button>
        <button
          type="button"
          className="ghost-back-btn"
          style={{ fontSize: "0.72rem", borderBottom: "1px dotted var(--text-tertiary)" }}
          onClick={() => {
            const sample = "https://www.ajio.com/the-indian-garage-co-men-embroidered-regular-fit-biker-jacket/p/469802250_black";
            setUrlInput(sample);
            setDetectedPlatform(identifyPlatform(sample));
          }}
        >
          Ajio Biker Jacket
        </button>
      </div>
    </div>
  );
}
