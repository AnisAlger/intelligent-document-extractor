import { useState, useEffect } from "react";
import "./IdentityVerification.css";

const MAX_SIZE = 8 * 1024 * 1024;

export default function IdentitySubmission({
  apiUrl = "https://intelligent-document-extractor-api.onrender.com",
  userToken = "",
  onSubmissionSuccess,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeToken, setActiveToken] = useState(userToken);

  const [idPhoto, setIdPhoto] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [idPreview, setIdPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    setActiveToken(userToken);
  }, [userToken]);

  useEffect(() => {
    return () => {
      if (idPreview) URL.revokeObjectURL(idPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [idPreview, selfiePreview]);

  const handleFileChange = (file, type) => {
    setError("");
    setSuccessResult(null);

    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Format non supporté. Veuillez choisir une image JPEG ou PNG.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("Le fichier dépasse la taille maximale autorisée (8 Mo).");
      return;
    }

    const preview = URL.createObjectURL(file);

    if (type === "id") {
      if (idPreview) URL.revokeObjectURL(idPreview);
      setIdPhoto(file);
      setIdPreview(preview);
    } else {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      setSelfie(file);
      setSelfiePreview(preview);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setSubmitting(true);
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Identifiants invalides.");
      }

      setActiveToken(data.access_token);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessResult(null);

    if (!activeToken) {
      setError("Connectez-vous d'abord à votre compte pour soumettre votre dossier.");
      return;
    }

    if (!idPhoto || !selfie) {
      setError("Veuillez sélectionner à la fois la carte d'identité et le selfie.");
      return;
    }

    const formData = new FormData();
    formData.append("id_photo", idPhoto);
    formData.append("selfie", selfie);

    try {
      setSubmitting(true);
      const response = await fetch(`${apiUrl}/auth/verify-id-card`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Échec de l'envoi des documents.");
      }

      setSuccessResult(data);
      if (onSubmissionSuccess) {
        onSubmissionSuccess(data);
      }
    } catch (err) {
      setError(err.message || "Erreur réseau lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setIdPhoto(null);
    setSelfie(null);
    if (idPreview) URL.revokeObjectURL(idPreview);
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setIdPreview("");
    setSelfiePreview("");
    setError("");
    setSuccessResult(null);
  };

  return (
    <section className="identity-page fade-in">
      <header className="identity-header">
        <div className="page-title-row">
          <h2>Vérification Biométrique & KYC de l'Identité</h2>
          <span className="page-category-pill">Conformité Sécurisée</span>
        </div>
        <p>
          Déposez votre pièce d'identité officielle et un selfie de confirmation. Vos documents sont chiffrés et transmis en toute confidentialité au coffre-fort d'audit administrateur.
        </p>
      </header>

      {/* 3-Step KYC Progression Banner */}
      <div className="kyc-workflow-steps">
        <div className={`kyc-step-card ${!idPhoto ? "active" : ""}`}>
          <div className="kyc-step-num">{idPhoto ? "✓" : "1"}</div>
          <div className="kyc-step-content">
            <strong>Pièce d'Identité</strong>
            <small>{idPhoto ? "Carte sélectionnée" : "CNI ou Passeport"}</small>
          </div>
        </div>

        <div className={`kyc-step-card ${idPhoto && !selfie ? "active" : ""}`}>
          <div className="kyc-step-num">{selfie ? "✓" : "2"}</div>
          <div className="kyc-step-content">
            <strong>Selfie Facial</strong>
            <small>{selfie ? "Selfie capturé" : "Visage bien éclairé"}</small>
          </div>
        </div>

        <div className={`kyc-step-card ${idPhoto && selfie ? "active" : ""}`}>
          <div className="kyc-step-num">3</div>
          <div className="kyc-step-content">
            <strong>Revue & Validation</strong>
            <small>Examen administrateur</small>
          </div>
        </div>
      </div>

      {!activeToken ? (
        <div style={{ maxWidth: "440px", margin: "20px auto", background: "white", padding: "28px", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Connexion au compte utilisateur</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              Connectez-vous avec le compte associé à la demande d'identité.
            </p>

            <div className="form-field-group">
              <label htmlFor="user-login-email">Adresse e-mail :</label>
              <input
                id="user-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@domaine.com"
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="user-login-password">Mot de passe :</label>
              <input
                id="user-login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="identity-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-launch-extraction"
              style={{ width: "100%", margin: "8px 0 0" }}
            >
              {submitting ? "Connexion..." : "Se connecter pour soumettre"}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              padding: "10px 16px",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span style={{ fontSize: "0.88rem", color: "#065f46", fontWeight: 600 }}>
              ✓ Session active : compte prêt pour soumission KYC
            </span>
            <button
              type="button"
              className="btn-table-action"
              onClick={() => setActiveToken("")}
              style={{ fontSize: "0.78rem" }}
            >
              Changer de compte
            </button>
          </div>

          <div className="identity-upload-grid">
            {/* 1. Carte d'identité */}
            <div className="identity-upload-card">
              <div className="identity-card-header">
                <div>
                  <h3>1. Carte Nationale d'Identité</h3>
                  <p>Image nette, bien cadrée, textes lisibles et sans reflets lumineux.</p>
                </div>
                <div className="identity-card-badge-icon">🪪</div>
              </div>

              <div className={`document-frame-guide ${idPreview ? "has-image" : ""}`}>
                {idPreview ? (
                  <img
                    className="identity-preview"
                    src={idPreview}
                    alt="Aperçu de la carte d'identité"
                  />
                ) : (
                  <>
                    <span style={{ fontSize: "2rem" }}>📇</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Format CNI recto lisible
                    </span>
                  </>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <label className="identity-file-label">
                  <span>📁 Choisir la photo CNI</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => handleFileChange(e.target.files?.[0], "id")}
                  />
                </label>

                {idPhoto && (
                  <span className="identity-filename">
                    ✓ {idPhoto.name}
                  </span>
                )}
              </div>
            </div>

            {/* 2. Selfie */}
            <div className="identity-upload-card">
              <div className="identity-card-header">
                <div>
                  <h3>2. Selfie Biométrique</h3>
                  <p>Photo nette de face, yeux ouverts, bien éclairé, sans lunettes teintées ni masque.</p>
                </div>
                <div className="identity-card-badge-icon">🤳</div>
              </div>

              <div className={`document-frame-guide ${selfiePreview ? "has-image" : ""}`}>
                {selfiePreview ? (
                  <img
                    className="identity-preview"
                    src={selfiePreview}
                    alt="Aperçu du selfie"
                  />
                ) : (
                  <>
                    <span style={{ fontSize: "2rem" }}>👤</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Visage centré dans l'ovale
                    </span>
                  </>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <label className="identity-file-label">
                  <span>📸 Choisir le selfie</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) =>
                      handleFileChange(e.target.files?.[0], "selfie")
                    }
                  />
                </label>

                {selfie && (
                  <span className="identity-filename">
                    ✓ {selfie.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="identity-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <div className="identity-actions">
            <button
              type="submit"
              disabled={submitting || !idPhoto || !selfie}
            >
              {submitting
                ? "Transmission sécurisée en cours..."
                : "🚀 Envoyer pour examen administrateur"}
            </button>

            <button
              type="button"
              className="identity-reset"
              onClick={resetForm}
              disabled={submitting}
            >
              Réinitialiser
            </button>
          </div>
        </form>
      )}

      {successResult && (
        <div className="identity-result fade-in" aria-live="polite">
          <h3>✓ Dossier transmis et enregistré avec succès !</h3>
          <p>
            <strong>Statut de votre demande :</strong> En attente d'examen par l'administrateur (<code>review_required</code>).
          </p>
          <p>
            Vos documents biométriques ont été chiffrés et placés dans le coffre-fort serveur. L'administrateur vérifiera l'exactitude des pièces avant d'octroyer le niveau de conformité maximal.
          </p>

          {successResult.analysis?.face_comparison && (
            <div style={{ padding: "8px 12px", background: "rgba(255, 255, 255, 0.7)", borderRadius: "var(--radius-md)", border: "1px solid #a7f3d0", fontSize: "0.85rem", color: "#065f46" }}>
              Indice technique de similarité préliminaire :{" "}
              <strong>
                {Number(successResult.analysis.face_comparison.comparison_score).toFixed(4)}
              </strong>{" "}
              ({successResult.analysis.face_comparison.score_type || "cosine_similarity"})
            </div>
          )}
        </div>
      )}

      <div className="identity-privacy">
        <span style={{ fontSize: "1.2rem" }}>🔒</span>
        <div>
          <strong>Confidentialité & Protection des données :</strong> Vos pièces d'identité et biométries sont isolées dans un stockage privé chiffré. Aucun tiers n'a accès à ces données sans habilitation stricte.
        </div>
      </div>
    </section>
  );
}
