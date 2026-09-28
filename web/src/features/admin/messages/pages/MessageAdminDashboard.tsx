import React from 'react';
import { Link } from 'react-router-dom';

import MessageAdminHeader from '../components/MessageAdminHeader';
import MessageStats from '../components/MessageStats';
import useMessageAdmin from '../hooks/useMessageAdmin';

import '../styles/MessageAdminDashboard.scss';

export default function MessageAdminDashboard(): React.ReactElement {
  const {
    stats,
    loading,
    error,
    reload,
  } = useMessageAdmin();

  return (
    <div className="message-admin-page">
      <MessageAdminHeader
        title="Messages Dashboard"
        description="Manage Fockis messaging, Fockis IDs, calls, attachments, and reports."
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

      <MessageStats
        stats={stats}
        loading={loading}
      />

      <section className="message-admin-dashboard-grid">
        <Link
          to="/admin/messages/users"
          className="message-admin-dashboard-card"
        >
          <span className="message-admin-dashboard-card__icon">
            👥
          </span>

          <h2>Users</h2>

          <p>
            View users using the Fockis messaging
            system and manage their messaging status.
          </p>
        </Link>

        <Link
          to="/admin/messages/fockis-ids"
          className="message-admin-dashboard-card"
        >
          <span className="message-admin-dashboard-card__icon">
            🪪
          </span>

          <h2>Fockis IDs</h2>

          <p>
            Manage Fockis IDs, registration rules,
            validation, and pricing.
          </p>
        </Link>

        <Link
          to="/admin/messages/settings"
          className="message-admin-dashboard-card"
        >
          <span className="message-admin-dashboard-card__icon">
            💬
          </span>

          <h2>Message Settings</h2>

          <p>
            Configure messaging limits, reactions,
            replies, forwarding, editing, and
            deletion.
          </p>
        </Link>

        <Link
          to="/admin/messages/calls"
          className="message-admin-dashboard-card"
        >
          <span className="message-admin-dashboard-card__icon">
            📞
          </span>

          <h2>Calls</h2>

          <p>
            Configure voice, video, and group
            calling.
          </p>
        </Link>

        <Link
          to="/admin/messages/attachments"
          className="message-admin-dashboard-card"
        >
          <span className="message-admin-dashboard-card__icon">
            📎
          </span>

          <h2>Attachments</h2>

          <p>
            Configure upload sizes and attachment
            limits.
          </p>
        </Link>

        <Link
          to="/admin/messages/reports"
          className="message-admin-dashboard-card"
        >
          <span className="message-admin-dashboard-card__icon">
            🚩
          </span>

          <h2>Reports</h2>

          <p>
            Review and manage reported messages.
          </p>
        </Link>
      </section>
    </div>
  );
}