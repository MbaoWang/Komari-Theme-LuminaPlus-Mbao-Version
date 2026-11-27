import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, Navigate } from "react-router-dom";
import { CalendarClock, ChevronDown, ChevronLeft, ChevronUp, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { Flag } from "@/components/ui/Flag";
import { Spinner } from "@/components/ui/Spinner";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useHourlyClock } from "@/hooks/useClock";
import { useVisibleNodes } from "@/hooks/useVisibleNodes";
import {
  calculateCostSummary,
  convertCnyToCurrency,
  formatMoney,
  formatMoneyParts,
  formatSignedMoney,
  getExchangeRates,
} from "@/utils/cost";
import {
  CURRENCY_META,
  DISPLAY_CURRENCIES,
  getCurrencyLabel,
  type CurrencyPreference,
  type DisplayCurrency,
} from "@/utils/currency";
import { formatBillingCycle } from "@/utils/billing";
import { getExpireDaysRemaining, LONG_TERM_EXPIRE_DAYS } from "@/utils/format";
import { getRenewalReminders } from "@/utils/renewalReminder";
import { canViewCosts } from "@/utils/themeSettings";

type AssetDetail = ReturnType<typeof calculateCostSummary>["details"][number];
type AssetsSortField =
  | "weight"
  | "price"
  | "remaining"
  | "premium"
  | "premiumMonthly"
  | "expiry";
type AssetsSortDirection = "asc" | "desc";

const NATURAL_DIRECTION: Record<AssetsSortField, AssetsSortDirection> = {
  weight: "asc",
  price: "desc",
  remaining: "desc",
  premium: "desc",
  premiumMonthly: "desc",
  expiry: "asc",
};

const ASSETS_MOBILE_QUERY = "(max-width: 720px)";

function sortValue(detail: AssetDetail, field: AssetsSortField): number {
  switch (field) {
    case "price":
      return detail.priceCny;
    case "remaining":
      return detail.remainingCny;
    case "premium":
      return detail.premiumCny;
    case "premiumMonthly":
      return detail.premiumMonthlyCny;
    case "expiry": {
      const days = getExpireDaysRemaining(detail.expiredAt);
      return days == null ? Number.POSITIVE_INFINITY : days;
    }
    default:
      return detail.weight;
  }
}

function premiumTone(value: number) {
  if (value > 0) return "var(--status-error)";
  if (value < 0) return "var(--status-success)";
  return "var(--text-tertiary)";
}

function assetsRenewalTone(daysRemaining: number): "critical" | "warning" {
  return daysRemaining <= 3 ? "critical" : "warning";
}

function HeroMoney({
  value,
  currency,
  privacyMode,
  pendingLabel,
}: {
  value: number | null;
  currency: DisplayCurrency;
  privacyMode: boolean;
  pendingLabel: string;
}) {
  if (privacyMode) {
    return <span className="assets-hero-value">••••••</span>;
  }
  if (value == null) {
    return <span className="assets-hero-value is-pending">{pendingLabel}</span>;
  }
  const { symbol, int, frac } = formatMoneyParts(value, currency);
  return (
    <span className="assets-hero-value">
      <span className="assets-hero-currency">{symbol}</span>
      {int}
      {frac != null && <span className="assets-hero-frac">.{frac}</span>}
    </span>
  );
}

export function Assets() {
  const { resolvedLanguage, tx } = useI18n();
  const { currencyPreference, resolvedCurrency, setCurrencyPreference } = useCurrency();
  const { privacyMode } = usePrivacyMode();
  const [sortField, setSortField] = useState<AssetsSortField>("weight");
  const [sortDirection, setSortDirection] = useState<AssetsSortDirection>("asc");
  const isMobileLayout = useMediaQuery(ASSETS_MOBILE_QUERY);
  const now = useHourlyClock();
  const themeSettings = useThemeSettings();
  const { data: me, isPending: authPending } = useAuth();
  const costsVisible =
    themeSettings.isReady &&
    !authPending &&
    canViewCosts(themeSettings, me?.logged_in === true);
  const forceRateRefresh = useRef(false);
  const nodes = useVisibleNodes();
  const renewalReminders = useMemo(() => getRenewalReminders(nodes, now), [nodes, now]);
  const renewalByUuid = useMemo(
    () => new Map(renewalReminders.map((item) => [item.uuid, item])),
    [renewalReminders],
  );
  const rateQuery = useQuery({
    queryKey: ["cost-rates", themeSettings.costRateApiUrl],
    queryFn: ({ signal }) => {
      const ignoreCache = forceRateRefresh.current;
      forceRateRefresh.current = false;
      return getExchangeRates(themeSettings.costRateApiUrl, { signal, ignoreCache });
    },
    staleTime: 60 * 60 * 1000,
    enabled: costsVisible && nodes.length > 0,
    retry: 1,
  });
  const rates = rateQuery.data?.rates;
  const activeCurrency: DisplayCurrency =
    rates && (resolvedCurrency === "CNY" || rates[resolvedCurrency])
      ? resolvedCurrency
      : "CNY";

  const convert = (cny: number) =>
    convertCnyToCurrency(cny, activeCurrency, rates) ?? cny;
  const fmtMoney = (cny: number) =>
    privacyMode ? "•••" : formatMoney(convert(cny), activeCurrency);
  const fmtSigned = (cny: number) =>
    privacyMode ? "•••" : formatSignedMoney(convert(cny), activeCurrency);

  const summary = useMemo(
    () =>
      costsVisible && rateQuery.data
        ? calculateCostSummary(
            nodes,
            themeSettings.costIgnoredNodes,
            rateQuery.data.rates,
            themeSettings.costPremiums,
            now,
          )
        : null,
    [costsVisible, nodes, now, themeSettings.costIgnoredNodes, themeSettings.costPremiums, rateQuery.data],
  );
  const detailRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const rows = (summary?.details ?? []).map((detail) => ({
      detail,
      key: sortValue(detail, sortField),
    }));
    rows.sort((a, b) => {
      if (a.detail.counted !== b.detail.counted) return a.detail.counted ? -1 : 1;
      return (
        (a.key - b.key) * direction || a.detail.name.localeCompare(b.detail.name, "zh-CN")
      );
    });
    return rows.map(({ detail }) => detail);
  }, [sortDirection, sortField, summary]);

  const exchangeRateRows = useMemo(() => {
    if (!rates || !rates[activeCurrency]) return [];
    const targetRate = rates[activeCurrency];
    return (["USD", "CNY", "TWD", "HKD", "EUR", "GBP", "JPY", "SGD"] as const)
      .filter((code) => code !== activeCurrency && Boolean(rates[code]))
      .map((code) => ({ code, value: targetRate / rates[code] }));
  }, [activeCurrency, rates]);

  const tableColumns: Array<{ field: AssetsSortField; label: string; numeric?: boolean }> = [
    { field: "weight", label: tx("节点", "節點", "Node") },
    { field: "price", label: tx("价格", "價格", "Price"), numeric: true },
    { field: "remaining", label: tx("剩余价值", "剩餘價值", "Remaining"), numeric: true },
    { field: "premium", label: tx("溢价", "溢價", "Premium"), numeric: true },
    { field: "premiumMonthly", label: tx("溢价月摊", "溢價月攤", "Amort/mo"), numeric: true },
    { field: "expiry", label: tx("到期", "到期", "Expiry"), numeric: true },
  ];

  const mobileSortOptions: Array<{ field: AssetsSortField; label: string }> = [
    { field: "weight", label: tx("权重", "權重", "Weight") },
    { field: "price", label: tx("价格", "價格", "Price") },
    { field: "premium", label: tx("溢价", "溢價", "Premium") },
    { field: "expiry", label: tx("到期", "到期", "Expiry") },
  ];

  const formatCostExpiry = (expiredAt: string) => {
    const days = getExpireDaysRemaining(expiredAt);
    if (days == null) return tx("到期未知", "到期未知", "Unknown");
    if (days > LONG_TERM_EXPIRE_DAYS) return tx("长期", "長期", "Long-term");
    if (days < 0) return tx("已过期", "已過期", "Expired");
    if (days === 0) return tx("今日到期", "今日到期", "Expires today");
    return tx(`${days} 天后到期`, `${days} 天後到期`, `In ${days}d`);
  };

  const assetsRenewalLabel = (daysRemaining: number) =>
    daysRemaining < 0
      ? tx("已过期", "已過期", "Expired")
      : tx("即将到期", "即將到期", "Expiring");

  const translateNote = (note: string) => {
    if (note === "已忽略") return tx("已忽略", "已忽略", "Ignored");
    if (note === "免费") return tx("免费", "免費", "Free");
    if (note === "汇率缺失") return tx("汇率缺失", "匯率缺失", "No FX");
    return note;
  };

  const handleSort = (field: AssetsSortField) => {
    if (field === sortField) {
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(NATURAL_DIRECTION[field]);
    }
  };

  if (!themeSettings.isReady || authPending) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  if (!costsVisible) {
    return <Navigate to="/" replace />;
  }

  if (!themeSettings.showCostSummary && !themeSettings.showCostSummaryFloatingButton) {
    return <Navigate to="/" replace />;
  }

  const hasPremium = summary?.details.some((detail) => detail.premiumCny !== 0) ?? false;
  const ledgerRows: Array<{
    label: string;
    value: string;
    tone?: string;
    title?: string;
  }> = [
    {
      label: tx("年化总支出", "年化總支出", "Annualized"),
      value: summary ? fmtMoney(summary.totalCny) : "--",
    },
    {
      label: tx("月均支出", "月均支出", "Monthly Avg"),
      value: summary ? fmtMoney(summary.monthlyCny) : "--",
    },
    ...(summary != null && hasPremium
      ? [
          {
            label: tx("溢价盈亏", "溢價盈虧", "Premium P/L"),
            value: fmtSigned(summary.premiumTotalCny),
            tone: privacyMode ? undefined : premiumTone(summary.premiumTotalCny),
            title: tx(
              "所有节点「收购溢价」的加总（正数=溢价多花钱，负数=折价少花钱）",
              "所有節點「收購溢價」的加總（正數=溢價多花錢，負數=折價少花錢）",
              "Sum of acquisition premiums across all nodes",
            ),
          },
        ]
      : []),
    ...(summary != null && summary.premiumMonthlyTotalCny !== 0
      ? [
          {
            label: tx("真实月均", "真實月均", "Effective Monthly"),
            value: fmtMoney(summary.effectiveMonthlyCny),
            title: tx(
              "月均支出 + 溢价月摊",
              "月均支出 + 溢價月攤",
              "Monthly cost + amortized premium",
            ),
          },
        ]
      : []),
    ...(summary != null && hasPremium
      ? [
          {
            label: tx("实际剩余价值", "實際剩餘價值", "Actual Remaining"),
            value: fmtMoney(summary.actualRemainingCny),
            title: tx(
              "剩余价值 + 尚未摊销的溢价",
              "剩餘價值 + 尚未攤銷的溢價",
              "Remaining value + unamortized premium",
            ),
          },
        ]
      : []),
  ];

  const directionIcon =
    sortDirection === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;

  return (
    <div className="assets-page flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="instance-page-back">
          <ChevronLeft size={14} />
          {tx("返回", "返回", "Back")}
        </Link>
        <div className="flex items-center gap-2">
          <select
            className="overview-currency-select"
            style={{ height: 32, padding: "0 24px 0 10px", fontSize: 12 }}
            value={currencyPreference}
            onChange={(e) => setCurrencyPreference(e.target.value as CurrencyPreference)}
            aria-label={tx("切换显示币别", "切換顯示幣別", "Display currency")}
          >
            <option value="auto">
              {tx(
                `跟随地区 (${resolvedCurrency})`,
                `跟隨地區 (${resolvedCurrency})`,
                `Auto (${resolvedCurrency})`,
              )}
            </option>
            {DISPLAY_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {getCurrencyLabel(code, resolvedLanguage)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`cost-summary-action${rateQuery.isFetching ? " is-spinning" : ""}`}
            onClick={() => {
              forceRateRefresh.current = true;
              void rateQuery.refetch();
            }}
            disabled={rateQuery.isFetching}
            aria-busy={rateQuery.isFetching}
            aria-label={tx("刷新汇率与统计", "刷新匯率與統計", "Refresh exchange rates")}
            title={tx("刷新", "刷新", "Refresh")}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]">
          <span className="text-[15px]">{tx("暂无节点数据", "暫無節點資料", "No node data")}</span>
          <span className="text-[12px]">
            {tx("等待后端推送或前往管理后台添加", "等待後端推送或前往管理後台新增", "Waiting for agents or add one in admin")}
          </span>
        </div>
      ) : (
        <>
          <section className="assets-hero" aria-label={tx("资产汇总", "資產彙總", "Asset Summary")}>
            <span className="assets-hero-mark" aria-hidden>
              {CURRENCY_META[activeCurrency].symbol}
            </span>
            <div className="assets-hero-main">
              <span
                className="assets-eyebrow"
                title={tx(
                  "按各节点账单价格折算的剩余价值，不含收购溢价",
                  "按各節點帳單價格折算的剩餘價值，不含收購溢價",
                  "Prepaid remaining value excluding acquisition premiums",
                )}
              >
                {tx("剩余价值", "剩餘價值", "Remaining Value")} · {activeCurrency}
              </span>
              <HeroMoney
                value={summary ? convert(summary.remainingCny) : null}
                currency={activeCurrency}
                privacyMode={privacyMode}
                pendingLabel={tx("计算中", "計算中", "Calculating")}
              />
            </div>
            <dl className="assets-ledger">
              {ledgerRows.map((row) => (
                <div className="assets-ledger-row" key={row.label} title={row.title}>
                  <dt>{row.label}</dt>
                  <dd style={row.tone ? { color: row.tone } : undefined}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="assets-section-head">
            <span className="assets-eyebrow">{tx("明细", "明細", "Breakdown")}</span>
            <span className="assets-count">
              {tx(`${detailRows.length} 台`, `${detailRows.length} 台`, `${detailRows.length} nodes`)}
            </span>
            {renewalReminders.length > 0 && (
              <span className="assets-renewal-inline">
                <CalendarClock size={12} strokeWidth={2.1} />
                {tx(
                  `${renewalReminders.length} 台临期`,
                  `${renewalReminders.length} 台臨期`,
                  `${renewalReminders.length} expiring`,
                )}
              </span>
            )}
            <div className="assets-mobile-tools">
              <div className="cost-summary-sort-tabs" role="group" aria-label={tx("排序字段", "排序欄位", "Sort by")}>
                {mobileSortOptions.map((option) => (
                  <button
                    key={option.field}
                    type="button"
                    className="cost-summary-sort-tab"
                    data-active={sortField === option.field}
                    onClick={() => handleSort(option.field)}
                    aria-pressed={sortField === option.field}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="cost-summary-action is-direction"
                onClick={() => setSortDirection((value) => (value === "asc" ? "desc" : "asc"))}
                aria-label={
                  sortDirection === "asc"
                    ? tx("切换为倒序", "切換為降序", "Sort descending")
                    : tx("切换为正序", "切換為升序", "Sort ascending")
                }
                title={sortDirection === "asc" ? tx("正序", "升序", "Asc") : tx("倒序", "降序", "Desc")}
              >
                {sortDirection === "asc" ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>
          </div>

          {summary ? (
            <>
              {!isMobileLayout ? (
                <div className="assets-table-wrap">
                <table className="assets-table">
                  <thead>
                    <tr>
                      {tableColumns.map((column) => (
                        <th
                          key={column.field}
                          data-numeric={column.numeric || undefined}
                          aria-sort={
                            sortField === column.field
                              ? sortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : undefined
                          }
                        >
                          <button
                            type="button"
                            onClick={() => handleSort(column.field)}
                            data-active={sortField === column.field}
                          >
                            {column.label}
                            {sortField === column.field && directionIcon}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((detail) => {
                      const reminder = renewalByUuid.get(detail.uuid);
                      const renewalTone = reminder
                        ? assetsRenewalTone(reminder.daysRemaining)
                        : undefined;
                      const renewalLabel = reminder
                        ? assetsRenewalLabel(reminder.daysRemaining)
                        : undefined;
                      return (
                        <tr
                          key={detail.uuid}
                          data-counted={detail.counted}
                          data-renewal-tone={renewalTone}
                        >
                        <td>
                          <Link
                            to={`/instance/${encodeURIComponent(detail.uuid)}`}
                            className="assets-node-link"
                            title={detail.name}
                          >
                            <Flag region={detail.region} size={12} />
                            <span>{detail.name}</span>
                          </Link>
                        </td>
                        <td data-numeric>
                          {detail.counted ? (
                            `${fmtMoney(detail.priceCny)}/${formatBillingCycle(detail.billingCycleDays)}`
                          ) : (
                            <span className="assets-note-chip">{translateNote(detail.note)}</span>
                          )}
                        </td>
                        <td data-numeric data-strong>
                          {detail.counted ? fmtMoney(detail.remainingCny) : "—"}
                        </td>
                        <td data-numeric>
                          {detail.premiumCny !== 0 ? (
                            <span style={{ color: privacyMode ? undefined : premiumTone(detail.premiumCny) }}>
                              {fmtSigned(detail.premiumCny)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-numeric>
                          {detail.premiumCny !== 0 && detail.amortMonths != null ? (
                            <span
                              title={tx(
                                `摊销 ${Math.round(detail.amortMonths)} 个月`,
                                `攤銷 ${Math.round(detail.amortMonths)} 個月`,
                                `Amortized over ${Math.round(detail.amortMonths)} months`,
                              )}
                            >
                              {fmtSigned(detail.premiumMonthlyCny)}/{tx("月", "月", "mo")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-numeric>
                          {reminder ? (
                            <span
                              className="assets-expiry-reminder"
                              data-tone={renewalTone}
                              title={renewalLabel}
                            >
                              <span>{formatCostExpiry(detail.expiredAt)}</span>
                              <small>{renewalLabel}</small>
                            </span>
                          ) : (
                            formatCostExpiry(detail.expiredAt)
                          )}
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="assets-card-list">
                {detailRows.map((detail) => {
                  const reminder = renewalByUuid.get(detail.uuid);
                  const renewalTone = reminder
                    ? assetsRenewalTone(reminder.daysRemaining)
                    : undefined;
                  const renewalLabel = reminder
                    ? assetsRenewalLabel(reminder.daysRemaining)
                    : undefined;
                  const priceLabel = detail.counted
                    ? `${fmtMoney(detail.priceCny)}/${formatBillingCycle(detail.billingCycleDays)}`
                    : translateNote(detail.note);
                  return (
                    <div
                      key={detail.uuid}
                      className="cost-summary-detail-item"
                      data-counted={detail.counted}
                      data-renewal-tone={renewalTone}
                      title={detail.name}
                    >
                      <div className="cost-summary-detail-head">
                        <Link
                          to={`/instance/${encodeURIComponent(detail.uuid)}`}
                          className="cost-summary-detail-name"
                        >
                          <Flag region={detail.region} size={12} />
                          <span className="cost-summary-detail-title">{detail.name}</span>
                        </Link>
                        <strong title={tx("剩余价值", "剩餘價值", "Remaining")}>
                          {detail.counted ? fmtMoney(detail.remainingCny) : "—"}
                        </strong>
                      </div>
                      <div className="cost-summary-detail-meta">
                        <span className="cost-summary-price-chip">{priceLabel}</span>
                        {detail.premiumCny !== 0 && (
                          <span
                            className="cost-summary-premium-chip"
                            style={
                              { "--cost-premium-color": premiumTone(detail.premiumCny) } as CSSProperties
                            }
                          >
                            {fmtSigned(detail.premiumCny)} {tx("溢价", "溢價", "Prem")}
                          </span>
                        )}
                        {detail.premiumCny !== 0 && detail.amortMonths != null && (
                          <span className="cost-summary-premium-chip">
                            {tx("月摊", "月攤", "Amort")} {fmtSigned(detail.premiumMonthlyCny)} · {Math.round(detail.amortMonths)}{tx("月", "月", "m")}
                          </span>
                        )}
                        <span
                          className="cost-summary-expire-label"
                          data-tone={renewalTone}
                        >
                          {formatCostExpiry(detail.expiredAt)}
                          {renewalLabel && <small>{renewalLabel}</small>}
                        </span>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </>
          ) : (
            <div className="cost-summary-empty">
              {rateQuery.isError
                ? tx("汇率获取失败，点击右上角刷新重试", "匯率獲取失敗，點擊右上角刷新重試", "Failed to fetch exchange rates. Tap refresh to retry.")
                : tx("费用明细加载中", "費用明細載入中", "Loading asset breakdown...")}
            </div>
          )}

          <details className="cost-summary-rate-details">
            <summary>
              <span>{tx("汇率", "匯率", "FX Rates")}</span>
              <strong>
                {exchangeRateRows.length > 0
                  ? exchangeRateRows
                      .slice(0, 3)
                      .map((item) => `${item.code} ${formatMoney(item.value, activeCurrency)}`)
                      .join(" · ")
                  : tx("暂无汇率", "暫無匯率", "No rates")}
              </strong>
            </summary>
            {exchangeRateRows.length > 0 ? (
              <div className="cost-summary-rate-list" aria-label={tx("汇率", "匯率", "FX Rates")}>
                {exchangeRateRows.map((item) => (
                  <div className="cost-summary-rate-item" key={item.code}>
                    <span>1 {item.code}</span>
                    <strong>{formatMoney(item.value, activeCurrency)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cost-summary-empty is-compact">
                {tx("暂无可用汇率", "暫無可用匯率", "No exchange rates available")}
              </div>
            )}
          </details>
        </>
      )}
    </div>
  );
}
