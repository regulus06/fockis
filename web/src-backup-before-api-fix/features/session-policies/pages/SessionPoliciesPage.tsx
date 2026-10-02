import React, { useCallback, useEffect, useState } from 'react';
import { sessionPolicyApi } from '../api/sessionPolicyApi';
import SessionPolicyCard from '../components/SessionPolicyCard';
import SessionPolicyForm from '../components/SessionPolicyForm';
import type {
  CreateSessionPolicyInput,
  SessionPolicy,
  UpdateSessionPolicyInput,
} from '../types/sessionPolicy.types';
import '../styles/SessionPolicies.scss';

export default function SessionPoliciesPage() {
  const [policies, setPolicies] = useState<SessionPolicy[]>([]);
  const [editing, setEditing] = useState<SessionPolicy | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setPolicies(await sessionPolicyApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load policies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(
    input: CreateSessionPolicyInput | UpdateSessionPolicyInput,
  ) {
    try {
      if (editing) {
        await sessionPolicyApi.update(editing._id, input);
      } else {
        await sessionPolicyApi.create(input as CreateSessionPolicyInput);
      }

      setEditing(null);
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save policy.');
    }
  }

  async function remove(policy: SessionPolicy) {
    if (!window.confirm(`Delete "${policy.displayName}"?`)) return;

    try {
      await sessionPolicyApi.remove(policy._id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete policy.');
    }
  }

  return (
    <section className="session-policies-page">
      <header className="session-policies-page__header">
        <div>
          <span className="eyebrow">Security Center</span>
          <h1>Session & Authentication</h1>
          <p>
            Manage session inactivity, maximum session lifetime, MFA
            requirements, and route-specific security policies.
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          + New policy
        </button>
      </header>

      {error && <div className="session-policies-error">{error}</div>}

      {(creating || editing) && (
        <div className="session-policies-editor">
          <div className="session-policies-editor__header">
            <h2>{editing ? 'Edit session policy' : 'Create session policy'}</h2>
          </div>

          <SessionPolicyForm
            policy={editing}
            onSubmit={save}
            onCancel={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="session-policies-empty">Loading policies...</div>
      ) : (
        <div className="session-policies-grid">
          {policies.map((policy) => (
            <SessionPolicyCard
              key={policy._id}
              policy={policy}
              onEdit={(item) => {
                setCreating(false);
                setEditing(item);
              }}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {!loading && !policies.length && (
        <div className="session-policies-empty">
          No session policies have been configured.
        </div>
      )}
    </section>
  );
}
