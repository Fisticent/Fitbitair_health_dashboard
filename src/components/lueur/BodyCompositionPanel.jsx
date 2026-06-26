import { LueurMetricLabel } from "./LueurInfoTip";
import { formatMetricValue } from "../../utils/formatMetric";
import { bmiZone, idealTargetZone, weightDeltaZone } from "../../utils/metricStatus";
import { BodyFatEditor } from "../desktop/BodyFatEditor";
import { BmiGauge } from "./BmiGauge";
import { WeightIdealGauge } from "./WeightIdealGauge";
import { BodyFatGauge } from "./BodyFatGauge";

const PILL_ZONE = {
  green: "teal",
  blue: "blue",
  yellow: "amber",
  orange: "coral",
  red: "coral",
  neutral: "neutral",
};

function CompPill({ label, zone }) {
  if (!label || label === "—") return null;
  return (
    <span className={`lueur-body-comp-pill lueur-body-comp-pill--${PILL_ZONE[zone] || "neutral"}`}>
      {label}
    </span>
  );
}

function CompFact({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="lueur-body-comp-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CompChip({ label, tone = "neutral" }) {
  if (!label) return null;
  return <span className={`lueur-body-comp-chip lueur-body-comp-chip--${tone}`}>{label}</span>;
}

export function BodyCompositionPanel({
  vitals,
  bodyFatPct,
  bodyFatIsManual,
  manualDate,
  focusDate,
  leanMassKg,
  saveBodyFat,
  clearBodyFat,
  formatShortDate,
}) {
  const idealWeight = vitals?.ideal_weight;
  const idealBodyFat = vitals?.ideal_body_fat;
  const bmiStatus = bmiZone(vitals?.bmi_category);
  const weightIdealStatus = idealTargetZone(idealWeight);
  const bodyFatIdealStatus = idealTargetZone(idealBodyFat);
  const weightDeltaStatus = weightDeltaZone(vitals?.weight_delta_7d);

  const weightStr =
    vitals?.weight_kg != null ? formatMetricValue("weight", vitals.weight_kg) : null;
  const delta7 =
    vitals?.weight_delta_7d != null
      ? `${vitals.weight_delta_7d >= 0 ? "+" : ""}${vitals.weight_delta_7d} kg`
      : null;

  return (
    <div className="lueur-body-comp">
      <div className="lueur-body-comp-hero">
        <article className="lueur-body-comp-panel lueur-body-comp-panel--primary">
          <header className="lueur-body-comp-head">
            <LueurMetricLabel id="weight" as="span" className="lueur-body-comp-kicker">
              Poids
            </LueurMetricLabel>
            <CompPill
              label={idealWeight?.in_range != null ? weightIdealStatus.label : null}
              zone={weightIdealStatus.zone}
            />
          </header>

          <div className="lueur-body-comp-value-row">
            <span className="lueur-body-comp-value">{weightStr ?? "—"}</span>
            {weightStr && <span className="lueur-body-comp-unit">kg</span>}
          </div>

          <div className="lueur-body-comp-gauge-slot">
            {vitals?.weight_kg != null && idealWeight ? (
              <WeightIdealGauge weightKg={vitals.weight_kg} ideal={idealWeight} />
            ) : (
              <span className="lueur-body-comp-gauge-placeholder" aria-hidden="true" />
            )}
          </div>

          <dl className="lueur-body-comp-facts">
            <CompFact
              label="Cible"
              value={idealWeight ? `${idealWeight.min_kg}–${idealWeight.max_kg} kg` : null}
            />
            <CompFact
              label="Écart"
              value={
                idealWeight?.delta_kg != null
                  ? `${idealWeight.delta_kg > 0 ? "+" : ""}${idealWeight.delta_kg} kg`
                  : null
              }
            />
            <CompFact
              label="Mesure"
              value={vitals?.weight_date ? formatShortDate(vitals.weight_date) : null}
            />
          </dl>

          <div className="lueur-body-comp-panel-foot">
            <div className="lueur-body-comp-chips">
              {vitals?.height_cm != null && <CompChip label={`${vitals.height_cm} cm`} />}
              {delta7 && (
                <CompChip
                  label={`Δ 7 j ${delta7}`}
                  tone={
                    weightDeltaStatus.zone === "green"
                      ? "teal"
                      : weightDeltaStatus.zone === "yellow"
                        ? "amber"
                        : weightDeltaStatus.zone === "orange"
                          ? "coral"
                          : "neutral"
                  }
                />
              )}
            </div>
          </div>
        </article>

        <article className="lueur-body-comp-panel lueur-body-comp-panel--bmi">
          <header className="lueur-body-comp-head">
            <LueurMetricLabel id="bmi" as="span" className="lueur-body-comp-kicker">
              IMC
            </LueurMetricLabel>
            <CompPill label={vitals?.bmi != null ? bmiStatus.label : null} zone={bmiStatus.zone} />
          </header>

          <div className="lueur-body-comp-value-row">
            <span className="lueur-body-comp-value">{vitals?.bmi ?? "—"}</span>
          </div>

          <div className="lueur-body-comp-gauge-slot">
            {vitals?.bmi != null ? (
              <BmiGauge bmi={vitals.bmi} category={vitals.bmi_category} />
            ) : (
              <span className="lueur-body-comp-gauge-placeholder" aria-hidden="true" />
            )}
          </div>

          <dl className="lueur-body-comp-facts">
            <CompFact
              label="Taille"
              value={vitals?.height_cm != null ? `${vitals.height_cm} cm` : null}
            />
            <CompFact label="Poids" value={weightStr != null ? `${weightStr} kg` : null} />
            <CompFact label="Repère" value="18,5–24,9" />
          </dl>

          <div className="lueur-body-comp-panel-foot">
            <p className="lueur-body-comp-note">Indice poids / taille² · repères OMS</p>
          </div>
        </article>
      </div>

      <div className="lueur-body-comp-secondary">
        <article className="lueur-body-comp-panel lueur-body-comp-panel--bodyfat">
          <header className="lueur-body-comp-head">
            <LueurMetricLabel id="body_fat" as="span" className="lueur-body-comp-kicker">
              Masse grasse
            </LueurMetricLabel>
            <CompPill
              label={
                bodyFatPct != null && idealBodyFat?.in_range != null
                  ? bodyFatIdealStatus.label
                  : null
              }
              zone={bodyFatIdealStatus.zone}
            />
          </header>

          <div className="lueur-body-comp-value-row">
            <span className="lueur-body-comp-value">
              {bodyFatPct != null ? formatMetricValue("body fat", bodyFatPct) : "—"}
            </span>
            {bodyFatPct != null && <span className="lueur-body-comp-unit">%</span>}
          </div>

          <div className="lueur-body-comp-gauge-slot">
            {bodyFatPct != null && idealBodyFat ? (
              <BodyFatGauge value={bodyFatPct} ideal={idealBodyFat} />
            ) : (
              <span className="lueur-body-comp-gauge-placeholder" aria-hidden="true" />
            )}
          </div>

          <dl className="lueur-body-comp-facts">
            <CompFact
              label="Cible"
              value={idealBodyFat ? `${idealBodyFat.min_pct}–${idealBodyFat.max_pct} %` : null}
            />
            <CompFact
              label="Écart"
              value={
                idealBodyFat?.delta_pct != null
                  ? `${idealBodyFat.delta_pct > 0 ? "+" : ""}${idealBodyFat.delta_pct} %`
                  : null
              }
            />
            <CompFact
              label="Source"
              value={
                bodyFatIsManual
                  ? manualDate && manualDate !== focusDate
                    ? `Manuel · ${formatShortDate(manualDate)}`
                    : "Saisie manuelle"
                  : "Balance / sync"
              }
            />
          </dl>

          <div className="lueur-body-comp-panel-foot">
            <div className="lueur-body-comp-editor">
              <BodyFatEditor
                value={bodyFatPct}
                isManual={bodyFatIsManual}
                manualDate={manualDate}
                focusDate={focusDate}
                onSave={saveBodyFat}
                onClear={clearBodyFat}
                formatShortDate={formatShortDate}
                hideLabel
                hideValue
              />
            </div>
          </div>
        </article>

        <article className="lueur-body-comp-panel lueur-body-comp-panel--metrics">
          <ul className="lueur-body-comp-metric-list">
            <li>
              <LueurMetricLabel id="lean_mass" as="span" className="lueur-body-comp-metric-label">
                Masse maigre
              </LueurMetricLabel>
              <span className="lueur-body-comp-metric-value">
                {leanMassKg != null ? (
                  <>
                    {formatMetricValue("weight", leanMassKg)}
                    <span className="lueur-body-comp-unit"> kg</span>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </li>
            {vitals?.fat_mass_kg != null && (
              <li>
                <span className="lueur-body-comp-metric-label">Masse grasse</span>
                <span className="lueur-body-comp-metric-value">
                  {formatMetricValue("weight", vitals.fat_mass_kg)}
                  <span className="lueur-body-comp-unit"> kg</span>
                </span>
              </li>
            )}
            <li>
              <LueurMetricLabel id="vo2" as="span" className="lueur-body-comp-metric-label">
                VO₂ max
              </LueurMetricLabel>
              <span className="lueur-body-comp-metric-value">
                {vitals?.vo2_max != null ? (
                  <>
                    {formatMetricValue("vo2", vitals.vo2_max)}
                    <span className="lueur-body-comp-unit"> ml/kg/min</span>
                  </>
                ) : (
                  <span className="lueur-body-comp-metric-empty">Non synchronisé</span>
                )}
              </span>
            </li>
          </ul>
        </article>
      </div>
    </div>
  );
}
