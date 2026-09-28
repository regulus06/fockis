import React from 'react';

import MessageAdminHeader from '../components/MessageAdminHeader';
import MessageUserTable from '../components/MessageUserTable';
import useMessageAdmin from '../hooks/useMessageAdmin';

import type {
  MessageAdminUser,
} from '../types/messageAdmin.types';

import '../styles/MessageAdmin.scss';

export default function MessageUsersPage(): React.ReactElement {
  const {
    users,
    loading,
    error,
    reload,
  } = useMessageAdmin();

  const handleSelectUser = (
    user: MessageAdminUser,
  ): void => {
    console.log(
      'Selected messaging user:',
      user,
    );
  };

  return (
    <div className="message-admin-page">
      <MessageAdminHeader
        title="Messaging Users"
        description="View users registered with Fockis messaging."
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

      <MessageUserTable
        users={users}
        loading={loading}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}