import { DashboardDatePicker } from "../desktop/DashboardDatePicker";

export function LueurTopbarActions({
  selectedDate,
  onDateChange,
  today,
  datesWithData,
  syncing,
  syncLabel,
  onRefresh,
}) {
  return (
    <div className="lueur-toolbar">
      <DashboardDatePicker
        variant="lueur"
        value={selectedDate}
        onChange={onDateChange}
        today={today}
        datesWithData={datesWithData}
      />
      <div className="lueur-sync-badge">
        <span className={`lueur-sync-dot${syncing ? " is-syncing" : ""}`} />
        <span>{syncLabel}</span>
      </div>
      <button
        type="button"
        className="lueur-btn-sync"
        onClick={onRefresh}
        disabled={syncing}
      >
        {syncing ? "Synchro…" : "Synchroniser"}
      </button>
    </div>
  );
}
