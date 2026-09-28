import { Sparkles } from 'lucide-react';
import type { SecretaryStatus } from '../../types';
import '../../styles/components/secretary.scss';

const LABELS: Record<SecretaryStatus, string> = {
  off: 'Off',
  listening: 'Listening',
  processing: 'Processing',
  generating_summary: 'Generating summary',
  complete: 'Complete',
  error: 'Error',
};

export function SecretaryStatusBadge({ status }: { status: SecretaryStatus }) {
  return (
    <span className={`fm-secretary-badge fm-secretary-badge--${status}`}>
      {status !== 'off' && <span className="fm-secretary-badge__pulse" />}
      <Sparkles size={12} />
      {LABELS[status]}
    </span>
  );
}
