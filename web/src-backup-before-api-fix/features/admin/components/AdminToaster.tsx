import { useEffect } from 'react';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

export function AdminToaster() {
  const toasts = useAdminNotificationStore((s) => s.toasts);
  const dismissToast = useAdminNotificationStore((s) => s.dismissToast);

  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => dismissToast(t.id), 4200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fk-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`fk-toast fk-toast--${t.variant}`} onClick={() => dismissToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
