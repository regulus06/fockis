import React from 'react';

import type { MessageReport } from '../types/messageAdmin.types';

interface MessageReportTableProps {
  reports: MessageReport[];
  loading?: boolean;
  onStatusChange?: (
    reportId: string,
    status: MessageReport['status'],
  ) => void;
}

export default function MessageReportTable({
  reports,
  loading = false,
  onStatusChange,
}: MessageReportTableProps) {
  return (
    <section className="message-report-table">
      <div className="message-report-table__header">
        <div>
          <h2>Message Reports</h2>
          <p>
            Review reports submitted by Fockis users.
          </p>
        </div>

        <span>{reports.length}</span>
      </div>

      <div className="message-admin-table-wrapper">
        <table className="message-admin-table">
          <thead>
            <tr>
              <th>Reason</th>
              <th>Reporter</th>
              <th>Message</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="message-admin-table__empty"
                >
                  Loading reports...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="message-admin-table__empty"
                >
                  No message reports found.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <strong>{report.reason}</strong>

                    {report.description && (
                      <small>
                        {report.description}
                      </small>
                    )}
                  </td>

                  <td>
                    {report.reporterName ||
                      report.reporterId ||
                      'Unknown'}
                  </td>

                  <td>
                    <code>
                      {report.messageId || 'Unknown'}
                    </code>
                  </td>

                  <td>
                    <span
                      className={`message-report-status message-report-status--${report.status}`}
                    >
                      {report.status}
                    </span>
                  </td>

                  <td>
                    {report.createdAt
                      ? new Date(
                          report.createdAt,
                        ).toLocaleString()
                      : 'Unknown'}
                  </td>

                  <td>
                    {onStatusChange && (
                      <select
                        value={report.status}
                        onChange={(event) =>
                          onStatusChange(
                            report.id,
                            event.target
                              .value as MessageReport['status'],
                          )
                        }
                      >
                        <option value="pending">
                          Pending
                        </option>
                        <option value="reviewed">
                          Reviewed
                        </option>
                        <option value="resolved">
                          Resolved
                        </option>
                        <option value="dismissed">
                          Dismissed
                        </option>
                      </select>
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