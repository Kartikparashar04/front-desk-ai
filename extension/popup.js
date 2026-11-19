const PROD_ORIGIN = "https://frontdeskai.shop";
const DEV_ORIGIN = "http://localhost:5173";

async function resolveDestinationOrigin(choice) {
  if (choice === PROD_ORIGIN || choice === DEV_ORIGIN) return choice;
  try {
    const allTabs = await chrome.tabs.query({});
    if (allTabs.some((t) => (t.url || "").startsWith(PROD_ORIGIN))) return PROD_ORIGIN;
    if (allTabs.some((t) => (t.url || "").startsWith(DEV_ORIGIN))) return DEV_ORIGIN;
  } catch {}
  return DEV_ORIGIN;
}

async function extractProductFromDom() {
  const cleanText = (s) => (s || "").replace(/\s+/g, " ").trim();

  const findSizeTable = () => {
    for (const tbl of document.querySelectorAll("table")) {
      const rows = [...tbl.querySelectorAll("tr")]
        .map((tr) => [...tr.querySelectorAll("th,td")].map((c) => cleanText(c.innerText)))
        .filter((r) => r.length >= 2);
      if (rows.length >= 3 && rows.some((r) => r.some((cell) => /chest|bust|shoulder|waist|length/i.test(cell)))) {
        return rows;
      }
    }
    return [];
  };

  if (findSizeTable().length === 0) {
    const trigger = [...document.querySelectorAll("button, a, span, div")].find((el) => {
      const txt = cleanText(el.innerText);
      return /^(size\s*(chart|guide)|view size guide)/i.test(txt) && el.offsetParent !== null;
    });
    if (trigger) {
      trigger.click();
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  let ldProd = null;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent || "");
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed];
      const hit = list.find(
        (item) => item && (item["@type"] === "Product" || (Array.isArray(item["@type"]) && item["@type"].includes("Product")))
      );
      if (hit) {
        ldProd = hit;
        break;
      }
    } catch {}
  }

  const h1 = cleanText(document.querySelector("h1")?.innerText) || cleanText(ldProd?.name) || cleanText(document.title);
  const ldBrand = typeof ldProd?.brand === "string" ? ldProd.brand : ldProd?.brand?.name || "";

  let image =
    document.querySelector('meta[property="og:image"]')?.content ||
    (Array.isArray(ldProd?.image) ? ldProd.image[0] : ldProd?.image) ||
    "";
  if (!image) {
    const imgs = [...document.querySelectorAll("img")].filter((img) => img.naturalWidth >= 250 && img.naturalHeight >= 250);
    if (imgs[0]) image = imgs[0].src;
  }

  let price = "";
  const offer = Array.isArray(ldProd?.offers) ? ldProd.offers[0] : ldProd?.offers;
  if (offer?.price) {
    price = `₹${Number(offer.price).toLocaleString("en-IN")}`;
  } else {
    const bodyText = document.body.innerText || "";
    const m = bodyText.match(/(?:₹|Rs\.?)\s*[\d,]+(?:\.\d{1,2})?/i);
    if (m) price = m[0].replace(/\s+/g, "");
  }

  const tableMatrix = findSizeTable();

  let modalText = "";
  if (tableMatrix.length === 0) {
    const modal = [...document.querySelectorAll('[role="dialog"], [class*="size" i], [id*="size" i]')].find(
      (el) => /chest|shoulder|waist|length/i.test(el.innerText || "") && (el.innerText || "").length < 3000
    );
    if (modal) modalText = modal.innerText;
  }

  return {
    url: location.href,
    title: h1,
    brand: cleanText(ldBrand),
    price,
    image,
    table: tableMatrix,
    rawChartText: modalText
  };
}

const originSelect = document.getElementById("targetOrigin");
try {
  const savedOrigin = localStorage.getItem("frontdeskai_ext_origin");
  if (savedOrigin) originSelect.value = savedOrigin;
  originSelect.addEventListener("change", () => localStorage.setItem("frontdeskai_ext_origin", originSelect.value));
} catch {}

document.getElementById("grabBtn").addEventListener("click", async () => {
  const statusEl = document.getElementById("status");
  statusEl.className = "status";
  statusEl.textContent = "Reading open tab...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      statusEl.className = "status warn";
      statusEl.textContent = "No active tab found.";
      return;
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractProductFromDom
    });

    if (!result?.url) {
      statusEl.className = "status warn";
      statusEl.textContent = "Could not inspect this page.";
      return;
    }

    const destOrigin = await resolveDestinationOrigin(originSelect.value);
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(result))));
    await chrome.tabs.create({ url: `${destOrigin}/#clip=${encoded}` });

    statusEl.className = "status ok";
    statusEl.textContent = result.table?.length
      ? `Sent title, price & ${result.table.length - 1} size rows to Front Desk AI!`
      : result.rawChartText
        ? "Sent page details + detected size chart text to Front Desk AI!"
        : "Sent title & price to Front Desk AI (open Size Chart for exact SKU rows).";
  } catch (err) {
    statusEl.className = "status warn";
    statusEl.textContent = `Error: ${err.message}`;
  }
});
