import { RingGauge } from "../RingGauge";

export function SleepScreen({ data }) {
  const { sleep, history } = data;
  const { stages } = sleep;
  const total = stages.deep_min + stages.rem_min + stages.light_min + stages.awake_min || 1;

  return (
    <div className="screen sleep-screen">
      <header className="screen-header compact">
        <h2>Sommeil</h2>
        <p className="screen-desc">Performance sommeil · stades Fitbit</p>
      </header>

      <div className="detail-ring">
        <RingGauge value={sleep.score} max={100} size={240} stroke={14} color="var(--sleep)">
          <span className="big-value">{sleep.score}%</span>
          <span className="ring-label">Performance</span>
          <span className="ring-sublabel">{sleep.hours}h / {sleep.need}h</span>
        </RingGauge>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-num">{sleep.efficiency}%</span>
          <span className="stat-lbl">efficacité</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{stages.deep_min}m</span>
          <span className="stat-lbl">profond</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{stages.rem_min}m</span>
          <span className="stat-lbl">REM</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{stages.awake_min}m</span>
          <span className="stat-lbl">éveillé</span>
        </div>
      </div>

      <section className="card">
        <h3>Stades</h3>
        <div className="stage-bars">
          {[
            { key: "deep", label: "Profond", min: stages.deep_min, color: "#6366f1" },
            { key: "rem", label: "REM", min: stages.rem_min, color: "#a78bfa" },
            { key: "light", label: "Léger", min: stages.light_min, color: "#4b5563" },
            { key: "awake", label: "Éveillé", min: stages.awake_min, color: "#f59e0b" },
          ].map((s) => (
            <div key={s.key} className="stage-row">
              <span className="stage-label">{s.label}</span>
              <div className="stage-track">
                <div
                  className="stage-fill"
                  style={{ width: `${(s.min / total) * 100}%`, background: s.color }}
                />
              </div>
              <span className="stage-min">{s.min}m</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Trend sommeil (7j)</h3>
        <div className="bar-chart">
          {history.slice(-7).map((d) => (
            <div key={d.date} className="bar-col">
              <div
                className="bar-fill sleep-bar"
                style={{ height: `${d.sleep}%` }}
              />
              <span className="bar-day">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
