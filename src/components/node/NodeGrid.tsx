import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, Search, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import {
  useAllNodeMeta,
  useHomeNodeSummaries,
  useNodeOnlineSummaries,
  useNodeStoreStatus,
} from "@/hooks/useNode";
import { useHomepagePingOverview } from "@/hooks/usePingOverview";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useViewMode } from "@/hooks/useViewMode";
import {
  formatBytes,
  formatByteRate,
  formatByteRateLabel,
} from "@/utils/format";
import {
  calculateCostSummary,
  convertCnyToCurrency,
  formatMoney,
  getExchangeRates,
} from "@/utils/cost";
import {
  DISPLAY_CURRENCIES,
  type CurrencyPreference,
  type DisplayCurrency,
} from "@/utils/currency";
import { useHiddenNodeUuids } from "@/hooks/useVisibleNodes";
import { speedRateColor } from "@/utils/metricTone";
import {
  getHomeGroupLabel,
  getHomeGroupOptions,
  getHomeRegionOptions,
  HOME_ALL_GROUP,
  HOME_ALL_REGION,
  sortHomeGroupOptions,
} from "@/utils/homeNodes";
import { getDisplayRegionCode } from "@/utils/geo";
import { useHomeSort } from "@/hooks/useHomeSort";
import { useHomeNodeOrder } from "@/hooks/useHomeNodeOrder";
import { useHomeFilterOrder } from "@/hooks/useHomeFilterOrder";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { HOME_SORT_NATURAL_DIRECTION } from "@/utils/homeSort";
import { MOBILE_VIEWPORT_QUERY } from "@/utils/mediaQuery";
import { useHourlyClock } from "@/hooks/useClock";
import { preloadAssetsPage } from "@/services/assetsPageLoader";
import {
  preloadTodayTrafficStats,
  TodayTrafficStatsProvider,
} from "@/hooks/useTodayTrafficStats";
import { HomeSortControl } from "./HomeSortControl";
import { GroupTabs, RegionTabs } from "./HomeFilterTabs";
import {
  getOverviewRating,
  type OverviewRating,
} from "@/utils/overviewRating";
import { CompactNodeCard } from "./CompactNodeCard";
import { MiniNodeCard } from "./MiniNodeCard";
import { NodeCard } from "./NodeCard";
import { NodeListView } from "./NodeListView";
import { RenewalReminder } from "./RenewalReminder";
import { canViewCosts, type NodeViewMode } from "@/utils/themeSettings";
import type { RenewalReminderSource } from "@/utils/renewalReminder";

const NodeMapBackground = lazy(() =>
  import("./NodeMapBackground").then((module) => ({ default: module.NodeMapBackground })),
);

// 卡片视图网格密度；列表档由独立组件布局。
const GRID_LAYOUT: Record<NodeViewMode, { className: string; minColumnWidth: number }> = {
  large: { className: "grid gap-4 xl:gap-5", minColumnWidth: 360 },
  compact: { className: "grid gap-3 xl:gap-4", minColumnWidth: 340 },
  mini: { className: "grid gap-3 xl:gap-3.5", minColumnWidth: 260 },
  // 占位以满足 Record 穷尽。
  list: { className: "", minColumnWidth: 0 },
};

type MiniGridStyle = CSSProperties & { "--mini-card-min-width": string };
type HomeStatusFilter = "all" | "online" | "offline";

// 标准 UUID 不含逗号，可安全拼成稳定签名。
const UUID_KEY_SEPARATOR = ",";

type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface HomeOverview {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  trafficUp: number;
  trafficDown: number;
  netUp: number;
  netDown: number;
}

function formatCompactBytes(value: number): string {
  const [amount, unit = "B"] = formatBytes(value).split(" ");
  return `${amount}${unit[0]}`;
}

function TrafficBarsIcon({ size = 19 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <rect x="2" y="10" width="4" height="8" rx="1.2" fill="currentColor" />
      <rect x="8" y="5.5" width="4" height="12.5" rx="1.2" fill="currentColor" />
      <rect x="14" y="2" width="4" height="16" rx="1.2" fill="currentColor" />
    </svg>
  );
}

// 站点铭牌由 CSS 放进 AppShell 顶部留白，不占概览卡内容流。
function FallbackBrandLogo() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className="home-brand-logo"
      aria-hidden
    >
      <rect width="24" height="24" rx="6" fill="var(--accent-500)" />
      <path
        d="M7 6.5V17.5M7 12L13.5 6.5M10 9.5L16.5 17.5"
        stroke="#FFFFFF"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17.2" cy="7.2" r="2" fill="#FFFFFF" opacity="0.92" />
    </svg>
  );
}

function HomeBrand({
  siteName,
  showLogo,
  logoUrl,
}: {
  siteName: string;
  showLogo: boolean;
  logoUrl: string;
}) {
  const { tx } = useI18n();
  const [logoFailed, setLogoFailed] = useState(false);
  const resolvedLogoSrc = logoUrl || "/favicon.ico";

  useEffect(() => {
    setLogoFailed(false);
  }, [resolvedLogoSrc]);

  return (
    <header className="home-brand" aria-label={tx("站点名称", "站點名稱", "Site title")}>
      {showLogo &&
        (!logoFailed ? (
          <img
            src={resolvedLogoSrc}
            alt=""
            className="home-brand-logo"
            decoding="async"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <FallbackBrandLogo />
        ))}
      <h1 className="home-brand-title" title={siteName}>
        {siteName}
      </h1>
    </header>
  );
}

function HomeOverviewCards({
  overview,
  costSummary,
  costLoading,
  rates,
  displayCurrency,
  currencyPreference,
  onSelectCurrency,
  privacyMode,
  showOverviewRatings,
  showTrafficRating,
  showBandwidthRating,
  showAssetRating,
  trafficRatingLabels,
  bandwidthRatingLabels,
  assetRatingLabels,
  showCosts,
  showDetailButton,
  renewalNodes,
  dense,
  mapBackground,
  onWarmTraffic,
}: {
  overview: HomeOverview;
  costSummary: { remainingCny: number } | null;
  costLoading: boolean;
  rates: Record<string, number> | null | undefined;
  displayCurrency: DisplayCurrency;
  currencyPreference: CurrencyPreference;
  onSelectCurrency: (next: CurrencyPreference) => void;
  privacyMode: boolean;
  dense: boolean;
  mapBackground: boolean;
  showOverviewRatings: boolean;
  showTrafficRating: boolean;
  showBandwidthRating: boolean;
  showAssetRating: boolean;
  trafficRatingLabels: string;
  bandwidthRatingLabels: string;
  assetRatingLabels: string;
  showCosts: boolean;
  showDetailButton: boolean;
  renewalNodes: RenewalReminderSource[];
  onWarmTraffic: () => void;
}) {
  const { tx } = useI18n();
  const [trafficValue, trafficUnit] = formatBytes(
    overview.trafficUp + overview.trafficDown,
  ).split(" ");
  const rate = formatByteRate(overview.netUp + overview.netDown);
  const onlinePct =
    overview.totalNodes > 0 ? (overview.onlineNodes / overview.totalNodes) * 100 : 0;
  const offlinePct =
    overview.totalNodes > 0 ? (overview.offlineNodes / overview.totalNodes) * 100 : 0;
  const convertedRemaining = costSummary
    ? convertCnyToCurrency(costSummary.remainingCny, displayCurrency, rates)
    : null;
  const remainingValue = !showCosts
    ? "-"
    : privacyMode
      ? "••••••"
      : convertedRemaining != null
        ? formatMoney(convertedRemaining, displayCurrency)
        : costSummary
          ? formatMoney(costSummary.remainingCny, "CNY")
          : costLoading
            ? tx("计算中", "計算中", "Calculating")
            : "—";
  const trafficDetailLabel = `↑ ${formatBytes(overview.trafficUp)} · ↓ ${formatBytes(overview.trafficDown)}`;
  const trafficCompactLabel = `↑${formatCompactBytes(overview.trafficUp)} ↓${formatCompactBytes(overview.trafficDown)}`;
  const bandwidthDetailLabel = `↑ ${formatByteRateLabel(overview.netUp)} · ↓ ${formatByteRateLabel(overview.netDown)}`;
  const bandwidthCompactLabel = `↑${formatCompactBytes(overview.netUp)} ↓${formatCompactBytes(overview.netDown)}`;
  const trafficRating =
    !mapBackground && showOverviewRatings && showTrafficRating
      ? getOverviewRating({
          kind: "traffic",
          value: overview.trafficUp + overview.trafficDown,
          customLabels: trafficRatingLabels,
        })
      : null;
  const bandwidthRating =
    !mapBackground && showOverviewRatings && showBandwidthRating
      ? getOverviewRating({
          kind: "bandwidth",
          value: overview.netUp + overview.netDown,
          customLabels: bandwidthRatingLabels,
        })
      : null;
  const assetRating =
    !mapBackground && showOverviewRatings && showAssetRating && costSummary && !privacyMode
      ? getOverviewRating({
          kind: "asset",
          value: costSummary.remainingCny,
          customLabels: assetRatingLabels,
        })
      : null;

  const renderRating = (rating: OverviewRating | null) =>
    rating ? (
      <span className="overview-card-rating" data-rating-level={rating.level} title={rating.label}>
        {rating.label}
      </span>
    ) : null;

  return (
    <section
      className={`home-overview${dense ? " is-dense" : ""}${mapBackground ? " is-map" : ""}`}
      aria-label={tx("首页总览", "首頁總覽", "Overview")}
    >
      <article className="overview-card" data-metric="online">
        <span className="overview-card-label">{tx("在线节点", "在線節點", "Online Nodes")}</span>
        <div className="overview-card-main">
          <p className="overview-card-value">
            {overview.onlineNodes}
            <span className="overview-card-unit">/ {overview.totalNodes}</span>
          </p>
        </div>
        {overview.totalNodes >= 5 && overview.totalNodes <= 10 ? (
          <div className="overview-blocks" role="presentation">
            {Array.from({ length: overview.totalNodes }, (_, i) => {
              const cls =
                i < overview.onlineNodes
                  ? "overview-block is-online"
                  : i >= overview.totalNodes - overview.offlineNodes
                    ? "overview-block is-offline"
                    : "overview-block";
              return <span key={i} className={cls} />;
            })}
          </div>
        ) : (
          <div className="overview-bar" role="presentation">
            <span className="overview-bar-online" style={{ width: `${onlinePct}%` }} />
            <span className="overview-bar-offline" style={{ width: `${offlinePct}%` }} />
          </div>
        )}
      </article>

      <article className="overview-card" data-metric="bandwidth">
        <span className="overview-card-label">{tx("实时带宽", "即時頻寬", "Live Bandwidth")}</span>
        <div className="overview-card-main">
          <p
            className="overview-card-value"
            style={{ color: speedRateColor(rate.unit) }}
          >
            {rate.value}
            <span className="overview-card-unit">{rate.unit}</span>
          </p>
        </div>
        {!mapBackground && (
          <div className="overview-card-footer">
            <p className="overview-card-sub" title={bandwidthDetailLabel}>
              <span className="overview-card-sub-full">{bandwidthDetailLabel}</span>
              <span className="overview-card-sub-compact">{bandwidthCompactLabel}</span>
            </p>
            {renderRating(bandwidthRating)}
          </div>
        )}
      </article>

      <article className="overview-card" data-metric="traffic">
        <div className="overview-card-head">
          <span className="overview-card-label">{tx("累计流量", "累計流量", "Total Traffic")}</span>
          <Link
            to="/traffic"
            className="overview-card-action"
            aria-label={tx("打开今日流量统计页", "開啟今日流量統計頁", "Open daily traffic stats")}
            title={tx("今日流量统计", "今日流量統計", "Today's Traffic")}
            onPointerEnter={onWarmTraffic}
            onFocus={onWarmTraffic}
            onClick={onWarmTraffic}
          >
            <TrafficBarsIcon />
          </Link>
        </div>
        <div className="overview-card-main">
          <p className="overview-card-value">
            {trafficValue}
            <span className="overview-card-unit">{trafficUnit}</span>
          </p>
        </div>
        {!mapBackground && (
          <div className="overview-card-footer">
            <p className="overview-card-sub" title={trafficDetailLabel}>
              <span className="overview-card-sub-full">{trafficDetailLabel}</span>
              <span className="overview-card-sub-compact">{trafficCompactLabel}</span>
            </p>
            {renderRating(trafficRating)}
          </div>
        )}
      </article>

      <article className="overview-card" data-metric="asset">
        <div className="overview-card-head">
          <span className="overview-card-label">{tx("资产概览", "資產概覽", "Asset Value")}</span>
          <div className="overview-card-head-actions">
            {showCosts && !privacyMode && (
              <select
                className="overview-currency-select"
                value={currencyPreference}
                onChange={(e) => onSelectCurrency(e.target.value as CurrencyPreference)}
                aria-label={tx("切换显示币别", "切換顯示幣別", "Display currency")}
                title={tx("切换资产显示币别", "切換資產顯示幣別", "Switch display currency")}
              >
                <option value="auto">
                  {tx(`自动(${displayCurrency})`, `自動(${displayCurrency})`, `Auto(${displayCurrency})`)}
                </option>
                {DISPLAY_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            )}
            {showDetailButton && <RenewalReminder nodes={renewalNodes} />}
          </div>
        </div>
        <div className="overview-card-main">
          <p className="overview-card-value">{remainingValue}</p>
        </div>
        {!mapBackground && (
          <div className="overview-card-footer">
            <p className="overview-card-caption">
              {tx("实时汇率计算", "即時匯率換算", "Live FX rate")}
            </p>
            {renderRating(assetRating)}
          </div>
        )}
      </article>
    </section>
  );
}

export function NodeGrid() {
  const { tx } = useI18n();
  const { currencyPreference, resolvedCurrency, setCurrencyPreference } = useCurrency();
  const { privacyMode } = usePrivacyMode();
  const now = useHourlyClock();
  const queryClient = useQueryClient();
  const nodes = useHomeNodeSummaries();
  const nodeOnlineSummaries = useNodeOnlineSummaries();
  const allMeta = useAllNodeMeta();
  const { hydrated: storeHydrated, nodeInfoError } = useNodeStoreStatus();
  const { data: me } = useAuth();
  const { data: publicConfig } = usePublicConfig();
  const siteName = publicConfig?.sitename?.trim() || tx("节点概览", "節點概覽", "Nodes");
  const themeSettings = useThemeSettings();
  const { mode } = useViewMode();
  const sort = useHomeSort();
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_QUERY, true);
  const mapBackgroundEnabled = themeSettings.enableMapBackground && !isMobileViewport;
  const {
    canReorder: canReorderFilters,
    reorder: reorderFilters,
    status: orderStatus,
    errorMessage: orderError,
  } = useHomeFilterOrder();
  const filterReorderingEnabled = canReorderFilters && !isMobileViewport;
  const costsVisible =
    themeSettings.isReady && canViewCosts(themeSettings, me?.logged_in === true);
  const sortEnabled = themeSettings.isReady && themeSettings.enableHomeSort;
  const configuredSortField = sortEnabled ? sort.field : themeSettings.homeSortField;
  const configuredSortDirection = sortEnabled ? sort.direction : themeSettings.homeSortDirection;
  const sortField = !costsVisible && configuredSortField === "price"
    ? "default"
    : configuredSortField;
  const sortDirection = !costsVisible && configuredSortField === "price"
    ? HOME_SORT_NATURAL_DIRECTION.default
    : configuredSortDirection;
  const [selectedGroup, setSelectedGroup] = useState(HOME_ALL_GROUP);
  const [selectedRegion, setSelectedRegion] = useState(HOME_ALL_REGION);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<HomeStatusFilter>("all");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useHomepagePingOverview(mode);

  const showHomeSearchBar = themeSettings.isReady && themeSettings.showHomeSearchBar;

  useEffect(() => {
    if (!showHomeSearchBar) {
      setSearchQuery("");
      setStatusFilter("all");
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHomeSearchBar]);

  // 摘要不含名称，先从完整 meta 解析主题隐藏列表，再统一过滤各类数据。
  const hiddenUuids = useHiddenNodeUuids();
  const visibleNodes = useMemo(
    () =>
      nodes.filter(
        (node) => (me?.logged_in === true || !node.hidden) && !hiddenUuids.has(node.uuid),
      ),
    [me?.logged_in, nodes, hiddenUuids],
  );
  // 资产统计与卡片使用同一可见性规则，避免泄露隐藏节点信息。
  const visibleMeta = useMemo(
    () =>
      allMeta.filter(
        (node) => (me?.logged_in === true || !node.hidden) && !hiddenUuids.has(node.uuid),
      ),
    [allMeta, me?.logged_in, hiddenUuids],
  );
  const metaByUuid = useMemo(() => {
    const map = new Map<string, (typeof visibleMeta)[number]>();
    for (const item of visibleMeta) map.set(item.uuid, item);
    return map;
  }, [visibleMeta]);
  const renewalNodes = useMemo<RenewalReminderSource[]>(() => {
    const onlineByUuid = new Map(
      nodeOnlineSummaries.map((node) => [node.uuid, node.online]),
    );
    return visibleMeta.map((node) => ({
      ...node,
      online: onlineByUuid.get(node.uuid) ?? null,
    }));
  }, [nodeOnlineSummaries, visibleMeta]);
  const trafficUuids = useMemo(
    () => visibleMeta.map((node) => node.uuid),
    [visibleMeta],
  );
  const warmTrafficPage = useCallback(() => {
    void preloadTodayTrafficStats(queryClient, trafficUuids, Date.now());
  }, [queryClient, trafficUuids]);
  // 「名称」排序需要展示名(摘要无 name),从 meta 注入。
  const nameByUuid = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of visibleMeta) map.set(node.uuid, node.name?.trim() || node.uuid);
    return map;
  }, [visibleMeta]);
  const overview = useMemo<HomeOverview>(() => {
    let onlineNodes = 0;
    let offlineNodes = 0;
    let trafficUp = 0;
    let trafficDown = 0;
    let netUp = 0;
    let netDown = 0;
    for (const node of visibleNodes) {
      if (node.online === true) onlineNodes += 1;
      else if (node.online === false) offlineNodes += 1;
      trafficUp += node.trafficUp;
      trafficDown += node.trafficDown;
      netUp += node.netUp;
      netDown += node.netDown;
    }

    return {
      totalNodes: visibleNodes.length,
      onlineNodes,
      offlineNodes,
      trafficUp,
      trafficDown,
      netUp,
      netDown,
    };
  }, [visibleNodes]);
  const showHomeOverview = themeSettings.isReady && themeSettings.showHomeOverview;
  const showTrafficPopover = themeSettings.isReady && themeSettings.showTodayTrafficPopover;
  const hasNodes = visibleMeta.length > 0;
  // 卡内入口与悬浮入口互斥，避免重复操作入口。
  const costOverviewNeeded = showHomeOverview && costsVisible && hasNodes;
  const showCostDetailButton =
    costOverviewNeeded && themeSettings.isReady && themeSettings.showCostSummary;
  const showCostFloatingButton =
    themeSettings.isReady &&
    costsVisible &&
    themeSettings.showCostSummaryFloatingButton &&
    hasNodes &&
    !showCostDetailButton;

  useEffect(() => {
    if (!showCostDetailButton && !showCostFloatingButton) return;

    const idleWindow = window as IdleCapableWindow;
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(preloadAssetsPage, { timeout: 2_000 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const handle = window.setTimeout(preloadAssetsPage, 1_000);
    return () => window.clearTimeout(handle);
  }, [showCostDetailButton, showCostFloatingButton]);

  const costNeeded = costOverviewNeeded || showCostFloatingButton;
  const rateQuery = useQuery({
    queryKey: ["cost-rates", themeSettings.costRateApiUrl],
    queryFn: ({ signal }) => getExchangeRates(themeSettings.costRateApiUrl, { signal }),
    staleTime: 60 * 60 * 1000,
    enabled: costsVisible && (costNeeded || sortField === "price") && hasNodes,
    retry: 1,
  });
  const costSummary = useMemo(
    () =>
      costsVisible && rateQuery.data
        ? calculateCostSummary(
            visibleMeta,
            themeSettings.costIgnoredNodes,
            rateQuery.data.rates,
            themeSettings.costPremiums,
            now,
          )
        : null,
    [costsVisible, now, visibleMeta, themeSettings.costIgnoredNodes, themeSettings.costPremiums, rateQuery.data],
  );
  const priceByUuid = useMemo(() => {
    const map = new Map<string, number | null>();
    if (costSummary) {
      for (const detail of costSummary.details) {
        map.set(detail.uuid, detail.counted ? detail.monthlyCny : null);
      }
    }
    return map;
  }, [costSummary]);
  const costLoading = costNeeded && rateQuery.isLoading;
  const groupOptions = useMemo(
    () =>
      sortHomeGroupOptions(
        getHomeGroupOptions(visibleNodes),
        themeSettings.isReady ? themeSettings.homeGroupOrder : [],
      ),
    [visibleNodes, themeSettings.homeGroupOrder, themeSettings.isReady],
  );
  const groupFilteredNodes = useMemo(
    () =>
      selectedGroup === HOME_ALL_GROUP
        ? visibleNodes
        : visibleNodes.filter((node) => getHomeGroupLabel(node.group) === selectedGroup),
    [visibleNodes, selectedGroup],
  );
  const regionOptions = useMemo(
    () => getHomeRegionOptions(
      groupFilteredNodes,
      themeSettings.isReady ? themeSettings.homeRegionOrder : [],
    ),
    [groupFilteredNodes, themeSettings.homeRegionOrder, themeSettings.isReady],
  );
  const availableRegions = useMemo(
    () => getHomeRegionOptions(visibleNodes).map(({ code }) => code),
    [visibleNodes],
  );
  const reorderGroups = useCallback((visibleOrder: string[]) => {
    reorderFilters({ field: "homeGroupOrder", visibleOrder, availableOrder: groupOptions });
  }, [reorderFilters, groupOptions]);
  const reorderRegions = useCallback((visibleOrder: string[]) => {
    reorderFilters({ field: "homeRegionOrder", visibleOrder, availableOrder: availableRegions });
  }, [reorderFilters, availableRegions]);
  const regionFilteredNodes = useMemo(
    () =>
      selectedRegion === HOME_ALL_REGION
        ? groupFilteredNodes
        : groupFilteredNodes.filter((node) => getDisplayRegionCode(node.region) === selectedRegion),
    [groupFilteredNodes, selectedRegion],
  );
  const filteredNodes = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return regionFilteredNodes.filter((node) => {
      if (statusFilter === "online" && node.online !== true) return false;
      if (statusFilter === "offline" && node.online !== false) return false;
      if (!keyword) return true;
      const meta = metaByUuid.get(node.uuid);
      const routeConfig = themeSettings.nodeRoutes[node.uuid];
      const routeText = routeConfig
        ? Object.values(routeConfig)
            .map((entry) => entry?.label ?? "")
            .join(" ")
        : "";
      return [
        meta?.name,
        meta?.group,
        meta?.region,
        meta?.tags,
        meta?.public_remark,
        routeText,
      ].some((field) => String(field || "").toLowerCase().includes(keyword));
    });
  }, [metaByUuid, regionFilteredNodes, searchQuery, statusFilter, themeSettings.nodeRoutes]);
  const orderedNodes = useHomeNodeOrder({
    nodes: filteredNodes,
    field: sortField,
    direction: sortDirection,
    nameByUuid,
    priceByUuid,
  });

  useEffect(() => {
    if (selectedGroup !== HOME_ALL_GROUP && !groupOptions.includes(selectedGroup)) {
      setSelectedGroup(HOME_ALL_GROUP);
    }
  }, [groupOptions, selectedGroup]);

  useEffect(() => {
    if (
      selectedRegion !== HOME_ALL_REGION &&
      !regionOptions.some((option) => option.code === selectedRegion)
    ) {
      setSelectedRegion(HOME_ALL_REGION);
    }
  }, [regionOptions, selectedRegion]);

  useEffect(() => {
    if (!themeSettings.showRegionBar && selectedRegion !== HOME_ALL_REGION) {
      setSelectedRegion(HOME_ALL_REGION);
    }
  }, [themeSettings.showRegionBar, selectedRegion]);

  useEffect(() => {
    if (!themeSettings.showGroupTabs && selectedGroup !== HOME_ALL_GROUP) {
      setSelectedGroup(HOME_ALL_GROUP);
    }
  }, [themeSettings.showGroupTabs, selectedGroup]);

  const uuidsKey = useMemo(
    () => orderedNodes.map((node) => node.uuid).join(UUID_KEY_SEPARATOR),
    [orderedNodes],
  );
  const orderedUuids = useMemo(
    () => (uuidsKey ? uuidsKey.split(UUID_KEY_SEPARATOR) : []),
    [uuidsKey],
  );
  const cards = useMemo(
    () =>
      mode === "list"
        ? null
        : orderedUuids.map((uuid) => (
            <div key={uuid} className="min-w-0">
              {mode === "mini" ? (
                <MiniNodeCard
                  uuid={uuid}
                  showTodayTraffic={showTrafficPopover}
                  showCosts={costsVisible}
                />
              ) : mode === "compact" ? (
                <CompactNodeCard
                  uuid={uuid}
                  showTodayTraffic={showTrafficPopover}
                  showCosts={costsVisible}
                />
              ) : (
                <NodeCard
                  uuid={uuid}
                  showTodayTraffic={showTrafficPopover}
                  showCosts={costsVisible}
                />
              )}
            </div>
          )),
    [costsVisible, orderedUuids, mode, showTrafficPopover],
  );
  const showGroupTabs =
    themeSettings.isReady && themeSettings.showGroupTabs && groupOptions.length > 0;
  const showHomeSort = sortEnabled && visibleNodes.length > 1;
  const showRegionBar =
    themeSettings.isReady && themeSettings.showRegionBar && regionOptions.length > 1;
  const isMini = mode === "mini";
  const isList = mode === "list";
  const { className: gridClassName, minColumnWidth } = GRID_LAYOUT[mode];
  const gridWrapClassName = isMini ? `${gridClassName} node-grid-mini` : gridClassName;
  const gridStyle = isList
    ? undefined
    : isMini
      ? ({ "--mini-card-min-width": `${minColumnWidth}px` } as MiniGridStyle)
      : { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minColumnWidth}px), 1fr))` };
  const gridElement = (
    <div className={gridWrapClassName} style={gridStyle}>
      {cards}
    </div>
  );
  const borrowControlsGrid = isMini || isList;
  const controlsWrapClassName = borrowControlsGrid
    ? "grid gap-3 home-controls-bar mb-4"
    : `${gridWrapClassName} home-controls-bar mb-4`;
  const controlsStyle = borrowControlsGrid
    ? {
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${GRID_LAYOUT.compact.minColumnWidth}px), 1fr))`,
      }
    : gridStyle;

  if (!themeSettings.isReady || !storeHydrated) {
    if (!nodeInfoError) return null;
    return (
      <div
        className="flex h-[40vh] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]"
        aria-live="polite"
      >
        <span className="text-[14px]">
          {tx("节点数据暂时无法加载", "節點資料暫時無法載入", "Unable to load node data")}
        </span>
        <span className="text-[12px]">
          {tx("正在等待后端自动重试", "正在等待後端自動重試", "Retrying automatically...")}
        </span>
      </div>
    );
  }

  const homeHeader = (
    <>
      {showCostFloatingButton && (
        <Link
          to="/assets"
          className="cost-summary-ball show"
          aria-label={tx("打开资产统计页", "開啟資產統計頁", "Open assets page")}
          title={tx("资产统计", "資產統計", "Assets")}
        >
          <span className="cost-summary-ball-icon" aria-hidden>
            <CircleDollarSign size={16} />
          </span>
        </Link>
      )}
      <HomeBrand
        siteName={siteName}
        showLogo={themeSettings.showBrandLogo}
        logoUrl={themeSettings.brandLogoUrl}
      />
      {mapBackgroundEnabled && (
        <Suspense fallback={null}>
          <NodeMapBackground nodes={visibleNodes} />
        </Suspense>
      )}
      <div
        className={mapBackgroundEnabled ? `${isList ? "grid gap-3" : gridWrapClassName} home-map-header` : undefined}
        style={mapBackgroundEnabled ? (isList ? controlsStyle : gridStyle) : undefined}
      >
        {showHomeOverview && (
          <HomeOverviewCards
            overview={overview}
            dense={mode === "mini" || mode === "list"}
            mapBackground={mapBackgroundEnabled}
            showDetailButton={showCostDetailButton}
            showCosts={costsVisible}
            renewalNodes={renewalNodes}
            costSummary={costSummary}
            costLoading={costLoading}
            rates={rateQuery.data?.rates}
            displayCurrency={resolvedCurrency}
            currencyPreference={currencyPreference}
            onSelectCurrency={setCurrencyPreference}
            privacyMode={privacyMode}
            showOverviewRatings={themeSettings.showOverviewRatings}
            showTrafficRating={themeSettings.showTrafficRating}
            showBandwidthRating={themeSettings.showBandwidthRating}
            showAssetRating={themeSettings.showAssetRating}
            trafficRatingLabels={themeSettings.trafficRatingLabels}
            bandwidthRatingLabels={themeSettings.bandwidthRatingLabels}
            assetRatingLabels={themeSettings.assetRatingLabels}
            onWarmTraffic={warmTrafficPage}
          />
        )}
      </div>
    </>
  );

  if (visibleNodes.length === 0) {
    return (
      <>
        {homeHeader}
        <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]">
          <span className="text-[15px]">
            {tx("尚未连接到任何节点", "尚未連線至任何節點", "No nodes connected yet")}
          </span>
          <span className="text-[12px]">
            {tx("等待后端推送或前往管理后台添加", "等待後端推送或前往管理後台新增", "Waiting for agents or add one in admin")}
          </span>
        </div>
      </>
    );
  }

  const isFilteredEmpty = orderedUuids.length === 0;

  return (
    <>
      {homeHeader}
      <span className="sr-only" role="status">{orderStatus}</span>
      {orderError && (
        <div className="home-filter-order-error" role="alert">{orderError}</div>
      )}
      {showHomeSearchBar && visibleNodes.length > 1 && (
        <div className="home-search-toolbar">
          <label className="home-search-input-wrap">
            <Search size={14} aria-hidden />
            <input
              ref={searchInputRef}
              type="search"
              className="home-search-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchQuery("");
                  searchInputRef.current?.blur();
                }
              }}
              placeholder={tx(
                "搜索节点名称、标签、地区或回程线路…",
                "搜尋節點名稱、標籤、地區或回程線路…",
                "Search nodes, tags, regions, routes...",
              )}
              aria-label={tx("搜索节点", "搜尋節點", "Search nodes")}
            />
            {searchQuery ? (
              <button
                type="button"
                className="home-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label={tx("清空搜索", "清空搜尋", "Clear search")}
              >
                <X size={12} />
              </button>
            ) : (
              <kbd className="home-search-kbd" aria-hidden>/</kbd>
            )}
          </label>
          <div className="home-status-pills" role="group" aria-label={tx("状态筛选", "狀態篩選", "Status filter")}>
            <button
              type="button"
              className="home-status-pill"
              data-active={statusFilter === "all" ? "true" : "false"}
              onClick={() => setStatusFilter("all")}
            >
              <span>{tx("全部", "全部", "All")}</span>
              <span className="home-status-count">{overview.totalNodes}</span>
            </button>
            <button
              type="button"
              className="home-status-pill"
              data-active={statusFilter === "online" ? "true" : "false"}
              onClick={() => setStatusFilter("online")}
            >
              <span className="home-status-dot is-online" aria-hidden />
              <span>{tx("在线", "在線", "Online")}</span>
              <span className="home-status-count">{overview.onlineNodes}</span>
            </button>
            <button
              type="button"
              className="home-status-pill"
              data-active={statusFilter === "offline" ? "true" : "false"}
              onClick={() => setStatusFilter("offline")}
            >
              <span className="home-status-dot is-offline" aria-hidden />
              <span>{tx("离线", "離線", "Offline")}</span>
              <span className="home-status-count">{overview.offlineNodes}</span>
            </button>
          </div>
        </div>
      )}
      {(showGroupTabs || showHomeSort) && (
        <div className={controlsWrapClassName} style={controlsStyle}>
          {showGroupTabs && (
            <GroupTabs
              groups={groupOptions}
              selectedGroup={selectedGroup}
              onSelectGroup={setSelectedGroup}
              canReorder={filterReorderingEnabled}
              onReorder={reorderGroups}
            />
          )}
          {showHomeSort && <HomeSortControl state={sort} showPrice={costsVisible} />}
        </div>
      )}
      {showRegionBar && (
        <RegionTabs
          regions={regionOptions}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
          canReorder={filterReorderingEnabled}
          onReorder={reorderRegions}
        />
      )}
      {isFilteredEmpty ? (
        <div className="flex h-[28vh] flex-col items-center justify-center gap-3 text-[var(--text-tertiary)]">
          <span className="text-[14px]">
            {tx("没有符合筛选条件的节点", "沒有符合篩選條件的節點", "No matching nodes")}
          </span>
          <button
            type="button"
            className="control-button px-3 py-1.5 text-[12px]"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setSelectedGroup(HOME_ALL_GROUP);
              setSelectedRegion(HOME_ALL_REGION);
            }}
          >
            {tx("重置筛选", "重設篩選", "Reset filters")}
          </button>
        </div>
      ) : isList ? (
        <NodeListView uuids={orderedUuids} showCosts={costsVisible} />
      ) : showTrafficPopover ? (
        <TodayTrafficStatsProvider uuids={trafficUuids}>
          {gridElement}
        </TodayTrafficStatsProvider>
      ) : (
        gridElement
      )}
    </>
  );
}
