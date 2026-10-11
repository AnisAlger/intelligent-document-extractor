
import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState("");

  const formatAmount = (value) =>
    Number(value ?? 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Charger l'historique des factures
  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/invoices`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de charger les factures."
        );
      }

      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Exporter les factures en Excel ou PDF
  const handleExport = async (format) => {
    try {
      setError("");
      setExporting(format);

      const endpoint = format === "excel" ? "excel" : "pdf";

      const response = await fetch(
        `${API_URL}/invoices/export/${endpoint}`
      );

      if (!response.ok) {
        let message = "Impossible d'exporter les factures.";

        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // La réponse n'est pas nécessairement du JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download =
        format === "excel" ? "factures.xlsx" : "factures.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      setError(err.message || "Erreur pendant l'exportation.");
    } finally {
      setExporting("");
    }
  };

  // Afficher les détails d'une facture
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setEditingInvoice(null);
  };

  // Préparer la modification
  const handleEditInvoice = (invoice) => {
    setEditingInvoice({
      ...invoice,
      invoice: {
        ...invoice.invoice,
      },
    });

    setSelectedInvoice(null);
  };

  // Enregistrer les modifications
  const handleSaveInvoice = async () => {
    if (!editingInvoice) return;

    try {
      setSaving(true);
      setError("");

      const fields = editingInvoice.invoice;

      const payload = {
        invoice_number: fields.invoice_number || null,
        issue_date: fields.issue_date || null,
        due_date: fields.due_date || null,
        supplier: fields.supplier || null,
        customer: fields.customer || null,
        total_ht:
          fields.total_ht === "" || fields.total_ht == null
            ? null
            : Number(fields.total_ht),
        tax:
          fields.tax === "" || fields.tax == null
            ? null
            : Number(fields.tax),
        total_ttc:
          fields.total_ttc === "" || fields.total_ttc == null
            ? null
            : Number(fields.total_ttc),
        currency: fields.currency || null,
      };

      for (const field of ["total_ht", "tax", "total_ttc"]) {
        if (
          payload[field] !== null &&
          !Number.isFinite(payload[field])
        ) {
          throw new Error(`Le champ ${field} doit être un nombre valide.`);
        }
      }

      const response = await fetch(
        `${API_URL}/invoices/${editingInvoice.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de modifier la facture."
        );
      }

      setEditingInvoice(null);
      await loadInvoices();
    } catch (err) {
      setError(err.message || "Erreur pendant la modification.");
    } finally {
      setSaving(false);
    }
  };

  // Supprimer une facture
  const handleDeleteInvoice = async (invoiceId) => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer cette facture ?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/invoices/${invoiceId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de supprimer la facture."
        );
      }

      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(null);
      }

      if (editingInvoice?.id === invoiceId) {
        setEditingInvoice(null);
      }

      await loadInvoices();
    } catch (err) {
      setError(err.message || "Erreur pendant la suppression.");
    }
  };

  // Mettre à jour un champ du formulaire de modification
  const handleFieldChange = (field, value) => {
    setEditingInvoice((previous) => ({
      ...previous,
      invoice: {
        ...previous.invoice,
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="invoice-history">
        <h2>📋 Historique des factures</h2>
        <p>Chargement des factures...</p>
      </div>
    );
  }

  return (
    <section className="invoice-history">
      <div className="history-header">
        <div>
          <h2>📋 Historique des factures</h2>
          <p>Consultez et gérez les factures enregistrées.</p>
        </div>

        <button
          type="button"
          onClick={loadInvoices}
          disabled={loading}
        >
          🔄 Actualiser
        </button>
      </div>

      {error && (
        <div className="error-box" role="alert">
          ❌ {error}
        </div>
      )}

      <div className="export-buttons">
        <button
          type="button"
          className="export-excel-button"
          onClick={() => handleExport("excel")}
          disabled={Boolean(exporting)}
        >
          {exporting === "excel"
            ? "⏳ Exportation..."
            : "📊 Exporter Excel"}
        </button>

        <button
          type="button"
          className="export-pdf-button"
          onClick={() => handleExport("pdf")}
          disabled={Boolean(exporting)}
        >
          {exporting === "pdf"
            ? "⏳ Exportation..."
            : "📄 Exporter PDF"}
        </button>
      </div>

      <p className="invoice-count">
        {invoices.length} facture(s) enregistrée(s)
      </p>

      {invoices.length === 0 ? (
        <div className="empty-history">
          <p>📭 Aucune facture disponible.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>N° facture</th>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Client</th>
                <th>Total HT</th>
                <th>TVA</th>
                <th>Total TTC</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((item) => {
                const invoice = item.invoice || {};

                return (
                  <tr key={item.id}>
                    <td>
                      {invoice.invoice_number || "Non renseigné"}
                    </td>
                    <td>{invoice.issue_date || "—"}</td>
                    <td>{invoice.supplier || "—"}</td>
                    <td>{invoice.customer || "—"}</td>
                    <td>{formatAmount(invoice.total_ht)}</td>
                    <td>{formatAmount(invoice.tax)}</td>
                    <td>{formatAmount(invoice.total_ttc)}</td>

                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="view-button"
                          onClick={() => handleViewInvoice(item)}
                        >
                          👁️ Voir
                        </button>

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => handleEditInvoice(item)}
                        >
                          ✏️ Modifier
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => handleDeleteInvoice(item.id)}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Fenêtre de consultation */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="invoice-modal">
            <h3>📄 Détails de la facture</h3>

            <p>
              <strong>Fichier :</strong>{" "}
              {selectedInvoice.filename || "—"}
            </p>

            {Object.entries(selectedInvoice.invoice || {}).map(
              ([key, value]) => (
                <p key={key}>
                  <strong>{key} :</strong>{" "}
                  {value == null || value === "" ? "—" : String(value)}
                </p>
              )
            )}

            <button
              type="button"
              onClick={() => setSelectedInvoice(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Fenêtre de modification */}
      {editingInvoice && (
        <div className="modal-overlay">
          <div className="invoice-modal edit-modal">
            <h3>✏️ Modifier la facture</h3>

            <p className="edit-filename">
              Fichier : {editingInvoice.filename || "—"}
            </p>

            {[
              ["invoice_number", "Numéro de facture", "text"],
              ["issue_date", "Date de facture", "text"],
              ["due_date", "Date d'échéance", "text"],
              ["supplier", "Fournisseur", "text"],
              ["customer", "Client", "text"],
              ["total_ht", "Total HT", "number"],
              ["tax", "TVA", "number"],
              ["total_ttc", "Total TTC", "number"],
              ["currency", "Devise", "text"],
            ].map(([field, label, type]) => (
              <label className="edit-field" key={field}>
                <span>{label}</span>

                <input
                  type={type}
                  step={type === "number" ? "any" : undefined}
                  value={editingInvoice.invoice[field] ?? ""}
                  onChange={(event) =>
                    handleFieldChange(field, event.target.value)
                  }
                />
              </label>
            ))}

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                disabled={saving}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "💾 Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default InvoiceHistory;
