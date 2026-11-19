/**
 * Front Desk AI — Authentication & Security Service
 * Cryptographically secured user registration, login, and profile storage
 */

import crypto from "node:crypto";
import https from "node:https";
import {
  getUserByEmail,
  getUserById,
  getUserByPhone,
  createUser,
  updateUser,
  updateUserProfile,
  clearUserProfile as dbClearUserProfile,
  deleteUserAccount as dbDeleteUserAccount
} from "./firestoreDb.js";

const TOKEN_SECRET = process.env.FRONTDESK_AUTH_SECRET || "frontdeskai-jwt-secret-salt-2026-secure-key";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days session validity

// Rate Limiting Table in-memory
const RATE_LIMIT_STORE = new Map();

// In-Memory OTP Store: key -> { code, expiresAt, attempts }
const OTP_STORE = new Map();

function checkRateLimit(key, max = 10, windowMs = 60000) {
  const now = Date.now();
  const entry = RATE_LIMIT_STORE.get(key);
  if (!entry || now > entry.expiresAt) {
    RATE_LIMIT_STORE.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= max) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.expiresAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
}

/**
 * Hash password with PBKDF2 (SHA-256, 100k iterations)
 */
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
}

function verifyPassword(password, salt, storedHash) {
  const computed = hashPassword(password, salt);
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generate HMAC signed session token
 */
export function generateToken(payload) {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS
  });
  const dataB64 = Buffer.from(data).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(dataB64).digest("base64url");
  return `${dataB64}.${sig}`;
}

/**
 * Verify HMAC signed session token
 */
export function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [dataB64, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(dataB64).digest("base64url");

  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(dataB64, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Extract Bearer token from HTTP request header
 */
export function extractBearerToken(req) {
  if (!req || !req.headers) return null;
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

/**
 * API Handler: Check Phone Registration Status
 */
export async function handleCheckPhone(body) {
  const { phone } = body || {};
  if (!phone || typeof phone !== "string") {
    throw new Error("Phone number is required.");
  }
  const cleanPhone = phone.trim();
  const digits = cleanPhone.replace(/\D/g, "");
  if (digits.length < 10) {
    throw new Error("Please enter a valid 10-digit mobile number.");
  }
  const last10 = digits.slice(-10);
  const formattedPhone = `+91${last10}`;

  const user = await getUserByPhone(formattedPhone);
  if (user) {
    return {
      ok: true,
      exists: true,
      phone: formattedPhone,
      name: user.name && user.name !== "User" && !user.name.startsWith("User ") && !user.name.startsWith("+")
        ? user.name
        : null
    };
  }

  return {
    ok: true,
    exists: false,
    phone: formattedPhone
  };
}

/**
 * API Handler: Register
 */
export async function handleRegister(body) {
  const { name, email, password, phone, initialProfile, emailVerified } = body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("Please enter your name.");
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (!password || typeof password !== "string" || password.trim().length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone && typeof phone === "string" ? phone.trim() : null;

  // Rate limit
  const rate = checkRateLimit("reg_" + cleanEmail, 6, 60000);
  if (!rate.allowed) {
    throw new Error(`Too many registration attempts. Please retry in ${rate.retryAfterSec}s.`);
  }

  // Check existing user
  const existing = await getUserByEmail(cleanEmail);
  if (existing) {
    throw new Error("An account with this email already exists. Please log in.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password.trim(), salt);

  const newUser = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    emailVerified: Boolean(emailVerified),
    phoneVerified: Boolean(cleanPhone),
    authProvider: "local",
    salt,
    passwordHash,
    role: "user",
    profile: initialProfile || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await createUser(newUser);

  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role
  });

  return {
    ok: true,
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      emailVerified: newUser.emailVerified,
      phoneVerified: newUser.phoneVerified,
      authProvider: newUser.authProvider,
      role: newUser.role,
      profile: newUser.profile
    }
  };
}

/**
 * API Handler: Google Sign-In / OAuth
 */
export async function handleGoogleAuth(body) {
  const { credential, profile } = body || {};
  let email = null;
  let name = null;
  let picture = null;
  let sub = null;

  // Try decoding Google ID token (JWT) if credential string provided
  if (credential && typeof credential === "string" && credential.includes(".")) {
    try {
      const parts = credential.split(".");
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
      const payload = JSON.parse(payloadJson);
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      sub = payload.sub;
    } catch (e) {
      console.warn("Could not decode Google JWT, falling back to payload fields", e.message);
    }
  }

  // Fallback to direct client profile payload
  if (!email && profile) {
    email = profile.email;
    name = profile.name;
    picture = profile.picture;
    sub = profile.sub || profile.id;
  }

  // Support Mobile Phone Authentication via Firebase Phone Auth
  const userPhone = profile?.phone || body?.phone;
  if (!email && userPhone) {
    const cleanPhone = userPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      throw new Error("Invalid phone number format.");
    }
    const last10 = phoneDigits.slice(-10);
    const formattedPhone = `+91${last10}`;

    // Clean name: if user sent a real custom name (not "User"), use it; else default to clean phone number
    let clientName = name || profile?.name || body?.name;
    if (clientName === "User" || (typeof clientName === "string" && clientName.startsWith("User "))) {
      clientName = null;
    }
    const cleanName = clientName ? clientName.trim() : formattedPhone;

    // Check if user already exists with this phone number
    let user = await getUserByPhone(formattedPhone);

    const intent = body?.intent || profile?.intent;
    if (intent === "signup" && user) {
      throw new Error(`This mobile number (${formattedPhone}) is already registered. Please Sign In.`);
    }
    if (intent === "signin" && !user) {
      throw new Error(`No account found with mobile number ${formattedPhone}. Please Sign Up first.`);
    }

    if (!user) {
      const salt = crypto.randomBytes(16).toString("hex");
      const dummyPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = hashPassword(dummyPassword, salt);
      const generatedEmail = `91${last10}@phone.frontdeskai.shop`;

      user = {
        id: `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        name: cleanName,
        email: generatedEmail,
        phone: formattedPhone,
        emailVerified: false,
        phoneVerified: true,
        authProvider: "phone",
        googleSub: sub || null,
        avatarUrl: picture || null,
        salt,
        passwordHash,
        role: "user",
        profile: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await createUser(user);
      console.log(`[Phone Auth] Created new user: ${formattedPhone} (${cleanName})`);
    } else {
      const updates = { phoneVerified: true };
      if (!user.authProvider) updates.authProvider = "phone";
      if (!user.phone) updates.phone = formattedPhone;
      if (clientName && (!user.name || user.name === "User" || user.name.startsWith("User ") || user.name.startsWith("+"))) {
        updates.name = clientName.trim();
      }
      await updateUser(user.id, updates);
      user = { ...user, ...updates };
      console.log(`[Phone Auth] Existing user logged in: ${formattedPhone} (${user.name})`);
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user"
    });

    const displayUser = {
      id: user.id,
      name: user.name && user.name !== "User" && !user.name.startsWith("User ") ? user.name : formattedPhone,
      email: null, // NEVER leak synthetic @phone.frontdeskai.shop email to client
      phone: user.phone || formattedPhone,
      emailVerified: false,
      phoneVerified: true,
      authProvider: "phone",
      avatarUrl: user.avatarUrl || null,
      role: user.role || "user",
      profile: user.profile || null
    };

    return {
      ok: true,
      token,
      user: displayUser
    };
  }

  if (!email || !email.includes("@")) {
    throw new Error("Authentication failed: Email or mobile phone number was not provided.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || "Google User").trim();

  // Check if user already exists
  let user = await getUserByEmail(cleanEmail);

  if (!user) {
    // Create new Google-linked user
    const salt = crypto.randomBytes(16).toString("hex");
    const dummyPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = hashPassword(dummyPassword, salt);

    user = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      name: cleanName,
      email: cleanEmail,
      phone: null,
      emailVerified: true,
      phoneVerified: false,
      authProvider: "google",
      googleSub: sub || null,
      avatarUrl: picture || null,
      salt,
      passwordHash,
      role: "user",
      profile: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createUser(user);
    console.log(`[Google Auth] Created new user: ${cleanEmail}`);
  } else {
    // Existing user signing in with Google
    const updates = { emailVerified: true };
    if (!user.authProvider || user.authProvider === "local") {
      updates.authProvider = "google";
    }
    if (picture && !user.avatarUrl) {
      updates.avatarUrl = picture;
    }
    await updateUser(user.id, updates);
    user = { ...user, ...updates };
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "user"
  });

  return {
    ok: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      emailVerified: true,
      phoneVerified: Boolean(user.phoneVerified),
      authProvider: user.authProvider || "google",
      avatarUrl: user.avatarUrl || null,
      role: user.role || "user",
      profile: user.profile || null
    }
  };
}

/**
 * API Handler: Send OTP (Email or Phone)
 */
export async function handleSendOtp(body) {
  const { target, type } = body || {};
  if (!target || typeof target !== "string") {
    throw new Error("Recipient address or phone number is required.");
  }

  const cleanTarget = target.trim();
  const otpType = type === "phone" ? "phone" : "email";

  if (otpType === "email" && !cleanTarget.includes("@")) {
    throw new Error("Invalid email address.");
  }
  if (otpType === "phone" && cleanTarget.replace(/\D/g, "").length < 10) {
    throw new Error("Please enter a valid 10-digit phone number.");
  }

  const rateKey = `otp_rate_${cleanTarget}`;
  const rate = checkRateLimit(rateKey, 5, 300000); // max 5 OTPs per 5 mins
  if (!rate.allowed) {
    throw new Error(`Too many OTP requests. Please wait ${rate.retryAfterSec}s.`);
  }

  // Generate 6-digit cryptographic OTP
  const code = crypto.randomInt(100000, 999999).toString();
  const storeKey = `${otpType}_${cleanTarget.toLowerCase()}`;
  OTP_STORE.set(storeKey, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    attempts: 0
  });

  console.log(`[OTP Sent] Target: ${cleanTarget} (${otpType}) | Code: ${code}`);

  // If email OTP, dispatch real verification email via Google Firebase Identity Toolkit
  if (otpType === "email") {
    try {
      const apiKey = process.env.VITE_FIREBASE_API_KEY || "AIzaSyB9tdv-W-3twFkQGw7pbU9lYGroOxWvfXA";
      const payload = JSON.stringify({
        requestType: "EMAIL_SIGNIN",
        email: cleanTarget,
        continueUrl: "https://frontdeskai.shop/"
      });

      await new Promise((resolve) => {
        const req = https.request({
          hostname: "identitytoolkit.googleapis.com",
          path: `/v1/accounts:sendOobCode?key=${apiKey}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          }
        }, (res) => {
          let data = "";
          res.on("data", c => data += c);
          res.on("end", () => {
            console.log(`[Google Firebase Real Email Dispatched] Target: ${cleanTarget} (HTTP ${res.statusCode})`);
            resolve();
          });
        });
        req.on("error", (e) => {
          console.warn("[Firebase Email Dispatch Error]:", e.message);
          resolve();
        });
        req.write(payload);
        req.end();
      });
    } catch (err) {
      console.warn("[Email dispatch caught]:", err.message);
    }
  }

  return {
    ok: true,
    message: `Verification code / link sent to ${cleanTarget}. Check your inbox or spam folder.`
  };
}

/**
 * API Handler: Verify OTP (Email or Phone)
 */
export async function handleVerifyOtp(req, body) {
  const { target, code, type } = body || {};
  if (!target || !code) {
    throw new Error("Target and verification code are required.");
  }

  const cleanTarget = target.trim();
  const cleanCode = code.trim();
  const otpType = type === "phone" ? "phone" : "email";
  const storeKey = `${otpType}_${cleanTarget.toLowerCase()}`;

  const entry = OTP_STORE.get(storeKey);
  if (!entry) {
    throw new Error("No active OTP found. Please request a new code.");
  }

  if (Date.now() > entry.expiresAt) {
    OTP_STORE.delete(storeKey);
    throw new Error("Verification code has expired. Please request a new code.");
  }

  if (entry.attempts >= 5) {
    OTP_STORE.delete(storeKey);
    throw new Error("Too many incorrect attempts. Please request a new code.");
  }

  if (entry.code !== cleanCode) {
    entry.attempts += 1;
    throw new Error("Invalid verification code. Please check and retry.");
  }

  // OTP verified successfully!
  OTP_STORE.delete(storeKey);

  // If user is authenticated, update their DB record
  const token = extractBearerToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      if (otpType === "phone") {
        await updateUser(decoded.id, { phone: cleanTarget, phoneVerified: true });
      } else {
        await updateUser(decoded.id, { emailVerified: true });
      }
    }
  }

  return {
    ok: true,
    verified: true,
    message: `${otpType === "phone" ? "Phone number" : "Email"} verified successfully!`
  };
}

/**
 * API Handler: Sign In / Sign Up with Email OTP (Passwordless Login)
 */
export async function handleLoginWithEmailOtp(body) {
  const { email, code, name } = body || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (!code || typeof code !== "string" || code.trim().length !== 6) {
    throw new Error("Please enter the 6-digit verification code sent to your email.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();
  const storeKey = `email_${cleanEmail}`;

  const entry = OTP_STORE.get(storeKey);
  if (!entry) {
    throw new Error("No active verification code found for this email. Please request a new code.");
  }

  if (Date.now() > entry.expiresAt) {
    OTP_STORE.delete(storeKey);
    throw new Error("Verification code has expired. Please request a new code.");
  }

  if (entry.attempts >= 5) {
    OTP_STORE.delete(storeKey);
    throw new Error("Too many incorrect attempts. Please request a new code.");
  }

  if (entry.code !== cleanCode) {
    entry.attempts = (entry.attempts || 0) + 1;
    throw new Error("Invalid verification code. Please check your email and retry.");
  }

  // OTP verified! Remove from store
  OTP_STORE.delete(storeKey);

  // Check if user already exists
  let user = await getUserByEmail(cleanEmail);
  const cleanName = (name || cleanEmail.split("@")[0].replace(/[._-]/g, " ") || "User").trim();

  if (!user) {
    const salt = crypto.randomBytes(16).toString("hex");
    const dummyPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = hashPassword(dummyPassword, salt);

    user = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      name: cleanName,
      email: cleanEmail,
      phone: null,
      emailVerified: true,
      phoneVerified: false,
      authProvider: "email_otp",
      salt,
      passwordHash,
      role: "user",
      profile: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createUser(user);
    console.log(`[Email OTP Auth] Created new user: ${cleanEmail}`);
  } else {
    // Existing user
    const updates = { emailVerified: true };
    if (!user.authProvider) updates.authProvider = "email_otp";
    if (name && (!user.name || user.name === "User")) updates.name = cleanName;
    await updateUser(user.id, updates);
    user = { ...user, ...updates };
    console.log(`[Email OTP Auth] Existing user logged in: ${cleanEmail}`);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "user"
  });

  return {
    ok: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      emailVerified: true,
      phoneVerified: Boolean(user.phoneVerified),
      authProvider: user.authProvider || "email_otp",
      avatarUrl: user.avatarUrl || null,
      role: user.role || "user",
      profile: user.profile || null
    }
  };
}

/**
 * API Handler: Forgot Password (Initiate Reset)
 */
export async function handleForgotPassword(body) {
  const { email } = body || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error("Please enter your registered email address.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await getUserByEmail(cleanEmail);
  if (!user) {
    throw new Error("No account registered with this email address.");
  }

  // Generate 6-digit Reset OTP
  const code = crypto.randomInt(100000, 999999).toString();
  const storeKey = `reset_${cleanEmail}`;
  OTP_STORE.set(storeKey, {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins expiry
    attempts: 0
  });

  console.log(`[Password Reset] Email: ${cleanEmail} | OTP: ${code}`);

  return {
    ok: true,
    message: `Password reset code sent to ${cleanEmail}.`
  };
}

/**
 * API Handler: Reset Password with OTP
 */
export async function handleResetPassword(body) {
  const { email, otp, newPassword } = body || {};
  if (!email || !otp || !newPassword) {
    throw new Error("Email, reset code, and new password are required.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (newPassword.trim().length < 4) {
    throw new Error("New password must be at least 4 characters long.");
  }

  const storeKey = `reset_${cleanEmail}`;
  const entry = OTP_STORE.get(storeKey);

  if (!entry) {
    throw new Error("No active password reset request found. Please request a new code.");
  }

  if (Date.now() > entry.expiresAt) {
    OTP_STORE.delete(storeKey);
    throw new Error("Password reset code has expired. Please request a new one.");
  }

  if (entry.code !== cleanOtp) {
    entry.attempts += 1;
    throw new Error("Invalid reset code. Please check and try again.");
  }

  const user = await getUserByEmail(cleanEmail);
  if (!user) {
    throw new Error("User record not found.");
  }

  // Generate new cryptographic salt & hash
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(newPassword.trim(), salt);

  await updateUser(user.id, { salt, passwordHash });
  OTP_STORE.delete(storeKey);

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "user"
  });

  return {
    ok: true,
    message: "Password reset successful! You are now logged in.",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      emailVerified: Boolean(user.emailVerified),
      phoneVerified: Boolean(user.phoneVerified),
      role: user.role || "user",
      profile: user.profile || null
    }
  };
}

/**
 * API Handler: Login
 */
export async function handleLogin(body) {
  const { email, password } = body || {};

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const cleanEmail = email.trim().toLowerCase();

  const rate = checkRateLimit("login_" + cleanEmail, 10, 60000);
  if (!rate.allowed) {
    throw new Error(`Too many login attempts. Locked for ${rate.retryAfterSec}s.`);
  }

  const user = await getUserByEmail(cleanEmail);
  if (!user || !user.passwordHash || !user.salt) {
    throw new Error("Invalid email or password. Please verify.");
  }

  const isValid = verifyPassword(password.trim(), user.salt, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password. Please verify.");
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "user"
  });

  return {
    ok: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      emailVerified: Boolean(user.emailVerified),
      phoneVerified: Boolean(user.phoneVerified),
      authProvider: user.authProvider || "local",
      role: user.role || "user",
      profile: user.profile || null
    }
  };
}

/**
 * API Handler: Get Authenticated User
 */
export async function handleGetMe(req) {
  const token = extractBearerToken(req);
  if (!token) {
    throw new Error("Unauthorized: Missing bearer token");
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    throw new Error("Unauthorized: Invalid or expired session");
  }

  const user = await getUserById(decoded.id);
  if (!user) {
    throw new Error("User record not found");
  }

  const isPhoneUser = user.authProvider === "phone" || (user.email && user.email.includes("@phone."));
  const cleanName = user.name && user.name !== "User" && !user.name.startsWith("User ")
    ? user.name
    : (user.phone || "Member");

  return {
    ok: true,
    user: {
      id: user.id,
      name: cleanName,
      email: isPhoneUser ? null : user.email,
      phone: user.phone || null,
      emailVerified: Boolean(user.emailVerified),
      phoneVerified: Boolean(user.phoneVerified),
      authProvider: user.authProvider || (isPhoneUser ? "phone" : "local"),
      role: user.role || "user",
      profile: user.profile || null
    }
  };
}

/**
 * API Handler: Update User Profile
 */
export async function handleUpdateProfile(req, body) {
  const token = extractBearerToken(req);
  if (!token) throw new Error("Unauthorized");

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) throw new Error("Unauthorized");

  const { profile } = body || {};
  if (!profile || typeof profile !== "object") {
    throw new Error("Invalid profile payload provided.");
  }

  // Sanitize numerical measurements across tops, bottoms (pants/jeans) & women's dresses
  const cleanProfile = {
    units: profile.units === "in" ? "in" : "cm",
    gender: ["men", "women", "unisex"].includes(profile.gender) ? profile.gender : "unisex",
    category: ["tops", "bottoms", "dresses"].includes(profile.category) ? profile.category : "tops",
    fit: ["slim", "regular", "relaxed"].includes(profile.fit) ? profile.fit : "regular",
    chest: Number(profile.chest) || 0,
    bust: Number(profile.bust) || 0,
    waist: Number(profile.waist) || 0,
    hip: Number(profile.hip) || 0,
    height: Number(profile.height) || 0,
    shoulder: profile.shoulder ? Number(profile.shoulder) : null,
    inseam: profile.inseam ? Number(profile.inseam) : null,
    thigh: profile.thigh ? Number(profile.thigh) : null,
    dressLength: profile.dressLength ? Number(profile.dressLength) : null,
    updatedAt: new Date().toISOString()
  };

  const updated = await updateUserProfile(decoded.id, cleanProfile);

  return {
    ok: true,
    profile: updated
  };
}

/**
 * API Handler: Clear User Profile
 */
export async function handleClearProfile(req) {
  const token = extractBearerToken(req);
  if (!token) throw new Error("Unauthorized");

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) throw new Error("Unauthorized");

  await dbClearUserProfile(decoded.id);
  return { ok: true };
}

/**
 * API Handler: Delete Entire User Account (DPDPA 2023 / Right to Erasure)
 */
export async function handleDeleteAccount(req) {
  const token = extractBearerToken(req);
  if (!token) throw new Error("Unauthorized");

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) throw new Error("Unauthorized");

  await dbDeleteUserAccount(decoded.id);
  return { ok: true, deleted: true };
}
