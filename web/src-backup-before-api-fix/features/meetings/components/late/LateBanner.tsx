import { AlertTriangle } from 'lucide-react';
import '../../styles/components/late.scss';

export function LateBanner() {
  return (
    <div className="fm-late-banner">
      <AlertTriangle size={15} />
      Meeting is running late — the host hasn't started it yet.
    </div>
  );
}
