import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import messageAdminService from '../services/messageAdminService';

import type {
  MessageAdminStats,
  MessageAdminUser,
  MessageReport,
} from '../types/messageAdmin.types';

export function useMessageAdmin() {
  const [stats, setStats] =
    useState<MessageAdminStats | null>(null);

  const [users, setUsers] =
    useState<MessageAdminUser[]>([]);

  const [reports, setReports] =
    useState<MessageReport[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(
    async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const [
          statsResult,
          usersResult,
          reportsResult,
        ] = await Promise.all([
          messageAdminService.getStats(),
          messageAdminService.getUsers(),
          messageAdminService.getReports(),
        ]);

        setStats(statsResult);
        setUsers(usersResult);
        setReports(reportsResult);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load message administration data.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    stats,
    users,
    reports,
    loading,
    error,
    reload: load,
  };
}

export default useMessageAdmin;