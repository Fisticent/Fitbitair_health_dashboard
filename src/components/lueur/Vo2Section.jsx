import { LueurCard } from "./LueurCard";
import { LueurMetricLabel } from "./LueurInfoTip";
import { formatMetricValue } from "../../utils/formatMetric";

export function Vo2Section({ vo2Max }) {
  if (vo2Max == null) return null;

  return (
    <LueurCard style={{ marginTop: 20 }}>
      <LueurMetricLabel id="vo2" as="p" className="lueur-label lueur-card-section-label">
        Endurance · VO₂ max
      </LueurMetricLabel>
      <p className="lueur-meta" style={{ marginBottom: 16 }}>
        Capacité aérobie · facteur de l&apos;X-Âge
      </p>
      <div className="lueur-vo2-hero">
        <span className="lueur-vo2-value">{formatMetricValue("vo2", vo2Max)}</span>
        <span className="lueur-vo2-unit">ml/kg/min</span>
      </div>
      <p className="lueur-mono-meta" style={{ marginTop: 10 }}>
        Mesure GPS/cardio ou estimation Fitbit · voir aussi X-Âge ci-dessous
      </p>
    </LueurCard>
  );
}
