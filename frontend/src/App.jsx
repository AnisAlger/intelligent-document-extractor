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

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

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

      await new Promise((resolve) => setTimeout(resolve, 400));
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
      await new Promise((resolve) => setTimeout(resolve, 400));

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
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#0f172a",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div>Chargement de votre session...</div>
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

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="app-header">
        <div className="app-logo">
          <div className="logo-icon">📄</div>
          <div>
            <h1>Intelligent Document Extractor</h1>
            <p>Extraction intelligente de factures & gestion documentaire</p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="main-navigation">
          <button
            type="button"
            className={
              activePage === "dashboard"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setActivePage("dashboard")}
          >
            📊 Dashboard
          </button>

          <button
            type="button"
            className={
              activePage === "extract"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={handleNewExtraction}
          >
            📤 Nouvelle extraction
          </button>

          <button
            type="button"
            className={
              activePage === "history"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setActivePage("history")}
          >
            📋 Historique
          </button>

          {isAdmin && (
            <button
              type="button"
              className={
                activePage === "admin"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() => {
                setActivePage("admin");
                loadAdminReviews(token, adminStatusFilter);
              }}
              style={{
                color: activePage === "admin" ? "#2563eb" : "#d97706",
                fontWeight: 600,
              }}
            >
              🛡️ Administration
            </button>
          )}

          <button
            type="button"
            className={
              activePage === "identity"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setActivePage("identity")}
          >
            🪪 Mon identité
          </button>
        </nav>

        {/* USER PROFILE & LOGOUT */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ fontWeight: 600, color: "#1e293b" }}>
              👤 {user.email}
            </span>
            {isAdmin && (
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#d97706",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                ADMINISTRATEUR
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "7px 14px",
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Se déconnecter"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="main-content">
        {/* 1. DASHBOARD */}
        {activePage === "dashboard" && <Dashboard />}

        {/* 2. NOUVELLE EXTRACTION DE FACTURE */}
        {activePage === "extract" && (
          <section className="extraction-section">
            <div className="page-title">
              <h2>📤 Nouvelle extraction de facture</h2>
              <p>
                Importez une facture pour extraire automatiquement ses
                informations avec l'OCR et l'IA, puis les enregistrer dans la
                base de données.
              </p>
            </div>

            <div
              className="upload-card"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📄</div>

              <h3>Glissez votre facture ici</h3>
              <p>ou sélectionnez un fichier depuis votre ordinateur</p>

              <div className="upload-formats">PDF • PNG • JPG • JPEG</div>

              <label className="file-input-label">
                📁 Choisir une facture
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <div className="selected-file" style={{ display: "block", marginTop: "15px" }}>
                  📎 Facture sélectionnée : <strong>{file.name}</strong> (
                  {(file.size / 1024).toFixed(1)} Ko)
                </div>
              )}

              <button
                className="extract-button"
                onClick={handleExtract}
                disabled={loading || !file}
                style={{ marginTop: "20px" }}
              >
                {loading
                  ? "⏳ Extraction et enregistrement en cours..."
                  : "🚀 Extraire les données & Sauvegarder"}
              </button>

              {loading && (
                <div className="extraction-progress">
                  <div
                    className={
                      extractionStep === "upload" ||
                      extractionStep === "ocr" ||
                      extractionStep === "ai" ||
                      extractionStep === "database" ||
                      extractionStep === "done"
                        ? "progress-step completed"
                        : "progress-step"
                    }
                  >
                    <span>📤</span>
                    <div>
                      <strong>Upload du document</strong>
                      <small>
                        {extractionStep === "upload" ? "En cours..." : "Terminé"}
                      </small>
                    </div>
                  </div>

                  <div
                    className={
                      extractionStep === "ocr" ||
                      extractionStep === "ai" ||
                      extractionStep === "database" ||
                      extractionStep === "done"
                        ? "progress-step completed"
                        : "progress-step"
                    }
                  >
                    <span>🔍</span>
                    <div>
                      <strong>Analyse OCR</strong>
                      <small>
                        {extractionStep === "ocr"
                          ? "En cours..."
                          : extractionStep === "upload"
                          ? "En attente"
                          : "Terminé"}
                      </small>
                    </div>
                  </div>

                  <div
                    className={
                      extractionStep === "ai" ||
                      extractionStep === "database" ||
                      extractionStep === "done"
                        ? "progress-step completed"
                        : "progress-step"
                    }
                  >
                    <span>🤖</span>
                    <div>
                      <strong>Extraction IA</strong>
                      <small>
                        {extractionStep === "ai"
                          ? "En cours..."
                          : extractionStep === "upload" ||
                            extractionStep === "ocr"
                          ? "En attente"
                          : "Terminé"}
                      </small>
                    </div>
                  </div>

                  <div
                    className={
                      extractionStep === "database" ||
                      extractionStep === "done"
                        ? "progress-step completed"
                        : "progress-step"
                    }
                  >
                    <span>🗄️</span>
                    <div>
                      <strong>Enregistrement dans MongoDB Atlas</strong>
                      <small>
                        {extractionStep === "database"
                          ? "En cours..."
                          : extractionStep === "done"
                          ? "Terminé"
                          : "En attente"}
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="error-box">❌ {error}</div>}
            </div>

            {result && (
              <div style={{ marginTop: "30px" }}>
                <InvoiceResult result={result} />
              </div>
            )}
          </section>
        )}

        {/* 3. HISTORIQUE DES FACTURES */}
        {activePage === "history" && <InvoiceHistory />}

        {/* 4. ADMINISTRATION (EXAMEN DES PIECES D'IDENTITE - ETAPE 2) */}
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

      {/* FOOTER */}
      <footer className="app-footer">
        Intelligent Document Extractor © 2026 — Extraction intelligente de factures & Authentification biométrique
      </footer>
      <ChatWidget token={token} isAdmin={isAdmin} />
    </div>
  );
}

export default App;
