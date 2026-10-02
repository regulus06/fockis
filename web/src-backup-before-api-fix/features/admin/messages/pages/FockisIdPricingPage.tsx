import React from 'react';

import MessageAdminHeader from '../components/MessageAdminHeader';
import FockisIdPricingForm from '../components/FockisIdPricingForm';
import useFockisIdAdmin from '../hooks/useFockisIdAdmin';

import '../styles/FockisIdPricing.scss';

export default function FockisIdPricingPage(): React.ReactElement {
  const {
    pricing,
    loading,
    saving,
    error,
    savePricing,
    reload,
  } = useFockisIdAdmin();

  if (loading) {
    return (
      <div className="message-admin-page">
        <MessageAdminHeader
          title="Fockis ID Pricing"
          description="Configure Fockis ID registration and renewal pricing."
          onRefresh={() => void reload()}
          loading={loading}
        />

        <div className="message-admin-loading">
          Loading Fockis ID pricing...
        </div>
      </div>
    );
  }

  return (
    <div className="message-admin-page">
      <MessageAdminHeader
        title="Fockis ID Pricing"
        description="Configure Fockis ID registration and renewal pricing."
        onRefresh={() => void reload()}
        loading={loading}
      />

      {error && (
        <div
          className="message-admin-alert message-admin-alert--error"
          role="alert"
        >
          {error}
        </div>
      )}

      <FockisIdPricingForm
        value={pricing}
        onSave={savePricing}
        saving={saving}
      />
    </div>
  );
}