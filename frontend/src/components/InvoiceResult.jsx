function InvoiceResult({ result }) {
  const invoice = result.invoice;

  return (
    <div className="invoice-result">
      <h2>Résultat de l'extraction</h2>

      <div className="invoice-info">
        <div className="info-item">
          <span>N° de facture</span>
          <strong>{invoice.invoice_number || "—"}</strong>
        </div>

        <div className="info-item">
          <span>Date d'émission</span>
          <strong>{invoice.issue_date || "—"}</strong>
        </div>

        <div className="info-item">
          <span>Date d'échéance</span>
          <strong>{invoice.due_date || "—"}</strong>
        </div>

        <div className="info-item">
          <span>Fournisseur</span>
          <strong>{invoice.supplier || "—"}</strong>
        </div>

        <div className="info-item">
          <span>Client</span>
          <strong>{invoice.customer || "—"}</strong>
        </div>

        <div className="info-item">
          <span>Total HT</span>
          <strong>
            {invoice.total_ht !== null && invoice.total_ht !== undefined
              ? `${invoice.total_ht.toLocaleString("fr-FR")} ${invoice.currency || ""}`
              : "—"}
          </strong>
        </div>

        <div className="info-item">
          <span>TVA</span>
          <strong>
            {invoice.tax !== null && invoice.tax !== undefined
              ? `${invoice.tax.toLocaleString("fr-FR")} ${invoice.currency || ""}`
              : "—"}
          </strong>
        </div>

        <div className="info-item">
          <span>Total TTC</span>
          <strong>
            {invoice.total_ttc !== null && invoice.total_ttc !== undefined
              ? `${invoice.total_ttc.toLocaleString("fr-FR")} ${invoice.currency || ""}`
              : "—"}
          </strong>
        </div>
      </div>

      <div className="file-info">
        📄 Fichier : <strong>{result.filename}</strong>
      </div>
    </div>
  );
}

export default InvoiceResult;