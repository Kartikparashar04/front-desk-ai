import { GoogleGenAI } from "@google/genai";

/**
 * Global Admin AI Configuration (Google Cloud Gemini)
 * Backed by Google Cloud Project project-cf853977-5c9b-4d28-91d
 */
const DEFAULT_GEMINI_KEY = "AIzaSyBjumXobr1iudbYKnK4gbHJH6_NJIAwLYk";

export function getAdminApiKey() {
  try {
    return (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) || DEFAULT_GEMINI_KEY;
  } catch (e) {
    return DEFAULT_GEMINI_KEY;
  }
}

/**
 * AI Fit Analyst: Generates an expert editorial breakdown of how this exact
 * garment fabric, weight, and silhouette interacts with the user's specific measurements.
 * Multi-category support: Tops, Bottoms (Pants/Jeans), and Women's Dresses.
 */
export async function getAIFitAnalysis({ product, profile, deterministicRec }) {
  const apiKey = getAdminApiKey();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are Front Desk AI's senior technical apparel designer and textile engineer.
Write a concise (max 3 sentences), highly specific, restrained fit analysis.
Do NOT sound like PR or marketing. Sound like an expert bespoke master tailor in Bengaluru or Mumbai.

USER BODY PROFILE:
- Units: ${profile.units}
- Gender / Target: ${profile.gender || "Unisex"}
- Chest / Bust: ${profile.bust || profile.chest} ${profile.units}
- Waist: ${profile.waist} ${profile.units}
- Hips: ${profile.hip || "Not specified"} ${profile.units}
- Total Height: ${profile.height} ${profile.units}
- Silhouette Preference: ${profile.fit}

GARMENT DATA:
- Brand: ${product.brandName} (${product.origin})
- Piece: ${product.name}
- Category: ${product.category}
- Material: ${product.material}
- Cut: ${product.fitCut}
- Recommended Size: ${deterministicRec.size} (Ease: ${deterministicRec.easeCm || 0}cm)
- Fit Estimate: ${deterministicRec.fitEstimate}

Provide a direct assessment of how the fabric drape, stretch elasticity, and silhouette will sit on their frame in Indian weather, and whether washing shrinkage should be factored in.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      if (response?.text) return response.text;
    } catch (err) {
      // Fallback seamlessly to local intelligent tailor engine
    }
  }

  return generateLocalAiInsight(product, profile, deterministicRec);
}

/**
 * AI Fabric & Stretch Advisor: Detailed analysis of elastane, weave, and shrinkage
 */
export async function getAIFabricStretchAnalysis({ product, profile }) {
  const material = (product.material || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();

  let hasStretch = material.includes("elastane") || material.includes("spandex") || material.includes("stretch");
  let isLinen = material.includes("linen");
  let isCotton = material.includes("cotton");
  let isViscose = material.includes("viscose") || material.includes("rayon");

  if (cat.includes("pant") || cat.includes("jean") || cat.includes("trouser")) {
    if (hasStretch) {
      return {
        stretchFactor: "Medium Elastic Stretch (1-3% Elastane)",
        waistbandBehavior: "Waistband conforms after 30 minutes of wear. Does not bag out at knees.",
        washAdvice: "Wash in cold water inside-out. Avoid tumble dry to prevent elastane fiber snap.",
        climateScore: "Comfortable for 8-10 hours in air-conditioned or temperate Indian weather."
      };
    } else {
      return {
        stretchFactor: "Rigid Non-Stretch Structure",
        waistbandBehavior: "Fixed waistband. Rely strictly on exact waist circumference; zero give.",
        washAdvice: "Cold soak only. Expect 2-3% initial shrinkage on first warm rinse.",
        climateScore: "High durability authentic denim feel; best for cooler evenings."
      };
    }
  }

  if (cat.includes("dress") || cat.includes("kurta")) {
    if (isViscose) {
      return {
        stretchFactor: "Fluid Bias Drape (Zero mechanical stretch)",
        waistbandBehavior: "Falls vertically with gravity. Accentuates body contours without clinging.",
        washAdvice: "Dry clean or delicate hand wash. Rayon/viscose shrinks up to 4% in hot water.",
        climateScore: "Ultra breathable, lightweight cooling feel for Indian summers."
      };
    } else {
      return {
        stretchFactor: hasStretch ? "4-Way Contour Stretch" : "Breathable Natural Cotton Weave",
        waistbandBehavior: "Smooth silhouette with zero waist chafing. Designed for comfortable posture.",
        washAdvice: "Gentle machine wash with mild detergent; flat dry in shade.",
        climateScore: "Optimal for high humidity and all-day ethnic/festive wear."
      };
    }
  }

  // Tops default
  return {
    stretchFactor: hasStretch ? "Comfort Stretch" : "Natural Cotton Drape",
    waistbandBehavior: "Balanced collar and shoulder seam retention.",
    washAdvice: "Pre-shrunk cotton. Machine wash cold, air dry.",
    climateScore: "High breathability in subcontinental climates."
  };
}

/**
 * AI Assistant Chat: Answers specific questions about wearability, sizing up/down,
 * and styling for the garment.
 */
export async function askAIFitAssistant({ question, product, profile, deterministicRec, chatHistory = [] }) {
  const apiKey = getAdminApiKey();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemPrompt = `You are Front Desk AI's technical size advisor.
The user is inspecting: ${product.name} by ${product.brandName} (${product.fitCut}, ${product.material}).
Their calculated recommendation is size ${deterministicRec.size} (${deterministicRec.fitEstimate}) based on their metrics.
Answer the user's question directly, concisely (under 60 words), in natural Hinglish or English based on how they ask, without fluff.`;

      const contents = [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${question}` }] }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
      });

      if (response?.text) return response.text;
    } catch (err) {
      // Fallback cleanly
    }
  }

  return getLocalChatResponse(question, product, deterministicRec);
}

/**
 * AI Profile Estimator: Given natural language inputs in Hindi, Hinglish, or English,
 * extracts or estimates chest/bust, waist, hip, height, and gender.
 * e.g. "meri height 5'9 hai weight 70kg hai pant size 32 or shirt M pehanta hu"
 * e.g. "height 5'4, bust 34, waist 28, hip 38 for dresses"
 */
export async function estimateProfileFromDescription(naturalText, units = "cm") {
  const apiKey = getAdminApiKey();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Extract or estimate body measurements from this user description (which may be in English, Hindi, or Hinglish): "${naturalText}".
Return ONLY a valid JSON object without markdown or code formatting:
{"chest": number, "bust": number, "waist": number, "hip": number, "height": number, "shoulder": number, "gender": "men"|"women"|"unisex", "units": "${units}"}
All numbers in ${units === "in" ? "inches" : "centimetres"}.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const cleaned = response.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.chest || parsed.bust || parsed.waist) {
        return parsed;
      }
    } catch (err) {
      // Fall through to heuristic
    }
  }

  return parseMetricsHeuristic(naturalText, units);
}

// Built-in intelligent expert tailoring fallback engine
function generateLocalAiInsight(product, profile, rec) {
  const cut = (product.fitCut || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();
  const ease = rec.easeCm || 4;

  if (cat.includes("pant") || cat.includes("jean") || cat.includes("trouser")) {
    return `Size ${rec.size} provides an engineered waistband fall matching your waist. The ${product.material} provides comfortable movement through the thighs and seat without knee pouching. Designed to retain taper across full-day wear.`;
  }

  if (cat.includes("dress") || cat.includes("kurta")) {
    return `Calibrated for size ${rec.size}. The ${product.material} drapes smoothly over your torso with ${ease}cm ease at the bust. The waist and hip proportions accommodate effortless posture and fluid movement in subcontinental climates.`;
  }

  if (cut.includes("boxy") || cut.includes("drop")) {
    return `Because this ${product.name} features an intentional drop-shoulder cut, size ${rec.size} gives you ${ease}cm of chest ease without collar strain. The ${product.material} maintains a structured drape that won't cling in humid conditions.`;
  } else if (cut.includes("slim") || cut.includes("tailored")) {
    return `With ${product.brandName}'s tailored block, size ${rec.size} cleanly outlines your torso with minimal fabric bunching. Note that the ${product.material} has under 2% residual shrinkage on cold wash.`;
  } else {
    return `Calibrated for a classic silhouette. Size ${rec.size} accommodates your waist-to-chest ratio with ${ease}cm ease across the chest and clean drape. The ${product.material} balances breathability and silhouette retention.`;
  }
}

function getLocalChatResponse(question, product, rec) {
  const q = question.toLowerCase();
  if (q.includes("size up") || q.includes("larger") || q.includes("baggy") || q.includes("oversize") || q.includes("bada")) {
    return `Sizing up from ${rec.size} will add ~4-5 cm to the circumference and drop the silhouette. If you prefer a loose streetwear or relaxed look, it works well; otherwise stay with ${rec.size}.`;
  }
  if (q.includes("wash") || q.includes("shrink") || q.includes("care") || q.includes("dhona")) {
    return `The ${product.material} is pre-washed. Expect no more than 1.5% shrinkage on a cold cycle (30°C). Air dry to preserve structure.`;
  }
  if (q.includes("weather") || q.includes("summer") || q.includes("hot") || q.includes("cotton") || q.includes("garmi")) {
    return `The fabric weave is breathable and well-suited for Indian conditions. Adequate positive ease prevents sticking in humid weather.`;
  }
  return `Based on your metrics, size ${rec.size} provides the intended fit for ${product.name}. You have balanced ease across the vital measurement points.`;
}

// Multilingual Heuristic Parser (Hindi / Hinglish / English)
function parseMetricsHeuristic(text, units) {
  const isCm = units === "cm";
  const lower = (text || "").toLowerCase();

  // Detect gender
  let gender = "unisex";
  if (lower.includes("girl") || lower.includes("woman") || lower.includes("women") || lower.includes("ladki") || lower.includes("female") || lower.includes("dress") || lower.includes("kurti")) {
    gender = "women";
  } else if (lower.includes("boy") || lower.includes("man") || lower.includes("men") || lower.includes("ladka") || lower.includes("male")) {
    gender = "men";
  }

  // Parse height: e.g. 5'11, 5'8", 5 foot 8, 175cm, 180 cm
  let height = isCm ? 175 : 69;
  const feetMatch = lower.match(/(\d)\s*(?:'|ft|foot|feet)\s*(\d{1,2})?/);
  if (feetMatch) {
    const feet = parseInt(feetMatch[1], 10);
    const inches = parseInt(feetMatch[2] || "0", 10);
    const totalInches = feet * 12 + inches;
    height = isCm ? Math.round(totalInches * 2.54) : totalInches;
  } else {
    const cmMatch = lower.match(/(\d{3})\s*cm/);
    if (cmMatch) {
      height = isCm ? parseInt(cmMatch[1], 10) : Math.round(parseInt(cmMatch[1], 10) / 2.54);
    }
  }

  // Parse waist / pant size: e.g. "waist 32", "pant 30", "32 in jeans"
  let waist = isCm ? 84 : 33.0;
  const waistMatch = lower.match(/(?:waist|pant|jeans?|kamar)\s*(?:size)?\s*(?:is|me|pe)?\s*(\d{2})/);
  if (waistMatch) {
    const val = parseInt(waistMatch[1], 10);
    waist = isCm ? Math.round(val * 2.54) : val;
  }

  // Parse chest / bust: e.g. "chest 38", "bust 34", "38 chest"
  let chest = isCm ? 98 : 38.5;
  const chestMatch = lower.match(/(?:chest|bust|seena)\s*(?:size)?\s*(?:is|me)?\s*(\d{2,3})/);
  if (chestMatch) {
    const val = parseInt(chestMatch[1], 10);
    if (val > 50) {
      // cm
      chest = isCm ? val : Math.round(val / 2.54);
    } else {
      // in
      chest = isCm ? Math.round(val * 2.54) : val;
    }
  }

  let hip = isCm ? 98 : 38.5;
  const hipMatch = lower.match(/(?:hip|hips)\s*(?:size)?\s*(?:is|me)?\s*(\d{2,3})/);
  if (hipMatch) {
    const val = parseInt(hipMatch[1], 10);
    hip = isCm ? (val > 50 ? val : Math.round(val * 2.54)) : (val > 50 ? Math.round(val / 2.54) : val);
  }

  return {
    gender,
    chest,
    bust: chest,
    waist,
    hip,
    height,
    shoulder: isCm ? 45 : 17.5,
    units
  };
}
