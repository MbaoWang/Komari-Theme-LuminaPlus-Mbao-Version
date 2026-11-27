import { memo, type CSSProperties } from "react";
import { clsx } from "clsx";
import { useI18n } from "@/i18n";
import {
  getCarrierFullLabel,
  getCarrierShortLabel,
  type ResolvedRoutePill,
  type RouteBadgeStyle,
  type RouteCarrierKey,
  type RoutePremiumEffect,
  type RoutePremiumIcon,
} from "@/utils/nodeRoutes";

export function CarrierLogoIcon({
  carrier,
  size = 13,
}: {
  carrier: RouteCarrierKey;
  size?: number;
}) {
  if (carrier === "ct") {
    // 中國電信：標誌性雙「C」交錯飛翔弧線（直弧 + 橫展飛弧）
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M15.9 15.6C15.3 18.2 14.1 20.6 12.1 21.2C10.5 21.7 9.4 19.7 9.1 16.6C8.7 12.8 9.2 7.8 11.4 4.1C12.3 2.5 14.1 2.5 15.1 4.2"
          stroke="currentColor"
          strokeWidth="2.35"
          strokeLinecap="round"
        />
        <path
          d="M8.5 5.4C4.9 6.6 2.3 8.7 2.4 11.2C2.5 13.2 5.4 14.1 9.4 13.7C14.5 13.2 20.2 10.8 21.5 7.7C22.2 6.0 20.6 4.6 17.8 4.2"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (carrier === "cu") {
    // 中國聯通：標誌性紅結（交織雙斜環＋左右耳環）
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M10.7 7.8L13.3 5.2C15.1 3.4 18.0 5.9 16.0 8.0L8.2 15.8C6.1 17.9 9.1 20.4 11.0 18.5L13.2 16.3"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.3 7.8L10.7 5.2C8.9 3.4 6.0 5.9 8.0 8.0L15.8 15.8C17.9 17.9 14.9 20.4 13.0 18.5L10.8 16.3"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.0 13.5L5.4 10.9C3.8 9.3 1.9 10.8 2.1 12.4C2.3 14.0 4.0 14.9 5.4 13.5L8.0 10.9"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.0 10.5L18.6 13.1C20.2 14.7 22.1 13.2 21.9 11.6C21.7 10.0 20.0 9.1 18.6 10.5L16.0 13.1"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (carrier === "cm") {
    // 中國移動：標誌性圓形流動波紋球徽標
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3.4 8.2C7.4 3.1 12.0 2.2 15.2 4.1C17.6 5.5 19.6 7.8 21.0 9.7"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M6.2 10.6C9.7 6.5 13.0 5.9 15.8 7.8C17.8 9.2 19.6 11.0 20.8 12.3"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
        />
        <path
          d="M2.5 9.6C6.1 14.1 8.4 15.4 10.2 13.7C11.7 12.3 12.7 10.2 14.2 9.2C15.9 8.2 18.4 10.3 21.5 14.4"
          stroke="currentColor"
          strokeWidth="1.95"
          strokeLinecap="round"
        />
        <path
          d="M17.8 13.4C14.3 17.5 11.0 18.1 8.2 16.2C6.2 14.8 4.4 13.0 3.2 11.7"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
        />
        <path
          d="M20.6 15.8C16.6 20.9 12.0 21.8 8.8 19.9C6.4 18.5 4.4 16.2 3.0 14.3"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 國際互聯 IX：地球經緯線
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="12" cy="12" rx="4.2" ry="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.8 12H20.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function RoutePremiumBadgeIcon({
  icon,
  size = 12,
}: {
  icon: RoutePremiumIcon;
  size?: number;
}) {
  if (icon === "none") return null;

  if (icon === "sparkle") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        className="node-route-premium-icon"
        aria-hidden
      >
        <path d="M8 1.2L9.75 6.25L14.8 8L9.75 9.75L8 14.8L6.25 9.75L1.2 8L6.25 6.25L8 1.2Z" />
      </svg>
    );
  }

  if (icon === "crown") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        className="node-route-premium-icon"
        aria-hidden
      >
        <path d="M2 12.2L1.2 4.8L5 7.6L8 3.2L11 7.6L14.8 4.8L14 12.2H2ZM2.5 13.4H13.5V14.5H2.5V13.4Z" />
      </svg>
    );
  }

  if (icon === "wing") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        className="node-route-premium-icon"
        aria-hidden
      >
        <path d="M1.4 3.6C5.6 3.5 9.8 2.7 14.6 1.7C13.3 4.3 11.5 6.0 9.0 6.8L13.3 6.6C12.0 8.7 10.1 10.1 7.6 10.7L10.9 10.9C9.5 12.7 7.4 13.9 4.7 14.3C6.0 11.8 6.2 9.2 4.8 7.0C3.8 5.4 2.6 4.4 1.4 3.6Z" />
      </svg>
    );
  }

  if (icon === "sparkles") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        className="node-route-premium-icon"
        aria-hidden
      >
        <path d="M6.4 1.4L7.7 5.2L11.5 6.5L7.7 7.8L6.4 11.6L5.1 7.8L1.3 6.5L5.1 5.2L6.4 1.4Z" />
        <path d="M12.2 8.4L12.9 10.6L15.1 11.3L12.9 12.0L12.2 14.2L11.5 12.0L9.3 11.3L11.5 10.6L12.2 8.4Z" />
      </svg>
    );
  }

  if (icon === "vip") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        className="node-route-premium-icon"
        aria-hidden
      >
        <path d="M1.6 3.2H4.5L8 10.7L11.5 3.2H14.4L9.4 13.6H6.6L1.6 3.2ZM6.7 2.0H9.3L8 4.6L6.7 2.0Z" />
      </svg>
    );
  }

  // Default: sleek lightning bolt ("zap")
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className="node-route-premium-icon"
      aria-hidden
    >
      <path d="M9.3 1.2L3.2 9H7.6L6.7 14.8L12.8 7H8.4L9.3 1.2Z" />
    </svg>
  );
}

export const NodeRoutePills = memo(function NodeRoutePills({
  routes,
  premiumIcon = "zap",
  premiumEffect = "beam",
  badgeStyle = "outline",
  density = "compact",
  className,
}: {
  routes: ResolvedRoutePill[];
  premiumIcon?: RoutePremiumIcon;
  premiumEffect?: RoutePremiumEffect;
  badgeStyle?: RouteBadgeStyle;
  density?: "large" | "compact" | "detail";
  className?: string;
}) {
  const { resolvedLanguage, tx } = useI18n();

  if (routes.length === 0) return null;

  const tierText = (tier: ResolvedRoutePill["tier"]) => {
    if (tier === "premium") return tx("精品线路", "精品線路", "Premium");
    if (tier === "optimized") return tx("优化线路", "優化線路", "Optimized");
    return tx("普通线路", "普通線路", "Standard");
  };

  const hasPremium = routes.some((route) => route.tier === "premium");
  const isDenseFour = density === "compact" && routes.length >= 4;
  const usesLogo = badgeStyle === "logo" || badgeStyle === "outline";

  const pills = routes.map((route) => {
    const shortLabel = getCarrierShortLabel(route.carrier, resolvedLanguage);
    const fullLabel = getCarrierFullLabel(route.carrier, resolvedLanguage);
    return (
      <div
        key={route.carrier}
        className="node-route-pill"
        data-carrier={route.carrier}
        data-tier={route.tier}
        title={`${fullLabel} · ${route.label} (${tierText(route.tier)})`}
      >
        <span
          className={clsx(
            "node-route-carrier",
            badgeStyle === "logo" && "is-logo",
            badgeStyle === "outline" && "is-outline",
          )}
          aria-hidden
        >
          {usesLogo ? (
            <CarrierLogoIcon
              carrier={route.carrier}
              size={badgeStyle === "outline" ? (isDenseFour ? 14 : 15) : isDenseFour ? 12.5 : 13.5}
            />
          ) : (
            shortLabel
          )}
        </span>
        <span className="node-route-name">{route.label}</span>
        {route.tier === "premium" && (
          <RoutePremiumBadgeIcon
            icon={premiumIcon}
            size={isDenseFour ? 10 : density === "compact" ? 11 : 12}
          />
        )}
      </div>
    );
  });

  return (
    <div
      className={clsx(
        "node-route-strip",
        `is-${density}`,
        hasPremium && "has-premium",
        className,
      )}
      data-count={routes.length}
      data-effect={premiumEffect}
      data-badge={badgeStyle}
      style={{ "--route-cols": Math.min(4, Math.max(1, routes.length)) } as CSSProperties}
      aria-label={tx("三网回程路由", "三網回程路由", "Return Routes")}
    >
      {density === "detail" ? pills : <div className="node-route-inner">{pills}</div>}
    </div>
  );
});
