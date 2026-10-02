import {
  useCallback,
  useEffect,
  useState,
} from "react";

import domainAdminApi from "../api/domainAdminApi";

import type {
  CreateDomainAuthorizationPayload,
  CreateDomainCampaignPayload,
  DomainAuthorization,
  DomainCampaign,
  DomainListParams,
  DomainPolicy,
  DomainStats,
  ManagedDomain,
  UpdateDomainPolicyPayload,
} from "../types/domainAdmin.types";

export function useDomainAdmin() {
  const [policy, setPolicy] =
    useState<DomainPolicy | null>(null);

  const [stats, setStats] =
    useState<DomainStats | null>(null);

  const [campaigns, setCampaigns] =
    useState<DomainCampaign[]>([]);

  const [authorizations, setAuthorizations] =
    useState<DomainAuthorization[]>([]);

  const [domains, setDomains] =
    useState<ManagedDomain[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string>("");

  const getErrorMessage = useCallback(
    (value: unknown): string => {
      const errorValue =
        value as {
          response?: {
            data?: {
              message?: string | string[];
            };
          };
          message?: string;
        };

      const message =
        errorValue?.response?.data?.message;

      if (Array.isArray(message)) {
        return message.join(", ");
      }

      if (typeof message === "string") {
        return message;
      }

      if (
        typeof errorValue?.message ===
        "string"
      ) {
        return errorValue.message;
      }

      return "Unable to complete the domain admin request.";
    },
    [],
  );

  const loadOverview =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await domainAdminApi.getOverview();

        setPolicy(result.policy);
        setStats(result.stats);
        setCampaigns(
          result.campaigns ?? [],
        );
        setAuthorizations(
          result.authorizations ?? [],
        );
        setDomains(
          result.domains ?? [],
        );
      } catch (value) {
        setError(
          getErrorMessage(value),
        );
      } finally {
        setLoading(false);
      }
    }, [getErrorMessage]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const updatePolicy =
    useCallback(
      async (
        payload: UpdateDomainPolicyPayload,
      ) => {
        setError("");

        try {
          const updated =
            await domainAdminApi.updatePolicy(
              payload,
            );

          setPolicy(updated);

          return updated;
        } catch (value) {
          const message =
            getErrorMessage(value);

          setError(message);

          throw new Error(message);
        }
      },
      [getErrorMessage],
    );

  const createCampaign =
    useCallback(
      async (
        payload: CreateDomainCampaignPayload,
      ) => {
        setError("");

        try {
          const campaign =
            await domainAdminApi.createCampaign(
              payload,
            );

          setCampaigns((current) => [
            campaign,
            ...current,
          ]);

          return campaign;
        } catch (value) {
          const message =
            getErrorMessage(value);

          setError(message);

          throw new Error(message);
        }
      },
      [getErrorMessage],
    );

  const createAuthorization =
    useCallback(
      async (
        payload: CreateDomainAuthorizationPayload,
      ) => {
        setError("");

        try {
          const authorization =
            await domainAdminApi.createAuthorization(
              payload,
            );

          setAuthorizations(
            (current) => [
              authorization,
              ...current,
            ],
          );

          return authorization;
        } catch (value) {
          const message =
            getErrorMessage(value);

          setError(message);

          throw new Error(message);
        }
      },
      [getErrorMessage],
    );

  const revokeAuthorization =
    useCallback(
      async (
        authorizationId: string,
      ) => {
        setError("");

        try {
          await domainAdminApi.revokeAuthorization(
            authorizationId,
          );

          setAuthorizations(
            (current) =>
              current.filter(
                (item) =>
                  item.id !==
                  authorizationId,
              ),
          );
        } catch (value) {
          const message =
            getErrorMessage(value);

          setError(message);

          throw new Error(message);
        }
      },
      [getErrorMessage],
    );

  const loadDomains =
    useCallback(
      async (
        params: DomainListParams = {},
      ) => {
        setError("");

        try {
          const result =
            await domainAdminApi.getDomains(
              params,
            );

          setDomains(result);

          return result;
        } catch (value) {
          const message =
            getErrorMessage(value);

          setError(message);

          throw new Error(message);
        }
      },
      [getErrorMessage],
    );

  return {
    policy,
    stats,
    campaigns,
    authorizations,
    domains,

    loading,
    error,

    refresh: loadOverview,

    updatePolicy,

    createCampaign,

    createAuthorization,

    revokeAuthorization,

    loadDomains,
  };
}

export default useDomainAdmin;