import { useCallback, useEffect, useRef, useState } from "react";
import { API_CREDENTIALS } from "./useAuth";
import { appendProfileOverrideParams } from "./useManualMetrics";

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DASHBOARD_FETCH_TIMEOUT_MS = 120_000;

export function useDashboard({ enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [syncMessage, setSyncMessage] = useState(null);
  const skipNextLoad = useRef(false);

  const load = useCallback(async (day, { initial = false } = {}) => {
    if (initial) setLoading(true);
    else setSyncing(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ date: day, _: String(Date.now()) });
      appendProfileOverrideParams(qs);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_FETCH_TIMEOUT_MS);
      const res = await fetch(`/api/dashboard?${qs}`, {
        ...API_CREDENTIALS,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      // Adopt the date the backend actually used (it may fall back to J-1 when
      // today has no sleep/rest yet). Skip the resulting effect re-fetch.
      if (json.focus_date && initial && json.focus_date !== selectedDate) {
        skipNextLoad.current = true;
        setSelectedDate(json.focus_date);
      }
      return json;
    } catch (e) {
      const msg =
        e.name === "AbortError"
          ? "La synchronisation Google Health prend trop de temps (120 s). Vérifiez que l'API tourne sur le port 8000."
          : e.message;
      setError(msg);
      return null;
    } finally {
      if (initial) setLoading(false);
      else setSyncing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const qs = new URLSearchParams({ date: selectedDate, _: String(Date.now()) });
      appendProfileOverrideParams(qs);
      const res = await fetch(`/api/refresh?${qs}`, { method: "POST", ...API_CREDENTIALS });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Échec de la synchronisation (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      const at = json.synced_at
        ? new Date(json.synced_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "maintenant";
      setSyncMessage(`Synchronisé à ${at}`);
      setTimeout(() => setSyncMessage(null), 4000);
      return json;
    } catch (e) {
      setError(e.message);
      setSyncMessage(null);
      return null;
    } finally {
      setRefreshing(false);
      setSyncing(false);
    }
  }, [selectedDate]);

  const initialLoad = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    load(selectedDate, { initial: initialLoad.current });
    initialLoad.current = false;
  }, [selectedDate, load, enabled]);

  const changeDate = (day) => {
    if (day) setSelectedDate(day);
  };

  return {
    data,
    loading,
    syncing,
    refreshing,
    error,
    selectedDate,
    setSelectedDate: changeDate,
    refresh,
    syncMessage,
    reload: () => load(selectedDate),
  };
}
