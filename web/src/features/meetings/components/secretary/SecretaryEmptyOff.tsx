import { Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import '../../styles/components/secretary.scss';

export function SecretaryEmptyOff({ onEnable, isHost }: { onEnable: () => void; isHost: boolean }) {
  return (
    <div className="fm-secretary-off">
      <div className="fm-secretary-off__icon"><Sparkles size={26} /></div>
      <h4>Fockis Secretary is off</h4>
      <p>Turn it on to get live notes, a summary, and action items after this meeting.</p>
      {isHost && <Button variant="primary" size="sm" onClick={onEnable}>Turn on Secretary</Button>}
    </div>
  );
}
