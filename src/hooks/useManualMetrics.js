import { useCallback, useEffect, useState } from "react";

const KEY = "xhealth_manual";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** Latest manual body-fat % on or before `date`. */
export function resolveManualBodyFat(date) {
  const series = readAll().body_fat;
  if (!series || typeof series !== "object") return { pct: null, sourceDate: null };

  if (series[date] != null) {
    return { pct: series[date], sourceDate: date, isExactDate: true };
  }

  const prior = Object.keys(series)
    .filter((d) => d <= date)
    .sort();
  if (!prior.length) return { pct: null, sourceDate: null };

  const d = prior[prior.length - 1];
  return { pct: series[d], sourceDate: d, isExactDate: false };
}

export function useManualBodyFat(date) {
  const [resolved, setResolved] = useState(() => resolveManualBodyFat(date));

  useEffect(() => {
    setResolved(resolveManualBodyFat(date));
  }, [date]);

  const saveBodyFat = useCallback(
    (pct) => {
      const all = readAll();
      if (!all.body_fat) all.body_fat = {};

      if (pct === "" || pct == null || Number.isNaN(Number(pct))) {
        delete all.body_fat[date];
      } else {
        const n = Math.min(60, Math.max(3, Math.round(Number(pct) * 10) / 10));
        all.body_fat[date] = n;
      }

      writeAll(all);
      setResolved(resolveManualBodyFat(date));
    },
    [date],
  );

  const clearBodyFat = useCallback(() => {
    const all = readAll();
    if (all.body_fat) {
      delete all.body_fat[date];
      writeAll(all);
    }
    setResolved(resolveManualBodyFat(date));
  }, [date]);

  return {
    manualBodyFat: resolved.pct,
    manualDate: resolved.sourceDate,
    isExactDate: resolved.isExactDate,
    saveBodyFat,
    clearBodyFat,
  };
}

export const DEFAULT_STEPS_GOAL = 10000;

export function useStepsGoal() {
  const [goal, setGoal] = useState(() => {
    const all = readAll();
    const n = Number(all.steps_goal);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : DEFAULT_STEPS_GOAL;
  });

  const saveStepsGoal = useCallback((value) => {
    const all = readAll();
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 1000) {
      delete all.steps_goal;
      setGoal(DEFAULT_STEPS_GOAL);
    } else {
      all.steps_goal = Math.min(100000, n);
      setGoal(all.steps_goal);
    }
    writeAll(all);
  }, []);

  return { stepsGoal: goal, saveStepsGoal };
}

export const DEFAULT_CALORIES_GOAL = 2500;

export function useCaloriesGoal() {
  const [goal, setGoal] = useState(() => {
    const all = readAll();
    const n = Number(all.calories_goal);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : DEFAULT_CALORIES_GOAL;
  });

  const saveCaloriesGoal = useCallback((value) => {
    const all = readAll();
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 500) {
      delete all.calories_goal;
      setGoal(DEFAULT_CALORIES_GOAL);
    } else {
      all.calories_goal = Math.min(10000, n);
      setGoal(all.calories_goal);
    }
    writeAll(all);
  }, []);

  return { caloriesGoal: goal, saveCaloriesGoal };
}

export function computeLeanMass(weightKg, bodyFatPct) {
  if (weightKg == null || bodyFatPct == null) return null;
  const fat = weightKg * (bodyFatPct / 100);
  return Math.round((weightKg - fat) * 10) / 10;
}

const EMPTY_PROFILE_OVERRIDES = {
  sex: "",
  dateOfBirth: "",
  height_cm: "",
  weight_kg: "",
};

function readProfileOverrides() {
  const raw = readAll().profile_overrides;
  if (!raw || typeof raw !== "object") return { ...EMPTY_PROFILE_OVERRIDES };
  return { ...EMPTY_PROFILE_OVERRIDES, ...raw };
}

/** Append stored profile overrides to dashboard API query params. */
export function appendProfileOverrideParams(params) {
  const o = readProfileOverrides();
  if (o.sex === "male" || o.sex === "female") params.set("sex", o.sex);
  if (o.dateOfBirth) params.set("dob", o.dateOfBirth);
  const h = Number(o.height_cm);
  if (Number.isFinite(h) && h > 0) params.set("height_cm", String(h));
  const w = Number(o.weight_kg);
  if (Number.isFinite(w) && w > 0) params.set("weight_kg", String(w));
}

export function useProfileOverrides() {
  const [overrides, setOverrides] = useState(readProfileOverrides);

  const saveOverrides = useCallback((patch) => {
    const all = readAll();
    const next = { ...readProfileOverrides(), ...patch };

    if (next.sex !== "male" && next.sex !== "female") next.sex = "";
    if (next.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(next.dateOfBirth)) {
      next.dateOfBirth = "";
    }
    const h = Number(next.height_cm);
    next.height_cm = Number.isFinite(h) && h >= 100 && h <= 250 ? Math.round(h) : "";
    const w = Number(next.weight_kg);
    next.weight_kg =
      Number.isFinite(w) && w >= 30 && w <= 300 ? Math.round(w * 10) / 10 : "";

    const stored = {};
    if (next.sex) stored.sex = next.sex;
    if (next.dateOfBirth) stored.dateOfBirth = next.dateOfBirth;
    if (next.height_cm) stored.height_cm = next.height_cm;
    if (next.weight_kg) stored.weight_kg = next.weight_kg;

    if (Object.keys(stored).length) all.profile_overrides = stored;
    else delete all.profile_overrides;

    writeAll(all);
    setOverrides({ ...EMPTY_PROFILE_OVERRIDES, ...stored });
  }, []);

  const clearOverrides = useCallback(() => {
    const all = readAll();
    delete all.profile_overrides;
    writeAll(all);
    setOverrides({ ...EMPTY_PROFILE_OVERRIDES });
  }, []);

  return { overrides, saveOverrides, clearOverrides };
}
