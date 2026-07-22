import { useId, useState } from "react";
import { MetricLabel } from "./InfoTip";

export function BodyFatEditor({
  value,
  isManual,
  manualDate,
  focusDate,
  onSave,
  onClear,
  formatShortDate,
  hideLabel = false,
  hideValue = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const startEdit = () => {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
  };

  const commit = () => {
    if (draft === "") {
      onClear();
    } else {
      onSave(draft);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="body-fat-editor">
        {!hideLabel && (
          <MetricLabel id="body_fat" className="vital-lbl">
            Masse grasse
          </MetricLabel>
        )}
        {hideLabel && (
          <label htmlFor={inputId} className="lueur-sr-only">
            Masse grasse (%)
          </label>
        )}
        <div className="body-fat-input-row">
          <input
            id={inputId}
            type="number"
            className="body-fat-input"
            min={3}
            max={60}
            step={0.1}
            placeholder="ex. 18.5"
            aria-label={hideLabel ? undefined : "Masse grasse (%)"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
          />
          <span className="body-fat-unit" aria-hidden="true">
            %
          </span>
          <button type="button" className="body-fat-btn" onClick={commit}>
            OK
          </button>
          <button
            type="button"
            className="body-fat-btn body-fat-btn--ghost"
            onClick={() => setEditing(false)}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="body-fat-display">
      {!hideLabel && (
        <MetricLabel id="body_fat" className="vital-lbl">
          Masse grasse
        </MetricLabel>
      )}
      {!hideValue && (
        <span className="vital-val">
          {value != null ? `${value}%` : "—"}
          {isManual && <span className="manual-badge">manuel</span>}
        </span>
      )}
      {!hideValue && isManual && manualDate && manualDate !== focusDate && (
        <span className="vital-sub">
          saisi le {formatShortDate ? formatShortDate(manualDate) : manualDate}
        </span>
      )}
      <button type="button" className="body-fat-edit-link" onClick={startEdit}>
        {value != null ? "modifier" : "Saisir manuellement"}
      </button>
    </div>
  );
}
