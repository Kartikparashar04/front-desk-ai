/**
 * Front Desk AI Client-Side Database & Auth Adapter
 * Seamlessly interfaces with Cloud Firestore via Server Endpoints
 */

import {
  sanitizeInput,
  sanitizeObject,
  logSecurityEvent
} from "./security.js";

const TOKEN_KEY = "frontdeskai_auth_token";
const SESSION_CACHE_KEY = "frontdeskai_active_session";
const LEGACY_SESSION_KEY = "fitform_active_session";

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Returns cached session immediately for fast UI rendering,
 * while background fetch validates with server
 */
export function getCachedSession() {
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user) {
      if (user.email && user.email.includes("@phone.")) {
        user.email = null;
      }
      if (user.phone && (!user.name || user.name === "User" || user.name.startsWith("User "))) {
        const digits = user.phone.replace(/\D/g, "");
        user.name = `+91 ${digits.slice(-10)}`;
      }
    }
    return user;
  } catch (e) {
    return null;
  }
}

export function setSession(user) {
  if (!user) {
    localStorage.removeItem(SESSION_CACHE_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
    return;
  }
  const cleanEmail = user.email && user.email.includes("@phone.") ? null : user.email;
  let cleanName = user.name;
  if (!cleanName || cleanName === "User" || cleanName.startsWith("User ")) {
    if (user.phone) {
      const digits = user.phone.replace(/\D/g, "");
      cleanName = `+91 ${digits.slice(-10)}`;
    } else {
      cleanName = "Member";
    }
  }

  const sessionData = {
    id: user.id,
    name: cleanName,
    email: cleanEmail,
    phone: user.phone || null,
    phoneVerified: Boolean(user.phoneVerified),
    emailVerified: Boolean(user.emailVerified),
    authProvider: user.authProvider || (user.phone ? "phone" : "local"),
    avatarUrl: user.avatarUrl || null,
    role: user.role || "user",
    profile: user.profile || null,
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessionData));
}

/**
 * Fetch authenticated session from Cloud Firestore API
 */
export async function getCurrentSession() {
  const token = getStoredToken();
  const cached = getCachedSession();

  if (!token) {
    // If no token, return cached session if available or null
    return cached;
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        // Token expired
        setStoredToken(null);
        setSession(null);
        return null;
      }
      return cached;
    }

    const data = await res.json();
    if (data.ok && data.user) {
      setSession(data.user);
      return data.user;
    }
  } catch (err) {
    console.warn("Failed to reach auth service, using cached session:", err.message);
  }

  return cached;
}

/**
 * Register User into Cloud Firestore
 */
export async function registerUser({ name, email, password, phone, emailVerified = false }) {
  const cleanName = sanitizeInput(name);
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanPassword = password.trim();
  const cleanPhone = phone ? sanitizeInput(phone).trim() : null;

  // If user previously calibrated clothes locally, migrate that profile into Firestore
  const cached = getCachedSession();
  const initialProfile = cached?.profile || null;

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      phone: cleanPhone,
      emailVerified: Boolean(emailVerified),
      initialProfile
    })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Registration failed. Please try again.");
  }

  setStoredToken(data.token);
  setSession(data.user);
  logSecurityEvent("USER_REGISTERED_FIRESTORE", { userId: data.user.id, email: data.user.email });

  return data.user;
}

/**
 * Sign In / Sign Up with Google (Google Auth)
 */
export async function loginWithGoogle({ credential, profile }) {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ credential, profile })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Google authentication failed. Please try again.");
  }

  setStoredToken(data.token);
  setSession(data.user);
  logSecurityEvent("USER_LOGGED_IN_GOOGLE", { userId: data.user.id, email: data.user.email });

  return data.user;
}

/**
 * Request OTP for Phone or Email verification
 */
export async function sendOtp({ target, type = "email" }) {
  const cleanTarget = sanitizeInput(target).trim();
  const res = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: cleanTarget, type })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Failed to send verification code.");
  }
  return data;
}

/**
 * Sign In / Sign Up with Email OTP (Passwordless Login)
 */
export async function loginWithEmailOtp({ email, code, name }) {
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanCode = sanitizeInput(code).trim();
  const cleanName = name ? sanitizeInput(name).trim() : undefined;

  const res = await fetch("/api/auth/login-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, code: cleanCode, name: cleanName })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Email verification failed.");
  }

  setStoredToken(data.token);
  setSession(data.user);
  logSecurityEvent("USER_LOGGED_IN_EMAIL_OTP", { userId: data.user.id, email: data.user.email });

  return data.user;
}

/**
 * Verify submitted OTP code
 */
export async function verifyOtp({ target, code, type = "email" }) {
  const cleanTarget = sanitizeInput(target).trim();
  const cleanCode = sanitizeInput(code).trim();
  const token = getStoredToken();

  const res = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ target: cleanTarget, code: cleanCode, type })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Invalid verification code.");
  }

  // Update cached session verification flags if logged in
  const cached = getCachedSession();
  if (cached) {
    if (type === "phone") {
      cached.phone = cleanTarget;
      cached.phoneVerified = true;
    } else {
      cached.emailVerified = true;
    }
    setSession(cached);
  }

  return data;
}

/**
 * Forgot Password - Send Reset Code
 */
export async function forgotPassword({ email }) {
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Password reset request failed.");
  }
  return data;
}

/**
 * Reset Password with OTP Code
 */
export async function resetPassword({ email, otp, newPassword }) {
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanOtp = sanitizeInput(otp).trim();
  const cleanNewPassword = newPassword.trim();

  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword: cleanNewPassword })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Password reset failed. Please check the code.");
  }

  setStoredToken(data.token);
  setSession(data.user);
  logSecurityEvent("PASSWORD_RESET_SUCCESS", { userId: data.user.id });

  return data.user;
}

/**
 * Login User via Cloud Firestore
 */
export async function loginUser({ email, password }) {
  const cleanEmail = sanitizeInput(email).toLowerCase();

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: cleanEmail,
      password: password.trim()
    })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    // If account was created locally in this browser before cloud DB rollout, auto-migrate to Firestore!
    try {
      const rawDb = localStorage.getItem("frontdeskai_users_db") || localStorage.getItem("fitform_users_db");
      if (rawDb) {
        const localUsers = JSON.parse(rawDb);
        const matchedLocal = localUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail && u.password === password.trim()
        );
        if (matchedLocal) {
          console.info("[Migration] Syncing local offline account to Cloud Firestore:", cleanEmail);
          const regRes = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: matchedLocal.name || "User",
              email: cleanEmail,
              password: password.trim(),
              initialProfile: matchedLocal.profile || null
            })
          });
          const regData = await regRes.json();
          if (regRes.ok && regData.ok) {
            setStoredToken(regData.token);
            setSession(regData.user);
            return regData.user;
          }
        }
      }
    } catch (migErr) {
      console.warn("Legacy local migration error:", migErr);
    }

    throw new Error(data.error || "Invalid email or password.");
  }

  setStoredToken(data.token);
  setSession(data.user);
  logSecurityEvent("USER_LOGGED_IN_FIRESTORE", { userId: data.user.id });

  return data.user;
}

/**
 * Logout User
 */
export function logoutUser() {
  const cached = getCachedSession();
  if (cached) {
    logSecurityEvent("USER_LOGOUT", { userId: cached.id });
  }
  setStoredToken(null);
  setSession(null);
}

/**
 * Save User Profile to Cloud Firestore
 */
export async function saveUserProfile(targetUserId, profileData) {
  const token = getStoredToken();
  const cleanProfile = sanitizeObject(profileData);

  if (token) {
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ profile: cleanProfile })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save profile to cloud.");
      }

      // Update cached session
      const cached = getCachedSession();
      if (cached) {
        cached.profile = data.profile;
        setSession(cached);
      }
      logSecurityEvent("PROFILE_SAVED_FIRESTORE", { userId: targetUserId });
      return data.profile;
    } catch (err) {
      console.warn("Could not save to cloud, saving locally:", err.message);
    }
  }

  // Local fallback
  const cached = getCachedSession() || { id: targetUserId || "guest", name: "Guest", email: "" };
  cached.profile = cleanProfile;
  setSession(cached);
  return cleanProfile;
}

/**
 * Clear User Profile in Cloud Firestore
 */
export async function clearUserProfile(targetUserId) {
  const token = getStoredToken();

  if (token) {
    try {
      await fetch("/api/user/clear-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn("Cloud clear profile failed:", err.message);
    }
  }

  const cached = getCachedSession();
  if (cached) {
    cached.profile = null;
    setSession(cached);
  }
  logSecurityEvent("PROFILE_CLEARED", { userId: targetUserId });
}

/**
 * Permanently Delete Account from Cloud Firestore (DPDPA 2023)
 */
export async function deleteEntireUserAccount(targetUserId) {
  const token = getStoredToken();

  if (token) {
    try {
      await fetch("/api/user/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn("Cloud delete account failed:", err.message);
    }
  }

  logSecurityEvent("ACCOUNT_PERMANENTLY_DELETED", { userId: targetUserId });
  logoutUser();
}
