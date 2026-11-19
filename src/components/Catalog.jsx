import React, { useState } from "react";
import { recommendSize } from "../utils/sizing.js";
import { realCuratedProducts, buildAffiliateUrl } from "../data/realProducts.js";

export default function Catalog({ onSelectProduct, onEditProfile, profile }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all"); // 'all' | 'tops' | 'bottoms' | 'dresses'
  const [selectedGender, setSelectedGender] = useState("all"); // 'all' | 'Men' | 'Women' | 'Unisex'

  const brandsList = Array.from(new Set(realCuratedProducts.map((p) => p.brandName)));

  const filtered = realCuratedProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBrand = selectedBrand === "all" || p.brandName === selectedBrand;

    let matchesCategory = true;
    if (selectedCategory === "tops") {
      matchesCategory = (p.category || "").toLowerCase().includes("top") || (p.category || "").toLowerCase().includes("tee");
    } else if (selectedCategory === "bottoms") {
      matchesCategory = (p.category || "").toLowerCase().includes("bottom") || (p.category || "").toLowerCase().includes("jean") || (p.category || "").toLowerCase().includes("trouser");
    } else if (selectedCategory === "dresses") {
      matchesCategory = (p.category || "").toLowerCase().includes("dress") || (p.category || "").toLowerCase().includes("kurta") || (p.category || "").toLowerCase().includes("ethnic");
    }

    let matchesGender = true;
    if (selectedGender !== "all") {
      matchesGender = p.gender === selectedGender || p.gender === "Unisex";
    }

    return matchesSearch && matchesBrand && matchesCategory && matchesGender;
  });

  return (
    <div className="catalog-view">
      <div className="nav-actions">
        <button className="ghost-back-btn" onClick={onEditProfile}>
          ← Edit Anatomical Profile
        </button>
      </div>

      <div className="headline-mono">Verified Style & Fit Catalog</div>
      <h2 className="headline-lg">Tops, Bottoms & Dresses</h2>
      <p className="body-muted" style={{ marginBottom: "1.25rem" }}>
        Engineered sizing for Men and Women across Indian and international labels. Tap any piece to see your calibrated size or purchase directly.
      </p>

      {/* Category Segment Tabs */}
      <div className="segmented-control" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className={`segmented-btn ${selectedCategory === "all" ? "active" : ""}`}
          onClick={() => setSelectedCategory("all")}
        >
          All ({realCuratedProducts.length})
        </button>
        <button
          type="button"
          className={`segmented-btn ${selectedCategory === "tops" ? "active" : ""}`}
          onClick={() => setSelectedCategory("tops")}
        >
          👕 Tops & Tees
        </button>
        <button
          type="button"
          className={`segmented-btn ${selectedCategory === "bottoms" ? "active" : ""}`}
          onClick={() => setSelectedCategory("bottoms")}
        >
          👖 Pants & Jeans
        </button>
        <button
          type="button"
          className={`segmented-btn ${selectedCategory === "dresses" ? "active" : ""}`}
          onClick={() => setSelectedCategory("dresses")}
        >
          👗 Dresses & Kurtas
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <input
          type="text"
          className="search-input"
          style={{ flex: "1 1 200px" }}
          placeholder="Filter by label, fit cut, or color..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="brand-select"
          style={{ flex: "0 1 160px" }}
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
        >
          <option value="all">All Brands ({brandsList.length})</option>
          {brandsList.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className="brand-select"
          style={{ flex: "0 1 120px" }}
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
        >
          <option value="all">All Genders</option>
          <option value="Men">Men</option>
          <option value="Women">Women</option>
          <option value="Unisex">Unisex</option>
        </select>
      </div>

      {/* Product List */}
      <div className="product-grid">
        {filtered.map((item) => {
          const quickRec = profile ? recommendSize(profile, item.sizeChart, profile?.fit, item) : null;
          const affiliateLink = buildAffiliateUrl(item.externalStoreUrl, import.meta.env.VITE_AFFILIATE_TAG || "");

          return (
            <div
              key={item.id}
              className="product-row"
              style={{ gridTemplateColumns: "85px 1fr auto" }}
              tabIndex={0}
              role="button"
              onClick={() => onSelectProduct(item)}
              onKeyDown={(e) => e.key === "Enter" && onSelectProduct(item)}
            >
              {/* Product Visual Photo */}
              <div
                className="product-thumb"
                style={{
                  width: "85px",
                  height: "85px",
                  backgroundImage: `url(${item.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: "var(--radius-xs)"
                }}
              />

              <div className="product-info">
                <span className="product-brand-tag">
                  {item.brandName} · {item.platform} {item.gender ? `· ${item.gender}` : ""}
                </span>
                <div className="product-name">{item.name}</div>
                <div className="product-specs">
                  {item.color} · {item.fitCut} · <strong style={{ color: "var(--text-primary)" }}>{item.price}</strong>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                {quickRec?.size ? (
                  <span className="product-action-pill" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    Your Size: <strong>{quickRec.size}</strong> →
                  </span>
                ) : (
                  <span className="product-action-pill">
                    Check Size →
                  </span>
                )}
                
                {/* Direct Store Affiliate Redirection */}
                <a
                  href={affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-secondary)",
                    textDecoration: "underline",
                    fontFamily: "var(--font-mono)"
                  }}
                  onMouseOver={(e) => (e.target.style.color = "var(--accent-lime)")}
                  onMouseOut={(e) => (e.target.style.color = "var(--text-secondary)")}
                >
                  Buy on {item.brandName} ↗
                </a>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card-surface" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div className="headline-mono">Zero Matches Found</div>
            <p className="body-muted" style={{ marginTop: "0.5rem" }}>
              No apparel matches your selected filters. Switch category or clear search terms.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
