import { useCallback, useEffect, useState } from "react";

const API_CREDENTIALS = { credentials: "include" };

export function useAuth() {
  const [state, setState] = useState({
    loading: true,
    authRequired: false,
    authenticated: false,
    user: null,
    apiReachable: true,
  });

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me", API_CREDENTIALS);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    setState({
      loading: false,
      authRequired: Boolean(data.auth_required),
      authenticated: Boolean(data.authenticated),
      apiReachable: true,
      user: data.authenticated
        ? { email: data.email, name: data.name, picture: data.picture }
        : null,
    });
    return data;
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // API unreachable — don't force the login wall (local often has no OAuth).
      setState({
        loading: false,
        authRequired: false,
        authenticated: false,
        user: null,
        apiReachable: false,
      });
    });
  }, [refresh]);

  const login = useCallback(() => {
    window.location.href = "/api/auth/login";
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", ...API_CREDENTIALS });
    window.location.href = "/";
  }, []);

  return {
    ...state,
    login,
    logout,
    refresh,
  };
}

export { API_CREDENTIALS };
