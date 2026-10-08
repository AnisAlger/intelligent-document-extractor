import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardResponse, invoicesResponse] =
        await Promise.all([
          fetch("http://127.0.0.1:8000/dashboard"),
          fetch("http://127.0.0.1:8000/invoices"),
        ]);

      const dashboardData =
        await dashboardResponse.json();

      const invoicesData =
        await invoicesResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(
          dashboardData.detail ||
            "Impossible de charger le dashboard."
        );
      }

      if (!invoicesResponse.ok) {
        throw new Error(
          invoicesData.detail ||
            "Impossible de charger les factures."
        );
      }

      setStats(dashboardData);
      setInvoices(invoicesData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatAmount = (value) => {
    return Number(value || 0).toLocaleString(
      "fr-FR",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  const chartData = invoices
    .slice(0, 10)
    .reverse()
    .map((item, index) => ({
      name:
        item.invoice?.invoice_number ||
        `Facture ${index + 1}`,

      HT: Number(
        item.invoice?.total_ht || 0
      ),

      TVA: Number(
        item.invoice?.tax || 0
      ),

      TTC: Number(
        item.invoice?.total_ttc || 0
      ),
    }));

  if (loading) {
    return (
      <div className="dashboard">
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <p className="error-message">
          ❌ {error}
        </p>
      </div>
    );
  }

  return (
    <section className="dashboard">

      <div className="dashboard-header">
        <div>
          <h2>📊 Dashboard</h2>

          <p>
            Vue d'ensemble de vos factures
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadDashboard}
        >
          🔄 Actualiser
        </button>
      </div>

      {/* STATISTIQUES */}

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-icon">
            📄
          </div>

          <div>
            <p className="stat-label">
              Nombre de factures
            </p>

            <h3>
              {stats.total_invoices}
            </h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            💰
          </div>

          <div>
            <p className="stat-label">
              Total HT
            </p>

            <h3>
              {formatAmount(
                stats.total_ht
              )}{" "}
              DZD
            </h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🧾
          </div>

          <div>
            <p className="stat-label">
              Total TVA
            </p>

            <h3>
              {formatAmount(
                stats.total_tax
              )}{" "}
              DZD
            </h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            💵
          </div>

          <div>
            <p className="stat-label">
              Total TTC
            </p>

            <h3>
              {formatAmount(
                stats.total_ttc
              )}{" "}
              DZD
            </h3>
          </div>
        </div>

      </div>

      {/* GRAPHIQUE */}

      <div className="chart-card">

        <div className="chart-header">
          <div>
            <h3>
              📈 Montants des factures
            </h3>

            <p>
              Les 10 dernières factures
            </p>
          </div>
        </div>

        <div className="chart-container">

          {chartData.length === 0 ? (
            <p className="empty-chart">
              Aucune facture disponible.
            </p>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                />

                <YAxis />

                <Tooltip
                  formatter={(value) =>
                    `${formatAmount(value)} DZD`
                  }
                />

                <Legend />

                <Bar
                  dataKey="HT"
                  name="Total HT"
                />

                <Bar
                  dataKey="TVA"
                  name="TVA"
                />

                <Bar
                  dataKey="TTC"
                  name="Total TTC"
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