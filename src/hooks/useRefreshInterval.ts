import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import {
  setLiveStatusRefreshIntervalMs,
  triggerManualRefresh,
} from "@/services/wsStore";
import {
  REFRESH_INTERVAL_OPTIONS,
  normalizeRefreshIntervalMs,
  type RefreshIntervalOption,
} from "@/utils/themeSettings";

const REFRESH_STORAGE_KEY = "komaritheme:refresh-interval";

const listeners = new Set<() => void>();

function readStoredInterval(): RefreshIntervalOption | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = Number(raw);
    if (REFRESH_INTERVAL_OPTIONS.includes(parsed as RefreshIntervalOption)) {
      return parsed as RefreshIntervalOption;
    }
  } catch {}
  return null;
}

let visitorOverride: RefreshIntervalOption | null = readStoredInterval();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): RefreshIntervalOption | null {
  return visitorOverride;
}

export function setVisitorRefreshInterval(ms: RefreshIntervalOption | null) {
  visitorOverride = ms;
  if (typeof window !== "undefined") {
    try {
      if (ms == null) localStorage.removeItem(REFRESH_STORAGE_KEY);
      else localStorage.setItem(REFRESH_STORAGE_KEY, String(ms));
    } catch {}
  }
  emit();
}

export function useRefreshInterval() {
  const override = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const themeSettings = useThemeSettings();
  const intervalMs: RefreshIntervalOption =
    override ?? normalizeRefreshIntervalMs(themeSettings.refreshIntervalMs, 2000);

  useEffect(() => {
    setLiveStatusRefreshIntervalMs(intervalMs);
  }, [intervalMs]);

  const setRefreshInterval = useCallback((next: RefreshIntervalOption) => {
    setVisitorRefreshInterval(next);
  }, []);

  const refreshNow = useCallback(() => {
    triggerManualRefresh();
  }, []);

  return {
    intervalMs,
    isPaused: intervalMs === 0,
    setRefreshInterval,
    refreshNow,
  };
}
