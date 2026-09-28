import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import '../../styles/components/common.scss';

export function PanelHeader({ title, onClose, right }: { title: string; onClose: () => void; right?: ReactNode }) {
  return (
    <div className="fm-panel-header">
      <h3>{title}</h3>
      <div className="fm-panel-header__right">
        {right}
        <button className="fm-panel-header__close" onClick={onClose} aria-label="Close panel">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
