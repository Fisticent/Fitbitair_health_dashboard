import { LueurMetricLabel } from "./LueurInfoTip";
import { recoveryContributorStatus, scoreStatusLabel } from "./chartUtils";
import { vitalGaugeConfig } from "./vitalGaugeUtils";
import { formatMetricValue } from "../../utils/formatMetric";

const GOOD_STATUSES = new Set(["Optimal", "Bon"]);

const MONITOR_NAMES = {
  rhr: "FC repos",
  hrv: "VFC",
  Respiration: "Respiration",
};

function positionPct(value, scaleMin, scaleMax) {
  const clamped = Math.max(scaleMin, Math.min(scaleMax, value));
  return ((clamped - scaleMin) / (scaleMax - scaleMin)) * 100;
}

function fmtFr(n, digits = 1) {
  return Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function contributorItem({ label, tipId, value, display, scaleMin, scaleMax, normMin, normMax, rangeLabel, recoveryZ, fallbackScore }) {
  const status =
    recoveryZ != null ? recoveryContributorStatus(recoveryZ) : scoreStatusLabel(fallbackScore);
  return {
    label,
    tipId,
    value,
    display,
    scaleMin,
    scaleMax,
    normMin,
    normMax,
    rangeLabel,
    color: status.color,
    statusText: status.text,
    good: GOOD_STATUSES.has(status.text),
  };
}

function vitalContributor({ label, tipId, monitorName, health_monitor, recoveryZ }) {
  const metric = health_monitor?.find((m) => m.name === monitorName);
  if (metric?.value == null) return null;

  const config = vitalGaugeConfig(metric);
  if (!config) return null;

  const unit = metric.unit === "/min" ? "/min" : metric.unit ? ` ${metric.unit}` : "";
  const rangeUnit = metric.unit === "/min" ? "/min" : metric.unit ? ` ${metric.unit}` : "";

  return contributorItem({
    label,
    tipId,
    value: metric.value,
    display: `${formatMetricValue(monitorName, metric.value)}${unit}`,
    scaleMin: config.scaleMin,
    scaleMax: config.scaleMax,
    normMin: config.normMin,
    normMax: config.normMax,
    rangeLabel: `${formatMetricValue(monitorName, config.scaleMin)} – ${formatMetricValue(monitorName, config.scaleMax)}${rangeUnit}`,
    recoveryZ,
  });
}

/** Prior-day strain: low load supports recovery (same scale as the bar). */
function strainRecoveryZ(priorStrain) {
  return (40 - priorStrain) / 20;
}

export function buildContributors({ recovery, sleep, priorStrain, health_monitor }) {
  const items = [];
  const comp = recovery?.components || {};

  const rhr =
    vitalContributor({
      label: "Fréquence cardiaque au repos",
      tipId: "rhr",
      monitorName: MONITOR_NAMES.rhr,
      health_monitor,
      recoveryZ: comp.rhr?.z,
    }) ||
    (comp.rhr?.value != null
      ? contributorItem({
          label: "Fréquence cardiaque au repos",
          tipId: "rhr",
          value: comp.rhr.value,
          display: `${formatMetricValue("FC repos", comp.rhr.value)} bpm`,
          scaleMin: 45,
          scaleMax: 80,
          normMin: 50,
          normMax: 65,
          rangeLabel: "45 – 80 bpm",
          recoveryZ: comp.rhr?.z,
        })
      : null);
  if (rhr) items.push(rhr);

  const hrv =
    vitalContributor({
      label: "Équilibre HRV",
      tipId: "hrv",
      monitorName: MONITOR_NAMES.hrv,
      health_monitor,
      recoveryZ: comp.hrv?.z,
    }) ||
    (comp.hrv?.value != null
      ? contributorItem({
          label: "Équilibre HRV",
          tipId: "hrv",
          value: comp.hrv.value,
          display: `${formatMetricValue("HRV", comp.hrv.value)} ms`,
          scaleMin: 20,
          scaleMax: 90,
          normMin: 40,
          normMax: 70,
          rangeLabel: "20 – 90 ms",
          recoveryZ: comp.hrv?.z,
        })
      : null);
  if (hrv) items.push(hrv);

  const resp =
    vitalContributor({
      label: "Respiration",
      tipId: "Respiration",
      monitorName: MONITOR_NAMES.Respiration,
      health_monitor,
      recoveryZ: comp.respiratory?.z,
    }) ||
    (comp.respiratory?.value != null
      ? contributorItem({
          label: "Respiration",
          tipId: "Respiration",
          value: comp.respiratory.value,
          display: `${formatMetricValue("Respiration", comp.respiratory.value)}/min`,
          scaleMin: 10,
          scaleMax: 24,
          normMin: 14,
          normMax: 18,
          rangeLabel: "10 – 24 /min",
          recoveryZ: comp.respiratory?.z,
        })
      : null);
  if (resp) items.push(resp);

  if (comp.skin_temp?.value != null) {
    const dev = comp.skin_temp.value;
    items.push(
      contributorItem({
        label: "Température cutanée",
        tipId: "skin_temp",
        value: dev,
        display: `${dev >= 0 ? "+" : ""}${fmtFr(dev, 2)} °C`,
        scaleMin: -1,
        scaleMax: 1,
        normMin: -0.35,
        normMax: 0.35,
        rangeLabel: "−1 / +1 °C",
        recoveryZ: comp.skin_temp?.z,
      }),
    );
  }

  if (sleep?.score != null) {
    items.push(
      contributorItem({
        label: "Sommeil",
        tipId: "sleep",
        value: sleep.score,
        display: `${sleep.score} %`,
        scaleMin: 0,
        scaleMax: 100,
        normMin: 67,
        normMax: 100,
        rangeLabel: "0 – 100 %",
        recoveryZ: comp.sleep_hours?.z,
        fallbackScore: sleep.score,
      }),
    );
  }

  if (comp.sleep_hours?.value != null) {
    const need = comp.sleep_hours.need || 7.5;
    const hours = comp.sleep_hours.value;
    items.push(
      contributorItem({
        label: "Équilibre du sommeil",
        tipId: "sleep_balance",
        value: hours,
        display: `${fmtFr(hours, 1)} h`,
        scaleMin: 5,
        scaleMax: 9,
        normMin: Math.max(5, need - 0.75),
        normMax: Math.min(9, need + 0.75),
        rangeLabel: "5 – 9 h",
        recoveryZ: comp.sleep_hours?.z,
      }),
    );
  }

  if (priorStrain != null) {
    items.push(
      contributorItem({
        label: "Charge de la veille",
        tipId: "strain",
        value: priorStrain,
        display: `${priorStrain} %`,
        scaleMin: 0,
        scaleMax: 100,
        normMin: 0,
        normMax: 40,
        rangeLabel: "0 – 100 %",
        recoveryZ: strainRecoveryZ(priorStrain),
      }),
    );
  }

  return items;
}

function ContributorRangeBar({ scaleMin, scaleMax, normMin, normMax, value, color, rangeLabel }) {
  const normLeft = positionPct(normMin, scaleMin, scaleMax);
  const normWidth = positionPct(normMax, scaleMin, scaleMax) - normLeft;
  const valLeft = positionPct(value, scaleMin, scaleMax);

  return (
    <div className="lueur-contrib-range">
      <div className="lueur-contrib-range-track">
        <span
          className="lueur-contrib-range-norm"
          style={{ left: `${normLeft}%`, width: `${normWidth}%`, background: color }}
        />
        <span
          className="lueur-contrib-range-dot"
          style={{ left: `${valLeft}%`, background: color }}
          aria-hidden="true"
        />
      </div>
      {rangeLabel && <span className="lueur-contrib-range-label">{rangeLabel}</span>}
    </div>
  );
}

function ContributorRangeRow({ item }) {
  return (
    <div className="lueur-contributor-range-row">
      <span className="lueur-contributor-dot" style={{ background: item.color }} aria-hidden="true" />
      <div className="lueur-contributor-range-main">
        <LueurMetricLabel id={item.tipId} as="span" className="lueur-contributor-label">
          {item.label}
        </LueurMetricLabel>
        <ContributorRangeBar
          scaleMin={item.scaleMin}
          scaleMax={item.scaleMax}
          normMin={item.normMin}
          normMax={item.normMax}
          value={item.value}
          color={item.color}
          rangeLabel={item.rangeLabel}
        />
      </div>
      <div className="lueur-contributor-range-aside">
        <span className="lueur-contributor-value">{item.display}</span>
        <span className="lueur-contributor-status" style={{ color: item.color }}>
          {item.statusText}
        </span>
      </div>
    </div>
  );
}

function contributorsSummary(contributors) {
  const goodCount = contributors.filter((c) => c.good).length;
  const watchCount = contributors.filter((c) => c.statusText === "À surveiller").length;
  let tone = "mixte";
  if (watchCount === 0 && goodCount === contributors.length) tone = "homogène";
  else if (watchCount >= 2) tone = "contrasté";
  return { tone, goodCount, watchCount };
}

export function ContributorsPanel({ contributors }) {
  if (!contributors?.length) {
    return <p className="lueur-meta">Aucun contributeur disponible pour ce jour.</p>;
  }

  const { tone, goodCount } = contributorsSummary(contributors);

  return (
    <div className="lueur-contributors-panel">
      <div className="lueur-contributors-head">
        <p className="lueur-contributors-kicker">Impact sur ta récupération</p>
        <p className="lueur-contributors-summary">
          <span className="lueur-contributors-summary-dot" aria-hidden="true" />
          {tone} · {goodCount}/{contributors.length} favorables
        </p>
      </div>
      <div className="lueur-contributors-list">
        {contributors.map((item) => (
          <ContributorRangeRow key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}
