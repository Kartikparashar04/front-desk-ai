import React, { useState, useEffect } from "react";
import Landing from "./components/Landing.jsx";
import ProfileForm from "./components/ProfileForm.jsx";
import Catalog from "./components/Catalog.jsx";
import ProductDetail from "./components/ProductDetail.jsx";
import AuthModal from "./components/AuthModal.jsx";
import LegalModal from "./components/LegalModal.jsx";
import CookieConsentBanner from "./components/CookieConsentBanner.jsx";
import Footer from "./components/Footer.jsx";
import MobileNavDrawer from "./components/MobileNavDrawer.jsx";
import NotFoundView from "./components/NotFoundView.jsx";
import { analyzeGarmentUrl } from "./utils/urlAnalyzer.js";
import { buildChartFromTableMatrix, parseRawSizeChartText } from "./utils/sizeChartParser.js";
import { brands } from "./data/brands.js";
import {
  getCachedSession,
  getCurrentSession,
  saveUserProfile,
  clearUserProfile,
  deleteEntireUserAccount,
  logoutUser
} from "./utils/userDatabase.js";
import { completeFirebaseEmailLinkSignIn } from "./utils/firebaseAuth.js";

const FEEDBACK_KEY = "frontdeskai_user_feedback";
const LEGACY_FEEDBACK_KEY = "fitform_user_feedback";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // { id, name, email, profile }
  const [feedback, setFeedback] = useState({});
  const [view, setView] = useState("landing"); // 'landing' | 'profile' | 'catalog' | 'detail' | '404'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Modals & Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState("privacy");

  // Dynamic Title Management for SEO & Browser Context
  useEffect(() => {
    const titles = {
      landing: "Front Desk AI — Size Intelligence Protocol | frontdeskai.shop",
      profile: "Body Calibration & Anatomical Specs · Front Desk AI",
      catalog: "Garment Archive & Label Pattern Sizer · Front Desk AI",
      detail: selectedProduct ? `${selectedProduct.name} — Size Recommendation · Front Desk AI` : "Garment Size Recommendation · Front Desk AI",
      "404": "Page Not Found · Front Desk AI"
    };
    document.title = titles[view] || titles.landing;
  }, [view, selectedProduct]);

  // Load persisted user session from Database
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const cached = getCachedSession();
        if (cached && isMounted) {
          setCurrentUser(cached);
        }

        const activeSession = await getCurrentSession();
        if (isMounted && activeSession) {
          setCurrentUser(activeSession);
        }
        const savedFeedback = localStorage.getItem(FEEDBACK_KEY) || localStorage.getItem(LEGACY_FEEDBACK_KEY);
        if (savedFeedback && isMounted) {
          setFeedback(JSON.parse(savedFeedback));
          localStorage.setItem(FEEDBACK_KEY, savedFeedback);
        }

        // Automatic Firebase Email Link sign-in & verification check
        if (window.location.href.includes("apiKey=") && (window.location.href.includes("oobCode=") || window.location.href.includes("mode="))) {
          completeFirebaseEmailLinkSignIn(window.location.href)
            .then((verifiedUser) => {
              if (verifiedUser && isMounted) {
                setCurrentUser(verifiedUser);
                window.history.replaceState(null, "", window.location.pathname);
              }
            })
            .catch((err) => console.warn("Email link auto sign-in:", err.message));
        }

        // Import clipped product payload from browser bookmarklet (#clip=base64)
        if (window.location.hash.startsWith("#clip=")) {
          const encoded = window.location.hash.slice("#clip=".length);
          const clipData = JSON.parse(decodeURIComponent(escape(atob(encoded))));
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          if (clipData?.url) {
            analyzeGarmentUrl(clipData.url, (activeSession || cached)?.profile || null).then((base) => {
              if (!isMounted) return;
              const chartFromTable =
                Array.isArray(clipData.table) && clipData.table.length >= 2
                  ? buildChartFromTableMatrix(clipData.table[0], clipData.table.slice(1))
                  : [];
              const chartFromRaw =
                chartFromTable.length === 0 && clipData.rawChartText
                  ? parseRawSizeChartText(clipData.rawChartText).sizeChart
                  : [];
              const finalChart =
                chartFromTable.length > 0
                  ? chartFromTable
                  : chartFromRaw.length > 0
                    ? chartFromRaw
                    : base.sizeChart;
              const hasClippedChart = chartFromTable.length > 0 || chartFromRaw.length > 0;
              const resolvedBrand = clipData.brand || base.brandName;

              setSelectedProduct({
                id: base.id,
                name: clipData.title || base.productName,
                code: `${base.platform.toUpperCase().slice(0, 4)}-CLIP`,
                brandName: resolvedBrand,
                origin: base.platform,
                platform: base.platform,
                color: base.color || "Store Selection",
                material: base.material,
                price: clipData.price || base.price,
                image: clipData.image || base.image,
                fitCut: base.fitCut,
                sizeChart: finalChart,
                externalUrl: clipData.url,
                externalStoreUrl: clipData.url,
                affiliateUrl: base.affiliateUrl,
                isCustomUrl: true,
                liveStatus: hasClippedChart ? "live-chart" : "live-metadata",
                sourceNotice:
                  hasClippedChart
                    ? `Exact live title, price & size chart imported directly from your open ${base.platform} tab ✓`
                    : `Live title & price imported from your open ${base.platform} tab; paired with calibrated ${resolvedBrand} chart.`
              });
              setView("detail");
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse database state", e);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.profile) {
      setView("catalog");
    } else {
      setView("profile");
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setView("landing");
  };

  const handleDeleteAccount = async () => {
    if (currentUser) {
      await deleteEntireUserAccount(currentUser.id);
      setCurrentUser(null);
      setView("landing");
    }
  };

  const handleProfileSave = async (newProfile) => {
    if (currentUser) {
      setCurrentUser((prev) => ({
        ...prev,
        profile: newProfile
      }));
      await saveUserProfile(currentUser.id, newProfile);
    } else {
      setIsAuthModalOpen(true);
      setAuthMode("signup");
    }
    setView("catalog");
  };

  const handleProfileClear = async () => {
    if (currentUser) {
      await clearUserProfile(currentUser.id);
      setCurrentUser((prev) => ({
        ...prev,
        profile: null
      }));
    }
    setView("landing");
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setView("detail");
  };

  const handleFeedback = (productId, feedbackType) => {
    const updated = {
      ...feedback,
      [productId]: {
        rating: feedbackType,
        timestamp: new Date().toISOString()
      }
    };
    setFeedback(updated);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
  };

  const openLegal = (tab = "privacy") => {
    setLegalTab(tab);
    setIsLegalModalOpen(true);
  };

  if (!isLoaded) {
    return (
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="headline-mono">CONNECTING TO SECURE VAULT...</div>
      </div>
    );
  }

  const userProfile = currentUser?.profile || null;

  const displayUserLabel = () => {
    if (!currentUser) return "";
    if (currentUser.name && currentUser.name !== "User" && !currentUser.name.startsWith("User ")) {
      return currentUser.name.split(" ")[0];
    }
    if (currentUser.phone) {
      const digits = currentUser.phone.replace(/\D/g, "");
      return `+91 ${digits.slice(-10)}`;
    }
    if (currentUser.email && !currentUser.email.includes("@phone.")) {
      return currentUser.email.split("@")[0];
    }
    return "Member";
  };

  return (
    <div className="app-shell">
      {/* Top Editorial Header */}
      <header className="header-bar" role="banner">
        {/* Clickable Logo */}
        <button
          className="brand-badge"
          onClick={() => setView("landing")}
          aria-label="Front Desk AI — Return to Homepage"
        >
          <span className="brand-glyph" />
          <span className="brand-name">FRONT DESK AI</span>
        </button>

        <div className="header-meta">
          {/* Desktop User Status */}
          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {userProfile ? (
                <button
                  className="header-profile-pill"
                  onClick={() => setView("profile")}
                  title={`${displayUserLabel()} - Click to edit specs`}
                >
                  <span className="dot" />
                  <span>
                    {userProfile.chest}
                    {userProfile.units} · {userProfile.fit}
                  </span>
                </button>
              ) : (
                <button
                  className="ghost-back-btn"
                  onClick={() => setView("profile")}
                  style={{ color: "var(--accent-lime)" }}
                >
                  + Add Specs
                </button>
              )}

              <button
                className="btn-danger-ghost"
                onClick={handleLogout}
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}
                title="Sign out of current account"
              >
                Logout ({displayUserLabel()})
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <button
                className="ghost-back-btn"
                onClick={() => { setAuthMode("login"); setIsAuthModalOpen(true); }}
                style={{ color: "var(--text-primary)" }}
              >
                Log In
              </button>
              <button
                className="ghost-back-btn"
                onClick={() => { setAuthMode("signup"); setIsAuthModalOpen(true); }}
                style={{
                  color: "var(--accent-lime)",
                  border: "1px solid var(--accent-lime-border)",
                  padding: "0.3rem 0.65rem",
                  borderRadius: "var(--radius-xs)"
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open mobile navigation menu"
            style={{ display: "inline-block", marginLeft: "0.25rem" }}
          >
            ☰
          </button>
        </div>
      </header>

      {/* Screen Render */}
      <main role="main">
        {view === "landing" && (
          <Landing
            hasProfile={Boolean(userProfile)}
            profile={userProfile}
            onStart={() => {
              if (!currentUser) {
                setAuthMode("signup");
                setIsAuthModalOpen(true);
              } else {
                setView("profile");
              }
            }}
            onOpenCatalog={() => setView("catalog")}
            onProductReady={handleProductSelect}
          />
        )}

        {view === "profile" && (
          <ProfileForm
            existing={userProfile}
            userEmail={currentUser?.email}
            onSave={handleProfileSave}
            onClear={handleProfileClear}
            onDeleteAccount={currentUser ? handleDeleteAccount : null}
            onCancel={userProfile ? () => setView("catalog") : () => setView("landing")}
          />
        )}

        {view === "catalog" && (
          <Catalog
            brands={brands}
            profile={userProfile}
            onSelectProduct={handleProductSelect}
            onEditProfile={() => setView("profile")}
          />
        )}

        {view === "detail" && (
          <ProductDetail
            product={selectedProduct}
            profile={userProfile}
            onBack={() => setView("catalog")}
            onFeedback={handleFeedback}
            currentFeedback={selectedProduct ? feedback[selectedProduct.id]?.rating : null}
          />
        )}

        {view === "404" && (
          <NotFoundView onGoHome={() => setView("landing")} />
        )}
      </main>

      {/* Footer & Compliance Details with Clickable Phone/Email */}
      <Footer onOpenLegal={openLegal} onNavigate={(screen) => setView(screen)} />

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={(screen) => setView(screen)}
        currentUser={currentUser}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Cookie & Storage Consent Banner */}
      <CookieConsentBanner onOpenLegal={openLegal} />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onOpenLegal={openLegal}
      />

      {/* Legal & Compliance Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialTab={legalTab}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
}
