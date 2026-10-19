import { useState, useEffect, useRef } from "react";
import "./AdminDocumentReview.css";

const PRESET_NOTES = {
  valid: [
    "✓ Documents parfaitement lisibles et concordance morphologique confirmée.",
    "✓ Identité validée après examen visuel des pièces originales.",
    "✓ Document officiel conforme et selfie de qualité suffisante.",
  ],
  reject: [
    "✗ Carte d'identité floue, illisible ou reflets gênants.",
    "✗ Non-concordance morphologique entre le selfie et la photo du document.",
    "✗ Document tronqué ou informations obligatoires masquées.",
    "✗ Suspicion d'usurpation (capture d'écran ou document non original).",
  ],
};

export default function AdminDocumentReview({
  reviews = [],
  token = "",
  adminUser = null,
  apiUrl = "https://intelligent-document-extractor-api.onrender.com",
  statusFilter = "review_required",
  onFilterChange,
  onRefresh,
  onDecideReview,
  onLogout,
}) {
  const [selectedReview, setSelectedReview] = useState(null);
  const [idCardBlobUrl, setIdCardBlobUrl] = useState("");
  const [selfieBlobUrl, setSelfieBlobUrl] = useState("");
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageError, setImageError] = useState("");

  // Visual inspection tool states
  const [idCardZoom, setIdCardZoom] = useState(1);
  const [idCardRotation, setIdCardRotation] = useState(0);
  const [selfieZoom, setSelfieZoom] = useState(1);
  const [selfieRotation, setSelfieRotation] = useState(0);

  // Review & audit notes
  const [reviewNote, setReviewNote] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  // Inline confirmation state (replaces window.confirm to avoid popup blockers)
  const [pendingDecision, setPendingDecision] = useState(null); // { status: "verified"|"rejected" }

  // Inspection checklist state
  const [checklist, setChecklist] = useState({
    idLegible: false,
    idIntegrity: false,
    faceMatch: false,
    realPerson: false,
  });

  // Lightbox modal state
  const [lightbox, setLightbox] = useState(null); // { url, title }

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Keep track of active blob URLs to clean them up
  const activeBlobsRef = useRef([]);

  const cleanBlobs = () => {
    activeBlobsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Erreur lors de la révocation du blob:", err);
      }
    });
    activeBlobsRef.current = [];
  };

  useEffect(() => {
    return () => {
      cleanBlobs();
    };
  }, []);

  // Fetch documents securely with Authorization header when a dossier is selected
  useEffect(() => {
    if (!selectedReview) {
      cleanBlobs();
      setIdCardBlobUrl("");
      setSelfieBlobUrl("");
      return;
    }

    let isMounted = true;
    setLoadingImages(true);
    setImageError("");
    setIdCardZoom(1);
    setIdCardRotation(0);
    setSelfieZoom(1);
    setSelfieRotation(0);
    setReviewNote(selectedReview.review_note || "");
    setChecklist({
      idLegible: false,
      idIntegrity: false,
      faceMatch: false,
      realPerson: false,
    });

    cleanBlobs();

    async function loadSecureDocuments() {
      try {
        const userId = selectedReview.user_id;

        // 1. Fetch CNI photo
        const idCardUrl =
          selectedReview.documents?.id_card_url ||
          `/auth/admin/users/${userId}/documents/id_card`;

        const idRes = await fetch(`${apiUrl}${idCardUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!idRes.ok) {
          const errData = await idRes.json().catch(() => ({}));
          throw new Error(
            errData.detail ||
            `Impossible de récupérer la carte d'identité (HTTP ${idRes.status})`
          );
        }
        const idBlob = await idRes.blob();
        const idUrl = URL.createObjectURL(idBlob);
        activeBlobsRef.current.push(idUrl);

        // 2. Fetch Selfie photo
        const selfieUrl =
          selectedReview.documents?.selfie_url ||
          `/auth/admin/users/${userId}/documents/selfie`;

        const selfieRes = await fetch(`${apiUrl}${selfieUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!selfieRes.ok) {
          const errData = await selfieRes.json().catch(() => ({}));
          throw new Error(
            errData.detail ||
            `Impossible de récupérer le selfie (HTTP ${selfieRes.status})`
          );
        }
        const selfieBlob = await selfieRes.blob();
        const sUrl = URL.createObjectURL(selfieBlob);
        activeBlobsRef.current.push(sUrl);

        if (isMounted) {
          setIdCardBlobUrl(idUrl);
          setSelfieBlobUrl(sUrl);
        }
      } catch (err) {
        if (isMounted) {
          setImageError(err.message || "Erreur de chargement des documents.");
        }
      } finally {
        if (isMounted) {
          setLoadingImages(false);
        }
      }
    }

    loadSecureDocuments();

    return () => {
      isMounted = false;
    };
  }, [selectedReview, token, apiUrl]);

  // Step 1 : ask for inline confirmation (avoids popup-blocker issues with window.confirm)
  const handleDecision = (decisionStatus) => {
    if (!selectedReview || submittingDecision) return;
    setPendingDecision({ status: decisionStatus });
  };

  // Step 2 : actually submit after user confirmed in the inline banner
  const confirmDecision = async () => {
    if (!pendingDecision || !selectedReview) return;

    const decisionStatus = pendingDecision.status;
    setPendingDecision(null);
    setSubmittingDecision(true);
    setFeedbackMessage("");
    setFeedbackIsError(false);

    try {
      await onDecideReview(selectedReview, decisionStatus, reviewNote);
      setFeedbackMessage(
        `✅ Décision enregistrée : ${decisionStatus === "verified" ? "Identité Validée" : "Identité Rejetée"
        } pour ${selectedReview.email}.`
      );
      setFeedbackIsError(false);
      setSelectedReview(null);
    } catch (err) {
      console.error("[AdminDocumentReview] Erreur lors de la décision :", err);
      setFeedbackMessage(`❌ Erreur lors de la décision : ${err.message}`);
      setFeedbackIsError(true);
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.email?.toLowerCase().includes(q) ||
      r.user_id?.toLowerCase().includes(q)
    );
  });

  const getStatusLabel = (st) => {
    switch (st) {
      case "verified":
        return "Validée";
      case "rejected":
        return "Rejetée";
      case "review_required":
      default:
        return "En attente";
    }
  };

  return (
    <div className="admin-review-root">
      {/* Header bar */}
      <header className="admin-review-header">
        <div>
          <h2>Portail d'Administration des Identités</h2>
          <p>
            Connecté en tant que : <strong>{adminUser?.email}</strong> — Examen
            sécurisé des pièces d'identité et selfies
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onRefresh}
            title="Rafraîchir les dossiers"
          >
            🔄 Actualiser
          </button>
          <button
            type="button"
            className="btn-danger-outline"
            onClick={onLogout}
            title="Se déconnecter"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Filter and search bar */}
      <div className="admin-filters-bar">
        <span className="admin-filters-label">Filtrer par statut :</span>

        <button
          type="button"
          className={`filter-pill ${statusFilter === "review_required" ? "active" : ""
            }`}
          onClick={() => onFilterChange("review_required")}
        >
          En attente d'examen
          <span className="badge-count">
            {reviews.filter((r) => r.status === "review_required").length}
          </span>
        </button>

        <button
          type="button"
          className={`filter-pill ${statusFilter === "all" ? "active" : ""
            }`}
          onClick={() => onFilterChange("all")}
        >
          Tous les dossiers
          <span className="badge-count">{reviews.length}</span>
        </button>

        <button
          type="button"
          className={`filter-pill ${statusFilter === "verified" ? "active" : ""
            }`}
          onClick={() => onFilterChange("verified")}
        >
          Validées
          <span className="badge-count">
            {reviews.filter((r) => r.status === "verified").length}
          </span>
        </button>

        <button
          type="button"
          className={`filter-pill ${statusFilter === "rejected" ? "active" : ""
            }`}
          onClick={() => onFilterChange("rejected")}
        >
          Rejetées
          <span className="badge-count">
            {reviews.filter((r) => r.status === "rejected").length}
          </span>
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <input
            type="search"
            placeholder="Rechercher un email ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              minWidth: "220px",
            }}
          />
        </div>
      </div>

      {feedbackMessage && (
        <div
          className="regulatory-warning-banner"
          style={{
            background: feedbackIsError ? "#fef2f2" : "#f0fdf4",
            borderColor: feedbackIsError ? "#fecaca" : "#86efac",
            color: feedbackIsError ? "#991b1b" : "#166534",
          }}
        >
          <span>{feedbackIsError ? "⚠️" : "ℹ️"}</span>
          <div>{feedbackMessage}</div>
          <button
            type="button"
            onClick={() => setFeedbackMessage("")}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              color: "inherit",
              opacity: 0.6,
            }}
            title="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dossiers Grid */}
      {filteredReviews.length === 0 ? (
        <div className="admin-empty-state">
          <div style={{ fontSize: "2.5rem" }}>📁</div>
          <h3>Aucun dossier d'identité trouvé</h3>
          <p>
            {statusFilter === "review_required"
              ? "Toutes les demandes de vérification d'identité en attente ont été traitées."
              : "Aucun dossier ne correspond aux filtres de recherche."}
          </p>
        </div>
      ) : (
        <div className="reviews-grid">
          {filteredReviews.map((item) => {
            const hasId = item.documents?.has_id_card;
            const hasSelfie = item.documents?.has_selfie;
            const score = item.comparison_score;

            return (
              <div className="review-card" key={item.user_id}>
                <div className="review-card-top">
                  <div className="review-card-header">
                    <span className="review-card-email">{item.email}</span>
                    <span className={`status-badge ${item.status}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="review-card-meta">
                    <span>
                      <strong>ID :</strong> {item.user_id}
                    </span>
                    <span>
                      <strong>Soumis le :</strong>{" "}
                      {item.submitted_at
                        ? new Date(item.submitted_at).toLocaleString("fr-FR")
                        : "Date inconnue"}
                    </span>
                    {item.reviewed_at && (
                      <span>
                        <strong>Examiné le :</strong>{" "}
                        {new Date(item.reviewed_at).toLocaleString("fr-FR")}
                      </span>
                    )}
                    {item.review_note && (
                      <span style={{ fontStyle: "italic", marginTop: "4px" }}>
                        « {item.review_note} »
                      </span>
                    )}
                  </div>

                  <div className="documents-badges">
                    <span
                      className={`doc-tag ${hasId ? "has-doc" : ""}`}
                    >
                      {hasId ? "✓ Carte CNI présente" : "✗ Carte CNI manquante"}
                    </span>
                    <span
                      className={`doc-tag ${hasSelfie ? "has-doc" : ""}`}
                    >
                      {hasSelfie ? "✓ Selfie présent" : "✗ Selfie manquant"}
                    </span>
                  </div>

                  <div className="technical-score-box">
                    <span>Score de similarité faciale :</span>
                    <span className="score-value">
                      {score !== undefined && score !== null
                        ? Number(score).toFixed(4)
                        : "Non calculé"}
                    </span>
                  </div>
                </div>

                <div className="review-card-actions">
                  <button
                    type="button"
                    className="btn-inspect"
                    onClick={() => setSelectedReview(item)}
                  >
                    <span>🔍</span>
                    <span>Examiner les documents</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==========================================================================
          MODAL DE L'EXAMEN APPROFONDI DES DOCUMENTS D'IDENTITÉ
          ========================================================================== */}
      {selectedReview && (
        <div
          className="dossier-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReview(null);
          }}
        >
          <div className="dossier-modal-container">
            {/* Modal Header */}
            <div className="dossier-modal-header">
              <div className="dossier-modal-header-info">
                <h3 className="dossier-modal-title">
                  <span>📑 Examen du dossier :</span>
                  <span>{selectedReview.email}</span>
                </h3>
                <span className={`status-badge ${selectedReview.status}`}>
                  {getStatusLabel(selectedReview.status)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  ID : {selectedReview.user_id}
                </span>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedReview(null)}
                title="Fermer la vue d'examen"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="dossier-modal-body">
              {/* Essential Warning Banner */}
              <div className="regulatory-warning-banner">
                <span className="warning-icon">⚖️</span>
                <div>
                  <strong>
                    Examen humain obligatoire avant validation ou rejet :
                  </strong>
                  Vérifiez attentivement la lisibilité de la carte nationale
                  d'identité et la cohérence morphologique avec le selfie du
                  titulaire.
                  <em>
                    {" "}
                    Le score de comparaison faciale est un indicateur mathématique
                    d'assistance et ne constitue en aucun cas une preuve
                    d'identité suffisante.
                  </em>
                </div>
              </div>

              {/* Error or Loading for documents */}
              {imageError && (
                <div
                  className="regulatory-warning-banner"
                  style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}
                >
                  <span>⚠️</span>
                  <div>{imageError}</div>
                </div>
              )}

              {/* Dual Document Viewports */}
              <div className="documents-viewport-grid">
                {/* 1. Carte Nationale d'Identité */}
                <div className="document-pane">
                  <div className="document-pane-header">
                    <h4 className="document-pane-title">
                      <span>🪪</span>
                      <span>Carte Nationale d'Identité (CNI)</span>
                    </h4>

                    <div className="document-controls-toolbar">
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={() =>
                          setIdCardZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))
                        }
                        title="Zoomer en arrière"
                      >
                        ➖
                      </button>
                      <span className="zoom-indicator">
                        {Math.round(idCardZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={() =>
                          setIdCardZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))
                        }
                        title="Zoomer en avant"
                      >
                        ➕
                      </button>
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={() =>
                          setIdCardRotation((r) => (r + 90) % 360)
                        }
                        title="Pivoter de 90° vers la droite"
                      >
                        🔄 {idCardRotation}°
                      </button>
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={() => {
                          setIdCardZoom(1);
                          setIdCardRotation(0);
                        }}
                        title="Réinitialiser zoom et rotation"
                      >
                        ↺
                      </button>
                      {idCardBlobUrl && (
                        <button
                          type="button"
                          className="tool-btn"
                          onClick={() =>
                            setLightbox({
                              url: idCardBlobUrl,
                              title: `Carte Nationale d'Identité - ${selectedReview.email}`,
                            })
                          }
                          title="Agrandir en plein écran"
                        >
                          ⛶
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Image Display */}
                  <div className="image-viewport-box">
                    {loadingImages ? (
                      <div className="image-loading-placeholder">
                        <span>⏳</span>
                        <span>Transmission sécurisée de la carte...</span>
                      </div>
                    ) : idCardBlobUrl ? (
                      <img
                        src={idCardBlobUrl}
                        alt="Carte d'identité nationale de l'utilisateur"
                        className="inspected-document-img"
                        style={{
                          transform: `scale(${idCardZoom}) rotate(${idCardRotation}deg)`,
                        }}
                      />
                    ) : (
                      <div className="image-error-placeholder">
                        <span>❌</span>
                        <span>Aucun fichier de carte disponible.</span>
                      </div>
                    )}
                  </div>

                  {/* Document Checklist & OCR */}
                  <div className="document-inspection-checklist">
                    <span className="checklist-title">
                      Contrôles de lisibilité et conformité CNI :
                    </span>

                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklist.idLegible}
                        onChange={(e) =>
                          setChecklist({
                            ...checklist,
                            idLegible: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Textes nets et lisibles (Nom, Prénom, Date naissance,
                        Numéro).
                      </span>
                    </label>

                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklist.idIntegrity}
                        onChange={(e) =>
                          setChecklist({
                            ...checklist,
                            idIntegrity: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Intégrité visuelle du document (bords visibles, pas de
                        reflets massifs).
                      </span>
                    </label>

                    {/* OCR Text Box if available */}
                    {selectedReview.ocr?.text ? (
                      <div className="ocr-data-box">
                        <div className="ocr-data-header">
                          <span>Données textuelles OCR détectées :</span>
                          <span style={{ fontSize: "0.75rem", color: "#10b981" }}>
                            ✓ Texte extrait
                          </span>
                        </div>
                        <pre className="ocr-data-content">
                          {selectedReview.ocr.text}
                        </pre>
                      </div>
                    ) : (
                      <div className="ocr-data-box" style={{ color: "#64748b" }}>
                        <em>Aucun texte OCR pré-extrait pour ce dossier.</em>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Selfie du Titulaire */}
                <div className="document-pane">
                  <div className="document-pane-header">
                    <h4 className="document-pane-title">
                      <span>🤳</span>
                      <span>Selfie du titulaire</span>
                    </h4>

                    <div className="document-controls-toolbar">
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={() =>
                          setSelfieZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))
                        }
                        title="Zoomer en arrière"
                      >
                        ➖
                      </button>
                      <span className="zoom-indicator">
                        {Math.round(selfieZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={() =>
                          setSelfieZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))
                        }
                        title="Zoomer en avant"
                      >
                        ➕
                      </button>
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={() =>
                          setSelfieRotation((r) => (r + 90) % 360)
                        }
                        title="Pivoter de 90° vers la droite"
                      >
                        🔄 {selfieRotation}°
                      </button>
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={() => {
                          setSelfieZoom(1);
                          setSelfieRotation(0);
                        }}
                        title="Réinitialiser zoom et rotation"
                      >
                        ↺
                      </button>
                      {selfieBlobUrl && (
                        <button
                          type="button"
                          className="tool-btn"
                          onClick={() =>
                            setLightbox({
                              url: selfieBlobUrl,
                              title: `Selfie du titulaire - ${selectedReview.email}`,
                            })
                          }
                          title="Agrandir en plein écran"
                        >
                          ⛶
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Image Display */}
                  <div className="image-viewport-box">
                    {loadingImages ? (
                      <div className="image-loading-placeholder">
                        <span>⏳</span>
                        <span>Transmission sécurisée du selfie...</span>
                      </div>
                    ) : selfieBlobUrl ? (
                      <img
                        src={selfieBlobUrl}
                        alt="Selfie de l'utilisateur pour comparaison"
                        className="inspected-document-img"
                        style={{
                          transform: `scale(${selfieZoom}) rotate(${selfieRotation}deg)`,
                        }}
                      />
                    ) : (
                      <div className="image-error-placeholder">
                        <span>❌</span>
                        <span>Aucun fichier de selfie disponible.</span>
                      </div>
                    )}
                  </div>

                  {/* Facial Comparison Checklist */}
                  <div className="document-inspection-checklist">
                    <span className="checklist-title">
                      Contrôles morphologiques et présence réelle :
                    </span>

                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklist.faceMatch}
                        onChange={(e) =>
                          setChecklist({
                            ...checklist,
                            faceMatch: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Traits morphologiques concordants (yeux, nez, bouche,
                        structure osseuse).
                      </span>
                    </label>

                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklist.realPerson}
                        onChange={(e) =>
                          setChecklist({
                            ...checklist,
                            realPerson: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Visage face caméra, éclairage direct, absence de masque
                        ou de photo d'écran.
                      </span>
                    </label>

                    <div style={{ padding: "6px 0", fontSize: "0.82rem", color: "#64748b" }}>
                      💡 Astuce : Zoomez sur les deux visages pour comparer la
                      forme des arcades sourcilières et des ailes du nez.
                    </div>
                  </div>
                </div>
              </div>

              {/* Facial comparison score bar (Aide technique) */}
              <div className="facial-score-panel">
                <div className="score-panel-header">
                  <span>
                    Indicateur algorithmique de comparaison faciale (Cosine Similarity) :
                  </span>
                  <span className="score-value" style={{ fontSize: "1rem" }}>
                    {selectedReview.comparison_score !== undefined &&
                      selectedReview.comparison_score !== null
                      ? Number(selectedReview.comparison_score).toFixed(4)
                      : "Non disponible"}
                    {selectedReview.score_type ? ` (${selectedReview.score_type})` : ""}
                  </span>
                </div>

                {/* Score gauge meter */}
                <div className="score-meter-bar-container">
                  <div
                    className={`score-meter-bar-fill ${(selectedReview.comparison_score || 0) >= 0.6
                        ? "high"
                        : (selectedReview.comparison_score || 0) >= 0.4
                          ? "medium"
                          : "low"
                      }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          5,
                          ((selectedReview.comparison_score || 0) * 100)
                        )
                      )}%`,
                    }}
                  />
                </div>

                <div className="score-panel-subtext">
                  <span>0.00 (Aucune ressemblance)</span>
                  <span>0.50 (Similarité moyenne)</span>
                  <span>1.00 (Identité mathématique)</span>
                </div>
              </div>

              {/* Decision Section */}
              <div className="decision-action-section">
                <h4 className="decision-section-title">
                  Prise de décision de l'administrateur
                </h4>

                {/* Preset motifs */}
                <div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "6px",
                    }}
                  >
                    Motifs types pour traçabilité et audit :
                  </div>

                  <div className="preset-notes-bar">
                    {PRESET_NOTES.valid.map((note, idx) => (
                      <button
                        type="button"
                        key={`val-${idx}`}
                        className={`preset-note-pill ${reviewNote === note ? "active" : ""
                          }`}
                        onClick={() => setReviewNote(note)}
                      >
                        {note}
                      </button>
                    ))}
                    {PRESET_NOTES.reject.map((note, idx) => (
                      <button
                        type="button"
                        key={`rej-${idx}`}
                        className={`preset-note-pill ${reviewNote === note ? "active" : ""
                          }`}
                        onClick={() => setReviewNote(note)}
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free form note */}
                <textarea
                  className="review-notes-input"
                  placeholder="Saisissez ou modifiez le motif de votre décision avant enregistrement..."
                  value={reviewNote}
                  maxLength={500}
                  onChange={(e) => setReviewNote(e.target.value)}
                />

                {/* Inline decision confirmation banner */}
                {pendingDecision && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      background: pendingDecision.status === "verified" ? "#f0fdf4" : "#fef2f2",
                      border: `1.5px solid ${pendingDecision.status === "verified" ? "#86efac" : "#fecaca"}`,
                      borderRadius: "10px",
                      fontSize: "0.88rem",
                      fontWeight: 500,
                      color: pendingDecision.status === "verified" ? "#166534" : "#991b1b",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>
                      {pendingDecision.status === "verified" ? "✅" : "❌"}
                    </span>
                    <span>
                      Confirmer la décision{" "}
                      <strong>
                        [{pendingDecision.status === "verified" ? "VALIDER" : "REJETER"}]
                      </strong>{" "}
                      pour <strong>{selectedReview.email}</strong> ?
                    </span>
                    <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                      <button
                        type="button"
                        onClick={() => setPendingDecision(null)}
                        style={{
                          padding: "5px 14px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          color: "#475569",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: "0.82rem",
                        }}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={confirmDecision}
                        disabled={submittingDecision}
                        style={{
                          padding: "5px 18px",
                          borderRadius: "6px",
                          border: "none",
                          background: pendingDecision.status === "verified" ? "#16a34a" : "#dc2626",
                          color: "#ffffff",
                          fontWeight: 700,
                          cursor: submittingDecision ? "not-allowed" : "pointer",
                          fontSize: "0.82rem",
                          opacity: submittingDecision ? 0.6 : 1,
                        }}
                      >
                        {submittingDecision ? "Enregistrement..." : "Oui, confirmer"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="decision-buttons-row">
                  <button
                    type="button"
                    className="btn-reject-id"
                    disabled={submittingDecision || !!pendingDecision}
                    onClick={() => handleDecision("rejected")}
                  >
                    <span>❌</span>
                    <span>Rejeter l'identité</span>
                  </button>

                  <button
                    type="button"
                    className="btn-validate-id"
                    disabled={submittingDecision || !!pendingDecision}
                    onClick={() => handleDecision("verified")}
                  >
                    <span>✅</span>
                    <span>Valider l'identité</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-header">
            <span style={{ color: "#ffffff", fontWeight: 600 }}>
              {lightbox.title}
            </span>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setLightbox(null)}
            >
              ✕ Fermer
            </button>
          </div>
          <img
            src={lightbox.url}
            alt={lightbox.title}
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
