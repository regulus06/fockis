import React from 'react';

import type { MessageAdminUser } from '../types/messageAdmin.types';

interface MessageUserTableProps {
  users: MessageAdminUser[];
  loading?: boolean;
  onSelectUser?: (user: MessageAdminUser) => void;
}

export default function MessageUserTable({
  users,
  loading = false,
  onSelectUser,
}: MessageUserTableProps) {
  return (
    <section className="message-admin-table-card">
      <div className="message-admin-table-card__header">
        <div>
          <h2>Messaging Users</h2>
          <p>
            Users currently registered with the Fockis messaging
            system.
          </p>
        </div>

        <span className="message-admin-table-card__count">
          {users.length}
        </span>
      </div>

      <div className="message-admin-table-wrapper">
        <table className="message-admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Fockis ID</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="message-admin-table__empty">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="message-admin-table__empty">
                  No messaging users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="message-admin-user">
                      <strong>
                        {user.displayName ||
                          user.username ||
                          'Unknown User'}
                      </strong>

                      {user.email && (
                        <span>{user.email}</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <code>
                      {user.fockisId || 'Not assigned'}
                    </code>
                  </td>

                  <td>
                    <span
                      className={
                        user.isBlocked
                          ? 'message-admin-status message-admin-status--blocked'
                          : user.isActive === false
                            ? 'message-admin-status message-admin-status--inactive'
                            : 'message-admin-status message-admin-status--active'
                      }
                    >
                      {user.isBlocked
                        ? 'Blocked'
                        : user.isActive === false
                          ? 'Inactive'
                          : 'Active'}
                    </span>
                  </td>

                  <td>
                    {user.lastSeenAt
                      ? new Date(
                          user.lastSeenAt,
                        ).toLocaleString()
                      : 'Never'}
                  </td>

                  <td>
                    {onSelectUser && (
                      <button
                        type="button"
                        className="message-admin-table__action"
                        onClick={() => onSelectUser(user)}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}