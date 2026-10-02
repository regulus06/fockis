import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  listOrganizations,
} from "../../church/api/organizationsApi";

export default function OrganizationIdentityLauncherPage() {
  const [
    organizationId,
    setOrganizationId,
  ] = useState<string>("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrganization() {
      try {
        setLoading(true);
        setError("");

        const result =
          await listOrganizations({
            mine: true,
            page: 1,
            pageSize: 20,
          });

        if (cancelled) {
          return;
        }

        const organizations =
          result?.items ?? [];

        if (organizations.length === 0) {
          setError(
            "You do not belong to an organization yet.",
          );
          return;
        }

        const organization =
          organizations[0] as
            | {
                id?: string;
                _id?: string;
                organizationId?: string;
              }
            | undefined;

        const id =
          organization?.id ||
          organization?._id ||
          organization?.organizationId ||
          "";

        if (!id.trim()) {
          setError(
            "The organization ID could not be determined.",
          );
          return;
        }

        setOrganizationId(
          id.trim(),
        );
      } catch (err) {
        console.error(
          "[Organization Identity] Failed to load organization:",
          err,
        );

        if (!cancelled) {
          setError(
            "Unable to load your organization.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrganization();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "40px",
        }}
      >
        <div>
          <h2>
            Organization Identity
          </h2>

          <p>
            Loading your organization...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "40px",
        }}
      >
        <div>
          <h2>
            Organization Identity
          </h2>

          <p>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Navigate
      to={`/organizations/${encodeURIComponent(
        organizationId,
      )}/identity`}
      replace
    />
  );
}