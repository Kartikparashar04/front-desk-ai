import { analyzeGarmentUrl } from "./urlAnalyzer.js";
import { parseRawSizeChartText } from "./sizeChartParser.js";

const SIZE_ALIASES = {
  XS: ["XS", "34", "36"],
  S: ["S", "38", "SMALL"],
  M: ["M", "40", "MEDIUM"],
  L: ["L", "42", "LARGE"],
  XL: ["XL", "44", "X-LARGE"],
  XXL: ["XXL", "2XL", "46"],
  "3XL": ["3XL", "XXXL", "48"]
};

function findMatchingSizeRow(sizeChart, wornSize) {
  if (!Array.isArray(sizeChart) || sizeChart.length === 0) return null;

  const target = (wornSize || "M").trim().toUpperCase();
  const candidates = SIZE_ALIASES[target] || [target];

  // 1. Exact token match inside labels like "XL", "XL (44)", "44 (XL)", "44"
  const tokenize = (label) =>
    String(label || "")
      .toUpperCase()
      .split(/[\s()/,_-]+/)
      .filter(Boolean);

  for (const cand of candidates) {
    const exact = sizeChart.find((row) => tokenize(row.size).includes(cand));
    if (exact) return exact;
  }

  // 2. Fallback: substring match if formatting is unusual
  const partial = sizeChart.find((row) =>
    candidates.some((cand) => String(row.size || "").toUpperCase().includes(cand))
  );
  if (partial) return partial;

  // Never silently return Size M when user chose XL/XXL — map relative rank safely
  const ordered = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const rank = ordered.indexOf(target);
  if (rank >= 0) {
    const ratio = rank / (ordered.length - 1);
    const idx = Math.min(sizeChart.length - 1, Math.round(ratio * (sizeChart.length - 1)));
    return sizeChart[idx];
  }

  return sizeChart[0];
}

/**
 * Reverse Sizing Calibration Engine
 *
 * Takes an existing garment link/URL that fits the user nicely + the size they wore (e.g. "XL")
 * and reverse-engineers their body chest, waist, shoulder, and height consistently with sizing.js.
 */
export async function calibrateProfileFromPastGarment({
  url,
  wornSize,
  preferredFit = "regular",
  units = "cm",
  customChartText = ""
}) {
  const dummyProfile = { units: "cm", chest: 100, waist: 86, height: 175, fit: preferredFit };
  const garment = await analyzeGarmentUrl(url, dummyProfile);

  // Allow optional user-pasted Size Chart override (essential for HTTP 403 stores like Ajio/Zara)
  if (customChartText && customChartText.trim()) {
    const parsedCustom = parseRawSizeChartText(customChartText);
    if (parsedCustom.sizeChart.length > 0) {
      garment.sizeChart = parsedCustom.sizeChart;
      garment.sourceNotice = "Calibrated from your pasted size chart ✓";
    }
  }

  const normalizedSize = (wornSize || "M").trim().toUpperCase();
  const sizeRow = findMatchingSizeRow(garment.sizeChart, normalizedSize);

  const hasChest = Number.isFinite(sizeRow?.chest) && sizeRow.chest > 0;
  const hasBust = Number.isFinite(sizeRow?.bust) && sizeRow.bust > 0;
  const hasWaist = Number.isFinite(sizeRow?.waist) && sizeRow.waist > 0;

  if (!sizeRow || (!hasChest && !hasBust && !hasWaist)) {
    throw new Error(`Size ${wornSize} measurements were not available for ${garment.brandName}.`);
  }

  // Match the exact ease targets used by sizing.js so reverse-calibration -> forward-recommendation round-trips accurately
  const fitEaseMap = {
    slim: 4,
    regular: 7,
    relaxed: 12
  };
  let targetEase = fitEaseMap[preferredFit] ?? 7;

  // Account for inherently oversized boxy patterns when worn in regular/slim preference
  const cut = `${garment.fitCut || ""} ${garment.productName || ""}`.toLowerCase();
  const isOversizedGarment =
    cut.includes("oversize") || cut.includes("boxy") || cut.includes("drop shoulder");
  if (isOversizedGarment && preferredFit !== "relaxed") {
    targetEase += 4;
  }

  // Reverse calculate body measurements (all in cm internally)
  let estimatedBodyChestCm = 96;
  let estimatedBodyWaistCm = 82;
  let estimatedHipCm = 98;

  if (hasChest || hasBust) {
    const rowMetric = sizeRow.chest || sizeRow.bust;
    estimatedBodyChestCm = Math.max(74, Math.round(rowMetric - targetEase));
    const hasValidRowWaist = Number.isFinite(sizeRow.waist) && sizeRow.waist > 50;
    estimatedBodyWaistCm = hasValidRowWaist
      ? Math.max(60, Math.round(sizeRow.waist - (targetEase - 1)))
      : Math.max(60, Math.round(estimatedBodyChestCm * 0.86));
    estimatedHipCm = Number.isFinite(sizeRow.hip) && sizeRow.hip > 60
      ? Math.max(75, Math.round(sizeRow.hip - 4))
      : Math.round(estimatedBodyWaistCm + 16);
  } else if (hasWaist) {
    // Bottoms (Pants / Jeans) calibration
    let rowWaistCm = sizeRow.waist;
    if (rowWaistCm < 50 && rowWaistCm > 24) rowWaistCm = rowWaistCm * 2.54; // converted from inches
    estimatedBodyWaistCm = Math.max(60, Math.round(rowWaistCm - 2));
    estimatedBodyChestCm = Math.round(estimatedBodyWaistCm + 14);
    estimatedHipCm = Number.isFinite(sizeRow.hip)
      ? Math.round(sizeRow.hip - 4)
      : Math.round(estimatedBodyWaistCm + 16);
  }

  const hasValidRowShoulder = Number.isFinite(sizeRow.shoulder) && sizeRow.shoulder > 30;
  const estimatedShoulderCm =
    hasValidRowShoulder && !isOversizedGarment
      ? Math.max(38, Math.round(sizeRow.shoulder - 1.5))
      : Math.max(38, Math.round(estimatedBodyChestCm * 0.43));

  const hasValidRowLength = Number.isFinite(sizeRow.length) && sizeRow.length > 50;
  const rawHeight = hasValidRowLength ? Math.round((sizeRow.length / 41.5) * 100) : 175;
  const estimatedHeightCm = Math.min(198, Math.max(152, rawHeight));

  const convert = (cmVal) => {
    if (units === "in") {
      return parseFloat((cmVal / 2.54).toFixed(1));
    }
    return cmVal;
  };

  return {
    profile: {
      units,
      fit: preferredFit,
      chest: convert(estimatedBodyChestCm),
      bust: convert(estimatedBodyChestCm),
      waist: convert(estimatedBodyWaistCm),
      hip: convert(estimatedHipCm),
      height: convert(estimatedHeightCm),
      shoulder: convert(estimatedShoulderCm),
      calibratedFrom: {
        brandName: garment.brandName,
        productName: garment.productName,
        wornSize: sizeRow.size,
        platform: garment.platform,
        liveStatus: garment.liveStatus,
        url
      },
      updatedAt: new Date().toISOString()
    },
    garmentDetails: {
      brandName: garment.brandName,
      productName: garment.productName,
      platform: garment.platform,
      patternChest: sizeRow.chest || sizeRow.bust || sizeRow.waist,
      wornSize: sizeRow.size,
      estimatedBodyChestCm,
      sourceNotice: garment.sourceNotice
    }
  };
}
