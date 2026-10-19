import { useState, useEffect } from "react";
import "./IdentityVerification.css";

const MAX_SIZE = 8 * 1024 * 1024;

export default function IdentitySubmission({
  apiUrl = "http://127.0.0.1:8000",
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
    <section className="identity-page">
      <header className="identity-header">
        <h2>Soumission de votre pièce d'identité & Selfie</h2>
        <p>
          Vos documents sont conservés de manière sécurisée et confidentielle
          dans le coffre privé du serveur pour être examinés par un
          administrateur.
        </p>
      </header>

      {!activeToken ? (
        <div style={{ maxWidth: "420px", margin: "20px auto" }}>
          <form onSubmit={handleLogin}>
            <h3>Connexion au compte utilisateur</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Connectez-vous avec le compte associé à la demande d'identité.
            </p>

            <div className="form-group">
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

            <div className="form-group">
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

            <button type="submit" disabled={submitting}>
              {submitting ? "Connexion..." : "Se connecter pour soumettre"}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "0.9rem", color: "#059669", fontWeight: 600 }}>
              ✓ Session active : compte prêt pour soumission
            </span>
            <button
              type="button"
              className="identity-reset"
              onClick={() => setActiveToken("")}
            >
              Changer de compte
            </button>
          </div>

          <div className="identity-upload-grid">
            {/* 1. Carte d'identité */}
            <div className="identity-upload-card">
              <h3>1. Carte d'identité nationale</h3>
              <p>Image nette, bien cadrée, textes lisibles et sans reflets.</p>

              <label className="identity-file-label">
                Choisir la photo de la carte
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => handleFileChange(e.target.files?.[0], "id")}
                />
              </label>

              {idPreview && (
                <img
                  className="identity-preview"
                  src={idPreview}
                  alt="Aperçu de la carte"
                />
              )}

              {idPhoto && <p className="identity-filename">{idPhoto.name}</p>}
            </div>

            {/* 2. Selfie */}
            <div className="identity-upload-card">
              <h3>2. Selfie du titulaire</h3>
              <p>Photo nette, visage de face, bien éclairé et non masqué.</p>

              <label className="identity-file-label">
                Choisir le selfie
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0], "selfie")
                  }
                />
              </label>

              {selfiePreview && (
                <img
                  className="identity-preview"
                  src={selfiePreview}
                  alt="Aperçu du selfie"
                />
              )}

              {selfie && <p className="identity-filename">{selfie.name}</p>}
            </div>
          </div>

          {error && (
            <div className="identity-error" role="alert">
              {error}
            </div>
          )}

          <div className="identity-actions">
            <button
              type="submit"
              disabled={submitting || !idPhoto || !selfie}
              style={{ fontWeight: 700 }}
            >
              {submitting
                ? "Transmission sécurisée en cours..."
                : "Envoyer pour examen administrateur"}
            </button>

            <button
              type="button"
              className="identity-reset"
              onClick={resetForm}
              disabled={submitting}
            >
              Effacer
            </button>
          </div>
        </form>
      )}

      {successResult && (
        <div
          className="identity-result"
          aria-live="polite"
          style={{ borderColor: "#10b981", background: "#f0fdf4" }}
        >
          <h3 style={{ color: "#065f46" }}>
            ✓ Documents transmis et enregistrés en toute sécurité !
          </h3>

          <p>
            <strong>Statut du dossier :</strong> En attente d'examen par
            l'administrateur (<code>review_required</code>).
          </p>

          <p>
            Vos images ont été enregistrées avec des identifiants sécurisés dans
            l'espace de stockage privé. L'administrateur examinera la lisibilité
            de vos pièces et leur cohérence avant de valider votre identité.
          </p>

          {successResult.analysis?.face_comparison && (
            <p style={{ fontSize: "0.85rem", color: "#475569" }}>
              Indice technique préliminaire :{" "}
              {Number(
                successResult.analysis.face_comparison.comparison_score
              ).toFixed(4)}{" "}
              (
              {successResult.analysis.face_comparison.score_type ||
                "cosine_similarity"}
              )
            </p>
          )}
        </div>
      )}

      <p className="identity-privacy" style={{ marginTop: "24px" }}>
        🔒 <strong>Confidentialité garantie :</strong> Vos documents sont isolés
        dans un répertoire privé du serveur protégé par contrôle d'accès strict.
        Aucun document n'est accessible publiquement.
      </p>
    </section>
  );
}
