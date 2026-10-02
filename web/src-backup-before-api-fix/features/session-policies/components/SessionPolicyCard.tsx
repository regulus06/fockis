import React from 'react';
import type { SessionPolicy } from '../types/sessionPolicy.types';

interface Props {
  policy: SessionPolicy;
  onEdit: (policy: SessionPolicy) => void;
  onDelete: (policy: SessionPolicy) => void;
}

export default function SessionPolicyCard({
  policy,
  onEdit,
  onDelete,
}: Props) {
  return (
    <article className="session-policy-card">
      <div className="session-policy-card__header">
        <div>
          <span className="session-policy-card__key">{policy.key}</span>
          <h3>{policy.displayName}</h3>
        </div>

        <span
          className={`session-policy-status ${
            policy.enabled ? 'is-active' : 'is-disabled'
          }`}
        >
          {policy.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>

      <p>{policy.description || 'No description provided.'}</p>

      <div className="session-policy-card__metrics">
        <div>
          <strong>{policy.inactivityMinutes}m</strong>
          <span>Inactivity</span>
        </div>
        <div>
          <strong>{policy.maximumSessionHours}h</strong>
          <span>Maximum session</span>
        </div>
        <div>
          <strong>{policy.requireMfa ? 'Required' : 'Optional'}</strong>
          <span>MFA</span>
        </div>
      </div>

      <div className="session-policy-card__routes">
        <strong>Routes</strong>
        {policy.routePatterns.length ? (
          policy.routePatterns.map((route) => (
            <code key={route}>{route}</code>
          ))
        ) : (
          <span>Fallback policy</span>
        )}
      </div>

      <div className="session-policy-card__footer">
        <span>Priority: {policy.priority}</span>
        {policy.isProtected && <span>Protected</span>}

        <div>
          <button type="button" onClick={() => onEdit(policy)}>
            Edit
          </button>
          {!policy.isProtected && (
            <button
              type="button"
              className="danger"
              onClick={() => onDelete(policy)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
