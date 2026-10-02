import { Badge } from '../common/Badge';

export function ConnectionStatusBadge({ state }: { state: 'connected' | 'reconnecting' | 'disconnected' }) {
  if (state === 'connected') return null;
  return (
    <Badge tone={state === 'reconnecting' ? 'warning' : 'danger'} dot>
      {state === 'reconnecting' ? 'Reconnecting' : 'Disconnected'}
    </Badge>
  );
}
