import { useState } from "react";

export function CaloriesGoalEditor({ goal, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(String(goal));
    setEditing(true);
  };

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="steps-goal-editor">
        <input
          type="number"
          className="steps-goal-input"
          min={500}
          max={10000}
          step={50}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
        />
        <button type="button" className="steps-goal-btn" onClick={commit}>
          OK
        </button>
        <button
          type="button"
          className="steps-goal-btn steps-goal-btn--ghost"
          onClick={() => setEditing(false)}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="steps-goal-link"
      onClick={startEdit}
      title="Modifier l'objectif calories total estimé"
    >
      / {goal.toLocaleString("fr-FR")} objectif total
    </button>
  );
}
