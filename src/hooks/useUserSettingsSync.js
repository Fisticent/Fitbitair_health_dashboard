import { useCallback, useEffect, useState } from "react";
import { API_CREDENTIALS } from "./useAuth";
import {
  configureUserSettingsSync,
  readAll,
  writeAllLocal,
  localSettingsPayload,
  applyRemoteSettings,
} from "./useManualMetrics";

function hasLocalData(data) {
  if (!data || typeof data !== "object") return false;
  if (data.profile_overrides && Object.keys(data.profile_overrides).length) return true;
  if (data.body_fat && Object.keys(data.body_fat).length) return true;
  if (data.steps_goal != null) return true;
  if (data.calories_goal != null) return true;
  return false;
}

function hasRemoteData(data) {
  return hasLocalData(data);
}

const SETTINGS_SYNC_TIMEOUT_MS = 10_000;

export function useUserSettingsSync({ enabled = false } = {}) {
  const [ready, setReady] = useState(!enabled);

  const push = useCallback(async (data) => {
    const res = await fetch("/api/user-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(localSettingsPayload(data)),
      ...API_CREDENTIALS,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `HTTP ${res.status}`);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      configureUserSettingsSync({ enabled: false });
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    configureUserSettingsSync({ enabled: true, push });

    (async () => {
      setReady(false);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SETTINGS_SYNC_TIMEOUT_MS);
      try {
        const res = await fetch("/api/user-settings", {
          ...API_CREDENTIALS,
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const remote = await res.json();
        const local = readAll();

        if (hasRemoteData(remote)) {
          applyRemoteSettings(remote);
        } else if (hasLocalData(local)) {
          await push(local);
        }
      } catch {
        // Offline, timeout, or API unavailable — keep local cache.
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      configureUserSettingsSync({ enabled: false });
    };
  }, [enabled, push]);

  return { ready };
}
