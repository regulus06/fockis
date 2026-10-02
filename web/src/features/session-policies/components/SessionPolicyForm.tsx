import React, { useEffect, useState } from 'react';
import type {
  CreateSessionPolicyInput,
  SessionPolicy,
  UpdateSessionPolicyInput,
} from '../types/sessionPolicy.types';

interface Props {
  policy?: SessionPolicy | null;
  onSubmit: (
    input: CreateSessionPolicyInput | UpdateSessionPolicyInput,
  ) => Promise<void>;
  onCancel: () => void;
}

export default function SessionPolicyForm({
  policy,
  onSubmit,
  onCancel,
}: Props) {
  const [key, setKey] = useState(policy?.key ?? '');
  const [displayName, setDisplayName] = useState(policy?.displayName ?? '');
  const [description, setDescription] = useState(policy?.description ?? '');
  const [enabled, setEnabled] = useState(policy?.enabled ?? true);
  const [inactivityMinutes, setInactivityMinutes] = useState(
    policy?.inactivityMinutes ?? 120,
  );
  const [maximumSessionHours, setMaximumSessionHours] = useState(
    policy?.maximumSessionHours ?? 24,
  );
  const [requireMfa, setRequireMfa] = useState(policy?.requireMfa ?? false);
  const [priority, setPriority] = useState(policy?.priority ?? 100);
  const [isDefault, setIsDefault] = useState(policy?.isDefault ?? false);
  const [routes, setRoutes] = useState(
    policy?.routePatterns.join('\n') ?? '',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setKey(policy?.key ?? '');
    setDisplayName(policy?.displayName ?? '');
    setDescription(policy?.description ?? '');
    setEnabled(policy?.enabled ?? true);
    setInactivityMinutes(policy?.inactivityMinutes ?? 120);
    setMaximumSessionHours(policy?.maximumSessionHours ?? 24);
    setRequireMfa(policy?.requireMfa ?? false);
    setPriority(policy?.priority ?? 100);
    setIsDefault(policy?.isDefault ?? false);
    setRoutes(policy?.routePatterns.join('\n') ?? '');
  }, [policy]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      await onSubmit({
        key: key.trim().toLowerCase(),
        displayName: displayName.trim(),
        description: description.trim(),
        enabled,
        inactivityMinutes,
        maximumSessionHours,
        requireMfa,
        priority,
        isDefault,
        routePatterns: routes
          .split('\n')
          .map((route) => route.trim())
          .filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="session-policy-form" onSubmit={handleSubmit}>
      <div className="session-policy-form__grid">
        <label>
          Policy key
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="academy"
            disabled={Boolean(policy)}
            required
          />
        </label>

        <label>
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Academy"
            required
          />
        </label>

        <label className="full">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <label>
          Inactivity timeout
          <input
            type="number"
            min={1}
            max={1440}
            value={inactivityMinutes}
            onChange={(e) => setInactivityMinutes(Number(e.target.value))}
            required
          />
          <small>Minutes</small>
        </label>

        <label>
          Maximum session
          <input
            type="number"
            min={1}
            max={168}
            value={maximumSessionHours}
            onChange={(e) => setMaximumSessionHours(Number(e.target.value))}
            required
          />
          <small>Hours</small>
        </label>

        <label>
          Priority
          <input
            type="number"
            min={0}
            max={10000}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
        </label>

        <label className="full">
          Route patterns
          <textarea
            value={routes}
            onChange={(e) => setRoutes(e.target.value)}
            placeholder={'/academy/**\n/academy/instructor/**'}
            rows={5}
          />
          <small>One pattern per line. Higher priority wins.</small>
        </label>
      </div>

      <div className="session-policy-form__checks">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enabled
        </label>

        <label>
          <input
            type="checkbox"
            checked={requireMfa}
            onChange={(e) => setRequireMfa(e.target.checked)}
          />
          Require MFA
        </label>

        <label>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Default fallback policy
        </label>
      </div>

      <div className="session-policy-form__actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : policy ? 'Save changes' : 'Create policy'}
        </button>
      </div>
    </form>
  );
}
