import { useState, useEffect } from "react";
import { LueurCard } from "./LueurCard";
import { formatSyncTime } from "./chartUtils";
import { LueurMetricLabel } from "./LueurInfoTip";
import { StepsGoalEditor } from "../desktop/StepsGoalEditor";
import { CaloriesGoalEditor } from "../desktop/CaloriesGoalEditor";

const SEX_LABELS = {
  male: "Homme",
  female: "Femme",
  unknown: "Non renseigné",
};

function SourceHint({ google, override, label }) {
  if (override) {
    return <span className="lueur-profile-source lueur-profile-source--manual">Saisie manuelle</span>;
  }
  if (google != null && google !== "" && google !== "unknown") {
    return <span className="lueur-profile-source">Google Health</span>;
  }
  return <span className="lueur-profile-source lueur-profile-source--missing">{label || "Non disponible"}</span>;
}

export function ProfileView({
  profile,
  synced_at,
  overrides,
  saveOverrides,
  clearOverrides,
  stepsGoal,
  saveStepsGoal,
  caloriesGoal,
  saveCaloriesGoal,
  onSaved,
}) {
  const [draft, setDraft] = useState({
    sex: overrides.sex || "",
    dateOfBirth: overrides.dateOfBirth || "",
    height_cm: overrides.height_cm || "",
    weight_kg: overrides.weight_kg || "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft({
      sex: overrides.sex || "",
      dateOfBirth: overrides.dateOfBirth || "",
      height_cm: overrides.height_cm || "",
      weight_kg: overrides.weight_kg || "",
    });
  }, [overrides]);

  const activeFields = profile?.override_fields || [];
  const hasOverrides =
    activeFields.length > 0 ||
    draft.sex ||
    draft.dateOfBirth ||
    draft.height_cm ||
    draft.weight_kg;

  const handleSave = () => {
    saveOverrides(draft);
    onSaved?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    clearOverrides();
    setDraft({ sex: "", dateOfBirth: "", height_cm: "", weight_kg: "" });
    onSaved?.();
  };

  return (
    <div>
      <div className="lueur-section-title">Profil</div>
      <div className="lueur-section-sub">
        Données personnelles · BMR, X-Âge et composition
      </div>

      <div className="lueur-panel-section">
        <LueurCard>
          <LueurMetricLabel id="profile_identity" as="p" className="lueur-label lueur-card-section-label">
            Identité
          </LueurMetricLabel>
          <p className="lueur-meta" style={{ marginBottom: 18 }}>
            Google Health ne fournit pas le sexe ni la date de naissance. Complète ici pour
            affiner le métabolisme et l&apos;X-Âge.
          </p>

          <div className="lueur-profile-form">
            <label className="lueur-profile-field">
              <span className="lueur-profile-field-label">
                <LueurMetricLabel id="profile_sex">Sexe biologique</LueurMetricLabel>
                <SourceHint
                  google={profile?.google_sex}
                  override={activeFields.includes("sex")}
                />
              </span>
              <div className="lueur-profile-sex-row">
                {[
                  { id: "male", label: "Homme" },
                  { id: "female", label: "Femme" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`lueur-profile-sex-btn${draft.sex === opt.id ? " is-active" : ""}`}
                    onClick={() => setDraft((d) => ({ ...d, sex: opt.id }))}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`lueur-profile-sex-btn lueur-profile-sex-btn--ghost${!draft.sex ? " is-active" : ""}`}
                  onClick={() => setDraft((d) => ({ ...d, sex: "" }))}
                >
                  Auto
                </button>
              </div>
              <span className="lueur-profile-hint">
                Actuel : {SEX_LABELS[profile?.sex] || "Non renseigné"}
                {profile?.google_sex && profile.google_sex !== "unknown"
                  ? ` · Google : ${SEX_LABELS[profile.google_sex]}`
                  : ""}
              </span>
            </label>

            <label className="lueur-profile-field">
              <span className="lueur-profile-field-label">
                <LueurMetricLabel id="profile_dob">Date de naissance</LueurMetricLabel>
                <SourceHint
                  google={profile?.google_age}
                  override={activeFields.includes("dob")}
                  label="Âge Google uniquement"
                />
              </span>
              <input
                type="date"
                className="lueur-profile-input"
                value={draft.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
              />
              <span className="lueur-profile-hint">
                Âge utilisé : {profile?.age ?? "—"} ans
                {profile?.google_age != null ? ` · Google : ${profile.google_age} ans` : ""}
              </span>
            </label>
          </div>
        </LueurCard>

        <LueurCard style={{ marginTop: 16 }}>
          <LueurMetricLabel id="profile_height" as="p" className="lueur-label lueur-card-section-label">
            Mensurations
          </LueurMetricLabel>
          <p className="lueur-meta" style={{ marginBottom: 18 }}>
            Valeurs de secours si aucune pesée ou taille synchronisée.
          </p>

          <div className="lueur-profile-form lueur-profile-form--grid">
            <label className="lueur-profile-field">
              <span className="lueur-profile-field-label">
                <LueurMetricLabel id="profile_height">Taille (cm)</LueurMetricLabel>
                <SourceHint
                  google={profile?.height_cm}
                  override={activeFields.includes("height_cm")}
                />
              </span>
              <input
                type="number"
                className="lueur-profile-input"
                min={100}
                max={250}
                step={1}
                placeholder={profile?.height_cm ? String(profile.height_cm) : "ex. 175"}
                value={draft.height_cm}
                onChange={(e) => setDraft((d) => ({ ...d, height_cm: e.target.value }))}
              />
            </label>

            <label className="lueur-profile-field">
              <span className="lueur-profile-field-label">
                <LueurMetricLabel id="profile_weight">Poids (kg)</LueurMetricLabel>
                <SourceHint
                  google={profile?.weight_kg}
                  override={activeFields.includes("weight_kg")}
                />
              </span>
              <input
                type="number"
                className="lueur-profile-input"
                min={30}
                max={300}
                step={0.1}
                placeholder={profile?.weight_kg ? String(profile.weight_kg) : "ex. 72"}
                value={draft.weight_kg}
                onChange={(e) => setDraft((d) => ({ ...d, weight_kg: e.target.value }))}
              />
            </label>
          </div>
        </LueurCard>

        <LueurCard style={{ marginTop: 16 }}>
          <LueurMetricLabel id="profile_goals" as="p" className="lueur-label lueur-card-section-label">
            Objectifs
          </LueurMetricLabel>
          <div className="lueur-profile-goals">
            <div className="lueur-profile-goal-row">
              <LueurMetricLabel id="steps">Pas journaliers</LueurMetricLabel>
              <StepsGoalEditor goal={stepsGoal} onSave={saveStepsGoal} />
            </div>
            <div className="lueur-profile-goal-row">
              <LueurMetricLabel id="calories">Calories actives</LueurMetricLabel>
              <CaloriesGoalEditor goal={caloriesGoal} onSave={saveCaloriesGoal} />
            </div>
          </div>
        </LueurCard>

        <LueurCard style={{ marginTop: 16 }}>
          <LueurMetricLabel id="profile_local" as="p" className="lueur-label lueur-card-section-label">
            Source
          </LueurMetricLabel>
          <p className="lueur-meta">
            Données vitales : Google Health
            {synced_at ? ` · dernière sync ${formatSyncTime(synced_at) ?? "—"}` : ""}
          </p>
          <p className="lueur-meta" style={{ marginTop: 8 }}>
            Les réglages de cette page sont stockés localement sur cet appareil.
          </p>
        </LueurCard>

        <div className="lueur-profile-actions">
          <button type="button" className="lueur-btn-sync" onClick={handleSave}>
            Enregistrer
          </button>
          {hasOverrides && (
            <button type="button" className="lueur-profile-reset" onClick={handleReset}>
              Réinitialiser
            </button>
          )}
          {saved && <span className="lueur-profile-saved">Profil mis à jour</span>}
        </div>
      </div>
    </div>
  );
}
