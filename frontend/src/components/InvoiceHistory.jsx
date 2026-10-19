import { useEffect, useState, useMemo } from "react";

const API_URL = "http://127.0.0.1:8000";

function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const formatAmount = (value) =>
    Number(value ?? 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Charger l'historique des factures
  const loadInvoices = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/invoices`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de charger les factures.");
      }

      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Erreur de chargement des factures.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Filtered invoices by search query
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter((item) => {
      const inv = item.invoice || {};
      const number = String(inv.invoice_number || "").toLowerCase();
      const supplier = String(inv.supplier || "").toLowerCase();
      const customer = String(inv.customer || "").toLowerCase();
      const filename = String(item.filename || "").toLowerCase();
      const totalTtc = String(inv.total_ttc || "").toLowerCase();
      return (
        number.includes(q) ||
        supplier.includes(q) ||
        customer.includes(q) ||
        filename.includes(q) ||
        totalTtc.includes(q)
      );
    });
  }, [invoices, searchQuery]);

  // Total TTC of filtered
  const filteredTotalTTC = useMemo(() => {
    return filteredInvoices.reduce(
      (sum, item) => sum + (Number(item.invoice?.total_ttc) || 0),
      0
    );
  }, [filteredInvoices]);

  // Exporter les factures en Excel ou PDF
  const handleExport = async (format) => {
    try {
      setError("");
      setExporting(format);

      const endpoint = format === "excel" ? "excel" : "pdf";

      const response = await fetch(`${API_URL}/invoices/export/${endpoint}`);

      if (!response.ok) {
        let message = "Impossible d'exporter les factures.";
        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // not json
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = format === "excel" ? "factures_export.xlsx" : "factures_export.pdf";

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
        if (payload[field] !== null && !Number.isFinite(payload[field])) {
          throw new Error(`Le champ ${field} doit être un nombre valide.`);
        }
      }

      const response = await fetch(`${API_URL}/invoices/${editingInvoice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de modifier la facture.");
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
      "Êtes-vous sûr de vouloir supprimer définitivement cette facture ?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de supprimer la facture.");
      }

      if (selectedInvoice?.id === invoiceId) setSelectedInvoice(null);
      if (editingInvoice?.id === invoiceId) setEditingInvoice(null);

      await loadInvoices();
    } catch (err) {
      setError(err.message || "Erreur pendant la suppression.");
    }
  };

  const handleFieldChange = (field, value) => {
    setEditingInvoice((prev) => ({
      ...prev,
      invoice: {
        ...prev.invoice,
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="invoice-history-root" style={{ padding: "60px 0", textAlign: "center" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            border: "3px solid #e0e7ff",
            borderTopColor: "#4f46e5",
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "var(--text-muted)", fontWeight: 500 }}>
          Chargement de l'historique des factures...
        </p>
      </div>
    );
  }

  return (
    <section className="invoice-history-root fade-in">
      {/* Header Banner */}
      <div className="page-header-banner">
        <div className="page-title-row">
          <h2>Registre & Historique des Factures</h2>
          <span className="page-category-pill">Base documentaire</span>
        </div>
        <p>
          Consultez, recherchez, modifiez et exportez l'ensemble des factures traitées par l'OCR et l'intelligence artificielle.
        </p>
      </div>

      {error && (
        <div className="alert-box-pro danger" role="alert">
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Toolbar: Search & Export Actions */}
      <div className="history-toolbar">
        <div className="search-input-wrapper">
          <span className="search-icon-inside">🔍</span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Rechercher par N° facture, fournisseur, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-actions-group">
          <button
            type="button"
            className="btn-action-refresh"
            onClick={() => loadInvoices(true)}
            disabled={refreshing}
            title="Actualiser la liste"
          >
            <span
              style={{
                display: "inline-block",
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            >
              🔄
            </span>
            <span>{refreshing ? "Actualisation..." : "Actualiser"}</span>
          </button>

          <button
            type="button"
            className="btn-export-excel"
            onClick={() => handleExport("excel")}
            disabled={Boolean(exporting)}
            title="Exporter l'ensemble des factures au format tableur Excel"
          >
            <span>📊</span>
            <span>{exporting === "excel" ? "Exportation..." : "Exporter Excel"}</span>
          </button>

          <button
            type="button"
            className="btn-export-pdf"
            onClick={() => handleExport("pdf")}
            disabled={Boolean(exporting)}
            title="Exporter l'ensemble des factures au format PDF"
          >
            <span>📄</span>
            <span>{exporting === "pdf" ? "Exportation..." : "Exporter PDF"}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Line */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          padding: "0 4px",
        }}
      >
        <span>
          <strong>{filteredInvoices.length}</strong> facture(s) affichée(s)
          {searchQuery && ` (sur ${invoices.length} au total)`}
        </span>
        <span>
          Total sélection :{" "}
          <strong style={{ color: "#4f46e5", fontFamily: "var(--font-mono)" }}>
            {formatAmount(filteredTotalTTC)} DZD
          </strong>
        </span>
      </div>

      {/* Table Container */}
      <div className="table-card-container">
        {filteredInvoices.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">📭</div>
            <h4>Aucune facture trouvée</h4>
            <p>
              {searchQuery
                ? `Aucun document ne correspond à la recherche "${searchQuery}".`
                : "Aucune facture enregistrée pour le moment. Utilisez l'onglet Extraction pour importer votre première facture."}
            </p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Date émission</th>
                  <th>Fournisseur</th>
                  <th>Client</th>
                  <th style={{ textAlign: "right" }}>Total HT</th>
                  <th style={{ textAlign: "right" }}>TVA</th>
                  <th style={{ textAlign: "right" }}>Total TTC</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map((item) => {
                  const invoice = item.invoice || {};
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="invoice-badge-number">
                          {invoice.invoice_number || "Non renseigné"}
                        </span>
                      </td>
                      <td style={{ color: "#64748b", fontSize: "0.82rem" }}>
                        {invoice.issue_date || "—"}
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-main)" }}>
                          {invoice.supplier || "—"}
                        </strong>
                      </td>
                      <td>{invoice.customer || "—"}</td>
                      <td className="amount-cell">
                        {formatAmount(invoice.total_ht)}
                      </td>
                      <td className="amount-cell" style={{ color: "#059669" }}>
                        {formatAmount(invoice.tax)}
                      </td>
                      <td className="amount-cell" style={{ color: "#4f46e5", fontWeight: 700 }}>
                        {formatAmount(invoice.total_ttc)}{" "}
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {invoice.currency || "DZD"}
                        </span>
                      </td>

                      <td>
                        <div className="table-action-buttons" style={{ justifyContent: "center" }}>
                          <button
                            type="button"
                            className="btn-table-action view"
                            onClick={() => handleViewInvoice(item)}
                            title="Consulter les détails du document"
                          >
                            👁️ Voir
                          </button>

                          <button
                            type="button"
                            className="btn-table-action edit"
                            onClick={() => handleEditInvoice(item)}
                            title="Modifier les informations"
                          >
                            ✏️ Éditer
                          </button>

                          <button
                            type="button"
                            className="btn-table-action delete"
                            onClick={() => handleDeleteInvoice(item.id)}
                            title="Supprimer la facture"
                          >
                            🗑️
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
      </div>

      {/* Modal Consultation */}
      {selectedInvoice && (
        <div className="modal-backdrop-blur" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-card-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <div>
                <h3>📄 Détails de la facture</h3>
                <p>Document source : {selectedInvoice.filename || "—"}</p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedInvoice(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-card-body">
              <div className="result-fields-grid" style={{ marginBottom: "20px" }}>
                <div className="result-field-item">
                  <span className="field-label">N° de Facture</span>
                  <strong className="field-val" style={{ color: "#4f46e5", fontFamily: "var(--font-mono)" }}>
                    {selectedInvoice.invoice?.invoice_number || "Non renseigné"}
                  </strong>
                </div>

                <div className="result-field-item">
                  <span className="field-label">Identifiant Unique Atlas</span>
                  <strong className="field-val" style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}>
                    {selectedInvoice.id}
                  </strong>
                </div>

                <div className="result-field-item">
                  <span className="field-label">Fournisseur</span>
                  <strong className="field-val">{selectedInvoice.invoice?.supplier || "—"}</strong>
                </div>

                <div className="result-field-item">
                  <span className="field-label">Client</span>
                  <strong className="field-val">{selectedInvoice.invoice?.customer || "—"}</strong>
                </div>

                <div className="result-field-item">
                  <span className="field-label">Date d'émission</span>
                  <strong className="field-val">{selectedInvoice.invoice?.issue_date || "—"}</strong>
                </div>

                <div className="result-field-item">
                  <span className="field-label">Date d'échéance</span>
                  <strong className="field-val">{selectedInvoice.invoice?.due_date || "—"}</strong>
                </div>
              </div>

              {/* Financial Breakdown Card inside Modal */}
              <div className="financial-summary-card">
                <div className="fin-card-title">Composantes financières</div>
                <div className="fin-rows-group">
                  <div className="fin-row">
                    <span>Total Hors Taxe (HT)</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {formatAmount(selectedInvoice.invoice?.total_ht)}{" "}
                      {selectedInvoice.invoice?.currency || "DZD"}
                    </span>
                  </div>
                  <div className="fin-row">
                    <span>Montant de la TVA</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#34d399" }}>
                      {formatAmount(selectedInvoice.invoice?.tax)}{" "}
                      {selectedInvoice.invoice?.currency || "DZD"}
                    </span>
                  </div>
                  <div className="fin-row total-ttc-row">
                    <span>Total Toutes Taxes Comprises (TTC)</span>
                    <span className="amount-highlight">
                      {formatAmount(selectedInvoice.invoice?.total_ttc)}{" "}
                      {selectedInvoice.invoice?.currency || "DZD"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-action-refresh"
                onClick={() => {
                  handleEditInvoice(selectedInvoice);
                }}
              >
                ✏️ Modifier ce document
              </button>
              <button
                type="button"
                className="btn-launch-extraction"
                style={{ width: "auto", margin: 0, padding: "9px 20px" }}
                onClick={() => setSelectedInvoice(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modification */}
      {editingInvoice && (
        <div className="modal-backdrop-blur" onClick={() => setEditingInvoice(null)}>
          <div className="modal-card-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <div>
                <h3>✏️ Modifier les données de la facture</h3>
                <p>Fichier source : {editingInvoice.filename || "—"}</p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setEditingInvoice(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-card-body">
              <div className="edit-form-grid">
                {[
                  ["invoice_number", "Numéro de facture", "text"],
                  ["issue_date", "Date de facture (AAAA-MM-JJ)", "text"],
                  ["due_date", "Date d'échéance", "text"],
                  ["supplier", "Fournisseur", "text"],
                  ["customer", "Client", "text"],
                  ["total_ht", "Total HT", "number"],
                  ["tax", "Montant TVA", "number"],
                  ["total_ttc", "Total TTC", "number"],
                  ["currency", "Devise monétaire (ex: DZD, EUR)", "text"],
                ].map(([field, label, type]) => (
                  <div className="form-field-group" key={field}>
                    <label>{label}</label>
                    <input
                      type={type}
                      step={type === "number" ? "any" : undefined}
                      value={editingInvoice.invoice[field] ?? ""}
                      onChange={(event) =>
                        handleFieldChange(field, event.target.value)
                      }
                      placeholder={`Saisir ${label.toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-action-refresh"
                onClick={() => setEditingInvoice(null)}
                disabled={saving}
              >
                Annuler
              </button>

              <button
                type="button"
                className="btn-launch-extraction"
                style={{ width: "auto", margin: 0, padding: "9px 24px" }}
                onClick={handleSaveInvoice}
                disabled={saving}
              >
                {saving ? "Sauvegarde en cours..." : "💾 Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default InvoiceHistory;
