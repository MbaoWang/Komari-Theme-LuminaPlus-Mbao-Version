import { useCallback, useEffect } from "react";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import {
  setLiveStatusRefreshIntervalMs,
  triggerManualRefresh,
} from "@/services/wsStore";
import {
  normalizeRefreshIntervalMs,
  type RefreshIntervalOption,
} from "@/utils/themeSettings";

const LEGACY_REFRESH_STORAGE_KEY = "komaritheme:refresh-interval";

function clearLegacyRefreshOverride() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_REFRESH_STORAGE_KEY);
  } catch {}
}

// 早期版本曾在首頁懸浮工具列提供訪客端本地覆寫；目前已改由「主題設定 → 00 增強」統一控制，
// 載入時順手清掉殘留的舊 localStorage 鍵，避免手機端永久卡在舊的暫停或慢速設定。
clearLegacyRefreshOverride();

export function setVisitorRefreshInterval(ms?: RefreshIntervalOption | null) {
  void ms;
  clearLegacyRefreshOverride();
}

export function useRefreshInterval() {
  const themeSettings = useThemeSettings();
  const intervalMs: RefreshIntervalOption = normalizeRefreshIntervalMs(
    themeSettings.refreshIntervalMs,
    2000,
  );

  useEffect(() => {
    setLiveStatusRefreshIntervalMs(intervalMs);
  }, [intervalMs]);

  const refreshNow = useCallback(() => {
    triggerManualRefresh();
  }, []);

  return {
    intervalMs,
    isPaused: intervalMs === 0,
    refreshNow,
  };
}
