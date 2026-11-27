import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Route,
  Search,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useI18n } from "@/i18n";
import { Flag } from "@/components/ui/Flag";
import { NodeRoutePills } from "@/components/node/NodeRoutePills";
import { ThemeConfigSaveFooter } from "@/components/theme/ThemeConfigSaveFooter";
import type { AdminClient } from "@/types/komari";
import {
  COMMON_ROUTE_PRESETS,
  getCarrierFullLabel,
  getCarrierShortLabel,
  resolveNodeRoutes,
  ROUTE_CARRIER_KEYS,
  type NodeRouteConfig,
  type NodeRoutesMap,
  type RouteCarrierKey,
  type RoutePremiumIcon,
  type RouteTierSetting,
} from "@/utils/nodeRoutes";

type ConfigFilter = "all" | "configured" | "unconfigured";

interface NodeRouteConfigPanelProps {
  open: boolean;
  clients: AdminClient[];
  routesMap: NodeRoutesMap;
  premiumIcon: RoutePremiumIcon;
  saving: boolean;
  saveDisabled: boolean;
  saveError: string | null;
  onChange: (next: NodeRoutesMap) => void;
  onClose: () => void;
  onSave: () => Promise<boolean>;
}

function isConfigured(routesMap: NodeRoutesMap, uuid: string) {
  const entry = routesMap[uuid];
  if (!entry) return false;
  return ROUTE_CARRIER_KEYS.some((key) => Boolean(entry[key]?.label.trim()));
}

export function NodeRouteConfigPanel({
  open,
  clients,
  routesMap,
  premiumIcon,
  saving,
  saveDisabled,
  saveError,
  onChange,
  onClose,
  onSave,
}: NodeRouteConfigPanelProps) {
  const { resolvedLanguage, tx } = useI18n();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConfigFilter>("all");
  const [selectedUuid, setSelectedUuid] = useState(clients[0]?.uuid ?? "");
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const configuredCount = useMemo(
    () => clients.filter((client) => isConfigured(routesMap, client.uuid)).length,
    [clients, routesMap],
  );

  const filteredClients = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return clients.filter((client) => {
      const configured = isConfigured(routesMap, client.uuid);
      if (filter === "configured" && !configured) return false;
      if (filter === "unconfigured" && configured) return false;
      if (!keyword) return true;
      return [client.name, client.uuid, client.group, client.region].some((value) =>
        String(value || "").toLowerCase().includes(keyword),
      );
    });
  }, [clients, filter, routesMap, search]);

  const selectedClient = useMemo(
    () => filteredClients.find((client) => client.uuid === selectedUuid) ?? filteredClients[0],
    [filteredClients, selectedUuid],
  );

  const selectedConfig = useMemo<NodeRouteConfig>(
    () => (selectedClient ? routesMap[selectedClient.uuid] ?? {} : {}),
    [routesMap, selectedClient],
  );

  const previewPills = useMemo(
    () => resolveNodeRoutes(selectedConfig, ""),
    [selectedConfig],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const nextUuid = selectedClient?.uuid ?? "";
    if (nextUuid !== selectedUuid) setSelectedUuid(nextUuid);
  }, [open, selectedClient?.uuid, selectedUuid]);

  if (!open || typeof document === "undefined") return null;

  const updateCarrier = (
    carrier: RouteCarrierKey,
    patch: { label?: string; tier?: RouteTierSetting },
  ) => {
    if (!selectedClient) return;
    const nextMap = { ...routesMap };
    const current = { ...(nextMap[selectedClient.uuid] ?? {}) };
    const prevEntry = current[carrier] ?? { label: "" };
    const nextLabel = (patch.label ?? prevEntry.label).slice(0, 24);
    const nextTier = patch.tier ?? prevEntry.tier ?? "auto";

    if (!nextLabel.trim()) {
      delete current[carrier];
    } else {
      current[carrier] =
        nextTier === "auto" ? { label: nextLabel } : { label: nextLabel, tier: nextTier };
    }

    if (Object.keys(current).length === 0) {
      delete nextMap[selectedClient.uuid];
    } else {
      nextMap[selectedClient.uuid] = current;
    }
    onChange(nextMap);
  };

  const applyAllThree = (label: string) => {
    if (!selectedClient) return;
    const nextMap = { ...routesMap };
    const current = { ...(nextMap[selectedClient.uuid] ?? {}) };
    current.ct = { label };
    current.cu = { label };
    current.cm = { label };
    nextMap[selectedClient.uuid] = current;
    onChange(nextMap);
  };

  const clearSelected = () => {
    if (!selectedClient) return;
    const nextMap = { ...routesMap };
    delete nextMap[selectedClient.uuid];
    onChange(nextMap);
  };

  return createPortal(
    <div className="multi-ping-config-backdrop" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-config-title"
        className="multi-ping-config-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="multi-ping-config-header">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-tertiary)]">
              <Route size={14} />
              {tx("三网回程路由", "三網回程路由", "Return Routes")}
            </div>
            <h2
              id="route-config-title"
              className="mt-1 text-[19px] font-semibold text-[var(--text-primary)]"
            >
              {tx("按实例配置回程线路", "按實例設定回程線路", "Configure Return Routes per Node")}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="multi-ping-config-icon-button"
            aria-label={tx("关闭配置面板", "關閉設定面板", "Close")}
            title={tx("关闭", "關閉", "Close")}
          >
            <X size={18} />
          </button>
        </header>

        <div className="multi-ping-config-body">
          <aside className={clsx("multi-ping-config-sidebar", mobileEditorOpen && "is-mobile-hidden")}>
            <div className="multi-ping-config-sidebar-tools">
              <label className="surface-inset flex items-center gap-2 px-3 py-2">
                <Search size={14} className="text-[var(--text-tertiary)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={tx("搜索节点…", "搜尋節點…", "Search nodes...")}
                  className="w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", tx(`全部 (${clients.length})`, `全部 (${clients.length})`, `All (${clients.length})`)],
                    ["configured", tx(`已配置 (${configuredCount})`, `已設定 (${configuredCount})`, `Set (${configuredCount})`)],
                    ["unconfigured", tx(`未配置 (${clients.length - configuredCount})`, `未設定 (${clients.length - configuredCount})`, `Unset (${clients.length - configuredCount})`)],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={clsx(
                      "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                      filter === value
                        ? "bg-[var(--accent-500)] text-white"
                        : "bg-[var(--fill-tertiary)] text-[var(--text-secondary)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="multi-ping-config-list">
              {filteredClients.map((client) => {
                const active = selectedClient?.uuid === client.uuid;
                const configured = isConfigured(routesMap, client.uuid);
                return (
                  <button
                    key={client.uuid}
                    type="button"
                    onClick={() => {
                      setSelectedUuid(client.uuid);
                      setMobileEditorOpen(true);
                    }}
                    className={clsx("multi-ping-config-node-item", active && "is-active")}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Flag region={client.region} size={13} />
                      <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                        {client.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {configured && <Check size={14} className="text-[var(--status-success)]" />}
                      <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className={clsx("multi-ping-config-editor", !mobileEditorOpen && "is-mobile-hidden")}>
            {selectedClient ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileEditorOpen(false)}
                      className="multi-ping-config-mobile-back"
                    >
                      <ArrowLeft size={14} />
                      {tx("列表", "列表", "List")}
                    </button>
                    <Flag region={selectedClient.region} size={16} />
                    <span className="truncate text-[15px] font-semibold text-[var(--text-primary)]">
                      {selectedClient.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="rounded-lg border border-[var(--hairline)] px-2.5 py-1 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {tx("清空本节点", "清空本節點", "Clear node")}
                  </button>
                </div>

                {/* 即時效果預覽 */}
                <div className="surface-inset flex flex-col gap-2 p-3">
                  <div className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                    {tx("卡片效果预览", "卡片效果預覽", "Live Preview")}
                  </div>
                  {previewPills.length > 0 ? (
                    <NodeRoutePills
                      routes={previewPills}
                      premiumIcon={premiumIcon}
                      density="compact"
                    />
                  ) : (
                    <div className="text-[12px] text-[var(--text-tertiary)]">
                      {tx(
                        "尚未配置任何线路；也支持在 Komari 后台节点标签中直接填写 ct:CN2 GIA;cu:9929;cm:CMIN2;ix:BGP",
                        "尚未設定任何線路；也支援在 Komari 後台節點標籤中直接填寫 ct:CN2 GIA;cu:9929;cm:CMIN2;ix:BGP",
                        "No routes set yet. You can also write ct:CN2 GIA;cu:9929;cm:CMIN2;ix:BGP in Komari node tags.",
                      )}
                    </div>
                  )}
                </div>

                {/* 一鍵三網同線快捷按鈕 */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                    {tx("三网同线快填：", "三網同線快填：", "Quick fill CT/CU/CM:")}
                  </span>
                  {["CN2 GIA", "CMIN2", "AS9929", "AS4837", "CMI", "163"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyAllThree(preset)}
                      className="rounded-md border border-[var(--hairline)] bg-[var(--surface-a)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-500)] hover:text-[var(--text-primary)]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <datalist id="lumina-route-presets">
                  {COMMON_ROUTE_PRESETS.map((preset) => (
                    <option key={preset} value={preset} />
                  ))}
                </datalist>

                <div className="grid gap-3">
                  {ROUTE_CARRIER_KEYS.map((carrier) => {
                    const entry = selectedConfig[carrier];
                    const shortLabel = getCarrierShortLabel(carrier, resolvedLanguage);
                    const fullLabel = getCarrierFullLabel(carrier, resolvedLanguage);
                    return (
                      <div
                        key={carrier}
                        className="surface-inset flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-[108px] items-center gap-2">
                          <span
                            className="node-route-carrier"
                            style={{
                              background:
                                carrier === "ct"
                                  ? "#2563eb"
                                  : carrier === "cu"
                                    ? "#e11d48"
                                    : carrier === "cm"
                                      ? "#0d9488"
                                      : "#64748b",
                            }}
                          >
                            {shortLabel}
                          </span>
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">
                            {fullLabel}
                          </span>
                        </div>
                        <input
                          type="text"
                          list="lumina-route-presets"
                          value={entry?.label ?? ""}
                          onChange={(event) =>
                            updateCarrier(carrier, { label: event.target.value })
                          }
                          placeholder={
                            carrier === "ix"
                              ? tx("选填，例如 BGP / Tier1", "選填，例如 BGP / Tier1", "Optional, e.g. BGP")
                              : tx("例如 CN2 GIA / 9929 / CMIN2 / 163", "例如 CN2 GIA / 9929 / CMIN2 / 163", "e.g. CN2 GIA / 9929 / CMIN2")
                          }
                          className="h-9 flex-1 rounded-lg border border-[var(--hairline)] bg-[var(--surface-a)] px-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-500)]"
                        />
                        <select
                          value={entry?.tier ?? "auto"}
                          onChange={(event) =>
                            updateCarrier(carrier, {
                              tier: event.target.value as RouteTierSetting,
                            })
                          }
                          disabled={!entry?.label.trim()}
                          aria-label={tx("线路等级", "線路等級", "Route tier")}
                          className="h-9 rounded-lg border border-[var(--hairline)] bg-[var(--surface-a)] px-2 text-[12px] text-[var(--text-primary)] outline-none disabled:opacity-50"
                        >
                          <option value="auto">{tx("自动识别等级", "自動識別等級", "Auto tier")}</option>
                          <option value="premium">{tx("精品（发光）", "精品（發光）", "Premium (Glow)")}</option>
                          <option value="optimized">{tx("优化（着色）", "優化（著色）", "Optimized")}</option>
                          <option value="standard">{tx("普通（素面）", "普通（素面）", "Standard")}</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-tertiary)]">
                {tx("没有可配置的节点", "沒有可設定的節點", "No nodes available")}
              </div>
            )}
          </div>
        </div>

        <ThemeConfigSaveFooter
          saving={saving}
          saveDisabled={saveDisabled}
          saveError={saveError}
          onClose={onClose}
          onSave={onSave}
        />
      </section>
    </div>,
    document.body,
  );
}
