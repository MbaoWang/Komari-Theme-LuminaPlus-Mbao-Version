import { Save } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useI18n } from "@/i18n";

export function ThemeConfigSaveFooter({
  saving,
  saveDisabled,
  saveError,
  onClose,
  onSave,
}: {
  saving: boolean;
  saveDisabled: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: () => Promise<boolean>;
}) {
  const { tx } = useI18n();
  return (
    <footer className="multi-ping-config-footer">
      {saveError ? (
        <span
          role="alert"
          className="multi-ping-config-footer-error text-[11px] text-[var(--status-error)]"
        >
          {saveError}
        </span>
      ) : (
        <span className="multi-ping-config-footer-hint text-[11px] text-[var(--text-tertiary)]">
          {tx(
            "这里的修改会和其他主题设置一起保存。",
            "這裡的修改會與其他主題設定一起儲存。",
            "Changes here are saved together with other theme settings.",
          )}
        </span>
      )}
      <div className="multi-ping-config-footer-actions flex items-center gap-2">
        <button type="button" onClick={onClose} className="theme-manage-button">
          {tx("关闭", "關閉", "Close")}
        </button>
        <button
          type="button"
          disabled={saveDisabled || saving}
          onClick={() => void onSave().then((saved) => saved && onClose())}
          className="theme-manage-button is-primary"
        >
          {saving ? <Spinner size={14} /> : <Save size={14} />}
          {saving
            ? tx("保存中", "儲存中", "Saving")
            : tx("保存设置", "儲存設定", "Save Settings")}
        </button>
      </div>
    </footer>
  );
}
