import { useCallback, useSyncExternalStore } from "react";
import { toZhTW } from "./zhTw";

export { toZhTW };

export type LanguagePreference = "auto" | "zh-TW" | "zh-CN" | "en";
export type ResolvedLanguage = "zh-TW" | "zh-CN" | "en";

const LANGUAGE_STORAGE_KEY = "komaritheme:language";

export const LANGUAGE_OPTIONS: readonly LanguagePreference[] = [
  "auto",
  "zh-TW",
  "zh-CN",
  "en",
];

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === "auto" || value === "zh-TW" || value === "zh-CN" || value === "en";
}

export function detectBrowserLanguage(
  languages?: readonly string[],
): ResolvedLanguage {
  const candidates =
    languages ??
    (typeof window !== "undefined" && typeof navigator !== "undefined"
      ? navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : navigator.language
          ? [navigator.language]
          : []
      : []);

  // Node/SSR test environment without browser window: default to zh-CN for backwards compatibility.
  if (candidates.length === 0) return "zh-CN";

  for (const raw of candidates) {
    const tag = String(raw || "").trim().toLowerCase().replace(/_/g, "-");
    if (!tag) continue;
    if (
      tag === "zh-tw" ||
      tag === "zh-hk" ||
      tag === "zh-mo" ||
      tag.startsWith("zh-hant")
    ) {
      return "zh-TW";
    }
    if (tag === "zh" || tag.startsWith("zh-")) {
      return "zh-CN";
    }
    if (tag === "en" || tag.startsWith("en-")) {
      return "en";
    }
  }

  return "en";
}

function readStoredLanguage(): LanguagePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguagePreference(raw)) return raw;
  } catch {}
  return "auto";
}

function writeStoredLanguage(value: LanguagePreference) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  } catch {}
}

function resolveLanguage(pref: LanguagePreference): ResolvedLanguage {
  return pref === "auto" ? detectBrowserLanguage() : pref;
}

function applyDocumentLanguage(resolved: ResolvedLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang =
    resolved === "zh-TW" ? "zh-TW" : resolved === "en" ? "en" : "zh-CN";
}

interface LanguageState {
  language: LanguagePreference;
  resolvedLanguage: ResolvedLanguage;
}

const listeners = new Set<() => void>();
let snapshot: LanguageState = (() => {
  const language = readStoredLanguage();
  const resolvedLanguage = resolveLanguage(language);
  applyDocumentLanguage(resolvedLanguage);
  return { language, resolvedLanguage };
})();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

export function setAppLanguage(pref: LanguagePreference) {
  const normalized: LanguagePreference = isLanguagePreference(pref) ? pref : "auto";
  const resolvedLanguage = resolveLanguage(normalized);
  writeStoredLanguage(normalized);
  if (
    snapshot.language === normalized &&
    snapshot.resolvedLanguage === resolvedLanguage
  ) {
    return;
  }
  snapshot = { language: normalized, resolvedLanguage };
  applyDocumentLanguage(resolvedLanguage);
  emit();
}

export function getResolvedLanguage(): ResolvedLanguage {
  return snapshot.resolvedLanguage;
}

export function getIntlLocale(lang: ResolvedLanguage = snapshot.resolvedLanguage): string {
  if (lang === "zh-TW") return "zh-TW";
  if (lang === "en") return "en-US";
  return "zh-CN";
}

export function txStatic(zhCN: string, zhTW: string, en: string): string {
  const lang = snapshot.resolvedLanguage;
  if (lang === "zh-TW") return zhTW;
  if (lang === "en") return en;
  return zhCN;
}

export function zhStatic(zhCN: string, en?: string): string {
  const lang = snapshot.resolvedLanguage;
  if (lang === "zh-TW") return toZhTW(zhCN);
  if (lang === "en" && en) return en;
  return zhCN;
}

export function useI18n() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setLanguage = useCallback((next: LanguagePreference) => {
    setAppLanguage(next);
  }, []);

  const tx = useCallback(
    (zhCN: string, zhTW: string, en: string) => {
      if (state.resolvedLanguage === "zh-TW") return zhTW;
      if (state.resolvedLanguage === "en") return en;
      return zhCN;
    },
    [state.resolvedLanguage],
  );

  const zh = useCallback(
    (zhCN: string, en?: string) => {
      if (state.resolvedLanguage === "zh-TW") return toZhTW(zhCN);
      if (state.resolvedLanguage === "en" && en) return en;
      return zhCN;
    },
    [state.resolvedLanguage],
  );

  return {
    language: state.language,
    resolvedLanguage: state.resolvedLanguage,
    locale: getIntlLocale(state.resolvedLanguage),
    setLanguage,
    tx,
    zh,
  };
}
