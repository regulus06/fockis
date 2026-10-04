import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { MarketingContext, type ConfirmOptions, type MarketingContextValue, type ToastTone } from "../hooks/useMailchimp";
import type { DateRange } from "../types/mailchimp.types";
import { USE_MOCKS } from "../services/httpClient";
import { Modal } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Portal } from "./ui/Overlay";
import { cx, uid } from "../utils/format";

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ProviderProps {
  audienceId: string;
  basePath: string;
  userName: string;
  children: ReactNode;
}

export function MarketingProvider({ audienceId, basePath, userName, children }: ProviderProps) {
  const [dateRange, setDateRange] = useState<DateRange>({ preset: "30d" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = uid("toast");
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6500 : 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setConfirmState(null);
  };

  const value = useMemo<MarketingContextValue>(
    () => ({ audienceId, isMock: USE_MOCKS, basePath, userName, dateRange, setDateRange, toast, confirm }),
    [audienceId, basePath, userName, dateRange, toast, confirm],
  );

  return (
    <MarketingContext.Provider value={value}>
      {children}
      <Portal>
        <div className="fm-toasts" role="region" aria-live="polite" aria-label="Notifications">
          {toasts.map((t) => (
            <div key={t.id} className={cx("fm-toast", `fm-toast--${t.tone}`)} role={t.tone === "error" ? "alert" : "status"}>
              <Icon name={t.tone === "success" ? "check" : t.tone === "error" ? "alert" : "help"} size={16} />
              <span>{t.message}</span>
              <button type="button" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} aria-label="Dismiss">
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      </Portal>
      <Modal
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        onClose={() => settle(false)}
        size="sm"
        footer={
          <>
            <Button onClick={() => settle(false)}>Cancel</Button>
            <Button variant={confirmState?.danger ? "danger" : "primary"} onClick={() => settle(true)} data-autofocus>
              {confirmState?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        {confirmState?.body && <p className="fm-muted">{confirmState.body}</p>}
      </Modal>
    </MarketingContext.Provider>
  );
}
