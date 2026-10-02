import React from 'react';

import AttachmentSettingsForm from '../components/AttachmentSettingsForm';
import MessageAdminHeader from '../components/MessageAdminHeader';
import useMessageSettings from '../hooks/useMessageSettings';

import '../styles/MessageSettings.scss';

export default function AttachmentSettingsPage() {
  const {
    attachmentSettings,
    loading,
    saving,
    error,
    saveAttachmentSettings,
  } = useMessageSettings();

  if (loading) {
    return (
      <div className="message-admin-page">
        <MessageAdminHeader
          title="Attachment Settings"
          description="Configure messaging attachment limits."
        />

        <div className="message-admin-loading">
          Loading attachment settings...
        </div>
      </div>
    );
  }

  return (
    <div className="message-admin-page">
      <MessageAdminHeader
        title="Attachment Settings"
        description="Configure file sizes and attachment limits for Fockis messaging."
      />

      {error && (
        <div className="message-admin-alert message-admin-alert--error">
          {error}
        </div>
      )}

      <AttachmentSettingsForm
        value={attachmentSettings}
        onSave={saveAttachmentSettings}
        saving={saving}
      />
    </div>
  );
}