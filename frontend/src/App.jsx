import InvoiceResult from "./components/InvoiceResult";

import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
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

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/extract",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Une erreur est survenue."
        );
      }

      setResult(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Intelligent Document Extractor</h1>

      <p>
        Extraction intelligente de données de factures
      </p>

      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />

      <br />
      <br />

      <button
        onClick={handleExtract}
        disabled={loading}
      >
        {loading ? "Extraction en cours..." : "Extraire"}
      </button>

      {error && (
        <p>
          ❌ {error}
        </p>
      )}

      {result && <InvoiceResult result={result} />}
    </div>
  );
}

export default App;