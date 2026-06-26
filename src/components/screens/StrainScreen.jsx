import { RingGauge } from "../RingGauge";

export function StrainScreen({ data }) {
  const { strain, history } = data;
  const bars = history.slice(-7);

  return (
    <div className="screen strain-screen">
      <header className="screen-header compact">
        <h2>Charge</h2>
        <p className="screen-desc">Charge cardiovasculaire · zones FC Fitbit</p>
      </header>

      <div className="detail-ring">
        <RingGauge
          value={strain.score}
          max={100}
          size={240}
          stroke={14}
          color="var(--strain)"
        >
          <span className="big-value">{strain.score}%</span>
          <span className="ring-label">{strain.label}</span>
          <span className="ring-sublabel">sur 100</span>
        </RingGauge>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-num">{strain.zone_minutes}</span>
          <span className="stat-lbl">min zones</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{strain.load}</span>
          <span className="stat-lbl">charge Edwards</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">0–48</span>
          <span className="stat-lbl">léger</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">86–100</span>
          <span className="stat-lbl">maximal</span>
        </div>
      </div>

      <section className="card">
        <h3>7 derniers jours</h3>
        <div className="bar-chart">
          {bars.map((d) => (
            <div key={d.date} className="bar-col">
              <div
                className="bar-fill strain-bar"
                style={{ height: `${d.strain}%` }}
              />
              <span className="bar-day">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
