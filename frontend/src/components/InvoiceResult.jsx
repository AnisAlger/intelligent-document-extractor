import { useState } from "react";

function InvoiceResult({ result, onNewExtraction }) {
  const [copied, setCopied] = useState(false);
  const invoice = result?.invoice || {};

  const formatAmount = (value) => {
    if (value === null || value === undefined) return "—";
    return Number(value).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currency = invoice.currency || "DZD";

  return (
    <div className="invoice-result-card fade-in">
      {/* Banner Top */}
      <div className="result-card-banner">
        <div className="result-banner-left">
          <div className="result-success-orb">✓</div>
          <div className="result-banner-text">
            <h3>Facture extraite avec succès</h3>
            <p>Données reconnues par l'IA et indexées dans la base de données</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-action-refresh"
            onClick={handleCopyJson}
            title="Copier les données brutes au format JSON"
          >
            <span>{copied ? "✓ Copié !" : "📋 Copier JSON"}</span>
          </button>

          {onNewExtraction && (
            <button
              type="button"
              className="btn-launch-extraction"
              style={{
                width: "auto",
                margin: 0,
                padding: "9px 18px",
                fontSize: "0.88rem",
              }}
              onClick={onNewExtraction}
            >
              <span>+ Autre facture</span>
            </button>
          )}
        </div>
      </div>

      {/* Two Column Layout: Structured Fields & Financial Summary */}
      <div className="result-grid-two-col">
        {/* Left: Metadata Grid */}
        <div className="result-fields-grid">
          <div className="result-field-item">
            <span className="field-label">N° de Facture</span>
            <strong className="field-val" style={{ color: "#4f46e5", fontFamily: "var(--font-mono)" }}>
              {invoice.invoice_number || "Non identifié"}
            </strong>
          </div>

          <div className="result-field-item">
            <span className="field-label">Fichier source</span>
            <strong className="field-val" title={result.filename}>
              {result.filename || "Document"}
            </strong>
          </div>

          <div className="result-field-item">
            <span className="field-label">Fournisseur (Émetteur)</span>
            <strong className="field-val">{invoice.supplier || "—"}</strong>
          </div>

          <div className="result-field-item">
            <span className="field-label">Client (Destinataire)</span>
            <strong className="field-val">{invoice.customer || "—"}</strong>
          </div>

          <div className="result-field-item">
            <span className="field-label">Date d'émission</span>
            <strong className="field-val">{invoice.issue_date || "—"}</strong>
          </div>

          <div className="result-field-item">
            <span className="field-label">Date d'échéance</span>
            <strong className="field-val">{invoice.due_date || "—"}</strong>
          </div>
        </div>

        {/* Right: Executive Financial Summary Box */}
        <div className="financial-summary-card">
          <div className="fin-card-title">Synthèse des montants</div>

          <div className="fin-rows-group">
            <div className="fin-row">
              <span>Montant Total HT</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {formatAmount(invoice.total_ht)} {currency}
              </span>
            </div>

            <div className="fin-row">
              <span>Taxe sur la Valeur Ajoutée (TVA)</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#34d399" }}>
                {formatAmount(invoice.tax)} {currency}
              </span>
            </div>

            <div className="fin-row total-ttc-row">
              <span>Total TTC à Payer</span>
              <span className="amount-highlight">
                {formatAmount(invoice.total_ttc)} {currency}
              </span>
            </div>
          </div>

          <div style={{ fontSize: "0.78rem", color: "#94a3b8", display: "flex", gap: "6px", alignItems: "center" }}>
            <span>🔒</span>
            <span>Enregistrement persistant dans MongoDB Atlas</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceResult;