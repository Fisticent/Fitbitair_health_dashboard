import { formatMetricValue } from "../../utils/formatMetric";

const STATUS_DOT = {
  normal: "var(--green)",
  warning: "var(--yellow)",
  alert: "var(--red)",
};

export function HealthScreen({ data }) {
  const { health_monitor, vitals, recovery, history } = data;

  return (
    <div className="screen health-screen">
      <header className="screen-header compact">
        <h2>Moniteur santé</h2>
        <p className="screen-desc">Vitaux vs moyenne personnelle (30 j)</p>
      </header>

      <section className="card monitor-list">
        {health_monitor.map((m) => (
          <div key={m.name} className="monitor-row">
            <div className="monitor-left">
              <span
                className="status-dot"
                style={{ background: STATUS_DOT[m.status] }}
              />
              <div>
                <span className="monitor-name">{m.name}</span>
                <span className="monitor-baseline">moy. {formatMetricValue(m.name, m.baseline)} {m.unit}</span>
              </div>
            </div>
            <div className="monitor-right">
              <span className="monitor-value">
                {formatMetricValue(m.name, m.value)} <small>{m.unit}</small>
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>Activité & corps</h3>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-num">{vitals.steps ?? "—"}</span>
            <span className="stat-lbl">pas</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">{vitals.weight_kg ? `${vitals.weight_kg}` : "—"}</span>
            <span className="stat-lbl">kg</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">{vitals.vo2_max ?? "—"}</span>
            <span className="stat-lbl">VO₂ max</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">
              {recovery.components.sleep_hours.value ?? "—"}h
            </span>
            <span className="stat-lbl">sommeil</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Tendance récupération (7 j)</h3>
        <div className="bar-chart">
          {history.slice(-7).map((d) => (
            <div key={d.date} className="bar-col">
              <div
                className="bar-fill recovery-bar"
                style={{
                  height: `${d.recovery}%`,
                  background:
                    d.recovery >= 67
                      ? "var(--green)"
                      : d.recovery >= 34
                        ? "var(--yellow)"
                        : "var(--red)",
                }}
              />
              <span className="bar-day">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="disclaimer">
        Scores X-Health — méthodologie maison inspirée WHOOP. Non médical.
      </p>
    </div>
  );
}
