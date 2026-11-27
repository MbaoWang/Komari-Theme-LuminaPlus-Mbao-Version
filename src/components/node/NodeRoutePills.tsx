import { memo, type CSSProperties } from "react";
import { clsx } from "clsx";
import { useI18n } from "@/i18n";
import {
  getCarrierFullLabel,
  getCarrierShortLabel,
  type ResolvedRoutePill,
  type RoutePremiumIcon,
} from "@/utils/nodeRoutes";

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
  density = "compact",
  className,
}: {
  routes: ResolvedRoutePill[];
  premiumIcon?: RoutePremiumIcon;
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

  return (
    <div
      className={clsx("node-route-strip", `is-${density}`, className)}
      style={{ "--route-cols": Math.min(4, Math.max(1, routes.length)) } as CSSProperties}
      aria-label={tx("三网回程路由", "三網回程路由", "Return Routes")}
    >
      {routes.map((route) => {
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
            <span className="node-route-carrier" aria-hidden>
              {shortLabel}
            </span>
            <span className="node-route-name">{route.label}</span>
            {route.tier === "premium" && (
              <RoutePremiumBadgeIcon
                icon={premiumIcon}
                size={density === "compact" ? 11 : 12}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
