/**
 * Front Desk AI — Deterministic Multi-Category Sizing Engine
 * 
 * Accurately calculates sizing across:
 *   1. Tops (Shirts, T-Shirts, Polos, Sweaters, Jackets)
 *   2. Bottoms (Jeans, Trousers, Chinos, Cargos, Pants)
 *   3. Women's Wear & Dresses (Bodycon, A-Line, Wrap, Slip, Kurtas & Ethnic Wear)
 *
 * Accounts for positive ease, anatomical stretch tolerances, sitting ease,
 * and user silhouette preference ('slim', 'regular', 'relaxed').
 * Fully deterministic, unit-aware, zero external dependencies.
 */

export function detectGarmentCategory(productOrChart, explicitCategory) {
  if (explicitCategory) return explicitCategory.toLowerCase();
  
  if (typeof productOrChart === "object" && productOrChart !== null) {
    const cat = (productOrChart.category || productOrChart.name || "").toLowerCase();
    if (cat.includes("pant") || cat.includes("jean") || cat.includes("trouser") || cat.includes("chino") || cat.includes("cargo") || cat.includes("bottom")) {
      return "bottom";
    }
    if (cat.includes("dress") || cat.includes("kurta") || cat.includes("kurti") || cat.includes("gown") || cat.includes("skirt") || cat.includes("anarkali")) {
      return "dress";
    }
    if (Array.isArray(productOrChart.sizeChart) || Array.isArray(productOrChart)) {
      const chart = Array.isArray(productOrChart.sizeChart) ? productOrChart.sizeChart : productOrChart;
      const firstRow = chart[0] || {};
      if (firstRow.hip !== undefined && firstRow.chest === undefined && firstRow.bust === undefined) {
        return "bottom";
      }
      if (firstRow.bust !== undefined || (firstRow.waist !== undefined && firstRow.hip !== undefined && firstRow.length > 90)) {
        return "dress";
      }
      // Check if sizes are numeric waist inches like 28, 30, 32, 34, 36
      if (typeof firstRow.size === "number" || /^(2[8-9]|3[0-9]|4[0-4])$/.test(String(firstRow.size).trim())) {
        return "bottom";
      }
    }
  }
  return "top";
}

export function recommendSize(profile, sizeChart, fitPreference = "regular", garmentMeta = null) {
  if (!profile || !sizeChart || !sizeChart.length) {
    return {
      size: null,
      confidence: "low",
      fitEstimate: "unknown",
      explanation: "No profile or size chart data available.",
      breakdown: []
    };
  }

  // Unit conversion helper to Centimetres
  const toCm = (val) => {
    if (val === undefined || val === null || val === "" || isNaN(val)) return null;
    return profile.units === "in" ? Number(val) * 2.54 : Number(val);
  };

  const bodyChest = toCm(profile.chest || profile.bust);
  const bodyBust = toCm(profile.bust || profile.chest);
  const bodyWaist = toCm(profile.waist);
  const bodyHip = toCm(profile.hip);
  const bodyShoulder = toCm(profile.shoulder);
  const bodyHeight = toCm(profile.height);
  const bodyInseam = toCm(profile.inseam);
  const bodyThigh = toCm(profile.thigh);

  const category = detectGarmentCategory(garmentMeta || sizeChart);

  // -------------------------------------------------------------
  // 1. BOTTOMS (Jeans, Pants, Trousers, Chinos)
  // -------------------------------------------------------------
  if (category === "bottom") {
    // Effective waist & hip
    const effectiveWaist = bodyWaist || (bodyChest ? bodyChest - 14 : 80);
    const effectiveHip = bodyHip || (effectiveWaist ? effectiveWaist + 16 : 96);

    const bottomEaseMap = {
      slim: { min: -0.5, ideal: 1.5, max: 3.0 },
      regular: { min: 1.5, ideal: 3.5, max: 5.5 },
      relaxed: { min: 3.5, ideal: 6.0, max: 9.0 }
    };
    const targetEase = bottomEaseMap[fitPreference] || bottomEaseMap.regular;

    const scoredSizes = sizeChart.map((row) => {
      // Row waist could be numeric inches or cm
      let rowWaistCm = Number(row.waist);
      if (rowWaistCm < 50 && rowWaistCm > 24) {
        // Waist given in inches (e.g. 28, 30, 32, 34)
        rowWaistCm = rowWaistCm * 2.54;
      }
      if (!rowWaistCm && /^(2[8-9]|3[0-9]|4[0-4])$/.test(String(row.size).trim())) {
        rowWaistCm = Number(row.size) * 2.54;
      }

      let rowHipCm = Number(row.hip);
      if (rowHipCm < 60 && rowHipCm > 30) {
        rowHipCm = rowHipCm * 2.54;
      }

      const waistEase = rowWaistCm ? rowWaistCm - effectiveWaist : targetEase.ideal;
      const hipEase = rowHipCm ? rowHipCm - effectiveHip : 5.0;

      // Penalties
      let waistPenalty = 0;
      if (waistEase < targetEase.min) {
        // Too tight on waist is uncomfortable / button won't close
        waistPenalty = Math.pow(Math.abs(targetEase.ideal - waistEase), 1.9) * 2.5;
      } else {
        waistPenalty = Math.pow(Math.abs(targetEase.ideal - waistEase), 1.25);
      }

      let hipPenalty = 0;
      if (rowHipCm) {
        if (hipEase < 2.0) {
          hipPenalty = Math.pow(Math.abs(4.0 - hipEase), 1.8) * 2.0;
        } else {
          hipPenalty = Math.pow(Math.abs(5.0 - hipEase), 1.1);
        }
      }

      const totalScore = (waistPenalty * 0.7) + (hipPenalty * 0.3);

      return {
        size: row.size,
        score: totalScore,
        waistEase,
        hipEase,
        rowWaistCm,
        rowHipCm,
        row
      };
    });

    scoredSizes.sort((a, b) => a.score - b.score);
    const best = scoredSizes[0];

    const unitLabel = profile.units === "in" ? "in" : "cm";
    const displayVal = (cmVal) => profile.units === "in" ? (cmVal / 2.54).toFixed(1) : Math.round(cmVal);

    let fitEstimate = "true to size";
    if (best.waistEase < 1.0) fitEstimate = "snug waistband";
    else if (best.waistEase > 5.0) fitEstimate = "relaxed / belt recommended";

    const explanation = `Waist (${displayVal(effectiveWaist)} ${unitLabel}) matches waistband with ${displayVal(best.waistEase)} ${unitLabel} ease. Calibrated for ${fitPreference} bottomwear drape.`;

    return {
      size: best.size,
      confidence: bodyWaist ? "high" : "medium",
      fitEstimate,
      explanation,
      easeCm: Math.round(best.waistEase),
      allScores: scoredSizes
    };
  }

  // -------------------------------------------------------------
  // 2. WOMEN'S DRESSES & ETHNIC WEAR
  // -------------------------------------------------------------
  if (category === "dress") {
    const effectiveBust = bodyBust || (bodyWaist ? bodyWaist + 16 : 88);
    const effectiveWaist = bodyWaist || (effectiveBust ? effectiveBust - 16 : 72);
    const effectiveHip = bodyHip || (effectiveWaist ? effectiveWaist + 24 : 96);

    const fitCut = (garmentMeta?.fitCut || "").toLowerCase();
    const isBodycon = fitCut.includes("bodycon") || fitCut.includes("bandage");
    const isKurta = fitCut.includes("kurta") || fitCut.includes("anarkali") || fitCut.includes("ethnic");
    const isAline = fitCut.includes("a-line") || fitCut.includes("wrap") || fitCut.includes("flare");

    let targetBustEase = 4.0;
    let targetWaistEase = 4.0;

    if (isBodycon) {
      targetBustEase = 0.5;
      targetWaistEase = 0.5;
    } else if (isKurta) {
      targetBustEase = 7.0; // Room for sitting ease in traditional Indian cuts
      targetWaistEase = 8.0;
    } else if (isAline) {
      targetBustEase = 3.5;
      targetWaistEase = 3.5;
    }

    if (fitPreference === "slim") {
      targetBustEase -= 2.0;
      targetWaistEase -= 2.0;
    } else if (fitPreference === "relaxed") {
      targetBustEase += 3.0;
      targetWaistEase += 4.0;
    }

    const scoredSizes = sizeChart.map((row) => {
      const rowBust = Number(row.bust || row.chest);
      const rowWaist = Number(row.waist);
      const rowHip = Number(row.hip);

      const bustEase = rowBust ? rowBust - effectiveBust : targetBustEase;
      const waistEase = rowWaist ? rowWaist - effectiveWaist : targetWaistEase;
      const hipEase = rowHip ? rowHip - effectiveHip : 6.0;

      let bustPenalty = Math.pow(Math.abs(targetBustEase - bustEase), bustEase < targetBustEase ? 1.8 : 1.2);
      let waistPenalty = rowWaist ? Math.pow(Math.abs(targetWaistEase - waistEase), waistEase < targetWaistEase ? 1.7 : 1.1) : 0;
      let hipPenalty = (!isAline && rowHip) ? Math.pow(Math.abs(6.0 - hipEase), hipEase < 2.0 ? 2.0 : 1.1) : 0;

      const totalScore = (bustPenalty * 0.5) + (waistPenalty * 0.3) + (hipPenalty * 0.2);

      return {
        size: row.size,
        score: totalScore,
        bustEase,
        waistEase,
        hipEase,
        row
      };
    });

    scoredSizes.sort((a, b) => a.score - b.score);
    const best = scoredSizes[0];

    const unitLabel = profile.units === "in" ? "in" : "cm";
    const displayVal = (cmVal) => profile.units === "in" ? (cmVal / 2.54).toFixed(1) : Math.round(cmVal);

    let fitEstimate = "tailored drape";
    if (best.bustEase < 1.0) fitEstimate = "fitted";
    else if (best.bustEase > 6.0) fitEstimate = "fluid silhouette";

    const explanation = `Bust (${displayVal(effectiveBust)} ${unitLabel}) matches garment with ${displayVal(best.bustEase)} ${unitLabel} breathing room; waist gives ${displayVal(best.waistEase)} ${unitLabel} ease. Optimized for ${isKurta ? "comfortable ethnic posture" : "clean silhouette"}.`;

    return {
      size: best.size,
      confidence: (bodyBust && bodyWaist) ? "high" : "medium",
      fitEstimate,
      explanation,
      easeCm: Math.round(best.bustEase),
      allScores: scoredSizes
    };
  }

  // -------------------------------------------------------------
  // 3. TOPS (Shirts, T-Shirts, Jackets) [Default]
  // -------------------------------------------------------------
  const effectiveChest = bodyChest || (bodyWaist ? bodyWaist + 12 : 94);
  const effectiveWaist = bodyWaist || (bodyChest ? bodyChest - 12 : 82);

  const targetEaseMap = {
    slim: { min: 2, ideal: 4, max: 6 },
    regular: { min: 4, ideal: 7, max: 10 },
    relaxed: { min: 8, ideal: 12, max: 16 }
  };
  const targetEase = targetEaseMap[fitPreference] || targetEaseMap.regular;

  const scoredSizes = sizeChart.map((row) => {
    const hasChest = Number.isFinite(row.chest) && row.chest > 0;
    const hasWaist = Number.isFinite(row.waist) && row.waist > 0;

    const chestEase = hasChest ? row.chest - effectiveChest : targetEase.ideal;
    const waistEase = hasWaist ? row.waist - effectiveWaist : null;

    let chestPenalty = 0;
    if (chestEase < targetEase.min) {
      chestPenalty = Math.pow(Math.abs(targetEase.ideal - chestEase), 1.8) * 2.2;
    } else {
      chestPenalty = Math.pow(Math.abs(targetEase.ideal - chestEase), 1.3);
    }

    let waistPenalty = 0;
    if (hasWaist) {
      if (waistEase < targetEase.min - 1) {
        waistPenalty = Math.pow(Math.abs(targetEase.ideal - waistEase), 1.6) * 1.8;
      } else {
        waistPenalty = Math.pow(Math.abs(targetEase.ideal - waistEase), 1.1);
      }
    }

    let shoulderPenalty = 0;
    if (bodyShoulder && Number.isFinite(row.shoulder) && row.shoulder > 0) {
      const shoulderDiff = row.shoulder - bodyShoulder;
      shoulderPenalty = Math.abs(shoulderDiff - 1.5) * 1.2;
    }

    const chestWeight = hasWaist ? 0.6 : 0.85;
    const waistWeight = hasWaist ? 0.3 : 0;
    const shoulderWeight = hasWaist ? 0.1 : 0.15;
    const totalScore =
      (chestPenalty * chestWeight) +
      (waistPenalty * waistWeight) +
      (shoulderPenalty * shoulderWeight);

    return {
      size: row.size,
      score: totalScore,
      chestEase,
      waistEase: waistEase ?? chestEase,
      row
    };
  });

  scoredSizes.sort((a, b) => a.score - b.score);
  const best = scoredSizes[0];

  let fitEstimate = "true to preference";
  if (best.chestEase < targetEase.ideal - 2.5) {
    fitEstimate = "snug";
  } else if (best.chestEase > targetEase.ideal + 3.0) {
    fitEstimate = "loose";
  } else {
    fitEstimate = "true to preference";
  }

  const unitLabel = profile.units === "in" ? "in" : "cm";
  const displayVal = (cmVal) => profile.units === "in" ? (cmVal / 2.54).toFixed(1) : Math.round(cmVal);

  const parts = [];
  if (bodyChest) {
    parts.push(`Chest (${displayVal(bodyChest)} ${unitLabel}) matches garment chest ${displayVal(best.row.chest)} ${unitLabel} with ${displayVal(best.chestEase)} ${unitLabel} ease`);
  }
  if (bodyWaist && best.row.waist) {
    parts.push(`Waist (${displayVal(bodyWaist)} ${unitLabel}) provides ${displayVal(best.waistEase)} ${unitLabel} breathing room`);
  }
  if (bodyShoulder && best.row.shoulder) {
    const diff = best.row.shoulder - bodyShoulder;
    parts.push(`Shoulder spans ${displayVal(best.row.shoulder)} ${unitLabel} (${diff >= 0 ? '+' : ''}${displayVal(diff)} ${unitLabel})`);
  }

  const preferenceText = fitPreference === "slim" ? "tailored closer fit" : fitPreference === "relaxed" ? "roomier relaxed drape" : "classic balanced silhouette";
  const explanation = `${parts.join(". ")}. Calibrated for your ${preferenceText}.`;

  return {
    size: best.size,
    confidence: bodyChest ? "high" : "medium",
    fitEstimate,
    explanation,
    easeCm: Math.round(best.chestEase),
    allScores: scoredSizes
  };
}
