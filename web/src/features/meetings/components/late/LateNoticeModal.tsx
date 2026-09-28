import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { Button } from '../common/Button';
import { LATE_NOTICE_OPTIONS_MIN } from '../../constants';
import '../../styles/components/late.scss';

export function LateNoticeModal({
  onSend,
  onClose,
}: {
  onSend: (minutes: number, message: string) => void;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(10);
  const [message, setMessage] = useState('I will be there in approximately 10 minutes.');

  return (
    <div className="fm-modal-overlay" role="dialog" aria-modal="true">
      <div className="fm-modal">
        <button className="fm-modal__close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="fm-modal__icon"><Clock size={20} /></div>
        <h2>You're joining late</h2>
        <p className="fm-modal__desc">Tell the host when you expect to arrive.</p>

        <label className="fm-field">
          <span className="fm-field__label">Expected arrival</span>
          <select
            className="fm-select"
            value={minutes}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMinutes(v);
              setMessage(`I will be there in approximately ${v} minutes.`);
            }}
          >
            {LATE_NOTICE_OPTIONS_MIN.map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>

        <label className="fm-field">
          <span className="fm-field__label">Message</span>
          <textarea className="fm-textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>

        <Button variant="primary" fullWidth onClick={() => onSend(minutes, message)}>
          Send late notice
        </Button>
      </div>
    </div>
  );
}
