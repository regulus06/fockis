import React from 'react';

interface MessageAdminHeaderProps {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function MessageAdminHeader({
  title = 'Messages Administration',
  description = 'Manage Fockis messaging, Fockis IDs, calls, attachments, and reports.',
  onRefresh,
  loading = false,
}: MessageAdminHeaderProps) {
  return (
    <header className="message-admin-header">
      <div className="message-admin-header__content">
        <div>
          <div className="message-admin-header__eyebrow">
            FOCKIS ADMIN
          </div>

          <h1>{title}</h1>

          <p>{description}</p>
        </div>

        {onRefresh && (
          <button
            type="button"
            className="message-admin-header__refresh"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>
    </header>
  );
}