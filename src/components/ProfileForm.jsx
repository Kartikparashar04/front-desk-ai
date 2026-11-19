import React, { useState } from "react";
import { estimateProfileFromDescription } from "../utils/ai.js";
import PastGarmentCalibrator from "./PastGarmentCalibrator.jsx";

export default function ProfileForm({ existing, onSave, onClear, onCancel, onDeleteAccount, userEmail }) {
  const [activeTab, setActiveTab] = useState(existing ? "manual" : "past-garment"); // 'past-garment' | 'manual'
  const [gender, setGender] = useState(existing?.gender || "men"); // 'men' | 'women' | 'unisex'
  const [categoryFocus, setCategoryFocus] = useState(existing?.category || "tops"); // 'tops' | 'bottoms' | 'dresses'
  const [units, setUnits] = useState(existing?.units || "cm");
  const [fit, setFit] = useState(existing?.fit || "regular");

  // Dimensional Metrics
  const [chest, setChest] = useState(existing?.chest && existing.chest > 0 ? existing.chest : "");
  const [bust, setBust] = useState(existing?.bust && existing.bust > 0 ? existing.bust : (existing?.chest || ""));
  const [waist, setWaist] = useState(existing?.waist && existing.waist > 20 ? existing.waist : "");
  const [hip, setHip] = useState(existing?.hip && existing.hip > 20 ? existing.hip : "");
  const [height, setHeight] = useState(existing?.height && existing.height > 0 ? existing.height : "");
  const [shoulder, setShoulder] = useState(existing?.shoulder && existing.shoulder > 0 ? existing.shoulder : "");
  const [inseam, setInseam] = useState(existing?.inseam && existing.inseam > 0 ? existing.inseam : "");
  const [dressLength, setDressLength] = useState(existing?.dressLength && existing.dressLength > 0 ? existing.dressLength : "");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // AI Autofill State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);

  const handleUnitToggle = (newUnit) => {
    if (newUnit === units) return;
    const convert = (val) => {
      if (!val || isNaN(val)) return "";
      return newUnit === "in" 
        ? (Number(val) / 2.54).toFixed(1)
        : (Number(val) * 2.54).toFixed(1);
    };

    if (chest) setChest(convert(chest));
    if (bust) setBust(convert(bust));
    if (waist) setWaist(convert(waist));
    if (hip) setHip(convert(hip));
    if (height) setHeight(convert(height));
    if (shoulder) setShoulder(convert(shoulder));
    if (inseam) setInseam(convert(inseam));
    if (dressLength) setDressLength(convert(dressLength));
    setUnits(newUnit);
  };

  const handleCalibratedFromPastGarment = (calibratedProfile, garmentDetails) => {
    setUnits(calibratedProfile.units);
    setFit(calibratedProfile.fit);
    setChest(calibratedProfile.chest);
    setBust(calibratedProfile.chest);
    setWaist(calibratedProfile.waist);
    setHeight(calibratedProfile.height);
    if (calibratedProfile.shoulder) setShoulder(calibratedProfile.shoulder);
    if (calibratedProfile.hip) setHip(calibratedProfile.hip);

    setSuccessMsg(`✓ Calibrated successfully from ${garmentDetails.brandName} (${garmentDetails.wornSize}). Measurements filled!`);
    onSave({
      ...calibratedProfile,
      gender,
      category: categoryFocus
    });
  };

  const handleAiEstimate = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isEstimating) return;

    setIsEstimating(true);
    setErrorMsg("");
    try {
      const estimated = await estimateProfileFromDescription(aiPrompt, units);
      if (estimated.gender) setGender(estimated.gender);
      if (estimated.chest) setChest(estimated.chest);
      if (estimated.bust) setBust(estimated.bust);
      if (estimated.waist) setWaist(estimated.waist);
      if (estimated.hip) setHip(estimated.hip);
      if (estimated.height) setHeight(estimated.height);
      if (estimated.shoulder) setShoulder(estimated.shoulder);
      setSuccessMsg("AI estimated metrics populated below in your chosen units. Feel free to adjust.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setErrorMsg("Unable to estimate from text. Please enter metrics manually.");
    } finally {
      setIsEstimating(false);
    }
  };

  const validate = () => {
    if (categoryFocus === "bottoms") {
      if (!waist || isNaN(waist) || Number(waist) <= 0) {
        return "Please enter a valid waist circumference for pant matching.";
      }
      if (!height || isNaN(height) || Number(height) <= 0) {
        return "Please enter your height to calibrate leg length & inseam.";
      }
      return null;
    }

    if (categoryFocus === "dresses") {
      const targetBust = bust || chest;
      if (!targetBust || isNaN(targetBust) || Number(targetBust) <= 0) {
        return "Please enter your bust measurement for dresses.";
      }
      if (!waist || isNaN(waist) || Number(waist) <= 0) {
        return "Please enter your waist measurement.";
      }
      return null;
    }

    // Default tops
    if (!chest || isNaN(chest) || Number(chest) <= 0) {
      return "Please enter a valid chest circumference.";
    }
    if (!waist || isNaN(waist) || Number(waist) <= 0) {
      return "Please enter a valid waist circumference.";
    }
    if (!height || isNaN(height) || Number(height) <= 0) {
      return "Please enter your height.";
    }

    const chestCm = units === "in" ? Number(chest) * 2.54 : Number(chest);
    if (chestCm < 55 || chestCm > 175) {
      return `Chest of ${chest} ${units} looks outside typical human dimensions. Please verify.`;
    }

    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setErrorMsg(err);
      setSuccessMsg("");
      return;
    }

    setErrorMsg("");
    const profileData = {
      units,
      gender,
      category: categoryFocus,
      fit,
      chest: chest ? parseFloat(chest) : (bust ? parseFloat(bust) : 0),
      bust: bust ? parseFloat(bust) : (chest ? parseFloat(chest) : 0),
      waist: parseFloat(waist),
      hip: hip ? parseFloat(hip) : null,
      height: parseFloat(height),
      shoulder: shoulder ? parseFloat(shoulder) : null,
      inseam: inseam ? parseFloat(inseam) : null,
      dressLength: dressLength ? parseFloat(dressLength) : null,
      updatedAt: new Date().toISOString()
    };

    onSave(profileData);
  };

  return (
    <div className="profile-form-view">
      <div className="headline-mono">Personal Calibration</div>
      <h2 className="headline-lg">Your Anatomical Profile</h2>
      <p className="body-muted" style={{ marginBottom: "1.25rem" }}>
        Front Desk AI stores only the dimensional specs required to match patterns across Tops, Pants, and Dresses.
      </p>

      {/* Profile Creation Mode Switcher */}
      <div className="segmented-control" style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          className={`segmented-btn ${activeTab === "past-garment" ? "active" : ""}`}
          onClick={() => setActiveTab("past-garment")}
        >
          ✨ Calibrate from Clothes You Own
        </button>
        <button
          type="button"
          className={`segmented-btn ${activeTab === "manual" ? "active" : ""}`}
          onClick={() => setActiveTab("manual")}
        >
          📐 Enter Measurements
        </button>
      </div>

      {successMsg && (
        <div className="alert-box alert-success" role="alert" style={{ marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert-box alert-error" role="alert" style={{ marginBottom: "1rem" }}>
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {/* Option A: Calibrate From Past Garment */}
      {activeTab === "past-garment" && (
        <div>
          <PastGarmentCalibrator
            onProfileCalibrated={handleCalibratedFromPastGarment}
          />
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Prefer using a measuring tape?{" "}
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-lime)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "0.82rem"
                }}
              >
                Switch to manual measurement entry →
              </button>
            </span>
          </div>
        </div>
      )}

      {/* Option B: Manual Measurement Form */}
      {activeTab === "manual" && (
        <div>
          {/* AI Quick Description Box (Supports Hindi, Hinglish, English) */}
          <div className="card-surface" style={{ marginBottom: "1.25rem", border: "1px dashed var(--accent-lime-border)" }}>
            <div className="headline-mono" style={{ color: "var(--accent-lime)", marginBottom: "0.3rem", fontSize: "0.75rem" }}>
              Google Cloud Gemini · Natural Language Autofill
            </div>
            <p className="body-muted" style={{ fontSize: "0.78rem", marginBottom: "0.75rem" }}>
              Describe your body frame naturally in Hindi or English (e.g. <em>"Height 5'9, pant size 32, chest 38"</em> or <em>"Bust 34, waist 28, hip 38 for kurti"</em>):
            </p>

            <form onSubmit={handleAiEstimate} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                className="input-stealth"
                style={{ fontSize: "0.85rem", padding: "0.65rem 0.85rem" }}
                placeholder="e.g. 5'11, athletic build, wear size 32 jeans..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <button
                type="submit"
                className="btn-secondary"
                style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}
                disabled={isEstimating}
              >
                {isEstimating ? "Extracting..." : "Auto Fill"}
              </button>
            </form>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Gender and Category Selector */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div className="field-unit">
                <label className="field-label">Department / Gender</label>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${gender === "men" ? "active" : ""}`}
                    onClick={() => setGender("men")}
                  >
                    Men
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${gender === "women" ? "active" : ""}`}
                    onClick={() => { setGender("women"); if (categoryFocus === "tops") setCategoryFocus("dresses"); }}
                  >
                    Women
                  </button>
                </div>
              </div>

              <div className="field-unit">
                <label className="field-label">Measurement Standard</label>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${units === "cm" ? "active" : ""}`}
                    onClick={() => handleUnitToggle("cm")}
                  >
                    Centimetres (cm)
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${units === "in" ? "active" : ""}`}
                    onClick={() => handleUnitToggle("in")}
                  >
                    Inches (in)
                  </button>
                </div>
              </div>
            </div>

            {/* Primary Garment Focus */}
            <div className="field-unit" style={{ marginBottom: "1.25rem" }}>
              <label className="field-label">Primary Garment You Are Shopping For</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${categoryFocus === "tops" ? "active" : ""}`}
                  onClick={() => setCategoryFocus("tops")}
                >
                  👕 Shirts & Tees
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${categoryFocus === "bottoms" ? "active" : ""}`}
                  onClick={() => setCategoryFocus("bottoms")}
                >
                  👖 Pants & Jeans
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${categoryFocus === "dresses" ? "active" : ""}`}
                  onClick={() => { setCategoryFocus("dresses"); setGender("women"); }}
                >
                  👗 Dresses & Kurtas
                </button>
              </div>
            </div>

            {/* Dynamic Input Grid */}
            <div className="form-grid" style={{ marginBottom: "1.25rem" }}>
              {/* TOPS: Chest */}
              {categoryFocus !== "bottoms" && (
                <div className="field-unit">
                  <label htmlFor="input-chest" className="field-label">
                    <span>{categoryFocus === "dresses" || gender === "women" ? "Bust Circumference" : "Chest Circumference"}</span>
                  </label>
                  <input
                    id="input-chest"
                    type="number"
                    step="0.1"
                    className="input-stealth"
                    placeholder={units === "cm" ? (gender === "women" ? "e.g. 88.0" : "e.g. 98.0") : (gender === "women" ? "e.g. 34.5" : "e.g. 38.5")}
                    value={gender === "women" ? bust : chest}
                    onChange={(e) => {
                      if (gender === "women") {
                        setBust(e.target.value);
                        setChest(e.target.value);
                      } else {
                        setChest(e.target.value);
                        setBust(e.target.value);
                      }
                    }}
                    required
                  />
                </div>
              )}

              {/* Waist (Universal) */}
              <div className="field-unit">
                <label htmlFor="input-waist" className="field-label">
                  <span>{categoryFocus === "bottoms" ? "Waist (Where You Wear Pants)" : "Natural Waist (At Navel)"}</span>
                </label>
                <input
                  id="input-waist"
                  type="number"
                  step="0.1"
                  className="input-stealth"
                  placeholder={units === "cm" ? "e.g. 82.0" : "e.g. 32.0"}
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  required
                />
              </div>

              {/* Hips (Pants & Dresses) */}
              {(categoryFocus === "bottoms" || categoryFocus === "dresses" || gender === "women") && (
                <div className="field-unit">
                  <label htmlFor="input-hip" className="field-label">
                    <span>Hips (Widest Point of Seat)</span>
                    <span className="field-optional">{categoryFocus === "bottoms" ? "Recommended" : "Optional"}</span>
                  </label>
                  <input
                    id="input-hip"
                    type="number"
                    step="0.1"
                    className="input-stealth"
                    placeholder={units === "cm" ? "e.g. 98.0" : "e.g. 38.5"}
                    value={hip}
                    onChange={(e) => setHip(e.target.value)}
                  />
                </div>
              )}

              {/* Total Height */}
              <div className="field-unit">
                <label htmlFor="input-height" className="field-label">
                  <span>Total Height</span>
                </label>
                <input
                  id="input-height"
                  type="number"
                  step="0.1"
                  className="input-stealth"
                  placeholder={units === "cm" ? "e.g. 176" : "e.g. 69"}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                />
              </div>

              {/* Tops: Shoulder */}
              {categoryFocus === "tops" && (
                <div className="field-unit">
                  <label htmlFor="input-shoulder" className="field-label">
                    <span>Shoulder Point-to-Point</span>
                    <span className="field-optional">Optional</span>
                  </label>
                  <input
                    id="input-shoulder"
                    type="number"
                    step="0.1"
                    className="input-stealth"
                    placeholder={units === "cm" ? "e.g. 45.0" : "e.g. 17.5"}
                    value={shoulder}
                    onChange={(e) => setShoulder(e.target.value)}
                  />
                </div>
              )}

              {/* Bottoms: Inseam / Pant Length */}
              {categoryFocus === "bottoms" && (
                <div className="field-unit">
                  <label htmlFor="input-inseam" className="field-label">
                    <span>Inseam Length (Crotch to Ankle)</span>
                    <span className="field-optional">Optional</span>
                  </label>
                  <input
                    id="input-inseam"
                    type="number"
                    step="0.1"
                    className="input-stealth"
                    placeholder={units === "cm" ? "e.g. 81.0" : "e.g. 32.0"}
                    value={inseam}
                    onChange={(e) => setInseam(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Fit Preference Selector */}
            <div className="field-unit" style={{ marginBottom: "1.5rem" }}>
              <label className="field-label">
                <span>Drape & Silhouette Preference</span>
              </label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${fit === "slim" ? "active" : ""}`}
                  onClick={() => setFit("slim")}
                >
                  Slim (Close Tailored)
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${fit === "regular" ? "active" : ""}`}
                  onClick={() => setFit("regular")}
                >
                  Regular (Standard Drape)
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${fit === "relaxed" ? "active" : ""}`}
                  onClick={() => setFit("relaxed")}
                >
                  Relaxed (Fluid / Roomy)
                </button>
              </div>
            </div>

            {/* Action Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button type="submit" className="btn-primary">
                Save Profile & Open Finder →
              </button>
              {onCancel && (
                <button type="button" className="btn-secondary" onClick={onCancel}>
                  Cancel / Back
                </button>
              )}
              {existing && (
                <button type="button" className="btn-danger-ghost" onClick={onClear}>
                  Reset Entered Measurements Only
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* GDPR / DPDPA Complete Data Deletion Request (Right to Erasure) */}
      {onDeleteAccount && (
        <div style={{
          marginTop: "2.5rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          <div className="headline-mono" style={{ color: "var(--danger)", fontSize: "0.72rem" }}>
            Data Subject Rights · Right to Erasure (DPDPA 2023)
          </div>
          <p className="body-muted" style={{ fontSize: "0.78rem" }}>
            Permanently delete your account and erase all your body measurements from our database.
          </p>
          <div>
            <button
              type="button"
              className="btn-danger-ghost"
              style={{ color: "var(--danger)", border: "1px solid rgba(255,90,90,0.3)", padding: "0.4rem 0.8rem", borderRadius: "var(--radius-xs)" }}
              onClick={() => {
                if (window.confirm("Are you sure you want to permanently delete your account and erase all your body measurements? This cannot be undone.")) {
                  onDeleteAccount();
                }
              }}
            >
              Permanently Erase All My Data & Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
