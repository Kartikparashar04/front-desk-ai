import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveProductData } from "./productScraper.js";
import {
  handleCheckPhone,
  handleRegister,
  handleLogin,
  handleGetMe,
  handleGoogleAuth,
  handleSendOtp,
  handleVerifyOtp,
  handleLoginWithEmailOtp,
  handleForgotPassword,
  handleResetPassword,
  handleUpdateProfile,
  handleClearProfile,
  handleDeleteAccount
} from "./authHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../dist");

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store, no-cache"
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Guard against oversized payloads (>1MB)
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Invalid JSON in request body"));
      }
    });
    req.on("error", reject);
  });
}

function serveFile(res, filePath, contentType) {
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": contentType || "application/octet-stream",
      "Cache-Control": filePath.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("500 Internal Server Error");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = reqUrl.pathname;
    const method = req.method ? req.method.toUpperCase() : "GET";

    // Handle CORS preflight
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400"
      });
      res.end();
      return;
    }

    // 1. Health check for Google Cloud Run / Load Balancer
    if (pathname === "/healthz" || pathname === "/_health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
      return;
    }

    // SEO: robots.txt
    if (pathname === "/robots.txt") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" });
      res.end("User-agent: *\nAllow: /\nSitemap: https://frontdeskai.shop/sitemap.xml\n");
      return;
    }

    // SEO: sitemap.xml
    if (pathname === "/sitemap.xml") {
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://frontdeskai.shop/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://frontdeskai.shop/catalog</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=86400" });
      res.end(sitemap);
      return;
    }

    // 2. Production Scraper API endpoint
    if (pathname === "/api/fetch-product") {
      const targetUrl = reqUrl.searchParams.get("url");
      if (!targetUrl) {
        sendJson(res, 400, { ok: false, error: "Missing url parameter" });
        return;
      }

      const result = await fetchLiveProductData(targetUrl);
      sendJson(res, 200, result);
      return;
    }

    // 3. User & Auth Database Endpoints (Cloud Firestore)
    if (pathname === "/api/auth/check-phone" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleCheckPhone(body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/auth/register" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleRegister(body);
      sendJson(res, 201, result);
      return;
    }

    if (pathname === "/api/auth/login" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleLogin(body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/auth/google" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleGoogleAuth(body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/auth/send-otp" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleSendOtp(body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/auth/verify-otp" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleVerifyOtp(req, body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/auth/login-otp" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleLoginWithEmailOtp(body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/auth/forgot-password" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleForgotPassword(body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/auth/reset-password" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleResetPassword(body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/auth/me" && method === "GET") {
      const result = await handleGetMe(req);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/user/profile" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await handleUpdateProfile(req, body);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/user/clear-profile" && method === "POST") {
      const result = await handleClearProfile(req);
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/user/account" && method === "DELETE") {
      const result = await handleDeleteAccount(req);
      sendJson(res, 200, result);
      return;
    }

    // 4. Static Assets from dist/ or public/ (strict boundary check against path traversal)
    const decodedPath = decodeURIComponent(pathname);
    let candidateFile = path.resolve(DIST_DIR, `.${decodedPath}`);
    const PUBLIC_DIR = path.resolve(__dirname, "../public");

    let isStaticValid =
      (candidateFile === DIST_DIR || candidateFile.startsWith(DIST_DIR + path.sep)) &&
      fs.existsSync(candidateFile) &&
      fs.statSync(candidateFile).isFile();

    if (!isStaticValid) {
      const publicCandidate = path.resolve(PUBLIC_DIR, `.${decodedPath}`);
      if (
        (publicCandidate === PUBLIC_DIR || publicCandidate.startsWith(PUBLIC_DIR + path.sep)) &&
        fs.existsSync(publicCandidate) &&
        fs.statSync(publicCandidate).isFile()
      ) {
        candidateFile = publicCandidate;
        isStaticValid = true;
      }
    }

    if (isStaticValid) {
      const ext = path.extname(candidateFile).toLowerCase();
      serveFile(res, candidateFile, MIME_TYPES[ext] || "application/octet-stream");
      return;
    }

    // 5. SPA Fallback (Single Page Application routing -> dist/index.html)
    const indexHtml = path.join(DIST_DIR, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.end(fs.readFileSync(indexHtml));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  } catch (err) {
    console.error("Server API error:", err.message);
    sendJson(res, 400, { ok: false, error: err.message || "An unexpected error occurred" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Front Desk AI production server running on port ${PORT}`);
});
