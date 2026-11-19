/**
 * Shared header-aware Size Chart Parser for pasted text, copied store tables, and HTML tables.
 * Converts measurements cleanly into centimetres (cm).
 */

const SIZE_TOKEN_RE = /^(XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|28|30|32|34|36|38|40|42|44|46|48)$/i;

const NUMERIC_TO_ALPHA_SHIRT = {
  "36": "XS",
  "38": "S",
  "40": "M",
  "42": "L",
  "44": "XL",
  "46": "XXL",
  "48": "3XL"
};

function normalizeSizeLabel(tokens) {
  // Given leading size tokens on a row like ["38", "S"] or ["S", "S"] or ["M"], pick clean label
  const unique = [];
  for (const t of tokens) {
    const up = t.toUpperCase().replace(/^2XL$/, "XXL");
    if (!unique.includes(up)) unique.push(up);
  }
  const alpha = unique.find((t) => /^[A-Z0-9]*[A-Z]+[A-Z0-9]*$/.test(t) && !/^\d+$/.test(t));
  const num = unique.find((t) => /^\d+$/.test(t));
  if (alpha && num) return `${alpha} (${num})`;
  if (alpha) return alpha;
  if (num && NUMERIC_TO_ALPHA_SHIRT[num]) return `${NUMERIC_TO_ALPHA_SHIRT[num]} (${num})`;
  return unique[0] || "";
}

function detectColumnOrder(lines) {
  const cols = [];
  const headerKeywords = [
    { key: "chest", re: /\b(chest|bust|garment\s*chest)\b/i },
    { key: "waist", re: /\bwaist\b/i },
    { key: "shoulder", re: /\b(across\s*shoulder|shoulder)\b/i },
    { key: "length", re: /\b(front\s*length|body\s*length|length)\b/i },
    { key: "sleeve", re: /\b(sleeve[\s-]*length|sleeve)\b/i }
  ];

  // Scan top header lines (sometimes browsers copy each column header onto its own line or tab-separated)
  const combinedHeaderLines = [];
  for (const line of lines.slice(0, 12)) {
    const lower = line.toLowerCase();
    if (/(chest|bust|waist|shoulder|length|sleeve|size\s*chart|brand\s*size|garment\s*measurement)/i.test(lower)) {
      combinedHeaderLines.push(line);
    }
  }

  const headerText = combinedHeaderLines.join(" | ");
  const matches = [];
  for (const { key, re } of headerKeywords) {
    const m = re.exec(headerText);
    if (m) {
      matches.push({ key, index: m.index });
    }
  }
  matches.sort((a, b) => a.index - b.index);
  for (const m of matches) {
    if (!cols.includes(m.key)) cols.push(m.key);
  }

  let explicitUnit = null;
  if (/\((in|inch|inches)\)|\binches\b|\bin\b(?=\s|$|\))/i.test(headerText)) {
    explicitUnit = "in";
  } else if (/\((cm|cms)\)|\bcm\b/i.test(headerText)) {
    explicitUnit = "cm";
  }

  return { cols, explicitUnit };
}

function splitRowTokens(line) {
  // Prefer tab split if tabs exist, otherwise whitespace / colon / comma separation
  const rawTokens = line.includes("\t")
    ? line.split(/\t+/).map((s) => s.trim()).filter(Boolean)
    : line.replace(/[:|,]/g, " ").split(/\s+/).filter(Boolean);

  const sizeTokens = [];
  const numericValues = [];

  for (const tok of rawTokens) {
    const cleaned = tok.replace(/(in|cm)$/i, "").trim();
    if (numericValues.length === 0 && SIZE_TOKEN_RE.test(cleaned)) {
      sizeTokens.push(cleaned);
    } else if (/^\d+(\.\d+)?$/.test(cleaned)) {
      numericValues.push(parseFloat(cleaned));
    } else if (numericValues.length === 0 && /^(YOUR|RECOMMENDED|SIZE|◀|◄)$/i.test(tok)) {
      // Ignore UI markers like "◀ YOUR RECOMMENDED SIZE"
      continue;
    }
  }

  return { sizeTokens, numericValues };
}

function toCmValue(val, isInches) {
  if (!Number.isFinite(val) || val <= 0) return null;
  return parseFloat((isInches ? val * 2.54 : val).toFixed(1));
}

/**
 * Parses a structured matrix of rows (e.g. from HTML <table> extraction) or raw copied text.
 * Returns { sizeChart: Array, extractedPrice: string|null, unitDetected: "in"|"cm" }
 */
export function parseRawSizeChartText(raw) {
  if (!raw || typeof raw !== "string") {
    return { sizeChart: [], extractedPrice: null, unitDetected: null };
  }

  // Extract optional price snippet if user pasted whole product block (e.g. "₹ 582 ₹ 1399")
  let extractedPrice = null;
  const priceMatches = [...raw.matchAll(/(?:₹|Rs\.?)\s*([\d,]+)/gi)].map((m) =>
    m[1].replace(/,/g, "")
  );
  if (priceMatches.length >= 2) {
    const p1 = Number(priceMatches[0]);
    const p2 = Number(priceMatches[1]);
    if (p2 > p1) {
      extractedPrice = `₹${p1.toLocaleString("en-IN")} (MRP ₹${p2.toLocaleString("en-IN")})`;
    } else {
      extractedPrice = `₹${p1.toLocaleString("en-IN")}`;
    }
  } else if (priceMatches.length === 1) {
    extractedPrice = `₹${Number(priceMatches[0]).toLocaleString("en-IN")}`;
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const { cols, explicitUnit } = detectColumnOrder(lines);

  const rawRows = [];
  for (const line of lines) {
    // Skip obvious non-data header/banner lines
    if (/(chest|shoulder|length|brand\s*size|how\s*to\s*measure|size\s*guide|garment\s*measurement)/i.test(line)) {
      continue;
    }
    const { sizeTokens, numericValues } = splitRowTokens(line);
    if (sizeTokens.length > 0 && numericValues.length > 0) {
      const sizeLabel = normalizeSizeLabel(sizeTokens);
      if (sizeLabel) {
        rawRows.push({ size: sizeLabel, values: numericValues });
      }
    }
  }

  // Fallback for CSS-grid / vertically copied browser tables where each cell is on its own line
  if (rawRows.length === 0) {
    let currentSizeTokens = [];
    let currentNums = [];
    const flushRow = () => {
      if (currentSizeTokens.length > 0 && currentNums.length > 0) {
        const label = normalizeSizeLabel(currentSizeTokens);
        if (label) rawRows.push({ size: label, values: currentNums });
      }
      currentSizeTokens = [];
      currentNums = [];
    };

    for (const line of lines) {
      if (/(chest|bust|waist|shoulder|length|sleeve|brand\s*size|how\s*to\s*measure|size\s*guide|garment\s*measurement|^size$|^in$|^cm$)/i.test(line)) {
        continue;
      }
      const cleaned = line.replace(/(in|cm)$/i, "").trim();
      if (SIZE_TOKEN_RE.test(cleaned)) {
        // If we already collected numbers for the previous size row, start a new row
        if (currentNums.length > 0) {
          flushRow();
        }
        currentSizeTokens.push(cleaned);
      } else if (/^\d+(\.\d+)?$/.test(cleaned) && currentSizeTokens.length > 0) {
        currentNums.push(parseFloat(cleaned));
      }
    }
    flushRow();
  }

  if (rawRows.length === 0) {
    return { sizeChart: [], extractedPrice, unitDetected: explicitUnit };
  }

  // Map column positions cleanly
  const sampleVals = rawRows[0].values;
  let effectiveCols = cols;
  if (effectiveCols.length === 0) {
    if (sampleVals.length === 1) {
      effectiveCols = ["chest"];
    } else if (sampleVals.length === 2) {
      // Heuristic: if col 0 < 28 and col 1 >= 34, Ajio format [shoulder, chest]
      effectiveCols = sampleVals[0] < 28 && sampleVals[1] >= 34
        ? ["shoulder", "chest"]
        : ["chest", "shoulder"];
    } else if (sampleVals.length === 3) {
      effectiveCols = ["chest", "shoulder", "length"];
    } else {
      effectiveCols = ["chest", "length", "shoulder", "sleeve"];
    }
  }

  // Determine inches vs cm from explicit header or chest magnitude (inches: 30..58, cm: 75..150)
  let isInches = explicitUnit === "in";
  if (!explicitUnit) {
    const chestIdx = effectiveCols.indexOf("chest");
    const refVal = chestIdx >= 0 ? sampleVals[chestIdx] : Math.max(...sampleVals);
    isInches = refVal < 62;
  }

  const sizeChart = rawRows.map(({ size, values }) => {
    const mapped = {
      size,
      chest: null,
      waist: null,
      shoulder: null,
      length: null
    };

    effectiveCols.forEach((colKey, idx) => {
      if (idx < values.length && Object.prototype.hasOwnProperty.call(mapped, colKey)) {
        mapped[colKey] = toCmValue(values[idx], isInches);
      }
    });

    // If a table omitted chest explicitly (rare), fallback safely
    if (!mapped.chest && values.length > 0) {
      mapped.chest = toCmValue(values[0], isInches);
    }

    return mapped;
  });

  return {
    sizeChart,
    extractedPrice,
    unitDetected: isInches ? "in" : "cm"
  };
}

/**
 * Helper used by server scraper when normalizing HTML <table> rows + header cells.
 */
export function buildChartFromTableMatrix(headerCells, dataRows) {
  if (!dataRows || dataRows.length === 0) return [];
  const headerLine = (headerCells || []).join("\t");
  const rowLines = dataRows.map((cells) => cells.join("\t"));
  const combined = [headerLine, ...rowLines].filter(Boolean).join("\n");
  return parseRawSizeChartText(combined).sizeChart;
}
