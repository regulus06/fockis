import {
  useCallback,
  useEffect,
  useState,
} from "react";

import organizationIdentityApi from "../services/organizationIdentityApi";

import type {
  CreateManagedUserPayload,
  OrganizationIdentity,
  UpdateManagedUserPayload,
} from "../types/organizationIdentity.types";

export function useOrganizationIdentities(
  organizationId: string,
) {
  const [users, setUsers] = useState<OrganizationIdentity[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!organizationId?.trim()) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await organizationIdentityApi.getUsers(
          organizationId,
        );

      setUsers(result);
    } catch (errorValue) {
      setError(
        errorValue instanceof Error
          ? errorValue.message
          : "Unable to load organization users.",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createUser = useCallback(
    async (payload: CreateManagedUserPayload) => {
      await organizationIdentityApi.createUser(
        organizationId,
        payload,
      );

      await reload();
    },
    [organizationId, reload],
  );

  const updateUser = useCallback(
    async (
      userId: string,
      payload: UpdateManagedUserPayload,
    ) => {
      await organizationIdentityApi.updateUser(
        organizationId,
        userId,
        payload,
      );

      await reload();
    },
    [organizationId, reload],
  );

  return {
    users,
    loading,
    error,
    reload,
    createUser,
    updateUser,
  };
}

export default useOrganizationIdentities;