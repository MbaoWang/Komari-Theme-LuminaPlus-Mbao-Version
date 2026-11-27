import { useCallback, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import {
  isCurrencyPreference,
  resolveDisplayCurrency,
  type CurrencyPreference,
  type DisplayCurrency,
} from "@/utils/currency";

const CURRENCY_STORAGE_KEY = "komaritheme:currency";

const listeners = new Set<() => void>();

function readStoredCurrency(): CurrencyPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (isCurrencyPreference(raw)) return raw;
  } catch {}
  return null;
}

let visitorOverride: CurrencyPreference | null = readStoredCurrency();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CurrencyPreference | null {
  return visitorOverride;
}

export function setVisitorCurrencyPreference(pref: CurrencyPreference | null) {
  visitorOverride = pref;
  if (typeof window !== "undefined") {
    try {
      if (pref == null) localStorage.removeItem(CURRENCY_STORAGE_KEY);
      else localStorage.setItem(CURRENCY_STORAGE_KEY, pref);
    } catch {}
  }
  emit();
}

export function useCurrency() {
  const override = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const themeSettings = useThemeSettings();
  const { resolvedLanguage } = useI18n();

  const preference: CurrencyPreference =
    override ?? themeSettings.defaultCostCurrency ?? "auto";
  const resolvedCurrency: DisplayCurrency = resolveDisplayCurrency(
    preference,
    resolvedLanguage,
  );

  const setCurrencyPreference = useCallback((next: CurrencyPreference) => {
    setVisitorCurrencyPreference(next);
  }, []);

  return {
    currencyPreference: preference,
    resolvedCurrency,
    isAuto: preference === "auto",
    setCurrencyPreference,
  };
}
