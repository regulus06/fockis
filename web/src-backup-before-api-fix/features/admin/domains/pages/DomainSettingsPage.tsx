import {
  useState,
} from "react";

import DomainPolicyForm from "../components/DomainPolicyForm";

import useDomainAdmin from "../hooks/useDomainAdmin";

import "../styles/DomainSettings.scss";

export default function DomainSettingsPage() {
  const {
    policy,
    loading,
    error,
    updatePolicy,
  } = useDomainAdmin();

  const [saving, setSaving] =
    useState(false);

  async function savePolicy(
    payload: Parameters<
      typeof updatePolicy
    >[0],
  ) {
    setSaving(true);

    try {
      await updatePolicy(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="domain-settings-page">
      <header className="domain-admin-header">
        <div>
          <span className="domain-eyebrow">
            Super App Administration
          </span>

          <h1>
            Domain Settings
          </h1>

          <p>
            Change the default Fockis domain
            rules without changing application
            code.
          </p>
        </div>
      </header>

      {error && (
        <div
          className="domain-admin-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading && !policy ? (
        <div className="domain-table-state">
          Loading domain settings...
        </div>
      ) : (
        <DomainPolicyForm
          policy={policy}
          saving={saving}
          onSave={savePolicy}
        />
      )}
    </div>
  );
}