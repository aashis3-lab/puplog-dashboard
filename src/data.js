import { useCallback, useEffect, useState } from "react";
import { REFRESH_MS, SCRIPT_URL } from "./config.js";

const KEY_STORE = "puplog-view-key";

function store(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

// Only needed when the dashboard is family-only: the family link ends in #key=...
// Everything after # stays in the browser and is never sent to the web host.
function readViewKey() {
  const m = location.hash.match(/key=([^&/]+)/);
  if (m) {
    const key = decodeURIComponent(m[1]);
    store(() => localStorage.setItem(KEY_STORE, key));
    history.replaceState(null, "", location.pathname + location.search + "#/today");
    return key;
  }
  return store(() => localStorage.getItem(KEY_STORE));
}

/** Loads the dashboard data and keeps it fresh while the page is visible. */
export function useDashboard() {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const load = useCallback(async () => {
    const key = readViewKey();
    try {
      const res = await fetch(`${SCRIPT_URL}?route=dashboard${key ? `&key=${encodeURIComponent(key)}` : ""}`);
      const data = await res.json();
      if (data.error === "unauthorized") {
        store(() => localStorage.removeItem(KEY_STORE));
        setState({ data: null, error: "private", loading: false });
        return;
      }
      setState({ data, error: null, loading: false });
    } catch {
      setState(s => ({ ...s, error: s.data ? null : "offline", loading: false, stale: !!s.data }));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { ...state, reload: load };
}

/** Hash routing: #/health/weight → ["health", "weight"]. */
export function useRoute() {
  const parse = () => location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export const navigate = path => { location.hash = `#/${path}`; };
