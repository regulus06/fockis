import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

import { useHelpToastStore } from "../hooks/useHelpToast";

export default function HelpToaster() {
  const { toasts, dismiss } = useHelpToastStore();
  return (
    <div className="fk-help__toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`fk-help__toast fk-help__toast--${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
          {toast.tone === "error" ? <CircleAlert size={18} /> : toast.tone === "info" ? <Info size={18} /> : <CircleCheck size={18} />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
