import { formatDateLong } from "./chartUtils";
import { LueurComparePanel } from "./LueurCompareCharts";
import { XAgeSection } from "./XAgeSection";
import { AdvancedSignals } from "./AdvancedSignals";
import { Vo2Section } from "./Vo2Section";

function plusViewHasContent({
  history,
  vitals,
  physiological_age,
  pace_of_aging,
  sleep_regularity,
  load_balance,
  hrv_balance,
}) {
  if (history?.length) return true;
  if (vitals?.vo2_max != null) return true;
  if (physiological_age || pace_of_aging) return true;
  if (sleep_regularity || load_balance || hrv_balance) return true;
  return false;
}

export function PlusView({ data, history }) {
  if (!data) {
    return (
      <div>
        <div className="lueur-section-title">Analyses</div>
        <p className="lueur-chart-empty" style={{ marginTop: 20 }}>
          Données indisponibles pour le moment.
        </p>
      </div>
    );
  }

  const {
    focus_date,
    physiological_age,
    pace_of_aging,
    vitals,
    sleep_regularity,
    load_balance,
    hrv_balance,
  } = data;

  const compareHistory = history ?? data.history;
  const hasContent = plusViewHasContent({
    history: compareHistory,
    vitals,
    physiological_age,
    pace_of_aging,
    sleep_regularity,
    load_balance,
    hrv_balance,
  });

  return (
    <div>
      <div className="lueur-section-title">Analyses</div>
      <div className="lueur-section-sub">
        {formatDateLong(focus_date)} · Tendances et indicateurs avancés
      </div>

      {hasContent ? (
        <>
          <div className="lueur-panel-section">
            <LueurComparePanel history={compareHistory} />
          </div>

          <Vo2Section vo2Max={vitals?.vo2_max} />

          <XAgeSection physiological_age={physiological_age} pace_of_aging={pace_of_aging} />

          <AdvancedSignals
            sleep_regularity={sleep_regularity}
            load_balance={load_balance}
            hrv_balance={hrv_balance}
          />
        </>
      ) : (
        <p className="lueur-chart-empty" style={{ marginTop: 20 }}>
          Pas encore assez de données pour afficher les analyses avancées. Synchronisez votre
          appareil et revenez après quelques jours de suivi.
        </p>
      )}
    </div>
  );
}
