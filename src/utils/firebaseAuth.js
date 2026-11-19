/**
 * Front Desk AI — Google Firebase Authentication Adapter
 * Official Firebase Phone OTP, Gmail Email Verification & Google Auth
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { setSession } from "./userDatabase.js";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB9tdv-W-3twFkQGw7pbU9lYGroOxWvfXA",
  authDomain: "project-cf853977-5c9b-4d28-91d.firebaseapp.com",
  projectId: "project-cf853977-5c9b-4d28-91d",
  storageBucket: "project-cf853977-5c9b-4d28-91d.appspot.com",
  messagingSenderId: "817738954527",
  appId: "1:817738954527:web:frontdeskai"
};

// Initialize Firebase App singleton safely
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

/**
 * Sync authenticated Firebase user with Cloud Firestore backend
 */
export async function syncFirebaseUserWithBackend(firebaseUser, additionalData = {}) {
  const token = await firebaseUser.getIdToken();
  const phone = firebaseUser.phoneNumber || additionalData.phone || null;
  const rawName = additionalData.name || firebaseUser.displayName;
  const cleanName = rawName && rawName !== "User" && !rawName.startsWith("User ") ? rawName.trim() : undefined;

  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      credential: token,
      intent: additionalData.intent || "signin",
      name: cleanName,
      phone: phone,
      profile: {
        email: firebaseUser.email || (phone ? null : additionalData.email),
        name: cleanName,
        picture: firebaseUser.photoURL || null,
        sub: firebaseUser.uid,
        phone: phone,
        emailVerified: Boolean(firebaseUser.emailVerified),
        phoneVerified: Boolean(phone)
      }
    })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Failed to synchronize Firebase user with database.");
  }

  // Update local session safely
  localStorage.setItem("frontdeskai_auth_token", data.token);
  setSession(data.user);

  return data.user;
}

/**
 * 1. Google Sign-In with Firebase Popup
 */
export async function signInWithFirebaseGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  try {
    const result = await signInWithPopup(firebaseAuth, provider);
    const backendUser = await syncFirebaseUserWithBackend(result.user);
    return backendUser;
  } catch (err) {
    console.warn("Firebase popup sign-in fallback:", err.message);
    throw err;
  }
}

/**
 * 2. Send Firebase Phone OTP
 * Sets up RecaptchaVerifier on the provided container element ID
 */
export async function sendFirebasePhoneOtp(phoneNumber, containerId = "recaptcha-phone-container") {
  // Format international number (default to +91 India if not provided)
  let formattedNumber = phoneNumber.trim();
  if (!formattedNumber.startsWith("+")) {
    const digits = formattedNumber.replace(/\D/g, "");
    if (digits.length === 10) {
      formattedNumber = `+91${digits}`;
    } else {
      formattedNumber = `+${digits}`;
    }
  }

  try {
    // Clear any existing recaptcha verifier
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }

    const containerEl = document.getElementById(containerId);
    if (!containerEl) {
      throw new Error(`Recaptcha container #${containerId} not found in DOM.`);
    }

    window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerEl, {
      size: "invisible",
      callback: () => {
        // Invisible reCAPTCHA verification passed
      }
    });

    const confirmationResult = await signInWithPhoneNumber(
      firebaseAuth,
      formattedNumber,
      window.recaptchaVerifier
    );

    window.firebasePhoneConfirmation = confirmationResult;
    return {
      ok: true,
      confirmationResult,
      formattedNumber,
      message: `Firebase SMS verification code sent to ${formattedNumber}`
    };
  } catch (err) {
    console.warn("Firebase Phone Auth error:", err);
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    throw err;
  }
}

/**
 * 3. Confirm Firebase Phone OTP
 */
export async function confirmFirebasePhoneOtp(confirmationResult, otpCode, extraUserData = {}) {
  const result = confirmationResult || window.firebasePhoneConfirmation;
  if (!result) {
    throw new Error("No active Firebase phone verification session found. Please re-send OTP.");
  }

  const credential = await result.confirm(otpCode.trim());
  const backendUser = await syncFirebaseUserWithBackend(credential.user, {
    ...extraUserData,
    phone: credential.user.phoneNumber
  });

  return backendUser;
}

/**
 * 4. Send Firebase Email Verification to currently logged-in Firebase user
 */
export async function sendFirebaseEmailVerificationLink(user) {
  const targetUser = user || firebaseAuth.currentUser;
  if (!targetUser) {
    throw new Error("No active Firebase user logged in to send verification link.");
  }

  await sendEmailVerification(targetUser, {
    url: "https://frontdeskai.shop/",
    handleCodeInApp: true
  });

  return {
    ok: true,
    message: `Firebase verification email sent to ${targetUser.email}. Please check your inbox.`
  };
}

/**
 * 5. Send Firebase Password Reset Email
 */
export async function sendFirebasePasswordReset(email) {
  await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase(), {
    url: "https://frontdeskai.shop/"
  });

  return {
    ok: true,
    message: `Password reset link sent to ${email} via Google Firebase.`
  };
}

/**
 * 6. Send Firebase Real Email Verification / Sign-in Link directly to user's inbox
 */
export async function sendFirebaseEmailSignInLink(email) {
  const cleanEmail = email.trim().toLowerCase();
  const actionCodeSettings = {
    url: window.location.origin + "/",
    handleCodeInApp: true
  };

  await sendSignInLinkToEmail(firebaseAuth, cleanEmail, actionCodeSettings);
  window.localStorage.setItem("emailForSignIn", cleanEmail);

  return {
    ok: true,
    message: `Real verification link sent to ${cleanEmail} via Google Firebase.`
  };
}

/**
 * 7. Complete Firebase Email Link Sign In / Verification
 */
export async function completeFirebaseEmailLinkSignIn(currentUrl, emailHint = null) {
  if (!isSignInWithEmailLink(firebaseAuth, currentUrl)) {
    return null;
  }

  let email = emailHint || window.localStorage.getItem("emailForSignIn");
  if (!email) {
    email = window.prompt("Please confirm your email address to complete verification:");
  }
  if (!email) return null;

  const result = await signInWithEmailLink(firebaseAuth, email.trim().toLowerCase(), currentUrl);
  window.localStorage.removeItem("emailForSignIn");

  const backendUser = await syncFirebaseUserWithBackend(result.user, {
    email: result.user.email || email,
    emailVerified: true
  });

  return backendUser;
}
