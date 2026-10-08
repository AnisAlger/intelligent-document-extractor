import { useEffect, useState } from "react";

function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:8000/invoices"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de récupérer les factures."
        );
      }

      setInvoices(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleDeleteInvoice = async (invoiceId) => {
  const confirmed = window.confirm(
    "Êtes-vous sûr de vouloir supprimer cette facture ?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setError("");

    const response = await fetch(
      `http://127.0.0.1:8000/invoices/${invoiceId}`,
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

    // Fermer la fenêtre si la facture supprimée était ouverte
    if (
      selectedInvoice &&
      selectedInvoice.id === invoiceId
    ) {
      setSelectedInvoice(null);
    }

    // Recharger l'historique
    await loadInvoices();

  } catch (error) {
    setError(error.message);
  }
};

  const handleViewInvoice = async (invoiceId) => {
    try {
      setError("");

      const response = await fetch(
        `http://127.0.0.1:8000/invoices/${invoiceId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de récupérer la facture."
        );
      }

      setSelectedInvoice(data);
      setEditing(false);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleStartEditing = () => {
    setEditData({
      ...selectedInvoice.invoice,
    });

    setEditing(true);
  };

  const handleEditChange = (field, value) => {
    setEditData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const dataToSend = {
        invoice_number: editData.invoice_number || null,
        issue_date: editData.issue_date || null,
        due_date: editData.due_date || null,
        supplier: editData.supplier || null,
        customer: editData.customer || null,
        total_ht:
          editData.total_ht === "" ||
          editData.total_ht === null
            ? null
            : Number(editData.total_ht),
        tax:
          editData.tax === "" ||
          editData.tax === null
            ? null
            : Number(editData.tax),
        total_ttc:
          editData.total_ttc === "" ||
          editData.total_ttc === null
            ? null
            : Number(editData.total_ttc),
        currency: editData.currency || null,
      };

      const response = await fetch(
        `http://127.0.0.1:8000/invoices/${selectedInvoice.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de modifier la facture."
        );
      }

      setSelectedInvoice({
        ...selectedInvoice,
        invoice: dataToSend,
      });

      setEditing(false);

      await loadInvoices();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (value, currency) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return `${Number(value).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency || ""}`;
  };

  if (loading) {
    return (
      <div className="invoice-history">
        <h2>Historique des factures</h2>
        <p>Chargement des factures...</p>
      </div>
    );
  }

  if (error && !selectedInvoice) {
    return (
      <div className="invoice-history">
        <h2>Historique des factures</h2>

        <div className="error">
          ❌ {error}
        </div>

        <button
          className="extract-button"
          onClick={loadInvoices}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="invoice-history">

      <div className="history-header">
        <div>
          <h2>Historique des factures</h2>

          <p>
            {invoices.length} facture
            {invoices.length > 1 ? "s" : ""} enregistrée
            {invoices.length > 1 ? "s" : ""}
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadInvoices}
        >
          🔄 Actualiser
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">📄</div>

          <h3>Aucune facture</h3>

          <p>
            Les factures que vous analyserez apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="invoice-table-container">

          <table className="invoice-table">

            <thead>
              <tr>
                <th>Facture</th>
                <th>Fournisseur</th>
                <th>Client</th>
                <th>Date</th>
                <th>Total TTC</th>
                <th>Fichier</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {invoices.map((item) => {
                const invoice = item.invoice;

                return (
                  <tr key={item.id}>

                    <td>
                      <strong>
                        {invoice.invoice_number || "—"}
                      </strong>
                    </td>

                    <td>
                      {invoice.supplier || "—"}
                    </td>

                    <td>
                      {invoice.customer || "—"}
                    </td>

                    <td>
                      {invoice.issue_date || "—"}
                    </td>

                    <td>
                      {formatAmount(
                        invoice.total_ttc,
                        invoice.currency
                      )}
                    </td>

                    <td>
                      📄 {item.filename}
                    </td>

                    <td>
                      <div className="action-buttons">

  <button
    className="view-button"
    onClick={() =>
      handleViewInvoice(item.id)
    }
  >
    👁️ Voir
  </button>

  <button
    className="delete-button"
    onClick={() =>
      handleDeleteInvoice(item.id)
    }
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

      {selectedInvoice && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedInvoice(null);
            setEditing(false);
          }}
        >

          <div
            className="invoice-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  Facture{" "}
                  {selectedInvoice.invoice.invoice_number ||
                    "—"}
                </h2>

                <p>
                  {selectedInvoice.filename}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setEditing(false);
                }}
              >
                ✕
              </button>

            </div>

            {error && (
              <div className="error">
                ❌ {error}
              </div>
            )}

            {!editing ? (
              <>
                <div className="modal-grid">

                  <div className="modal-item">
                    <span>N° de facture</span>
                    <strong>
                      {selectedInvoice.invoice.invoice_number ||
                        "—"}
                    </strong>
                  </div>

                  <div className="modal-item">
                    <span>Date d'émission</span>
                    <strong>
                      {selectedInvoice.invoice.issue_date ||
                        "—"}
                    </strong>
                  </div>

                  <div className="modal-item">
                    <span>Date d'échéance</span>
                    <strong>
                      {selectedInvoice.invoice.due_date ||
                        "—"}
                    </strong>
                  </div>

                  <div className="modal-item">
                    <span>Fournisseur</span>
                    <strong>
                      {selectedInvoice.invoice.supplier ||
                        "—"}
                    </strong>
                  </div>

                  <div className="modal-item">
                    <span>Client</span>
                    <strong>
                      {selectedInvoice.invoice.customer ||
                        "—"}
                    </strong>
                  </div>

                  <div className="modal-item">
                    <span>Total HT</span>
                    <strong>
                      {formatAmount(
                        selectedInvoice.invoice.total_ht,
                        selectedInvoice.invoice.currency
                      )}
                    </strong>
                  </div>

                  <div className="modal-item">
                    <span>TVA</span>
                    <strong>
                      {formatAmount(
                        selectedInvoice.invoice.tax,
                        selectedInvoice.invoice.currency
                      )}
                    </strong>
                  </div>

                  <div className="modal-item">
                    <span>Total TTC</span>
                    <strong>
                      {formatAmount(
                        selectedInvoice.invoice.total_ttc,
                        selectedInvoice.invoice.currency
                      )}
                    </strong>
                  </div>

                </div>

                <div className="modal-actions">
                  <button
                    className="edit-button"
                    onClick={handleStartEditing}
                  >
                    ✏️ Modifier
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="edit-form">

                  <div className="form-group">
                    <label>N° de facture</label>
                    <input
                      type="text"
                      value={editData.invoice_number || ""}
                      onChange={(event) =>
                        handleEditChange(
                          "invoice_number",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Date d'émission</label>
                    <input
                      type="text"
                      value={editData.issue_date || ""}
                      onChange={(event) =>
                        handleEditChange(
                          "issue_date",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Date d'échéance</label>
                    <input
                      type="text"
                      value={editData.due_date || ""}
                      onChange={(event) =>
                        handleEditChange(
                          "due_date",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Fournisseur</label>
                    <input
                      type="text"
                      value={editData.supplier || ""}
                      onChange={(event) =>
                        handleEditChange(
                          "supplier",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Client</label>
                    <input
                      type="text"
                      value={editData.customer || ""}
                      onChange={(event) =>
                        handleEditChange(
                          "customer",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Total HT</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.total_ht ?? ""}
                      onChange={(event) =>
                        handleEditChange(
                          "total_ht",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>TVA</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.tax ?? ""}
                      onChange={(event) =>
                        handleEditChange(
                          "tax",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Total TTC</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.total_ttc ?? ""}
                      onChange={(event) =>
                        handleEditChange(
                          "total_ttc",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Devise</label>
                    <input
                      type="text"
                      value={editData.currency || ""}
                      onChange={(event) =>
                        handleEditChange(
                          "currency",
                          event.target.value
                        )
                      }
                    />
                  </div>

                </div>

                <div className="modal-actions">

                  <button
                    className="cancel-button"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Annuler
                  </button>

                  <button
                    className="save-button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving
                      ? "Enregistrement..."
                      : "💾 Enregistrer"}
                  </button>

                </div>
              </>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default InvoiceHistory;
