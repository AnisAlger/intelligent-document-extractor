
import { useEffect, useState } from "react";
import "./IdentityVerification.css";

const API_URL = "https://intelligent-document-extractor-api.onrender.com";
const MAX_SIZE = 8 * 1024 * 1024;

function IdentityVerification() {
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [idPreview, setIdPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => {
      if (idPreview) URL.revokeObjectURL(idPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [idPreview, selfiePreview]);

  const handleFileChange = (file, type) => {
    setError("");
    setResult(null);

    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Choisissez une image JPG, JPEG ou PNG.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("Chaque image doit peser au maximum 8 Mo.");
      return;
    }

    const preview = URL.createObjectURL(file);

    if (type === "id") {
      setIdPhoto(file);
      setIdPreview(preview);
    } else {
      setSelfie(file);
      setSelfiePreview(preview);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!idPhoto || !selfie) {
      setError("Sélectionnez la carte d'identité et le selfie.");
      return;
    }

    const formData = new FormData();
    formData.append("id_photo", idPhoto);
    formData.append("selfie", selfie);

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/verify-identity`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "La vérification a échoué."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
        "Impossible de contacter le serveur. Vérifiez que FastAPI fonctionne."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIdPhoto(null);
    setSelfie(null);
    setIdPreview("");
    setSelfiePreview("");
    setResult(null);
    setError("");
  };

  return (
    <section className="identity-page">
      <header className="identity-header">
        <h2>Vérification d'identité</h2>
        <p>
          Comparez le visage de la carte nationale d'identité
          avec celui d'un selfie.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="identity-upload-grid">
          <div className="identity-upload-card">
            <h3>1. Carte d'identité</h3>
            <p>Choisissez une image nette du document.</p>

            <label className="identity-file-label">
              Sélectionner la carte
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0], "id")
                }
              />
            </label>

            {idPreview && (
              <img
                className="identity-preview"
                src={idPreview}
                alt="Aperçu de la carte d'identité"
              />
            )}

            {idPhoto && (
              <p className="identity-filename">{idPhoto.name}</p>
            )}
          </div>

          <div className="identity-upload-card">
            <h3>2. Selfie</h3>
            <p>Choisissez une photo nette avec un seul visage visible.</p>

            <label className="identity-file-label">
              Sélectionner le selfie
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0], "selfie")
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

            {selfie && (
              <p className="identity-filename">{selfie.name}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="identity-error" role="alert">
            {error}
          </div>
        )}

        <div className="identity-actions">
          <button type="submit" disabled={loading}>
            {loading
              ? "Comparaison en cours..."
              : "Comparer les visages"}
          </button>

          <button
            type="button"
            className="identity-reset"
            onClick={resetForm}
            disabled={loading}
          >
            Effacer
          </button>
        </div>
      </form>

      {result && (
        <div className="identity-result" aria-live="polite">
          <h3>Résultat de l'analyse</h3>

          <p>
            <strong>Score de similarité :</strong>{" "}
            {Number(result.comparison_score).toFixed(4)}
          </p>

          <p>
            <strong>Type de score :</strong>{" "}
            {result.score_type}
          </p>

          <p>
            <strong>Statut :</strong> Vérification complémentaire requise
          </p>

          <p>{result.message}</p>

          <p className="identity-warning">
            Ce score n'est pas une probabilité d'identité.
            Il ne prouve ni l'authenticité du document ni la présence
            réelle du titulaire. Ne l'utilisez pas seul pour accepter
            ou rejeter une personne.
          </p>
        </div>
      )}

      <p className="identity-privacy">
        Les images sont envoyées à votre serveur pour analyse.
        Ce composant ne les enregistre pas dans la base de données.
      </p>
    </section>
  );
}

export default IdentityVerification;
