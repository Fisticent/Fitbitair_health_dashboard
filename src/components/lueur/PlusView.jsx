import { formatDateLong } from "./chartUtils";
import { LueurComparePanel } from "./LueurCompareCharts";
import { XAgeSection } from "./XAgeSection";
import { AdvancedSignals } from "./AdvancedSignals";

export function PlusView({ data, history }) {
  const {
    focus_date,
    physiological_age,
    pace_of_aging,
    vitals,
    sleep_regularity,
    load_balance,
    hrv_balance,
  } = data;
  const weightSeries = vitals?.weight_history || [];

  return (
    <div>
      <div className="lueur-section-title">Analyses</div>
      <div className="lueur-section-sub">
        {formatDateLong(focus_date)} · Tendances et indicateurs avancés
      </div>

      <div className="lueur-panel-section">
        <LueurComparePanel
          history={history}
          weightSeries={weightSeries}
          weightDate={vitals?.weight_date}
        />
      </div>

      <XAgeSection physiological_age={physiological_age} pace_of_aging={pace_of_aging} />

      <AdvancedSignals
        sleep_regularity={sleep_regularity}
        load_balance={load_balance}
        hrv_balance={hrv_balance}
      />
    </div>
  );
}
