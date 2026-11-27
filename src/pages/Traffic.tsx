import { Fragment, Suspense, lazy, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n";
import { Flag } from "@/components/ui/Flag";
import { Spinner } from "@/components/ui/Spinner";
import { useMinuteClock } from "@/hooks/useClock";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTodayTrafficStats } from "@/hooks/useTodayTrafficStats";
import { useVisibleNodes } from "@/hooks/useVisibleNodes";
import { formatByteRateLabel, formatBytes } from "@/utils/format";
import type { NodeInfo } from "@/types/komari";
import type { TodayTrafficSample, TodayTrafficStat } from "@/utils/trafficStats";

const TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
// 与 traffic-stats.css 的表格/卡片切换断点保持一致。
const TRAFFIC_MOBILE_QUERY = "(max-width: 720px)";

const TrafficRateChart = lazy(() =>
  import("@/components/traffic/TrafficRateChart").then((module) => ({
    default: module.TrafficRateChart,
  })),
);

interface TrafficDetail {
  node: NodeInfo;
  stat: TodayTrafficStat;
  total: number;
}

function formatPeakTime(timeMs: number | null, value: number) {
  return timeMs != null && value > 0 ? TIME_FORMATTER.format(timeMs) : "—";
}

function PeakValue({ value, timeMs }: { value: number; timeMs: number | null }) {
  return (
    <span className="traffic-peak-value">
      <strong>{formatByteRateLabel(value)}</strong>
      <small>{formatPeakTime(timeMs, value)}</small>
    </span>
  );
}

function PeakSummaryRow({
  direction,
  detail,
}: {
  direction: "up" | "down";
  detail: TrafficDetail | null;
}) {
  const { tx } = useI18n();
  const value = direction === "up" ? detail?.stat.peakUp ?? 0 : detail?.stat.peakDown ?? 0;
  const timeMs = direction === "up" ? detail?.stat.peakUpAt ?? null : detail?.stat.peakDownAt ?? null;
  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  return (
    <div className="traffic-summary-peak-row">
      <span className="traffic-summary-peak-label">
        <Icon size={13} strokeWidth={2.4} aria-hidden />
        {direction === "up" ? tx("上行", "上行", "Up") : tx("下行", "下行", "Down")}
      </span>
      <span className="traffic-summary-peak-main">
        <strong>{detail ? formatByteRateLabel(value) : "—"}</strong>
        <small>
          {detail && value > 0
            ? `${detail.node.name} · ${formatPeakTime(timeMs, value)}`
            : tx("暂无峰值", "暫無峰值", "No peak")}
        </small>
      </span>
    </div>
  );
}

function TrafficDetailToggle({
  expanded,
  controlsId,
  onClick,
}: {
  expanded: boolean;
  controlsId: string;
  onClick: () => void;
}) {
  const { tx } = useI18n();
  return (
    <button
      type="button"
      className="traffic-detail-toggle"
      aria-expanded={expanded}
      aria-controls={controlsId}
      onClick={onClick}
    >
      {tx("详情", "詳情", "Details")}
      <ChevronDown size={13} strokeWidth={2.2} aria-hidden />
    </button>
  );
}

function TrafficSampleChart({
  id,
  samples,
}: {
  id: string;
  samples: TodayTrafficSample[];
}) {
  const { tx } = useI18n();
  return (
    <section id={id} className="traffic-detail-panel" aria-label={tx("本日网络上下行明细", "本日網路上下行明細", "Today's bandwidth samples")}>
      <header className="traffic-detail-head">
        <strong>{tx("本日网络上下行", "本日網路上下行", "Today's Bandwidth")}</strong>
        <span>{tx(`${samples.length} 个采样`, `${samples.length} 個採樣`, `${samples.length} samples`)}</span>
      </header>
      {samples.length === 0 ? (
        <div className="traffic-detail-empty">
          {tx("本日暂无速率采样", "本日暫無速率採樣", "No rate samples today")}
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="traffic-chart-loading">
              <Spinner size={18} />
            </div>
          }
        >
          <TrafficRateChart samples={samples} />
        </Suspense>
      )}
    </section>
  );
}

export function Traffic() {
  const { locale, tx } = useI18n();
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);
  const now = useMinuteClock();
  const isMobileLayout = useMediaQuery(TRAFFIC_MOBILE_QUERY);
  const nodes = useVisibleNodes();
  const uuids = useMemo(() => nodes.map((node) => node.uuid), [nodes]);
  const trafficQuery = useTodayTrafficStats(uuids, now);
  const dayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(now),
    [locale, now],
  );
  const details = useMemo<TrafficDetail[]>(() => {
    const stats = new Map(trafficQuery.data?.rows.map((row) => [row.uuid, row] as const));
    return nodes
      .map((node) => {
        const stat = stats.get(node.uuid) ?? {
          uuid: node.uuid,
          trafficUp: 0,
          trafficDown: 0,
          peakUp: 0,
          peakUpAt: null,
          peakDown: 0,
          peakDownAt: null,
          sampleCount: 0,
          hasSamples: false,
        };
        return { node, stat, total: stat.trafficUp + stat.trafficDown };
      })
      .sort(
        (left, right) =>
          Number(right.stat.hasSamples) - Number(left.stat.hasSamples) ||
          right.total - left.total ||
          left.node.weight - right.node.weight,
      );
  }, [nodes, trafficQuery.data?.rows]);
  const { sampledDetails, totalUp, totalDown, peakUp, peakDown } = useMemo(() => {
    const sampled = details.filter((detail) => detail.stat.hasSamples);
    return {
      sampledDetails: sampled,
      totalUp: sampled.reduce((sum, detail) => sum + detail.stat.trafficUp, 0),
      totalDown: sampled.reduce((sum, detail) => sum + detail.stat.trafficDown, 0),
      peakUp: sampled.reduce<TrafficDetail | null>(
        (best, detail) => (!best || detail.stat.peakUp > best.stat.peakUp ? detail : best),
        null,
      ),
      peakDown: sampled.reduce<TrafficDetail | null>(
        (best, detail) => (!best || detail.stat.peakDown > best.stat.peakDown ? detail : best),
        null,
      ),
    };
  }, [details]);
  const updatedAt = trafficQuery.data?.rangeEndMs ?? now;

  return (
    <div className="traffic-page flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="instance-page-back">
          <ChevronLeft size={14} />
          {tx("返回", "返回", "Back")}
        </Link>
        <button
          type="button"
          className={`cost-summary-action${trafficQuery.isFetching ? " is-spinning" : ""}`}
          onClick={() => void trafficQuery.refetch()}
          disabled={trafficQuery.isFetching || nodes.length === 0}
          aria-busy={trafficQuery.isFetching}
          aria-label={tx("刷新今日流量统计", "刷新今日流量統計", "Refresh today's traffic")}
          title={tx("刷新", "刷新", "Refresh")}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]">
          <span className="text-[15px]">{tx("暂无节点数据", "暫無節點資料", "No node data")}</span>
          <span className="text-[12px]">
            {tx("等待后端推送或前往管理后台添加", "等待後端推送或前往管理後台新增", "Waiting for agents or add one in admin")}
          </span>
        </div>
      ) : trafficQuery.isPending ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Spinner size={24} />
        </div>
      ) : trafficQuery.isError ? (
        <section className="traffic-error" role="alert">
          <strong>{tx("无法读取今日流量统计", "無法讀取今日流量統計", "Unable to load daily traffic")}</strong>
          <span>{tx("请检查网络或历史记录配置后重试。", "請檢查網路或歷史記錄設定後重試。", "Check network or history settings and retry.")}</span>
          <button type="button" onClick={() => void trafficQuery.refetch()}>
            {tx("重新加载", "重新載入", "Reload")}
          </button>
        </section>
      ) : (
        <>
          <section className="traffic-summary-grid" aria-label={tx("今日流量汇总", "今日流量彙總", "Daily traffic summary")}>
            <article className="traffic-summary-card">
              <div className="traffic-summary-head">
                <span className="assets-eyebrow">{tx("今日流量", "今日流量", "Today's Traffic")}</span>
                <span>{dayLabel}</span>
              </div>
              <strong className="traffic-summary-total">
                {sampledDetails.length > 0 ? formatBytes(totalUp + totalDown) : "—"}
              </strong>
              <div className="traffic-summary-directions">
                <span><ArrowUp size={13} aria-hidden />{formatBytes(totalUp)}</span>
                <span><ArrowDown size={13} aria-hidden />{formatBytes(totalDown)}</span>
              </div>
            </article>

            <article className="traffic-summary-card">
              <div className="traffic-summary-head">
                <span className="assets-eyebrow">{tx("今日采样峰值", "今日採樣峰值", "Today's Peak")}</span>
                <span>{tx(`统计至 ${TIME_FORMATTER.format(updatedAt)}`, `統計至 ${TIME_FORMATTER.format(updatedAt)}`, `As of ${TIME_FORMATTER.format(updatedAt)}`)}</span>
              </div>
              <div className="traffic-summary-peak-list">
                <PeakSummaryRow direction="up" detail={peakUp} />
                <PeakSummaryRow direction="down" detail={peakDown} />
              </div>
            </article>
          </section>

          <div className="assets-section-head">
            <span className="assets-eyebrow">{tx("节点明细", "節點明細", "Node Breakdown")}</span>
            <span className="assets-count">
              {tx(`${details.length} 台`, `${details.length} 台`, `${details.length} nodes`)}
            </span>
            <span className="traffic-sample-note">
              {tx("峰值按历史采样计算", "峰值按歷史採樣計算", "Peaks computed from history samples")}
            </span>
          </div>

          {!isMobileLayout && (
          <div className="assets-table-wrap traffic-table-wrap">
            <table className="assets-table traffic-table">
              <thead>
                <tr>
                  <th><span>{tx("节点", "節點", "Node")}</span></th>
                  <th data-numeric><span>{tx("今日流量", "今日流量", "Today")}</span></th>
                  <th data-numeric><span>{tx("上行峰值", "上行峰值", "Peak Up")}</span></th>
                  <th data-numeric><span>{tx("下行峰值", "下行峰值", "Peak Down")}</span></th>
                  <th data-action><span>{tx("操作", "操作", "Action")}</span></th>
                </tr>
              </thead>
              <tbody>
                {details.map(({ node, stat, total }) => {
                  const expanded = expandedUuid === node.uuid;
                  const detailId = `traffic-detail-${node.uuid}`;
                  const samples = trafficQuery.data?.samplesByUuid[node.uuid] ?? [];
                  return (
                    <Fragment key={node.uuid}>
                      <tr data-empty={!stat.hasSamples || undefined}>
                        <td>
                          <Link
                            to={`/instance/${encodeURIComponent(node.uuid)}`}
                            className="assets-node-link"
                            title={node.name}
                          >
                            <Flag region={node.region} size={12} />
                            <span>{node.name}</span>
                          </Link>
                        </td>
                        <td data-numeric data-strong>
                          {stat.hasSamples ? (
                            <span className="traffic-volume-value">
                              <strong>{formatBytes(total)}</strong>
                              <small>↑ {formatBytes(stat.trafficUp)} · ↓ {formatBytes(stat.trafficDown)}</small>
                            </span>
                          ) : (
                            <span className="traffic-no-data">{tx("无数据", "無資料", "No data")}</span>
                          )}
                        </td>
                        <td data-numeric>
                          {stat.hasSamples ? <PeakValue value={stat.peakUp} timeMs={stat.peakUpAt} /> : "—"}
                        </td>
                        <td data-numeric>
                          {stat.hasSamples ? <PeakValue value={stat.peakDown} timeMs={stat.peakDownAt} /> : "—"}
                        </td>
                        <td data-action>
                          <TrafficDetailToggle
                            expanded={expanded}
                            controlsId={detailId}
                            onClick={() => setExpandedUuid(expanded ? null : node.uuid)}
                          />
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="traffic-detail-row">
                          <td colSpan={5}>
                            <TrafficSampleChart id={detailId} samples={samples} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          {isMobileLayout && (
          <div className="assets-card-list traffic-card-list">
            {details.map(({ node, stat, total }) => {
              const expanded = expandedUuid === node.uuid;
              const detailId = `traffic-mobile-detail-${node.uuid}`;
              const samples = trafficQuery.data?.samplesByUuid[node.uuid] ?? [];
              return (
                <article className="traffic-node-card" key={node.uuid} data-empty={!stat.hasSamples || undefined}>
                  <header className="traffic-node-card-head">
                    <Link to={`/instance/${encodeURIComponent(node.uuid)}`} className="assets-node-link">
                      <Flag region={node.region} size={12} />
                      <span>{node.name}</span>
                    </Link>
                    <div className="traffic-node-card-actions">
                      <strong>{stat.hasSamples ? formatBytes(total) : tx("无数据", "無資料", "No data")}</strong>
                      <TrafficDetailToggle
                        expanded={expanded}
                        controlsId={detailId}
                        onClick={() => setExpandedUuid(expanded ? null : node.uuid)}
                      />
                    </div>
                  </header>
                  {stat.hasSamples && (
                    <>
                      <div className="traffic-node-card-directions">
                        <span>↑ {formatBytes(stat.trafficUp)}</span>
                        <span>↓ {formatBytes(stat.trafficDown)}</span>
                      </div>
                      <dl className="traffic-node-card-peaks">
                        <div>
                          <dt>{tx("上行峰值", "上行峰值", "Peak Up")}</dt>
                          <dd><PeakValue value={stat.peakUp} timeMs={stat.peakUpAt} /></dd>
                        </div>
                        <div>
                          <dt>{tx("下行峰值", "下行峰值", "Peak Down")}</dt>
                          <dd><PeakValue value={stat.peakDown} timeMs={stat.peakDownAt} /></dd>
                        </div>
                      </dl>
                    </>
                  )}
                  {expanded && <TrafficSampleChart id={detailId} samples={samples} />}
                </article>
              );
            })}
          </div>
          )}
        </>
      )}
    </div>
  );
}
