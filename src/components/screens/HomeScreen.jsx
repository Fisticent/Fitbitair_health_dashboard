import { RingGauge } from "../RingGauge";

const ZONE_LABEL = { green: "Récupéré", yellow: "Modéré", red: "Fatigué" };

export function HomeScreen({ data, onNavigate }) {
  const { recovery, strain, sleep, focus_date, profile } = data;

  return (
    <div className="screen home-screen">
      <header className="screen-header">
        <div>
          <p className="date-label">{formatDate(focus_date)}</p>
          <h1 className="brand">X·HEALTH</h1>
        </div>
        <span className="age-badge">{profile.age} ans</span>
      </header>

      <section className="hero-recovery" onClick={() => onNavigate("strain")}>
        <RingGauge
          value={recovery.score}
          max={100}
          size={220}
          stroke={12}
          color={recovery.color}
          label={ZONE_LABEL[recovery.zone]}
        />
        <p className="hero-title">Récupération</p>
        <p className="hero-sub">Score maison · Google Health API</p>
      </section>

      <div className="pillar-row">
        <button type="button" className="pillar-card strain" onClick={() => onNavigate("strain")}>
          <RingGauge value={strain.score} max={100} size={88} stroke={6} color="var(--strain)">
            <span className="mini-value">{strain.score}%</span>
          </RingGauge>
          <div>
            <span className="pillar-name">Charge</span>
            <span className="pillar-meta">{strain.label}</span>
          </div>
        </button>

        <button type="button" className="pillar-card sleep" onClick={() => onNavigate("sleep")}>
          <RingGauge value={sleep.score} max={100} size={88} stroke={6} color="var(--sleep)">
            <span className="mini-value">{sleep.score}%</span>
          </RingGauge>
          <div>
            <span className="pillar-name">Sommeil</span>
            <span className="pillar-meta">{sleep.hours}h · besoin {sleep.need}h</span>
          </div>
        </button>
      </div>

      <section className="card vitals-preview" onClick={() => onNavigate("health")}>
        <h3>Moniteur santé</h3>
        <div className="vital-chips">
          {recovery.components.hrv.value && (
            <span className="chip">HRV {Math.round(recovery.components.hrv.value)} ms</span>
          )}
          {recovery.components.rhr.value && (
            <span className="chip">RHR {recovery.components.rhr.value} bpm</span>
          )}
          {recovery.components.respiratory.value && (
            <span className="chip">RR {recovery.components.respiratory.value}/min</span>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDate(iso) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}
