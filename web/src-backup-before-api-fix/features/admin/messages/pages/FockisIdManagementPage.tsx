import React, {
  useEffect,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import FockisIdManager from '../components/FockisIdManager';
import MessageAdminHeader from '../components/MessageAdminHeader';
import useFockisIdAdmin from '../hooks/useFockisIdAdmin';

import type {
  FockisIdPricing,
  FockisIdSettings,
} from '../types/messageAdmin.types';

import '../styles/FockisIdManagement.scss';

export default function FockisIdManagementPage(): React.ReactElement {
  const {
    pricing,
    settings,
    loading,
    saving,
    error,
    savePricing,
    saveSettings,
  } = useFockisIdAdmin();

  const [
    draftPricing,
    setDraftPricing,
  ] = useState<FockisIdPricing>(pricing);

  const [
    draftSettings,
    setDraftSettings,
  ] = useState<FockisIdSettings>(settings);

  useEffect(() => {
    setDraftPricing(pricing);
  }, [pricing]);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  const handleSave = async (): Promise<void> => {
    await Promise.all([
      savePricing(draftPricing),
      saveSettings(draftSettings),
    ]);
  };

  if (loading) {
    return (
      <div className="message-admin-page">
        <MessageAdminHeader
          title="Fockis ID Management"
          description="Manage Fockis ID registration and validation."
        />

        <div className="message-admin-loading">
          Loading Fockis ID settings...
        </div>
      </div>
    );
  }

  return (
    <div className="message-admin-page">
      <MessageAdminHeader
        title="Fockis ID Management"
        description="Manage Fockis ID registration, validation, and pricing."
      />

      <nav className="message-admin-subnav">
        <Link
          to="/admin/messages/fockis-ids"
          className="message-admin-subnav__active"
        >
          Manage IDs
        </Link>

        <Link to="/admin/messages/fockis-ids/pricing">
          Pricing
        </Link>
      </nav>

      {error && (
        <div
          className="message-admin-alert message-admin-alert--error"
          role="alert"
        >
          {error}
        </div>
      )}

      <FockisIdManager
        pricing={draftPricing}
        settings={draftSettings}
        onPricingChange={setDraftPricing}
        onSettingsChange={setDraftSettings}
        onSave={() => void handleSave()}
        saving={saving}
      />
    </div>
  );
}