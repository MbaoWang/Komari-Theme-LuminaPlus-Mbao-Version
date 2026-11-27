import { useEffect, useMemo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n";
import { useNodeMeta, useNodeMetrics } from "@/hooks/useNode";
import { useMinuteClock } from "@/hooks/useClock";
import { useTodayTrafficStats } from "@/hooks/useTodayTrafficStats";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { NodeRoutePills } from "@/components/node/NodeRoutePills";
import { InstanceSwitcher } from "./InstanceSwitcher";
import {
  formatTodayPeakValue,
  formatTodayTrafficValue,
} from "./instanceTodayTrafficFormat";
import {
  formatBytes,
  formatUptimeDays,
} from "@/utils/format";
import { resolveTrafficUsage } from "@/utils/traffic";
import { resolveNodeRoutes } from "@/utils/nodeRoutes";
import { InstancePanel } from "./InstancePanel";

// Intl.DateTimeFormat 构造开销大，复用一个实例，别每次 metrics 更新都重建
const TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function InstanceDetails({
  uuid,
  onNodeReady,
}: {
  uuid: string;
  onNodeReady?: () => (() => void) | void;
}) {
  const { tx } = useI18n();
  const now = useMinuteClock();
  const meta = useNodeMeta(uuid);
  const metrics = useNodeMetrics(uuid);
  const themeSettings = useThemeSettings();
  const trafficQuery = useTodayTrafficStats([uuid], now, "summary");
  const todayStat = trafficQuery.data?.rows.find((row) => row.uuid === uuid);
  const isReady = Boolean(meta && metrics);
  const routes = useMemo(
    () => (meta ? resolveNodeRoutes(themeSettings.nodeRoutes[uuid], meta.tags) : []),
    [meta, themeSettings.nodeRoutes, uuid],
  );

  useEffect(() => {
    if (!isReady) return;
    return onNodeReady?.();
  }, [isReady, onNodeReady, uuid]);

  if (!meta || !metrics) return null;

  const isOnline = metrics.online;
  const uptime = formatUptimeDays(metrics.uptime);
  const trafficUsage = resolveTrafficUsage(
    meta.traffic_limit_type,
    metrics.trafficUp,
    metrics.trafficDown,
    meta.traffic_limit,
  );
  const lastUpdated =
    metrics.updatedAt > 0 ? TIME_FORMATTER.format(metrics.updatedAt) : "—";
  const trimmedName = meta.name?.trim();
  const panelTitle = trimmedName
    ? tx(`${trimmedName} 信息`, `${trimmedName} 資訊`, `${trimmedName} Info`)
    : tx("实例信息", "實例資訊", "Instance Info");

  return (
    <InstancePanel
      title={panelTitle}
      titleAction={<InstanceSwitcher currentUuid={uuid} />}
      description={
        isOnline
          ? undefined
          : tx(
              "节点当前离线，以下展示最近一次上报的缓存数据。",
              "節點目前離線，以下顯示最近一次上報的快取資料。",
              "Node is offline. Displaying the latest cached telemetry.",
            )
      }
    >
      {themeSettings.showNodeRoutes && routes.length > 0 && (
        <div className="mb-4">
          <NodeRoutePills
            routes={routes}
            premiumIcon={themeSettings.routePremiumIcon}
            density="detail"
          />
        </div>
      )}
      <div className="instance-info-groups">
        <div className="instance-info-group">
          <div className="instance-info-group-title">{tx("系统", "系統", "System")}</div>
          <InfoRow
            label={tx("状态", "狀態", "Status")}
            value={isOnline ? tx("在线", "在線", "Online") : tx("离线", "離線", "Offline")}
          />
          <InfoRow
            label="CPU"
            value={`${meta.cpu_name || "—"}${meta.cpu_cores > 0 ? ` (x${meta.cpu_cores})` : ""}`}
          />
          <InfoRow label={tx("架构", "架構", "Arch")} value={meta.arch || "—"} />
          <InfoRow label={tx("虚拟化", "虛擬化", "Virt")} value={meta.virtualization || "—"} />
          <InfoRow label={tx("显卡", "顯示卡", "GPU")} value={meta.gpu_name || "—"} />
          <InfoRow label={tx("操作系统", "作業系統", "OS")} value={meta.os || "—"} />
        </div>

        <div className="instance-info-group">
          <div className="instance-info-group-title">{tx("资源", "資源", "Resources")}</div>
          <InfoRow
            label={tx("内存", "記憶體", "RAM")}
            value={`${formatBytes(metrics.ramUsed)} / ${formatBytes(metrics.ramTotal)}`}
          />
          <InfoRow
            label="Swap"
            value={
              metrics.swapTotal > 0
                ? `${formatBytes(metrics.swapUsed)} / ${formatBytes(metrics.swapTotal)}`
                : tx("无", "無", "None")
            }
          />
          <InfoRow
            label={tx("磁盘", "磁碟", "Disk")}
            value={`${formatBytes(metrics.diskUsed)} / ${formatBytes(metrics.diskTotal)}`}
          />
          <InfoRow
            label={tx("负载", "負載", "Load")}
            value={`${metrics.load1.toFixed(2)} | ${metrics.load5.toFixed(2)} | ${metrics.load15.toFixed(2)}`}
          />
          <InfoRow
            label={tx("运行时长", "運行時長", "Uptime")}
            value={uptime.unit ? `${uptime.value} ${uptime.unit}` : uptime.value}
          />
        </div>

        <div className="instance-info-group">
          <div className="instance-info-group-title">{tx("网络", "網路", "Network")}</div>
          <InfoRow
            label={
              isOnline
                ? tx("实时网络", "即時網路", "Live Speed")
                : tx("缓存网络", "快取網路", "Cached Speed")
            }
            value={`↑ ${formatBytes(metrics.netUp)}/s · ↓ ${formatBytes(metrics.netDown)}/s`}
          />
          <InfoRow
            label={
              isOnline
                ? tx("最近更新", "最近更新", "Updated")
                : tx("最后上报", "最後上報", "Last Seen")
            }
            value={lastUpdated}
          />
          <InfoRow
            label={tx("今日流量", "今日流量", "Today")}
            value={
              <span className="instance-info-inline-value">
                <span>
                  {formatTodayTrafficValue(
                    todayStat,
                    trafficQuery.isPending,
                    trafficQuery.isError,
                  )}
                </span>
                <button
                  type="button"
                  className={`instance-info-refresh${trafficQuery.isFetching ? " is-spinning" : ""}`}
                  onClick={() => void trafficQuery.refetch()}
                  disabled={trafficQuery.isFetching}
                  aria-busy={trafficQuery.isFetching}
                  aria-label={tx("刷新今日流量", "刷新今日流量", "Refresh today's traffic")}
                  title={tx("刷新今日流量", "刷新今日流量", "Refresh today's traffic")}
                >
                  <RefreshCw size={13} strokeWidth={2.2} />
                </button>
              </span>
            }
          />
          <InfoRow
            label={tx("峰值速度", "峰值速度", "Peak Speed")}
            value={formatTodayPeakValue(todayStat, trafficQuery.isPending)}
          />
          <div className="instance-info-item is-stack">
            <span className="instance-info-label">{tx("总流量", "總流量", "Total")}</span>
            <div className="instance-info-traffic">
              <span className="instance-info-value">{`↑ ${formatBytes(metrics.trafficUp)} · ↓ ${formatBytes(metrics.trafficDown)}`}</span>
              <div
                className={`instance-progress-track${trafficUsage.unlimited ? " is-unlimited" : ""}`}
                aria-hidden
              >
                {!trafficUsage.unlimited && (
                  <span
                    className="instance-progress-fill"
                    style={{ width: `${trafficUsage.fraction * 100}%` }}
                  />
                )}
              </div>
              <span className="instance-info-note">
                {trafficUsage.unlimited
                  ? `${formatBytes(trafficUsage.used)} / ∞`
                  : `${formatBytes(trafficUsage.used)} / ${formatBytes(trafficUsage.limit)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </InstancePanel>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="instance-info-item">
      <span className="instance-info-label">{label}</span>
      <div className="instance-info-value">{value}</div>
    </div>
  );
}
