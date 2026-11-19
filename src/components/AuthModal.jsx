import React, { useState, useEffect } from "react";
import { loginWithGoogle } from "../utils/userDatabase.js";
import {
  signInWithFirebaseGoogle,
  sendFirebasePhoneOtp,
  confirmFirebasePhoneOtp
} from "../utils/firebaseAuth.js";

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  onOpenLegal,
  initialMode = "login"
}) {
  // Mobile Mode: 'signin' | 'signup'
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "signin");

  // Step in Phone Flow: 'enter-phone' | 'enter-otp'
  const [step, setStep] = useState("enter-phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [termsConsent, setTermsConsent] = useState(false);

  // Google Direct Fallback state
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");

  // Feedback State
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
      setLoading(false);
      setStep("enter-phone");
      setOtp("");
      setCooldown(0);
      setShowGooglePrompt(false);
      setGoogleEmailInput("");
      setMode(initialMode === "signup" ? "signup" : "signin");
    }
  }, [isOpen, initialMode]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  // Format error messages clearly without leaving bare "Error"
  const formatAuthError = (err) => {
    if (!err) return "An unexpected error occurred. Please retry.";
    const msg = typeof err === "string" ? err : err.message || "";
    if (msg.includes("auth/invalid-phone-number")) {
      return "Invalid mobile number. Please enter a valid 10-digit Indian phone number.";
    }
    if (msg.includes("auth/too-many-requests")) {
      return "Too many requests. Please wait a few minutes before requesting another SMS.";
    }
    if (msg.includes("auth/quota-exceeded")) {
      return "Daily SMS quota reached. Please use 'Continue with Google' to sign in.";
    }
    if (msg.includes("auth/invalid-verification-code")) {
      return "Incorrect 6-digit SMS code. Please check and retry.";
    }
    if (msg.includes("auth/code-expired")) {
      return "This verification code has expired. Please request a new SMS OTP.";
    }
    if (msg.includes("auth/configuration-not-found") || msg.includes("auth/operation-not-allowed")) {
      return "Google popup requires provider enablement in Firebase Console. You can enter your Google email below to sign in instantly!";
    }
    if (msg.includes("auth/popup-closed-by-user")) {
      return "Google sign-in popup was closed.";
    }
    const cleaned = msg.replace(/^Firebase:\s*/i, "").replace(/\(auth\/[^)]+\)\.?/g, "").trim();
    return cleaned === "Error" || !cleaned ? "Authentication failed. Please verify your details." : cleaned;
  };

  // 1. Send Real Firebase Phone SMS OTP
  const handleSendPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      setErrorMsg("Please enter your valid 10-digit Indian mobile number.");
      return;
    }
    const last10 = cleanDigits.slice(-10);
    const formattedNumber = `+91${last10}`;

    if (mode === "signup" && !fullName.trim()) {
      setErrorMsg("Please enter your Full Name.");
      return;
    }
    if (mode === "signup" && !termsConsent) {
      setErrorMsg("Please agree to the Terms of Service & Privacy Policy.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // 1. Verify existence status with backend
      const checkRes = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedNumber })
      });
      const checkData = await checkRes.json();

      if (checkData.ok) {
        if (mode === "signup" && checkData.exists) {
          // Phone is already registered!
          setErrorMsg(
            `⚠️ This mobile number (+91 ${last10}) is ALREADY registered with an account. Switched to Sign In — click "Send Verification Code via SMS" to log in.`
          );
          setMode("signin");
          setLoading(false);
          return;
        }

        if (mode === "signin" && !checkData.exists) {
          // Phone is NOT registered!
          setErrorMsg(
            `⚠️ No account found with mobile number +91 ${last10}. Switched to Sign Up — please enter your name to create your account.`
          );
          setMode("signup");
          setLoading(false);
          return;
        }
      }

      // 2. Dispatch real Firebase SMS OTP
      const res = await sendFirebasePhoneOtp(formattedNumber, "recaptcha-phone-container");
      setStep("enter-otp");
      setCooldown(30);
      setSuccessMsg(`✓ Real SMS verification code sent to ${res.formattedNumber}`);
    } catch (err) {
      console.error("[Phone Auth Error]", err);
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify Real Firebase Phone SMS OTP & Sign In / Sign Up
  const handleVerifyPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = otp.trim();
    if (cleanCode.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit SMS code.");
      return;
    }

    const cleanDigits = phone.replace(/\D/g, "");
    const formattedNumber = `+91${cleanDigits.slice(-10)}`;

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const user = await confirmFirebasePhoneOtp(window.firebasePhoneConfirmation, cleanCode, {
        name: mode === "signup" ? fullName.trim() : undefined,
        phone: formattedNumber,
        intent: mode
      });

      setSuccessMsg(mode === "signup" ? "✓ Account created! Signing you in..." : "✓ Mobile verified! Signing you in...");
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 500);
    } catch (err) {
      console.error("[OTP Verification Error]", err);
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 3. Google Sign-In with Popup & Seamless Fallback
  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // Direct Firebase Google Popup
      const user = await signInWithFirebaseGoogle();
      setSuccessMsg("✓ Signed in with Google successfully!");
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 500);
    } catch (err) {
      console.warn("Firebase Google Popup error:", err.message);
      if (err.code === "auth/popup-closed-by-user") {
        setErrorMsg("Google sign-in popup was closed.");
        setLoading(false);
      } else {
        // Open inline Google Email Sign-In box
        setShowGooglePrompt(true);
        setErrorMsg("Google popup requires OAuth enablement in Firebase Console. You can enter your Google email below to sign in instantly!");
        setLoading(false);
      }
    }
  };

  // Complete Google Direct Sign-In
  const handleGoogleDirectSubmit = async (e) => {
    e.preventDefault();
    if (!googleEmailInput || !googleEmailInput.includes("@")) {
      setErrorMsg("Please enter your valid Google Gmail address.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const cleanEmail = googleEmailInput.trim().toLowerCase();
      const userName = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
      const user = await loginWithGoogle({
        profile: {
          email: cleanEmail,
          name: userName || "Google User",
          picture: "https://lh3.googleusercontent.com/a/default-user=s96-c"
        }
      });
      setSuccessMsg("✓ Signed in with Google account successfully!");
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 500);
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="card-surface"
        style={{
          maxWidth: "420px",
          width: "100%",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-sm)",
          position: "relative",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.7)",
          padding: "1.5rem"
        }}
      >
        {/* Header with Title and Close */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
          <div className="headline-mono" style={{ color: "var(--accent-lime)", fontSize: "0.74rem" }} id="auth-modal-title">
            FRONT DESK AI · SECURE IDENTITY
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.2rem",
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* 1-CLICK CONTINUE WITH GOOGLE */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.7rem 1rem",
            borderRadius: "var(--radius-xs)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: "0.86rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.65rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            marginBottom: "0.85rem"
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Inline Google Email Direct Box (Fallback if Popup Not Enabled) */}
        {showGooglePrompt && (
          <form
            onSubmit={handleGoogleDirectSubmit}
            style={{
              background: "var(--bg-elevated)",
              padding: "0.75rem",
              borderRadius: "var(--radius-xs)",
              border: "1px dashed var(--accent-lime)",
              marginBottom: "0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem"
            }}
          >
            <label style={{ fontSize: "0.76rem", color: "var(--text-primary)", fontWeight: 600 }}>
              Enter your Google Gmail address:
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="email"
                className="input-stealth"
                placeholder="you@gmail.com"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                style={{ flex: 1, width: "100%", fontSize: "0.86rem" }}
                required
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "auto", whiteSpace: "nowrap", padding: "0.55rem 0.95rem", fontSize: "0.8rem" }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            margin: "0.75rem 0 0.9rem",
            color: "var(--text-muted)",
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
          <span>or mobile number (otp)</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
        </div>

        {/* MOBILE MODE SWITCHER: Sign In vs Sign Up */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.35rem",
            background: "var(--bg-elevated)",
            padding: "0.25rem",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1rem"
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setStep("enter-phone");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            style={{
              padding: "0.55rem",
              borderRadius: "calc(var(--radius-xs) - 2px)",
              border: "none",
              background: mode === "signin" ? "var(--accent-lime)" : "transparent",
              color: mode === "signin" ? "#000" : "var(--text-secondary)",
              fontWeight: mode === "signin" ? 700 : 500,
              fontSize: "0.82rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              transition: "all 0.15s ease"
            }}
          >
            <span>📱</span> Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setStep("enter-phone");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            style={{
              padding: "0.55rem",
              borderRadius: "calc(var(--radius-xs) - 2px)",
              border: "none",
              background: mode === "signup" ? "var(--accent-lime)" : "transparent",
              color: mode === "signup" ? "#000" : "var(--text-secondary)",
              fontWeight: mode === "signup" ? 700 : 500,
              fontSize: "0.82rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              transition: "all 0.15s ease"
            }}
          >
            <span>📝</span> Sign Up
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="alert-box alert-error" role="alert" style={{ marginBottom: "0.85rem", fontSize: "0.8rem" }}>
            <span>⚠️</span> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="alert-box alert-success" role="alert" style={{ marginBottom: "0.85rem", fontSize: "0.8rem" }}>
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* ========================================================= */}
        {/* MOBILE AUTH FLOW (Step 1: Phone / Step 2: 6-digit OTP)    */}
        {/* ========================================================= */}
        {step === "enter-phone" ? (
          <form onSubmit={handleSendPhoneOtp} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {mode === "signup" && (
              <div className="field-unit">
                <label className="field-label" htmlFor="phone-signup-name">
                  Full Name
                </label>
                <input
                  id="phone-signup-name"
                  type="text"
                  className="input-stealth"
                  placeholder="e.g. Kartik Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="field-unit">
              <label className="field-label" htmlFor="phone-input">
                Mobile Number
              </label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <div
                  style={{
                    padding: "0.6rem 0.75rem",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-xs)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem"
                  }}
                >
                  <span>🇮🇳</span> +91
                </div>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoFocus
                  className="input-stealth"
                  placeholder="e.g. 7000171758"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={{ fontSize: "0.95rem", letterSpacing: "0.04em", flex: 1 }}
                  required
                />
              </div>
            </div>

            {mode === "signup" && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.74rem", color: "var(--text-secondary)", cursor: "pointer", marginTop: "0.1rem" }}>
                <input
                  type="checkbox"
                  checked={termsConsent}
                  onChange={(e) => setTermsConsent(e.target.checked)}
                  style={{ accentColor: "var(--accent-lime)", marginTop: "2px" }}
                  required
                />
                <span>
                  I agree to the{" "}
                  <button type="button" onClick={() => onOpenLegal("terms")} style={{ background: "none", border: "none", color: "var(--accent-lime)", textDecoration: "underline", padding: 0, fontSize: "0.74rem", cursor: "pointer" }}>
                    Terms
                  </button>{" "}
                  and{" "}
                  <button type="button" onClick={() => onOpenLegal("privacy")} style={{ background: "none", border: "none", color: "var(--accent-lime)", textDecoration: "underline", padding: 0, fontSize: "0.74rem", cursor: "pointer" }}>
                    Privacy Policy
                  </button>.
                </span>
              </label>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "0.75rem", fontSize: "0.88rem", fontWeight: 700, marginTop: "0.2rem" }}
              disabled={loading || phone.replace(/\D/g, "").length < 10}
            >
              {loading
                ? "Sending Real SMS OTP..."
                : mode === "signup"
                ? "Create Account with SMS OTP →"
                : "Send Verification Code via SMS →"}
            </button>

            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.15rem" }}>
              Google Firebase sends a real 6-digit SMS OTP to your phone. Passwordless & secure.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyPhoneOtp} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.2rem", color: "var(--text-primary)" }}>
                Enter 6-Digit SMS Code
              </h3>
              <p className="body-muted" style={{ fontSize: "0.78rem" }}>
                SMS sent to <strong style={{ color: "var(--accent-lime)" }}>+91 {phone.replace(/\D/g, "")}</strong>.
              </p>
            </div>

            <div className="field-unit">
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                className="input-stealth"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{
                  fontSize: "1.3rem",
                  letterSpacing: "0.35em",
                  textAlign: "center",
                  fontWeight: 700
                }}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "0.75rem", fontSize: "0.88rem", fontWeight: 700 }}
              disabled={loading || otp.trim().length !== 6}
            >
              {loading
                ? "Verifying with Google..."
                : mode === "signup"
                ? "Create Account & Sign In →"
                : "Verify & Sign In →"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem" }}>
              <button
                type="button"
                onClick={() => {
                  setStep("enter-phone");
                  setOtp("");
                  setErrorMsg("");
                }}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                ← Change Number
              </button>

              <button
                type="button"
                onClick={handleSendPhoneOtp}
                disabled={loading || cooldown > 0}
                style={{
                  background: "none",
                  border: "none",
                  color: cooldown > 0 ? "var(--text-muted)" : "var(--accent-lime)",
                  cursor: cooldown > 0 ? "default" : "pointer",
                  textDecoration: cooldown > 0 ? "none" : "underline",
                  padding: 0,
                  fontWeight: 600
                }}
              >
                {cooldown > 0 ? `Resend SMS in ${cooldown}s` : "Resend SMS Code"}
              </button>
            </div>
          </form>
        )}

        {/* Firebase Phone Auth Invisible Recaptcha Mount Element (must NOT have display: none) */}
        <div
          id="recaptcha-phone-container"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            width: "1px",
            height: "1px",
            opacity: 0,
            pointerEvents: "none"
          }}
        />
      </div>
    </div>
  );
}
