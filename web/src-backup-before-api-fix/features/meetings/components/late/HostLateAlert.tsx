import { X } from 'lucide-react';
import { Button } from '../common/Button';
import type { LateNotice } from '../../types';
import '../../styles/components/late.scss';

export function HostLateAlert({ notice, onDismiss }: { notice: LateNotice; onDismiss: () => void }) {
  return (
    <div className="fm-modal-overlay" role="dialog" aria-modal="true">
      <div className="fm-modal fm-modal--alert">
        <button className="fm-modal__close" onClick={onDismiss} aria-label="Close"><X size={16} /></button>
        <h2>{notice.participantName} is running late.</h2>
        <p className="fm-modal__desc">Expected arrival: {notice.expectedMinutes} minutes</p>
        <blockquote className="fm-modal__quote">"{notice.message}"</blockquote>
        <Button variant="primary" fullWidth onClick={onDismiss}>OK</Button>
      </div>
    </div>
  );
}
