import { useState, useEffect } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import InvoiceResult from "./components/InvoiceResult";
import InvoiceHistory from "./components/InvoiceHistory";
import AdminDocumentReview from "./components/AdminDocumentReview";
import IdentitySubmission from "./components/IdentitySubmission";
import AuthGateway from "./components/AuthGateway";
import ChatWidget from "./components/ChatWidget";

const API_URL = "http://127.0.0.1:8000";

function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [authChecking, setAuthChecking] = useState(true);

  // Application navigation: "dashboard" | "extract" | "history" | "admin" | "identity"
  const [activePage, setActivePage] = useState("dashboard");

  // Invoice Extraction state
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [extractionStep, setExtractionStep] = useState("");

  // Admin Reviews state
  const [adminReviews, setAdminReviews] = useState([]);
  const [adminStatusFilter, setAdminStatusFilter] = useState("review_required");

  // Responsive mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");

    if (savedToken) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Session expirée");
          return res.json();
        })
        .then((userData) => {
          setUser(userData);
          setToken(savedToken);
          if (userData.is_admin) {
            loadAdminReviews(savedToken, "review_required");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
          setToken("");
        })
        .finally(() => {
          setAuthChecking(false);
        });
    } else {
      setAuthChecking(false);
    }
  }, []);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("token", userToken);
    setActivePage("dashboard");

    if (userData.is_admin || userData.email === "anis@gmail.com") {
      loadAdminReviews(userToken, "review_required");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken("");
    setResult(null);
    setFile(null);
    setActivePage("dashboard");
  };

  const loadAdminReviews = async (activeToken = token, filter = adminStatusFilter) => {
    if (!activeToken) return;

    try {
      const res = await fetch(
        `${API_URL}/auth/admin/identity-reviews?status_filter=${filter}`,
        {
          headers: { Authorization: `Bearer ${activeToken}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAdminReviews(data.items || []);
      }
    } catch (err) {
      console.error("Erreur de chargement des demandes d'identité :", err);
    }
  };

  const handleAdminDecision = async (review, decision, note = "") => {
    let res;
    try {
      res = await fetch(
        `${API_URL}/auth/admin/users/${review.user_id}/identity-review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: decision,
            review_note: note,
          }),
        }
      );
    } catch (networkErr) {
      console.error("[handleAdminDecision] Erreur réseau :", networkErr);
      throw new Error("Erreur réseau — le serveur est-il démarré ?");
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      // response body isn't JSON (e.g. empty 204)
    }

    if (!res.ok) {
      const msg = data.detail || `Erreur HTTP ${res.status}`;
      console.error("[handleAdminDecision] Erreur backend :", res.status, data);
      throw new Error(msg);
    }

    await loadAdminReviews(token, adminStatusFilter);
    return data;
  };

  // Drag and drop & file change for invoices
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setResult(null);
    setError("");
  };

  // Drag state for dropzone
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];
    if (!droppedFile) return;

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
    ];

    if (!allowedTypes.includes(droppedFile.type)) {
      setError("Format non supporté. Utilisez PDF, PNG, JPG ou JPEG.");
      return;
    }

    setFile(droppedFile);
    setResult(null);
    setError("");
  };

  // Invoice extraction with OCR + AI + MongoDB Atlas recording
  const handleExtract = async () => {
    if (!file) {
      setError("Veuillez sélectionner une facture.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      setExtractionStep("upload");
      const formData = new FormData();
      formData.append("file", file);

      await new Promise((resolve) => setTimeout(resolve, 450));
      setExtractionStep("ocr");

      // Optional Bearer token if user is logged in
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      setExtractionStep("ai");

      const response = await fetch(`${API_URL}/extract`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Une erreur est survenue pendant l'extraction.");
      }

      setExtractionStep("database");
      await new Promise((resolve) => setTimeout(resolve, 450));

      setResult(data);
      setExtractionStep("done");
    } catch (err) {
      setError(err.message);
      setExtractionStep("");
    } finally {
      setLoading(false);
    }
  };

  const handleNewExtraction = () => {
    setActivePage("extract");
    setFile(null);
    setResult(null);
    setError("");
    setExtractionStep("");
  };

  if (authChecking) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#0f172a",
          color: "#ffffff",
          fontFamily: "var(--font-sans, sans-serif)",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "3px solid rgba(99, 102, 241, 0.2)",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: "1rem", fontWeight: 600, color: "#94a3b8" }}>
          Chargement de votre session sécurisée...
        </div>
      </div>
    );
  }

  // 1. IF NOT LOGGED IN -> DISPLAY THE AUTHENTICATION GATEWAY
  if (!user) {
    return (
      <AuthGateway
        apiUrl={API_URL}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // 2. IF LOGGED IN -> DISPLAY THE FULL APPLICATION
  const isAdmin = user.is_admin || user.email === "anis@gmail.com";
  const userInitial = (user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="app-container">
      {/* ENTERPRISE HEADER */}
      <header className="app-header">
        {/* Brand Lockup */}
        <div className="app-logo" onClick={() => setActivePage("dashboard")}>
          <div className="logo-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="logo-text-group">
            <div className="logo-brand-row">
              <h1>DocuMind AI</h1>
              <span className="brand-badge">v2.5 Enterprise</span>
            </div>
            <p>Extraction intelligente de factures & KYC biométrique</p>
          </div>
        </div>

        {/* NAVIGATION SEGMENTED */}
        <nav className={`main-navigation ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <button
            type="button"
            className={activePage === "dashboard" ? "nav-button active" : "nav-button"}
            onClick={() => {
              setActivePage("dashboard");
              setMobileMenuOpen(false);
            }}
          >
            <span className="nav-button-icon">📊</span>
            <span>Tableau de bord</span>
          </button>

          <button
            type="button"
            className={activePage === "extract" ? "nav-button active" : "nav-button"}
            onClick={() => {
              handleNewExtraction();
              setMobileMenuOpen(false);
            }}
          >
            <span className="nav-button-icon">📤</span>
            <span>Extraction</span>
          </button>

          <button
            type="button"
            className={activePage === "history" ? "nav-button active" : "nav-button"}
            onClick={() => {
              setActivePage("history");
              setMobileMenuOpen(false);
            }}
          >
            <span className="nav-button-icon">📋</span>
            <span>Factures</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={activePage === "admin" ? "nav-button active" : "nav-button"}
              onClick={() => {
                setActivePage("admin");
                loadAdminReviews(token, adminStatusFilter);
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-button-icon">🛡️</span>
              <span>Administration</span>
              {adminReviews.length > 0 && (
                <span className="nav-badge-alert" title={`${adminReviews.length} demande(s) en attente`}>
                  {adminReviews.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            className={activePage === "identity" ? "nav-button active" : "nav-button"}
            onClick={() => {
              setActivePage("identity");
              setMobileMenuOpen(false);
            }}
          >
            <span className="nav-button-icon">🪪</span>
            <span>Mon identité</span>
          </button>
        </nav>

        {/* USER PROFILE & ACTIONS */}
        <div className="header-actions">
          <div className="system-status-pill" title="Moteur OCR & IA opérationnels">
            <span className="status-dot-pulse" />
            <span>Système actif</span>
          </div>

          <div className="user-profile-pill">
            <div className="user-avatar-circle" title={user.email}>
              {userInitial}
            </div>
            <div className="user-meta">
              <span className="user-email-label" title={user.email}>
                {user.email}
              </span>
              <span className={`user-role-label ${isAdmin ? "admin-role" : ""}`}>
                {isAdmin ? "Admin" : "Utilisateur"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            title="Se déconnecter de la plateforme"
          >
            <span>Déconnexion</span>
          </button>

          {/* HAMBURGER TOGGLE FOR MOBILE / TABLET */}
          <button
            type="button"
            className={`mobile-menu-toggle ${mobileMenuOpen ? "active" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu de navigation"}
            title={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu de navigation"}
          >
            <span className="hamburger-icon">{mobileMenuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="main-content">
        {/* 1. DASHBOARD */}
        {activePage === "dashboard" && <Dashboard />}

        {/* 2. NOUVELLE EXTRACTION DE FACTURE */}
        {activePage === "extract" && (
          <section className="extraction-section fade-in">
            <div className="page-header-banner">
              <div className="page-title-row">
                <h2>Nouvelle extraction de document</h2>
                <span className="page-category-pill">OCR & IA Vision</span>
              </div>
              <p>
                Importez une facture numérisée. Notre pipeline OCR combiné à l'intelligence artificielle analyse le document, structure les métadonnées et enregistre automatiquement les données dans MongoDB Atlas.
              </p>
            </div>

            <div
              className={`upload-card-pro ${isDragging ? "drag-over" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon-orb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              <h3>Glissez-déposez votre facture ici</h3>
              <p className="upload-subtitle">
                ou parcourez les dossiers de votre appareil
              </p>

              <div className="format-badges-row">
                <span className="format-badge pdf">PDF</span>
                <span className="format-badge">PNG</span>
                <span className="format-badge">JPG</span>
                <span className="format-badge">JPEG</span>
              </div>

              <label className="btn-file-select">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Sélectionner un fichier</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <div className="selected-file-strip">
                  <div className="file-preview-left">
                    <div className="file-type-icon">
                      {file.type === "application/pdf" ? "📄" : "🖼️"}
                    </div>
                    <div className="file-info-text">
                      <span className="file-info-name" title={file.name}>
                        {file.name}
                      </span>
                      <span className="file-info-meta">
                        {(file.size / 1024).toFixed(1)} Ko • Prêt pour analyse
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-remove-file"
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                      setError("");
                    }}
                    title="Supprimer la sélection"
                  >
                    ×
                  </button>
                </div>
              )}

              <button
                className="btn-launch-extraction"
                onClick={handleExtract}
                disabled={loading || !file}
              >
                {loading ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                    <span>Traitement intelligent en cours...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Lancer l'extraction & Enregistrer</span>
                  </>
                )}
              </button>

              {loading && (
                <div className="extraction-pipeline-card">
                  <div className="pipeline-header">
                    <h4>Pipeline d'extraction documentaire</h4>
                    <span className="pipeline-status-badge">Traitement actif</span>
                  </div>

                  <div className="pipeline-steps-list">
                    <div
                      className={`pipeline-step-item ${
                        extractionStep === "upload"
                          ? "active"
                          : extractionStep === "ocr" ||
                            extractionStep === "ai" ||
                            extractionStep === "database" ||
                            extractionStep === "done"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <div className="step-circle-indicator">
                        {extractionStep === "ocr" ||
                        extractionStep === "ai" ||
                        extractionStep === "database" ||
                        extractionStep === "done"
                          ? "✓"
                          : "1"}
                      </div>
                      <div className="step-label-group">
                        <strong>Upload & Contrôle d'intégrité</strong>
                        <small>
                          {extractionStep === "upload" ? "Transmission du fichier..." : "Document validé"}
                        </small>
                      </div>
                    </div>

                    <div
                      className={`pipeline-step-item ${
                        extractionStep === "ocr"
                          ? "active"
                          : extractionStep === "ai" ||
                            extractionStep === "database" ||
                            extractionStep === "done"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <div className="step-circle-indicator">
                        {extractionStep === "ai" ||
                        extractionStep === "database" ||
                        extractionStep === "done"
                          ? "✓"
                          : "2"}
                      </div>
                      <div className="step-label-group">
                        <strong>Reconnaissance Optique de Caractères (OCR)</strong>
                        <small>
                          {extractionStep === "ocr"
                            ? "Numérisation et extraction du texte brut..."
                            : extractionStep === "upload"
                            ? "En attente"
                            : "Texte extrait avec succès"}
                        </small>
                      </div>
                    </div>

                    <div
                      className={`pipeline-step-item ${
                        extractionStep === "ai"
                          ? "active"
                          : extractionStep === "database" ||
                            extractionStep === "done"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <div className="step-circle-indicator">
                        {extractionStep === "database" || extractionStep === "done"
                          ? "✓"
                          : "3"}
                      </div>
                      <div className="step-label-group">
                        <strong>Extraction Sémantique par IA</strong>
                        <small>
                          {extractionStep === "ai"
                            ? "Structuration des montants, taxes, dates et tiers..."
                            : extractionStep === "upload" || extractionStep === "ocr"
                            ? "En attente"
                            : "Champs reconnus et formatés"}
                        </small>
                      </div>
                    </div>

                    <div
                      className={`pipeline-step-item ${
                        extractionStep === "database"
                          ? "active"
                          : extractionStep === "done"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <div className="step-circle-indicator">
                        {extractionStep === "done" ? "✓" : "4"}
                      </div>
                      <div className="step-label-group">
                        <strong>Enregistrement dans MongoDB Atlas</strong>
                        <small>
                          {extractionStep === "database"
                            ? "Indexation et sauvegarde sécurisée..."
                            : extractionStep === "done"
                            ? "Enregistrement confirmé"
                            : "En attente"}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="alert-box-pro danger">
                  <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                  <div>
                    <strong>Erreur de traitement :</strong> {error}
                  </div>
                </div>
              )}
            </div>

            {result && (
              <div style={{ marginTop: "12px" }}>
                <InvoiceResult result={result} onNewExtraction={handleNewExtraction} />
              </div>
            )}
          </section>
        )}

        {/* 3. HISTORIQUE DES FACTURES */}
        {activePage === "history" && <InvoiceHistory />}

        {/* 4. ADMINISTRATION (EXAMEN DES PIECES D'IDENTITE) */}
        {activePage === "admin" && isAdmin && (
          <AdminDocumentReview
            reviews={adminReviews}
            token={token}
            adminUser={user}
            apiUrl={API_URL}
            statusFilter={adminStatusFilter}
            onFilterChange={(newFilter) => {
              setAdminStatusFilter(newFilter);
              loadAdminReviews(token, newFilter);
            }}
            onRefresh={() => loadAdminReviews(token, adminStatusFilter)}
            onDecideReview={handleAdminDecision}
            onLogout={handleLogout}
          />
        )}

        {/* 5. SOUMISSION D'IDENTITE (CNI & SELFIE) */}
        {activePage === "identity" && (
          <IdentitySubmission
            apiUrl={API_URL}
            userToken={token}
            onSubmissionSuccess={() => {
              if (isAdmin) {
                loadAdminReviews(token, adminStatusFilter);
              }
            }}
          />
        )}
      </main>

      {/* FOOTER ENTERPRISE */}
      <footer className="app-footer-pro">
        <div>
          <strong>DocuMind AI</strong> • Intelligent Document Extractor © 2026. Tous droits réservés.
        </div>
        <div className="footer-badges-group">
          <span className="footer-security-badge" title="Chiffrement des documents">
            🔒 AES-256 Chiffré
          </span>
          <span className="footer-security-badge" title="Conformité des données">
            🛡️ RGPD / GDPR Conforme
          </span>
          <span className="footer-security-badge" title="Base de données Cloud">
            ☁️ MongoDB Atlas
          </span>
        </div>
      </footer>

      {/* AI COPILOT CHAT WIDGET */}
      <ChatWidget token={token} isAdmin={isAdmin} />
    </div>
  );
}

export default App;
