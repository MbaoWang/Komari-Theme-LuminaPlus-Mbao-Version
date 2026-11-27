import { clsx } from "clsx";
import { zhStatic } from "@/i18n";
import { MerchantIcon } from "@/components/ui/MerchantIcon";
import type { NodeMerchantLink } from "@/utils/merchantLinks";

export function MerchantLinkAction({
  link,
  className,
  size = 15,
}: {
  link?: NodeMerchantLink;
  className: string;
  size?: number;
}) {
  const url = link?.url.trim() ?? "";
  const icon = (
    <MerchantIcon
      enabled={Boolean(url)}
      iconUrl={url ? link?.iconUrl.trim() : ""}
      size={size}
    />
  );

  if (!url) {
    return (
      <span
        className={clsx(className, "merchant-link-action is-disabled")}
        title={zhStatic("未配置商家官网")}
        aria-label={zhStatic("未配置商家官网")}
      >
        {icon}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(className, "merchant-link-action")}
      title={zhStatic("打开商家官网")}
      aria-label={zhStatic("在新标签页打开商家官网")}
    >
      {icon}
    </a>
  );
}
