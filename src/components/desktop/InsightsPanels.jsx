import { motion } from "framer-motion";
import { useJournal } from "../../hooks/useJournal";
import { MetricLabel, InfoTip } from "./InfoTip";
import { BodyFatEditor } from "./BodyFatEditor";
import { COVERAGE_STATUS_TIPS, getMetricTip } from "../../data/metricTooltips";
import { formatMetricValue } from "../../utils/formatMetric";

export function ManualBodyFatPanel({
  focusDate,
  bodyFatPct,
  bodyFatIsManual,
  manualDate,
  leanMassKg,
  weightKg,
  onSave,
  onClear,
  formatShortDate,
}) {
  return (
    <motion.section
      className="body-metrics-panel glass-panel span-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <MetricLabel id="body_fat" as="h3">
        Masse grasse
      </MetricLabel>
      <p className="panel-sub">
        Saisie locale — utilisée si aucune donnée balance / Health Connect
      </p>
      <BodyFatEditor
        value={bodyFatPct}
        isManual={bodyFatIsManual}
        manualDate={manualDate}
        focusDate={focusDate}
        onSave={onSave}
        onClear={onClear}
        formatShortDate={formatShortDate}
      />
      {leanMassKg != null && weightKg != null && (
        <p className="card-meta body-metrics-meta">
          Masse maigre estimée : {formatMetricValue("weight", leanMassKg)} kg
          {bodyFatIsManual && " · depuis saisie manuelle"}
        </p>
      )}
    </motion.section>
  );
}

export function JournalPanel({ date }) {
  const { entry, save } = useJournal(date);

  return (
    <motion.section
      className="journal-panel glass-panel span-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <MetricLabel id="journal" as="h3">
        Journal
      </MetricLabel>
      <p className="panel-sub">Saisie locale — corrélée avec récupération et sommeil ci-dessous</p>
      <div className="journal-grid">
        <label>
          Café (tasses)
          <input
            type="number"
            min={0}
            max={12}
            value={entry.coffee}
            onChange={(e) => save({ coffee: Number(e.target.value) })}
          />
        </label>
        <label>
          Alcool
          <select
            value={entry.alcohol ? "yes" : "no"}
            onChange={(e) => save({ alcohol: e.target.value === "yes" })}
          >
            <option value="no">Non</option>
            <option value="yes">Oui</option>
          </select>
        </label>
        <label>
          Stress (1–5)
          <input
            type="range"
            min={1}
            max={5}
            value={entry.stress}
            onChange={(e) => save({ stress: Number(e.target.value) })}
          />
          <span className="range-val">{entry.stress}</span>
        </label>
        <label className="span-note">
          Note
          <textarea
            rows={2}
            value={entry.note}
            onChange={(e) => save({ note: e.target.value })}
            placeholder="Comment tu te sens…"
          />
        </label>
      </div>
    </motion.section>
  );
}

export function CoveragePanel({ items }) {
  if (!items?.length) {
    return (
      <section className="coverage-panel glass-panel span-full">
        <MetricLabel id="coverage" as="h3">
          Couverture KPI (tableau Obsidian)
        </MetricLabel>
        <p className="panel-sub">Aucune donnée de couverture — lance une synchronisation.</p>
      </section>
    );
  }

  const active = items.filter((k) => k.status === "active" && k.has_data);
  const proxy = items.filter((k) => k.status === "proxy" || k.status === "partial");
  const manual = items.filter((k) => k.status === "manual" || k.status === "planned");

  return (
    <motion.section
      className="coverage-panel glass-panel span-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <MetricLabel id="coverage" as="h3">
        Couverture KPI (tableau Obsidian)
      </MetricLabel>
      <p className="panel-sub">
        {active.length} actifs · {proxy.length} estimés · {manual.length} manuel / planifié
      </p>
      <div className="coverage-grid">
        {items.map((k) => {
          const kpiTip = getMetricTip(k.id);
          const statusTip = COVERAGE_STATUS_TIPS[k.status];
          const tip = [kpiTip, statusTip].filter(Boolean).join(" — ");
          return (
            <div
              key={k.id}
              className={`coverage-chip status-${k.status} ${k.has_data ? "has-data" : ""}`}
            >
              <span className="chip-dot" />
              {k.name}
              {tip && <InfoTip text={tip} />}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
