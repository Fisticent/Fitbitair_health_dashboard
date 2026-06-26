import { LueurCard } from "./LueurCard";
import { ProgressRing } from "./ProgressRing";
import { COLORS } from "./chartUtils";
import { formatConfidence } from "../../data/labels";
import { LueurMetricLabel } from "./LueurInfoTip";

function deltaStatus(delta) {
  if (delta == null) return { label: "—", color: COLORS.GREY, zone: "neutral" };
  if (delta <= -1) return { label: "En avance", color: COLORS.TEAL, zone: "green" };
  if (delta < 1) return { label: "Proche du réel", color: COLORS.BLUE, zone: "blue" };
  if (delta < 3) return { label: "Léger écart", color: COLORS.CORAL, zone: "coral" };
  return { label: "Écart marqué", color: COLORS.CORAL, zone: "red" };
}

function paceStatus(pace, label) {
  if (pace == null) return { label: label || "—", color: COLORS.GREY, zone: "neutral" };
  if (pace < -0.5) return { label: label || "Rajeunissement", color: COLORS.TEAL, zone: "green" };
  if (pace <= 0.5) return { label: label || "Stable", color: COLORS.BLUE, zone: "blue" };
  if (pace <= 2) return { label: label || "Accélération modérée", color: COLORS.CORAL, zone: "coral" };
  return { label: label || "Vieillissement accéléré", color: COLORS.CORAL, zone: "red" };
}

function paceGaugePct(pace) {
  if (pace == null) return 50;
  const clamped = Math.max(-2, Math.min(3, pace));
  return ((clamped + 2) / 5) * 100;
}

function formatPace(pace) {
  if (pace == null) return "—";
  const sign = pace > 0 ? "+" : "";
  return `${sign}${pace.toFixed(2)}`;
}

export function XAgeSection({ physiological_age, pace_of_aging }) {
  if (!physiological_age && !pace_of_aging) return null;

  const pa = physiological_age;
  const delta = pa?.delta_years ?? 0;
  const deltaSt = deltaStatus(delta);
  const ringScore = Math.min(100, Math.max(18, 100 - Math.abs(delta) * 16));

  const pace = pace_of_aging?.pace_years_per_year;
  const paceSt = paceStatus(pace, pace_of_aging?.label);
  const pacePct = paceGaugePct(pace);
  const paceWindowDays = pace_of_aging?.window_days ?? pace_of_aging?.days_needed ?? 21;
  const calibNeeded = pace_of_aging?.days_needed ?? 21;
  const calibDaysLeft = Math.max(0, calibNeeded - (pace_of_aging?.window_days ?? 0));
  const calibPct = Math.round((pace_of_aging?.progress ?? 0) * 100);

  const maxImpact = Math.max(
    1,
    ...(pa?.factors?.map((f) => Math.abs(f.impact)) ?? [1]),
  );

  return (
    <LueurCard style={{ marginTop: 20 }}>
      <LueurMetricLabel id="x_age" as="p" className="lueur-label lueur-card-section-label">
        X-Âge
      </LueurMetricLabel>
      <p className="lueur-meta" style={{ marginBottom: 20 }}>
        Âge fonctionnel estimé et tendance de vieillissement
      </p>

      <div className="lueur-xage-grid">
        {pa && (
          <div className="lueur-xage-block">
            <div className="lueur-xage-hero">
              <ProgressRing
                size={148}
                radius={64}
                stroke={10}
                value={ringScore}
                color={deltaSt.color}
                centerClassName="lueur-ring-center--compact"
              >
                <div className="lueur-ring-label">Âge fonc.</div>
                <div className="lueur-ring-value">
                  {pa.functional_age?.toFixed(1) ?? "—"}
                </div>
                <div className="lueur-ring-sub" style={{ color: deltaSt.color }}>
                  {deltaSt.label}
                </div>
              </ProgressRing>
              <div className="lueur-xage-summary">
                <div className="lueur-xage-stat-row">
                  <span className="lueur-xage-stat-label">Âge réel</span>
                  <span className="lueur-xage-stat-value">{pa.real_age} ans</span>
                </div>
                <div className="lueur-xage-stat-row">
                  <span className="lueur-xage-stat-label">Delta</span>
                  <span
                    className="lueur-xage-stat-value"
                    style={{ color: delta >= 0 ? COLORS.CORAL : COLORS.TEAL }}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta} ans
                  </span>
                </div>
                <div className="lueur-xage-stat-row">
                  <span className="lueur-xage-stat-label">Confiance</span>
                  <span className="lueur-xage-stat-value">{formatConfidence(pa.confidence)}</span>
                </div>
              </div>
            </div>

            {pa.factors?.length > 0 && (
              <div className="lueur-xage-factors">
                <span className="lueur-stat-chart-label">Facteurs</span>
                {pa.factors.map((f) => {
                  const pct = Math.min(100, (Math.abs(f.impact) / maxImpact) * 100);
                  const good = f.impact < 0;
                  return (
                    <div key={f.name} className="lueur-contributor-row">
                      <span
                        className="lueur-contributor-dot"
                        style={{ background: good ? COLORS.TEAL : COLORS.CORAL }}
                      />
                      <div className="lueur-contributor-main">
                        <span className="lueur-contributor-label">{f.name}</span>
                        <div className="lueur-progress-track">
                          <div
                            className="lueur-progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: good ? COLORS.TEAL : COLORS.CORAL,
                            }}
                          />
                        </div>
                      </div>
                      <div className="lueur-contributor-aside">
                        <span
                          className="lueur-contributor-value"
                          style={{ color: good ? COLORS.TEAL : COLORS.CORAL }}
                        >
                          {f.impact >= 0 ? "+" : ""}
                          {f.impact} ans
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {pace_of_aging && (
          <div className="lueur-xage-block lueur-xage-block--pace">
            <LueurMetricLabel id="pace_of_aging" as="span" className="lueur-stat-chart-label">
              Rythme de vieillissement
            </LueurMetricLabel>
            {pace_of_aging.status === "calibrating" ? (
              <>
                <div className="lueur-xage-pace-value-row">
                  <span className="lueur-stat-badge lueur-stat-badge--neutral">
                    En calibrage
                  </span>
                </div>
                <p className="lueur-meta" style={{ margin: "10px 0 14px" }}>
                  Collecte en cours — encore {calibDaysLeft} jour
                  {calibDaysLeft > 1 ? "s" : ""} de données pour estimer la tendance.
                </p>
                <div className="lueur-progress-track">
                  <div
                    className="lueur-progress-fill"
                    style={{ width: `${calibPct}%`, background: COLORS.BLUE }}
                  />
                </div>
                <p className="lueur-meta" style={{ marginTop: 8, fontSize: 11 }}>
                  {pace_of_aging.window_days ?? 0} / {pace_of_aging.days_needed ?? 21} jours
                </p>
              </>
            ) : (
              <>
                <div className="lueur-xage-pace-value-row">
                  <span className="lueur-xage-pace-num">{formatPace(pace)}</span>
                  <span className="lueur-xage-pace-unit">ans/an</span>
                  <span className={`lueur-stat-badge lueur-stat-badge--${paceSt.zone}`}>
                    {paceSt.label}
                  </span>
                </div>
                <p className="lueur-meta" style={{ marginBottom: 16 }}>
                  Tendance sur {paceWindowDays} jours · négatif = rajeunissement
                </p>
                <div className="lueur-xage-pace-track">
                  <div className="lueur-xage-pace-gradient" />
                  <div
                    className="lueur-xage-pace-marker"
                    style={{ left: `${pacePct}%` }}
                    title={pace != null ? `${formatPace(pace)} ans/an` : undefined}
                  />
                </div>
                <div className="lueur-xage-pace-scale">
                  <span>−2</span>
                  <span>0</span>
                  <span>+3</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </LueurCard>
  );
}
