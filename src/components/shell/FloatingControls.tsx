import { lazy, Suspense, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Grid3x3,
  Languages,
  LayoutGrid,
  List,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Rows3,
  Settings,
  SlidersHorizontal,
  Sun,
  Timer,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  LANGUAGE_OPTIONS,
  useI18n,
  type LanguagePreference,
} from "@/i18n";
import { usePreferences } from "@/hooks/usePreferences";
import { useViewMode } from "@/hooks/useViewMode";
import { useNodeStoreStatus } from "@/hooks/useNode";
import { useAuth } from "@/hooks/useAuth";
import { useAdminEntryPath } from "@/hooks/useAdminEntryPath";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useRefreshInterval } from "@/hooks/useRefreshInterval";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import {
  REFRESH_INTERVAL_OPTIONS,
  shouldShowAdminEntry,
  type NodeViewMode,
  type RefreshIntervalOption,
} from "@/utils/themeSettings";
import { clsx } from "clsx";

const MetricColorPicker = lazy(() =>
  import("./MetricColorPicker").then((module) => ({ default: module.MetricColorPicker })),
);

type ActivePopover = "none" | "colors" | "lang" | "refresh";

const VIEW_MODE_ICONS: Record<NodeViewMode, typeof LayoutGrid> = {
  large: LayoutGrid,
  compact: Rows3,
  mini: Grid3x3,
  list: List,
};

const APPEARANCE_OPTIONS = [
  { value: "light", icon: Sun },
  { value: "system", icon: Monitor },
  { value: "dark", icon: Moon },
] as const;

export function FloatingControls({
  onExpandedChange,
}: {
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const { language, setLanguage, tx } = useI18n();
  const { appearance, setAppearance } = usePreferences();
  const { mode, nextMode, toggleMode } = useViewMode();
  const { intervalMs, isPaused, setRefreshInterval, refreshNow } = useRefreshInterval();
  const { privacyMode, toggleAvailable, togglePrivacyMode } = usePrivacyMode();
  const { data: me } = useAuth();
  const adminEntryPath = useAdminEntryPath();
  const themeSettings = useThemeSettings();
  const { failureStreak } = useNodeStoreStatus();
  const [collapsed, setCollapsed] = useState(true);
  const [activePopover, setActivePopover] = useState<ActivePopover>("none");
  const [colorsMounted, setColorsMounted] = useState(false);
  const settingsReady = themeSettings.isReady;
  // 主题管理入口与配色取色器都仅对登录管理员开放（配色存后端、全局生效）。
  const loggedIn = Boolean(me?.logged_in);
  const showAdmin =
    settingsReady && shouldShowAdminEntry(themeSettings, loggedIn);
  const showThemeManage = loggedIn;
  const showColorPicker = loggedIn;
  const showSyncWarning = failureStreak >= 2;
  const hiddenTabIndex = collapsed ? -1 : undefined;
  const ToggleIcon = collapsed ? ChevronLeft : ChevronRight;
  const ViewIcon = VIEW_MODE_ICONS[nextMode];
  const isReducedView = mode !== "large";

  const viewModeLabel = (m: NodeViewMode) => {
    switch (m) {
      case "large":
        return tx("大视图", "大視圖", "Large view");
      case "compact":
        return tx("小视图", "小視圖", "Compact view");
      case "mini":
        return tx("迷你视图", "迷你視圖", "Mini view");
      case "list":
        return tx("列表视图", "列表視圖", "List view");
    }
  };

  const appearanceLabel = (value: "light" | "system" | "dark") => {
    if (value === "light") return tx("浅色", "淺色", "Light");
    if (value === "dark") return tx("深色", "深色", "Dark");
    return tx("跟随系统", "跟隨系統", "System");
  };

  const languageLabel = (pref: LanguagePreference) => {
    if (pref === "auto") return tx("跟随浏览器", "跟隨瀏覽器", "Auto (Browser)");
    if (pref === "zh-TW") return "繁體中文";
    if (pref === "zh-CN") return "简体中文";
    return "English";
  };

  const intervalLabel = (ms: RefreshIntervalOption) => {
    if (ms === 0) return tx("暂停", "暫停", "Paused");
    return tx(`${ms / 1000} 秒`, `${ms / 1000} 秒`, `${ms / 1000}s`);
  };

  useEffect(() => {
    onExpandedChange?.(false);
    return () => onExpandedChange?.(false);
  }, [onExpandedChange]);

  const toggleControls = () => {
    const nextCollapsed = !collapsed;
    if (nextCollapsed) setActivePopover("none");
    setCollapsed(nextCollapsed);
    onExpandedChange?.(!nextCollapsed);
  };

  const togglePopover = (target: Exclude<ActivePopover, "none">) => {
    if (target === "colors") setColorsMounted(true);
    setActivePopover((prev) => (prev === target ? "none" : target));
  };

  return (
    <div
      className={clsx(
        "floating-controls",
        collapsed && "is-collapsed",
        showSyncWarning && "has-warning",
      )}
    >
      <div className="floating-controls-inner">
        <div className="floating-controls-row">
          <div className="floating-controls-actions" aria-hidden={collapsed}>
            {settingsReady && (
              <>
                <div
                  className="control-group floating-controls-appearance"
                  role="group"
                  aria-label={tx("外观选择", "外觀選擇", "Appearance")}
                >
                  {APPEARANCE_OPTIONS.map(({ value, icon: Icon }) => {
                    const label = appearanceLabel(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAppearance(value)}
                        aria-label={label}
                        aria-pressed={appearance === value}
                        title={label}
                        tabIndex={hiddenTabIndex}
                        className={clsx(
                          "control-button grid h-9 w-9 place-items-center",
                          appearance === value && "control-toggle is-active",
                        )}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={toggleMode}
                  aria-label={tx("切换卡片视图", "切換卡片視圖", "Switch view mode")}
                  aria-pressed={isReducedView}
                  title={tx(
                    `临时切换到${viewModeLabel(nextMode)}`,
                    `暫時切換到${viewModeLabel(nextMode)}`,
                    `Switch to ${viewModeLabel(nextMode)}`,
                  )}
                  tabIndex={hiddenTabIndex}
                  className={clsx(
                    "control-button grid h-9 w-9 place-items-center",
                    isReducedView && "control-toggle is-active",
                  )}
                >
                  <ViewIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => togglePopover("lang")}
                  aria-label={tx("语言切换", "語言切換", "Language")}
                  aria-pressed={activePopover === "lang"}
                  title={tx("语言切换", "語言切換", "Language")}
                  tabIndex={hiddenTabIndex}
                  className={clsx(
                    "control-button grid h-9 w-9 place-items-center",
                    (activePopover === "lang" || language !== "auto") &&
                      "control-toggle is-active",
                  )}
                >
                  <Languages size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => togglePopover("refresh")}
                  aria-label={tx("刷新频率", "刷新頻率", "Refresh interval")}
                  aria-pressed={activePopover === "refresh"}
                  title={tx(
                    `刷新频率：${intervalLabel(intervalMs)}`,
                    `刷新頻率：${intervalLabel(intervalMs)}`,
                    `Refresh: ${intervalLabel(intervalMs)}`,
                  )}
                  tabIndex={hiddenTabIndex}
                  className={clsx(
                    "control-button grid h-9 w-9 place-items-center",
                    (activePopover === "refresh" || isPaused) && "control-toggle is-active",
                  )}
                >
                  <Timer size={16} />
                </button>
                {toggleAvailable && (
                  <button
                    type="button"
                    onClick={togglePrivacyMode}
                    aria-label={tx("隐私截图模式", "隱私截圖模式", "Privacy mode")}
                    aria-pressed={privacyMode}
                    title={
                      privacyMode
                        ? tx("隐私模式已开启（隐藏金额与敏感信息）", "隱私模式已開啟（隱藏金額與敏感資訊）", "Privacy mode ON")
                        : tx("开启隐私截图模式", "開啟隱私截圖模式", "Enable privacy mode")
                    }
                    tabIndex={hiddenTabIndex}
                    className={clsx(
                      "control-button grid h-9 w-9 place-items-center",
                      privacyMode && "control-toggle is-active",
                    )}
                  >
                    {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
                {showColorPicker && (
                  <button
                    type="button"
                    onClick={() => togglePopover("colors")}
                    aria-label={tx("卡片配色", "卡片配色", "Card colors")}
                    aria-pressed={activePopover === "colors"}
                    title={tx("卡片配色", "卡片配色", "Card colors")}
                    tabIndex={hiddenTabIndex}
                    className={clsx(
                      "control-button grid h-9 w-9 place-items-center",
                      activePopover === "colors" && "control-toggle is-active",
                    )}
                  >
                    <Palette size={16} />
                  </button>
                )}
              </>
            )}
            {showThemeManage && (
              <Link
                to="/?view=theme-manage"
                aria-label={tx("主题设置", "主題設定", "Theme settings")}
                title={tx("主题设置", "主題設定", "Theme settings")}
                tabIndex={hiddenTabIndex}
                className="control-button grid h-9 w-9 place-items-center"
              >
                <SlidersHorizontal size={16} />
              </Link>
            )}
            {showAdmin && adminEntryPath && (
              <a
                href={adminEntryPath}
                aria-label={
                  me?.logged_in
                    ? tx("管理", "管理", "Admin")
                    : tx("后台登录", "後台登入", "Admin login")
                }
                title={
                  me?.logged_in
                    ? tx("管理", "管理", "Admin")
                    : tx("后台登录", "後台登入", "Admin login")
                }
                tabIndex={hiddenTabIndex}
                className="control-button grid h-9 w-9 place-items-center"
              >
                <Settings size={16} />
              </a>
            )}
          </div>
          <button
            type="button"
            className="control-button floating-controls-trigger grid h-9 w-9 place-items-center"
            aria-label={
              collapsed
                ? tx("展开快捷按钮", "展開快捷按鈕", "Expand controls")
                : tx("收起快捷按钮", "收合快捷按鈕", "Collapse controls")
            }
            aria-expanded={!collapsed}
            onClick={toggleControls}
            title={
              collapsed
                ? tx("展开快捷按钮", "展開快捷按鈕", "Expand controls")
                : tx("收起快捷按钮", "收合快捷按鈕", "Collapse controls")
            }
          >
            <ToggleIcon size={16} />
            {showSyncWarning && collapsed && (
              <span className="floating-controls-warning-dot" aria-hidden />
            )}
          </button>
        </div>

        {!collapsed && activePopover === "lang" && (
          <div className="floating-quick-popover" role="group" aria-label={tx("语言选择", "語言選擇", "Language")}>
            <div className="floating-quick-popover-title">
              {tx("界面语言", "介面語言", "Language")}
            </div>
            <div className="floating-quick-popover-grid">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  data-active={language === option ? "true" : "false"}
                  className="floating-quick-popover-item"
                  onClick={() => {
                    setLanguage(option);
                    setActivePopover("none");
                  }}
                >
                  {languageLabel(option)}
                </button>
              ))}
            </div>
          </div>
        )}

        {!collapsed && activePopover === "refresh" && (
          <div className="floating-quick-popover" role="group" aria-label={tx("刷新频率", "刷新頻率", "Refresh interval")}>
            <div className="floating-quick-popover-head">
              <span className="floating-quick-popover-title">
                {tx("实时刷新频率", "即時刷新頻率", "Refresh Interval")}
              </span>
              <button
                type="button"
                className="floating-quick-popover-action"
                onClick={refreshNow}
                title={tx("立即刷新一次", "立即刷新一次", "Refresh now")}
              >
                <RefreshCw size={12} />
                <span>{tx("立即刷新", "立即刷新", "Refresh")}</span>
              </button>
            </div>
            <div className="floating-quick-popover-grid is-compact">
              {REFRESH_INTERVAL_OPTIONS.map((ms) => (
                <button
                  key={ms}
                  type="button"
                  data-active={intervalMs === ms ? "true" : "false"}
                  className="floating-quick-popover-item"
                  onClick={() => {
                    setRefreshInterval(ms);
                    setActivePopover("none");
                  }}
                >
                  {intervalLabel(ms)}
                </button>
              ))}
            </div>
          </div>
        )}

        {showColorPicker && colorsMounted && (
          <Suspense fallback={null}>
            <MetricColorPicker hidden={collapsed || activePopover !== "colors"} />
          </Suspense>
        )}
        {showSyncWarning && !collapsed && activePopover === "none" && (
          <div className="floating-controls-sync-warning pointer-events-none flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--status-offline)_32%,transparent)] bg-[color-mix(in_srgb,var(--surface-a)_90%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--status-offline)] shadow-[0_10px_25px_-18px_rgba(0,0,0,0.8)] backdrop-blur">
            <AlertTriangle size={12} />
            <span>
              {tx(
                "实时状态同步异常，当前展示的是最近缓存",
                "即時狀態同步異常，目前顯示最近快取",
                "Live sync interrupted, showing cached data",
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
