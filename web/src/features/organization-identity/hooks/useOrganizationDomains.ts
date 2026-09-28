import {
  useCallback,
  useEffect,
  useState,
} from "react";

import organizationIdentityApi from "../services/organizationIdentityApi";

import type {
  CreateDomainPayload,
  OrganizationDomain,
} from "../types/organizationIdentity.types";

export function useOrganizationDomains(
  organizationId: string,
) {
  const [domains, setDomains] = useState<
    OrganizationDomain[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!organizationId?.trim()) {
      setDomains([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await organizationIdentityApi.getDomains(
          organizationId,
        );

      setDomains(result);
    } catch (errorValue) {
      setError(
        errorValue instanceof Error
          ? errorValue.message
          : "Unable to load organization domains.",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addDomain = useCallback(
    async (payload: CreateDomainPayload) => {
      await organizationIdentityApi.addDomain(
        organizationId,
        payload,
      );

      await reload();
    },
    [organizationId, reload],
  );

  const verifyDomain = useCallback(
    async (domainId: string) => {
      const result =
        await organizationIdentityApi.verifyDomain(
          organizationId,
          domainId,
        );

      await reload();

      return result;
    },
    [organizationId, reload],
  );

  return {
    domains,
    loading,
    error,
    reload,
    addDomain,
    verifyDomain,
  };
}

export default useOrganizationDomains;