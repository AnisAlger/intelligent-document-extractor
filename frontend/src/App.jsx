import { useState } from "react";
import InvoiceResult from "./components/InvoiceResult";
import InvoiceHistory from "./components/InvoiceHistory";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [extractionStep, setExtractionStep] = useState("");

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

  if (!droppedFile) {
    return;
  }

  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
  ];

  if (!allowedTypes.includes(droppedFile.type)) {
    setError(
      "Format non supporté. Utilisez PDF, PNG ou JPG."
    );
    return;
  }

  setFile(droppedFile);
  setResult(null);
  setError("");
};

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

    // Petite pause pour permettre à l'interface
    // d'afficher l'étape Upload
    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    setExtractionStep("ocr");

    const response = await fetch(
      "http://127.0.0.1:8000/extract",
      {
        method: "POST",
        body: formData,
      }
    );

    setExtractionStep("ai");

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Une erreur est survenue."
      );
    }

    setExtractionStep("database");

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    setResult(data);
    setExtractionStep("done");

  } catch (error) {
    setError(error.message);
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
  };

  return (
    <div className="app-container">

      {/* HEADER */}

      <header className="app-header">

        <div className="app-logo">
          <div className="logo-icon">
            📄
          </div>

          <div>
            <h1>
              Intelligent Document Extractor
            </h1>

            <p>
              Extraction intelligente de données
            </p>
          </div>
        </div>

        {/* NAVIGATION */}

        <nav className="main-navigation">

          <button
            className={
              activePage === "dashboard"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            📊 Dashboard
          </button>

          <button
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
            className={
              activePage === "history"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() =>
              setActivePage("history")
            }
          >
            📋 Historique
          </button>

        </nav>

      </header>

      {/* CONTENU */}

      <main className="main-content">

        {activePage === "dashboard" && (
          <Dashboard />
        )}

        {activePage === "extract" && (
          <section className="extraction-section">

            <div className="page-title">
              <h2>
                📤 Nouvelle extraction
              </h2>

              <p>
                Importez une facture pour extraire
                automatiquement ses informations.
              </p>
            </div>

            <div
  className="upload-card"
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>

  <div className="upload-icon">
    📄
  </div>

  <h3>
    Glissez votre facture ici
  </h3>

  <p>
    ou sélectionnez un fichier depuis votre ordinateur
  </p>

  <div className="upload-formats">
    PDF • PNG • JPG • JPEG
  </div>

  <label className="file-input-label">
    📁 Choisir une facture

    <input
      type="file"
      accept=".pdf,.png,.jpg,.jpeg"
      onChange={handleFileChange}
    />
  </label>

              {file && (
                <div className="selected-file">
                  📎 {file.name}
                </div>
              )}

              <button
                className="extract-button"
                onClick={handleExtract}
                disabled={loading}
              >
                {loading
                  ? "⏳ Extraction en cours..."
                  : "🚀 Extraire les données"}
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
          {extractionStep === "upload"
            ? "En cours..."
            : "Terminé"}
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
        <strong>Enregistrement</strong>
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

              {error && (
                <div className="error-box">
                  ❌ {error}
                </div>
              )}

            </div>

            {result && (
              <InvoiceResult
                result={result}
              />
            )}

          </section>
        )}

        {activePage === "history" && (
          <InvoiceHistory />
        )}

      </main>

      {/* FOOTER */}

      <footer className="app-footer">
        Intelligent Document Extractor © 2026
      </footer>

    </div>
  );
}

export default App;