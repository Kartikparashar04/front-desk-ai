import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fetchLiveProductData } from './server/productScraper.js';
import {
  handleRegister,
  handleLogin,
  handleGetMe,
  handleGoogleAuth,
  handleSendOtp,
  handleVerifyOtp,
  handleForgotPassword,
  handleResetPassword,
  handleUpdateProfile,
  handleClearProfile,
  handleDeleteAccount
} from './server/authHandler.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

function attachApiMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    const pathname = reqUrl.pathname;
    const method = req.method ? req.method.toUpperCase() : 'GET';

    // Handle OPTIONS
    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.end();
      return;
    }

    try {
      if (pathname === '/api/fetch-product') {
        const targetUrl = reqUrl.searchParams.get('url');
        if (!targetUrl) {
          sendJson(res, 400, { ok: false, error: 'Missing url query parameter' });
          return;
        }
        const result = await fetchLiveProductData(targetUrl);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleRegister(body);
        sendJson(res, 201, result);
        return;
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleLogin(body);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/auth/google' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleGoogleAuth(body);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/auth/send-otp' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleSendOtp(body);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/auth/verify-otp' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleVerifyOtp(req, body);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/auth/forgot-password' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleForgotPassword(body);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/auth/reset-password' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleResetPassword(body);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/auth/me' && method === 'GET') {
        const result = await handleGetMe(req);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/user/profile' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleUpdateProfile(req, body);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/user/clear-profile' && method === 'POST') {
        const result = await handleClearProfile(req);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/user/account' && method === 'DELETE') {
        const result = await handleDeleteAccount(req);
        sendJson(res, 200, result);
        return;
      }
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message || 'Server error' });
      return;
    }

    next();
  });
}

function frontDeskAiApiPlugin() {
  return {
    name: 'front-desk-ai-api',
    configureServer(server) {
      attachApiMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachApiMiddleware(server.middlewares);
    }
  };
}

export default defineConfig({
  plugins: [react(), frontDeskAiApiPlugin()],
  server: {
    open: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://apis.google.com https://www.gstatic.com https://www.google.com https://www.recaptcha.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://www.google.com https://www.recaptcha.net; img-src 'self' data: https:;"
    }
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
});
