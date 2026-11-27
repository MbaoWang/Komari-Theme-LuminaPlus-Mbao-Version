import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";

export function NotFound() {
  const { tx } = useI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-7xl font-semibold tracking-tight text-[var(--text-primary)]">
        404
      </div>
      <p className="text-[var(--text-secondary)]">
        {tx("页面未找到", "找不到頁面", "Page not found")}
      </p>
      <Link
        to="/"
        className="control-button px-5 py-2 text-[13px] font-medium"
      >
        {tx("返回首页", "返回首頁", "Back to Home")}
      </Link>
    </div>
  );
}
