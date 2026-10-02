import React from 'react';

import CallSettingsForm from '../components/CallSettingsForm';
import MessageAdminHeader from '../components/MessageAdminHeader';
import useMessageSettings from '../hooks/useMessageSettings';

import '../styles/CallSettings.scss';

export default function CallSettingsPage() {
  const {
    callSettings,
    loading,
    saving,
    error,
    saveCallSettings,
  } = useMessageSettings();

  if (loading) {
    return (
      <div className="message-admin-page">
        <MessageAdminHeader
          title="Call Settings"
          description="Configure Fockis voice and video calls."
        />

        <div className="message-admin-loading">
          Loading call settings...
        </div>
      </div>
    );
  }

  return (
    <div className="message-admin-page">
      <MessageAdminHeader
        title="Call Settings"
        description="Configure voice, video, and group calls."
      />

      {error && (
        <div className="message-admin-alert message-admin-alert--error">
          {error}
        </div>
      )}

      <CallSettingsForm
        value={callSettings}
        onSave={saveCallSettings}
        saving={saving}
      />
    </div>
  );
}