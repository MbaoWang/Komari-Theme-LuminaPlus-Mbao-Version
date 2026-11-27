import { useCallback, useSyncExternalStore } from "react";
import { useThemeSettings } from "@/hooks/useThemeSettings";

const PRIVACY_STORAGE_KEY = "komaritheme:privacy-mode";

const listeners = new Set<() => void>();

function readStoredPrivacy(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PRIVACY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let privacyEnabled = readStoredPrivacy();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return privacyEnabled;
}

export function setPrivacyModeState(next: boolean) {
  if (privacyEnabled === next) return;
  privacyEnabled = next;
  if (typeof window !== "undefined") {
    try {
      if (next) localStorage.setItem(PRIVACY_STORAGE_KEY, "1");
      else localStorage.removeItem(PRIVACY_STORAGE_KEY);
    } catch {}
  }
  emit();
}

export function usePrivacyMode() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const themeSettings = useThemeSettings();
  const toggleAvailable = themeSettings.enablePrivacyModeToggle;
  const privacyMode = toggleAvailable && stored;

  const setPrivacyMode = useCallback((next: boolean) => {
    setPrivacyModeState(next);
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyModeState(!privacyEnabled);
  }, []);

  return {
    privacyMode,
    toggleAvailable,
    setPrivacyMode,
    togglePrivacyMode,
  };
}
