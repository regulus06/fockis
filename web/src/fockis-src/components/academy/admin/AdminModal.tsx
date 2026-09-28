import { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function AdminModal({ open, title, subtitle, onClose, children }: Props) {
  return (
    <div className={`admin-modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {open && (
        <div className="admin-modal">
          <h2>{title}</h2>
          {subtitle && <p className="admin-modal-sub">{subtitle}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
