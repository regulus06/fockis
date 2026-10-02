import React, {
  useCallback,
} from 'react';

import MessageAdminHeader from '../components/MessageAdminHeader';
import MessageReportTable from '../components/MessageReportTable';
import useMessageAdmin from '../hooks/useMessageAdmin';

import { messageAdminApi } from '../api/messageAdminApi';

import type {
  MessageReport,
} from '../types/messageAdmin.types';

import '../styles/MessageReports.scss';

export default function MessageReportsPage(): React.ReactElement {
  const {
    reports,
    loading,
    error,
    reload,
  } = useMessageAdmin();

  const handleStatusChange = useCallback(
    async (
      reportId: string,
      status: MessageReport['status'],
    ): Promise<void> => {
      try {
        await messageAdminApi.updateReportStatus(
          reportId,
          status,
        );

        await reload();
      } catch (err) {
        console.error(
          'Failed to update report status:',
          err,
        );
      }
    },
    [reload],
  );

  return (
    <div className="message-admin-page">
      <MessageAdminHeader
        title="Message Reports"
        description="Review reports submitted by Fockis users."
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

      <MessageReportTable
        reports={reports}
        loading={loading}
        onStatusChange={(reportId, status) => {
          void handleStatusChange(
            reportId,
            status,
          );
        }}
      />
    </div>
  );
}