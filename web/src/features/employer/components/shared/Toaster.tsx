import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import ui from '../../styles/EmployerShared.module.scss';
import { useEmployerNotificationStore } from '../../store/employerNotificationStore';

export function Toaster() {
  const toasts = useEmployerNotificationStore((state) => state.toasts);
  const dismiss = useEmployerNotificationStore((state) => state.dismiss);

  return (
    <div className={ui.toasts} aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={toast.tone === 'error' ? ui.toastError : toast.tone === 'info' ? ui.toastInfo : ui.toast}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          {toast.tone === 'error' ? (
            <TriangleAlert size={18} color="#dc2626" />
          ) : toast.tone === 'info' ? (
            <Info size={18} color="#1d4ed8" />
          ) : (
            <CircleCheck size={18} color="#15803d" />
          )}
          <p>{toast.message}</p>
          <button type="button" className={ui.iconBtn} style={{ width: 24, height: 24 }} onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toaster;
