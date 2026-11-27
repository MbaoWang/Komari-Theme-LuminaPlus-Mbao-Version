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
  size = 11,
}: {
  carrier: RouteCarrierKey;
  size?: number;
}) {
  if (carrier === "ct") {
    // 中國電信：雙弧線經典輪廓（專為小尺寸高對比簡化）
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M12.6 4.5C11.3 3.2 9.5 2.5 7.5 2.7C4.4 3 2.3 5.5 2.6 8.6C2.9 11.4 5.3 13.4 8.3 13.3C10.3 13.2 12 12.2 13 10.6"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M4.6 8.3C6.1 6.3 9.2 5.7 13.2 7.2"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (carrier === "cu") {
    // 中國聯通：幾何簡化中國結徽標
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 2.2L11.2 5.4L8 8.6L4.8 5.4L8 2.2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M8 7.4L11.2 10.6L8 13.8L4.8 10.6L8 7.4Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M2.6 8L5.3 5.3M13.4 8L10.7 5.3M2.6 8L5.3 10.7M13.4 8L10.7 10.7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (carrier === "cm") {
    // 中國移動：雙向環抱訊號弧線
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M2.6 9.8C3.5 5.4 7.5 3 11.8 4.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M13.4 6.2C12.5 10.6 8.5 13 4.2 11.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="8" cy="8" r="1.7" fill="currentColor" />
      </svg>
    );
  }

  // 國際互聯 IX：地球經緯線
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="8" cy="8" rx="2.7" ry="5.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.6 8H13.4" stroke="currentColor" strokeWidth="1.4" />
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

  if (icon === "flame") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        className="node-route-premium-icon"
        aria-hidden
      >
        <path d="M8.7 1.3C8.9 3.7 6.8 5.2 6.8 7.3C6.8 8.3 7.4 9.1 8.2 9.4C8 8.6 8.3 7.7 9.1 7.1C9.2 8.7 10.6 9.5 10.6 11.1C10.6 12.6 9.5 13.7 8.1 14C11.1 13.8 13.4 11.4 13.4 8.5C13.4 5.4 11.2 2.8 8.7 1.3ZM7.6 14.2C5.2 14 3.4 12 3.4 9.5C3.4 7.7 4.4 6.1 5.8 5C5.5 6.3 5.7 7.6 6.4 8.7C5.8 9.2 5.4 10 5.4 10.9C5.4 12.4 6.3 13.6 7.6 14.2Z" />
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
  badgeStyle = "text",
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
          className={clsx("node-route-carrier", badgeStyle === "logo" && "is-logo")}
          aria-hidden
        >
          {badgeStyle === "logo" ? (
            <CarrierLogoIcon
              carrier={route.carrier}
              size={isDenseFour ? 10.5 : 11.5}
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
