import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="recharts-custom-tooltip">
        <p className="tooltip-title">📄 {label}</p>
        {payload.map((entry, index) => (
          <div className="tooltip-row" key={`tooltip-item-${index}`}>
            <span style={{ color: entry.color, fontWeight: 600 }}>
              {entry.name} :
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {Number(entry.value).toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              DZD
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [dashboardResponse, invoicesResponse] = await Promise.all([
        fetch("http://127.0.0.1:8000/dashboard"),
        fetch("http://127.0.0.1:8000/invoices"),
      ]);

      const dashboardData = await dashboardResponse.json();
      const invoicesData = await invoicesResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(
          dashboardData.detail || "Impossible de charger le tableau de bord."
        );
      }

      if (!invoicesResponse.ok) {
        throw new Error(
          invoicesData.detail || "Impossible de charger les factures."
        );
      }

      setStats(dashboardData);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatAmount = (value) => {
    return Number(value || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="dashboard-root" style={{ padding: "60px 0", textAlign: "center" }}>
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
          Agrégation des statistiques et des analyses financières...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-root">
        <div className="alert-box-pro danger">
          <span style={{ fontSize: "1.3rem" }}>⚠️</span>
          <div>
            <strong>Erreur de chargement du tableau de bord :</strong> {error}
          </div>
        </div>
        <button
          className="btn-action-refresh"
          onClick={() => loadDashboard(true)}
          style={{ alignSelf: "flex-start", marginTop: "12px" }}
        >
          🔄 Réessayer
        </button>
      </div>
    );
  }

  const chartData = invoices
    .slice(0, 10)
    .reverse()
    .map((item, index) => {
      const inv = item.invoice || {};
      return {
        name: inv.invoice_number || `Facture ${index + 1}`,
        HT: Number(inv.total_ht || 0),
        TVA: Number(inv.tax || 0),
        TTC: Number(inv.total_ttc || 0),
        supplier: inv.supplier || "Fournisseur non spécifié",
      };
    });

  const avgTaxRate =
    stats?.total_ht > 0
      ? ((stats.total_tax / stats.total_ht) * 100).toFixed(1)
      : "19.0";

  return (
    <section className="dashboard-root fade-in">
      {/* Top Header Row */}
      <div className="dashboard-top-row">
        <div className="dashboard-title-area">
          <h2>Tableau de bord financier</h2>
          <p>
            Synthèse en temps réel des documents traités, des montants agrégés et des taxes
          </p>
        </div>

        <button
          type="button"
          className="btn-action-refresh"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          title="Actualiser les métriques"
        >
          <span
            style={{
              display: "inline-block",
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          >
            🔄
          </span>
          <span>{refreshing ? "Mise à jour..." : "Actualiser les données"}</span>
        </button>
      </div>

      {/* KPI METRICS GRID */}
      <div className="kpi-metrics-grid">
        {/* KPI 1: Factures totales */}
        <div className="kpi-metric-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Factures traitées</span>
            <div className="kpi-icon-badge blue">📄</div>
          </div>
          <div>
            <h3 className="kpi-card-value">{stats?.total_invoices ?? 0}</h3>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-trend-pill positive">✓ Indexées</span>
            <span>Dans la base MongoDB Atlas</span>
          </div>
        </div>

        {/* KPI 2: Total HT */}
        <div className="kpi-metric-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Montant total HT</span>
            <div className="kpi-icon-badge indigo">💰</div>
          </div>
          <div>
            <h3 className="kpi-card-value">
              {formatAmount(stats?.total_ht)}{" "}
              <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>DZD</span>
            </h3>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-trend-pill positive">Net HT</span>
            <span>Hors charges fiscales</span>
          </div>
        </div>

        {/* KPI 3: Total TVA */}
        <div className="kpi-metric-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">TVA cumulée</span>
            <div className="kpi-icon-badge emerald">🧾</div>
          </div>
          <div>
            <h3 className="kpi-card-value">
              {formatAmount(stats?.total_tax)}{" "}
              <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>DZD</span>
            </h3>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-trend-pill positive">~{avgTaxRate}%</span>
            <span>Taux effectif moyen</span>
          </div>
        </div>

        {/* KPI 4: Total TTC */}
        <div
          className="kpi-metric-card"
          style={{
            borderColor: "rgba(99, 102, 241, 0.4)",
            background: "linear-gradient(180deg, #ffffff 0%, #f8faff 100%)",
          }}
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Total consolidé TTC</span>
            <div className="kpi-icon-badge purple">💵</div>
          </div>
          <div>
            <h3 className="kpi-card-value" style={{ color: "#4f46e5" }}>
              {formatAmount(stats?.total_ttc)}{" "}
              <span style={{ fontSize: "0.95rem", color: "#6366f1" }}>DZD</span>
            </h3>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-trend-pill positive">Total TTC</span>
            <span>Montant définitif à payer</span>
          </div>
        </div>
      </div>

      {/* ANALYTICS RECHARTS GRAPH */}
      <div className="chart-card-pro">
        <div className="chart-card-header">
          <div>
            <h3>Évolution des montants par facture</h3>
            <p>Comparaison des composantes HT, TVA et TTC (10 dernières factures)</p>
          </div>

          <div className="chart-legend-custom">
            <div className="legend-chip">
              <span className="legend-color-dot" style={{ background: "#4f46e5" }} />
              <span>Total HT</span>
            </div>
            <div className="legend-chip">
              <span className="legend-color-dot" style={{ background: "#10b981" }} />
              <span>TVA</span>
            </div>
            <div className="legend-chip">
              <span className="legend-color-dot" style={{ background: "#0ea5e9" }} />
              <span>Total TTC</span>
            </div>
          </div>
        </div>

        <div className="chart-viewport">
          {chartData.length === 0 ? (
            <div className="empty-state-card" style={{ padding: "80px 20px" }}>
              <div className="empty-state-icon">📊</div>
              <h4>Aucune facture enregistrée pour le moment</h4>
              <p>Importez votre premier document pour visualiser les statistiques financières ici.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 15, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="barGradientHT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="barGradientTVA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="barGradientTTC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.7} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  dy={10}
                />

                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) =>
                    val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                  }
                />

                <Tooltip content={<CustomChartTooltip />} />

                <Bar
                  dataKey="HT"
                  name="Total HT"
                  fill="url(#barGradientHT)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="TVA"
                  name="TVA"
                  fill="url(#barGradientTVA)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="TTC"
                  name="Total TTC"
                  fill="url(#barGradientTTC)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;