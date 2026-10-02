import { useEffect, useState } from 'react';
import type { AuditEvent } from '../types/admin.types';
import { adminApi } from '../api/adminApi';
import { AdminEmptyState, AdminLoadingState } from './AdminStates';
import { roleLabel } from './AdminRoleBadge';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function UserAdminHistory({ userId }: { userId: string }) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.getUserAuditHistory(userId).then((res) => {
      if (!cancelled) setEvents(res);
    }).catch(() => !cancelled && setEvents([]));
    return () => { cancelled = true; };
  }, [userId]);

  if (events === null) return <AdminLoadingState label="Loading history…" />;
  if (events.length === 0) {
    return <AdminEmptyState title="No admin history yet" description="Actions taken on this account will appear here." icon="🕓" />;
  }

  return (
    <div className="fk-card">
      {events.map((e, i) => (
        <div
          key={e.id}
          style={{
            padding: '12px 0',
            borderBottom: i < events.length - 1 ? '1px solid var(--fk-border)' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--fk-text-tertiary)' }}>
            <span>{fmt(e.timestamp)}</span>
            <span className={`fk-badge fk-badge--${e.result === 'SUCCESS' ? 'success' : 'danger'}`}>{e.result}</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 13.5 }}>
            <strong>{e.actor}</strong>{' '}
            <span style={{ color: 'var(--fk-text-tertiary)' }}>({roleLabel(e.actorRole)})</span>{' '}
            — {e.action.replace(/_/g, ' ')}
            {e.previousValue && e.newValue && (
              <span className="mono" style={{ color: 'var(--fk-text-secondary)' }}>
                {' '}· {e.previousValue} → {e.newValue}
              </span>
            )}
          </div>
          {e.reason && (
            <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--fk-text-secondary)' }}>{e.reason}</div>
          )}
          {e.targetId && (
            <div style={{ marginTop: 2, fontSize: 11.5, color: 'var(--fk-text-tertiary)' }} className="mono">
              {e.targetId}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
