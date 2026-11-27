import { getResolvedLanguage, type ResolvedLanguage } from "@/i18n";

export type DisplayCurrency =
  | "TWD"
  | "CNY"
  | "USD"
  | "HKD"
  | "EUR"
  | "JPY"
  | "GBP"
  | "SGD"
  | "AUD"
  | "CAD";

export type CurrencyPreference = "auto" | DisplayCurrency;

export const DISPLAY_CURRENCIES: readonly DisplayCurrency[] = [
  "TWD",
  "CNY",
  "USD",
  "HKD",
  "EUR",
  "JPY",
  "GBP",
  "SGD",
  "AUD",
  "CAD",
];

export interface CurrencyMeta {
  code: DisplayCurrency;
  symbol: string;
  decimals: number;
  labelZhCN: string;
  labelZhTW: string;
  labelEn: string;
}

export const CURRENCY_META: Record<DisplayCurrency, CurrencyMeta> = {
  TWD: {
    code: "TWD",
    symbol: "NT$",
    decimals: 2,
    labelZhCN: "新台币 (TWD)",
    labelZhTW: "新台幣 (TWD)",
    labelEn: "TWD (NT$)",
  },
  CNY: {
    code: "CNY",
    symbol: "¥",
    decimals: 2,
    labelZhCN: "人民币 (CNY)",
    labelZhTW: "人民幣 (CNY)",
    labelEn: "CNY (¥)",
  },
  USD: {
    code: "USD",
    symbol: "$",
    decimals: 2,
    labelZhCN: "美元 (USD)",
    labelZhTW: "美元 (USD)",
    labelEn: "USD ($)",
  },
  HKD: {
    code: "HKD",
    symbol: "HK$",
    decimals: 2,
    labelZhCN: "港币 (HKD)",
    labelZhTW: "港幣 (HKD)",
    labelEn: "HKD (HK$)",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    decimals: 2,
    labelZhCN: "欧元 (EUR)",
    labelZhTW: "歐元 (EUR)",
    labelEn: "EUR (€)",
  },
  JPY: {
    code: "JPY",
    symbol: "JP¥",
    decimals: 0,
    labelZhCN: "日元 (JPY)",
    labelZhTW: "日圓 (JPY)",
    labelEn: "JPY (¥)",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    decimals: 2,
    labelZhCN: "英镑 (GBP)",
    labelZhTW: "英鎊 (GBP)",
    labelEn: "GBP (£)",
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    decimals: 2,
    labelZhCN: "新加坡元 (SGD)",
    labelZhTW: "新加坡幣 (SGD)",
    labelEn: "SGD (S$)",
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    decimals: 2,
    labelZhCN: "澳元 (AUD)",
    labelZhTW: "澳幣 (AUD)",
    labelEn: "AUD (A$)",
  },
  CAD: {
    code: "CAD",
    symbol: "C$",
    decimals: 2,
    labelZhCN: "加元 (CAD)",
    labelZhTW: "加幣 (CAD)",
    labelEn: "CAD (C$)",
  },
};

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return (
    typeof value === "string" &&
    DISPLAY_CURRENCIES.includes(value as DisplayCurrency)
  );
}

export function isCurrencyPreference(value: unknown): value is CurrencyPreference {
  return value === "auto" || isDisplayCurrency(value);
}

export function normalizeCurrencyPreference(
  value: unknown,
  fallback: CurrencyPreference = "auto",
): CurrencyPreference {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "auto") return "auto";
  const upper = trimmed.toUpperCase();
  return isDisplayCurrency(upper) ? upper : fallback;
}

const REGION_TO_CURRENCY: Record<string, DisplayCurrency> = {
  TW: "TWD",
  CN: "CNY",
  HK: "HKD",
  MO: "HKD",
  US: "USD",
  JP: "JPY",
  GB: "GBP",
  UK: "GBP",
  SG: "SGD",
  AU: "AUD",
  CA: "CAD",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
  LU: "EUR",
};

const TIMEZONE_TO_CURRENCY: Record<string, DisplayCurrency> = {
  "Asia/Taipei": "TWD",
  "Asia/Hong_Kong": "HKD",
  "Asia/Macau": "HKD",
  "Asia/Shanghai": "CNY",
  "Asia/Chongqing": "CNY",
  "Asia/Harbin": "CNY",
  "Asia/Urumqi": "CNY",
  "Asia/Tokyo": "JPY",
  "Asia/Singapore": "SGD",
  "Europe/London": "GBP",
  "Australia/Sydney": "AUD",
  "Australia/Melbourne": "AUD",
  "America/Toronto": "CAD",
  "America/Vancouver": "CAD",
  "Europe/Berlin": "EUR",
  "Europe/Paris": "EUR",
  "Europe/Amsterdam": "EUR",
  "Europe/Madrid": "EUR",
  "Europe/Rome": "EUR",
};

function currencyFromLocaleTag(rawTag: string): DisplayCurrency | null {
  const tag = rawTag.trim().replace(/_/g, "-");
  if (!tag) return null;
  const parts = tag.split("-");
  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const part = parts[i]?.toUpperCase();
    if (part && part.length === 2 && REGION_TO_CURRENCY[part]) {
      return REGION_TO_CURRENCY[part];
    }
  }
  const lower = tag.toLowerCase();
  if (lower.startsWith("zh-hant")) return "TWD";
  if (lower.startsWith("zh-hans")) return "CNY";
  if (lower === "ja") return "JPY";
  return null;
}

/**
 * 依據系統/瀏覽器語言與地區（含時區兜底）自動推斷最適合的顯示幣別。
 */
export function detectBrowserCurrency(options?: {
  languages?: readonly string[];
  timeZone?: string;
  resolvedLanguage?: ResolvedLanguage;
}): DisplayCurrency {
  const languages =
    options?.languages ??
    (typeof window !== "undefined" && typeof navigator !== "undefined"
      ? navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : navigator.language
          ? [navigator.language]
          : []
      : []);

  for (const tag of languages) {
    const matched = currencyFromLocaleTag(tag);
    if (matched) return matched;
  }

  let timeZone = options?.timeZone;
  if (!timeZone && typeof Intl !== "undefined") {
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}
  }
  if (timeZone && TIMEZONE_TO_CURRENCY[timeZone]) {
    return TIMEZONE_TO_CURRENCY[timeZone];
  }

  const lang = options?.resolvedLanguage ?? getResolvedLanguage();
  if (lang === "zh-TW") return "TWD";
  if (lang === "zh-CN") return "CNY";
  return "USD";
}

export function resolveDisplayCurrency(
  pref: CurrencyPreference,
  resolvedLanguage?: ResolvedLanguage,
): DisplayCurrency {
  if (pref !== "auto") return pref;
  return detectBrowserCurrency({ resolvedLanguage });
}

export function getCurrencyLabel(
  currency: DisplayCurrency,
  lang: ResolvedLanguage = getResolvedLanguage(),
): string {
  const meta = CURRENCY_META[currency];
  if (lang === "zh-TW") return meta.labelZhTW;
  if (lang === "en") return meta.labelEn;
  return meta.labelZhCN;
}
