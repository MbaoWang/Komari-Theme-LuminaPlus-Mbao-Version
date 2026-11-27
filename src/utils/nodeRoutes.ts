import type { ResolvedLanguage } from "@/i18n";

export type RouteCarrierKey = "ct" | "cu" | "cm" | "ix";
export type RouteTier = "premium" | "optimized" | "standard";
export type RouteTierSetting = "auto" | RouteTier;
export type RoutePremiumIcon =
  | "zap"
  | "sparkle"
  | "crown"
  | "wing"
  | "sparkles"
  | "vip"
  | "none";
export type RoutePremiumEffect =
  | "beam"
  | "crystal-beam"
  | "sheen"
  | "liquid"
  | "svip"
  | "brushed-gold";
export type RouteBadgeStyle = "outline" | "logo" | "text";

export const ROUTE_CARRIER_KEYS: readonly RouteCarrierKey[] = ["ct", "cu", "cm", "ix"];
export const ROUTE_PREMIUM_ICONS: readonly RoutePremiumIcon[] = [
  "zap",
  "sparkle",
  "crown",
  "wing",
  "sparkles",
  "vip",
  "none",
];
export const ROUTE_PREMIUM_EFFECTS: readonly RoutePremiumEffect[] = [
  "beam",
  "crystal-beam",
  "sheen",
  "liquid",
  "svip",
  "brushed-gold",
];
export const ROUTE_BADGE_STYLES: readonly RouteBadgeStyle[] = ["outline", "logo", "text"];

export interface NodeRouteEntry {
  label: string;
  tier?: RouteTierSetting;
}

export interface NodeRouteConfig {
  ct?: NodeRouteEntry;
  cu?: NodeRouteEntry;
  cm?: NodeRouteEntry;
  ix?: NodeRouteEntry;
}

export type NodeRoutesMap = Record<string, NodeRouteConfig>;

export interface ResolvedRoutePill {
  carrier: RouteCarrierKey;
  label: string;
  tier: RouteTier;
}

export const COMMON_ROUTE_PRESETS: readonly string[] = [
  "CN2 GIA",
  "CMIN2",
  "AS9929",
  "IEPL",
  "IPLC",
  "CTGNet",
  "CN2 GT",
  "AS4837",
  "CMI",
  "SoftBank",
  "IIJ",
  "HiNet",
  "163",
  "BGP",
  "Tier1",
  "NTT",
  "Cogent",
];

const PREMIUM_PATTERN =
  /(cn2\s*gia|cn2gia|\bgia\b|9929|cuii|cmin2|58807|iepl|iplc|ctgnet|\bctg\b|精品|专线|專線)/i;
const OPTIMIZED_PATTERN =
  /(cn2\s*gt|\bcn2\b|4837|\bcmi\b|58453|softbank|软银|軟銀|bbtec|\biij\b|\bhkt\b|\bhgc\b|hkbn|pccw|hinet|直连|直連|优化|優化)/i;

export function inferRouteTier(label: string): RouteTier {
  const normalized = label.trim();
  if (!normalized) return "standard";
  if (PREMIUM_PATTERN.test(normalized)) return "premium";
  if (OPTIMIZED_PATTERN.test(normalized)) return "optimized";
  return "standard";
}

export function resolveRouteTier(
  label: string,
  tier?: RouteTierSetting,
): RouteTier {
  if (tier === "premium" || tier === "optimized" || tier === "standard") {
    return tier;
  }
  return inferRouteTier(label);
}

export function isRoutePremiumIcon(value: unknown): value is RoutePremiumIcon {
  return (
    typeof value === "string" &&
    ROUTE_PREMIUM_ICONS.includes(value as RoutePremiumIcon)
  );
}

export function normalizeRoutePremiumIcon(
  value: unknown,
  fallback: RoutePremiumIcon = "zap",
): RoutePremiumIcon {
  return isRoutePremiumIcon(value) ? value : fallback;
}

export function isRoutePremiumEffect(value: unknown): value is RoutePremiumEffect {
  return (
    typeof value === "string" &&
    ROUTE_PREMIUM_EFFECTS.includes(value as RoutePremiumEffect)
  );
}

export function normalizeRoutePremiumEffect(
  value: unknown,
  fallback: RoutePremiumEffect = "beam",
): RoutePremiumEffect {
  return isRoutePremiumEffect(value) ? value : fallback;
}

export function isRouteBadgeStyle(value: unknown): value is RouteBadgeStyle {
  return (
    typeof value === "string" &&
    ROUTE_BADGE_STYLES.includes(value as RouteBadgeStyle)
  );
}

export function normalizeRouteBadgeStyle(
  value: unknown,
  fallback: RouteBadgeStyle = "outline",
): RouteBadgeStyle {
  return isRouteBadgeStyle(value) ? value : fallback;
}

function normalizeRouteTierSetting(value: unknown): RouteTierSetting | undefined {
  if (
    value === "auto" ||
    value === "premium" ||
    value === "optimized" ||
    value === "standard"
  ) {
    return value;
  }
  return undefined;
}

function normalizeRouteEntry(raw: unknown): NodeRouteEntry | undefined {
  if (typeof raw === "string") {
    const label = raw.trim().slice(0, 24);
    return label ? { label } : undefined;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim().slice(0, 24) : "";
  if (!label) return undefined;
  const tier = normalizeRouteTierSetting(record.tier);
  return tier && tier !== "auto" ? { label, tier } : { label };
}

export function normalizeNodeRoutes(value: unknown): NodeRoutesMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: NodeRoutesMap = {};

  for (const [rawUuid, rawConfig] of Object.entries(value as Record<string, unknown>)) {
    const uuid = rawUuid.trim();
    if (!uuid || !rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
      continue;
    }
    const record = rawConfig as Record<string, unknown>;
    const normalized: NodeRouteConfig = {};
    for (const carrier of ROUTE_CARRIER_KEYS) {
      const entry = normalizeRouteEntry(record[carrier]);
      if (entry) normalized[carrier] = entry;
    }
    if (Object.keys(normalized).length > 0) {
      result[uuid] = normalized;
    }
  }

  return result;
}

const TAG_CARRIER_PREFIXES: Record<string, RouteCarrierKey> = {
  ct: "ct",
  telecom: "ct",
  "电信": "ct",
  "電信": "ct",
  "电": "ct",
  "電": "ct",
  cu: "cu",
  unicom: "cu",
  "联通": "cu",
  "聯通": "cu",
  "联": "cu",
  "聯": "cu",
  cm: "cm",
  mobile: "cm",
  "移动": "cm",
  "移動": "cm",
  "移": "cm",
  ix: "ix",
  intl: "ix",
  bgp: "ix",
  "互联": "ix",
  "互聯": "ix",
  "国际": "ix",
  "國際": "ix",
  "互": "ix",
};

const ROUTE_TAG_REGEX = /^([^:：]+)[:：](.+)$/;

function parseSingleRouteTag(
  rawSegment: string,
): { carrier: RouteCarrierKey; entry: NodeRouteEntry } | null {
  // Strip optional Komari <color> suffix if someone wrote ct:CMIN2<blue>
  const stripped = rawSegment.trim().replace(/<[a-zA-Z]+>$/, "").trim();
  if (!stripped) return null;
  const match = ROUTE_TAG_REGEX.exec(stripped);
  if (!match) return null;
  const prefixKey = match[1].trim().toLowerCase();
  const carrier = TAG_CARRIER_PREFIXES[prefixKey];
  if (!carrier) return null;

  let valuePart = match[2].trim();
  let tier: RouteTierSetting | undefined;
  const tierMatch = /^(.*?)!(premium|optimized|standard|auto)$/i.exec(valuePart);
  if (tierMatch) {
    valuePart = tierMatch[1].trim();
    tier = tierMatch[2].toLowerCase() as RouteTierSetting;
  }
  const label = valuePart.slice(0, 24);
  if (!label) return null;

  return {
    carrier,
    entry: tier && tier !== "auto" ? { label, tier } : { label },
  };
}

/** 判斷單一標籤是否為三網回程語法（避免重複顯示於一般標籤列）。 */
export function isRouteTag(rawTag: string): boolean {
  return parseSingleRouteTag(rawTag) !== null;
}

/** 從 Komari 節點 tags 解析三網回程設定（如 ct:CN2 GIA;cu:9929;cm:CMIN2;ix:BGP）。 */
export function parseRoutesFromTags(rawTags: string | undefined | null): NodeRouteConfig {
  if (!rawTags) return {};
  const result: NodeRouteConfig = {};
  for (const segment of rawTags.split(";")) {
    const parsed = parseSingleRouteTag(segment);
    if (parsed) {
      result[parsed.carrier] = parsed.entry;
    }
  }
  return result;
}

/** 合併主題設定覆寫與節點 tags，產出排序固定的回程膠囊清單。 */
export function resolveNodeRoutes(
  configured: NodeRouteConfig | undefined,
  rawTags: string | undefined | null,
): ResolvedRoutePill[] {
  const fromTags = parseRoutesFromTags(rawTags);
  const pills: ResolvedRoutePill[] = [];

  for (const carrier of ROUTE_CARRIER_KEYS) {
    const entry = configured?.[carrier] ?? fromTags[carrier];
    if (!entry || !entry.label.trim()) continue;
    const label = entry.label.trim();
    pills.push({
      carrier,
      label,
      tier: resolveRouteTier(label, entry.tier),
    });
  }

  return pills;
}

export function getCarrierShortLabel(
  carrier: RouteCarrierKey,
  lang: ResolvedLanguage,
): string {
  if (lang === "en") {
    switch (carrier) {
      case "ct":
        return "CT";
      case "cu":
        return "CU";
      case "cm":
        return "CM";
      case "ix":
        return "IX";
    }
  }
  if (lang === "zh-TW") {
    switch (carrier) {
      case "ct":
        return "電";
      case "cu":
        return "聯";
      case "cm":
        return "移";
      case "ix":
        return "互";
    }
  }
  switch (carrier) {
    case "ct":
      return "电";
    case "cu":
      return "联";
    case "cm":
      return "移";
    case "ix":
      return "互";
  }
}

export function getCarrierFullLabel(
  carrier: RouteCarrierKey,
  lang: ResolvedLanguage,
): string {
  if (lang === "en") {
    switch (carrier) {
      case "ct":
        return "China Telecom";
      case "cu":
        return "China Unicom";
      case "cm":
        return "China Mobile";
      case "ix":
        return "International / BGP";
    }
  }
  if (lang === "zh-TW") {
    switch (carrier) {
      case "ct":
        return "中國電信";
      case "cu":
        return "中國聯通";
      case "cm":
        return "中國移動";
      case "ix":
        return "國際互聯";
    }
  }
  switch (carrier) {
    case "ct":
      return "中国电信";
    case "cu":
      return "中国联通";
    case "cm":
      return "中国移动";
    case "ix":
      return "国际互联";
  }
}
