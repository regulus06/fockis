import {
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import OrganizationIdentitySidebar from "../components/OrganizationIdentitySidebar";
import DomainVerificationCard from "../components/DomainVerificationCard";

import {
  useOrganizationDomains,
} from "../hooks/useOrganizationDomains";

import "../styles/OrganizationDomains.scss";

export default function OrganizationDomainDetailsPage() {
  const {
    organizationId = "",
    domainId = "",
  } = useParams();

  const {
    domains,
    verifyDomain,
  } = useOrganizationDomains(
    organizationId,
  );

  const domain =
    domains.find(
      (item) =>
        item.id === domainId,
    );

  const [message, setMessage] =
    useState("");

  const [verifying, setVerifying] =
    useState(false);

  async function verify() {
    if (!domain) {
      return;
    }

    setVerifying(true);
    setMessage("");

    try {
      const result =
        await verifyDomain(
          domain.id,
        );

      setMessage(
        result.status === "verified"
          ? "Domain verified successfully."
          : "The DNS record has not been detected yet.",
      );
    } catch (errorValue) {
      setMessage(
        errorValue instanceof Error
          ? errorValue.message
          : "Domain verification failed.",
      );
    } finally {
      setVerifying(false);
    }
  }

  if (!domain) {
    return (
      <div className="identity-layout">
        <OrganizationIdentitySidebar
          organizationId={
            organizationId
          }
        />

        <main className="identity-main">
          <div className="loading-state">
            <strong>
              Domain not found
            </strong>

            <p>
              The requested domain could
              not be found.
            </p>

            <Link
              to={`/organizations/${organizationId}/identity/domains`}
            >
              ← Back to domains
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="identity-layout">
      <OrganizationIdentitySidebar
        organizationId={
          organizationId
        }
      />

      <main className="identity-main">
        <Link
          className="back-link"
          to={`/organizations/${organizationId}/identity/domains`}
        >
          ← Domains
        </Link>

        <header className="identity-header domain-detail-header">
          <div>
            <span className="eyebrow">
              Organization domain
            </span>

            <h1>
              {domain.domain}
            </h1>

            <p>
              Domain status:{" "}
              <strong>
                {domain.status}
              </strong>
            </p>
          </div>
        </header>

        {message && (
          <div className="notice">
            {message}
          </div>
        )}

        <DomainVerificationCard
          domain={domain}
          onVerify={() =>
            void verify()
          }
          verifying={verifying}
        />

        {domain.status ===
          "verified" && (
          <section className="domain-next-step">
            <h2>
              Your domain is ready
            </h2>

            <p>
              Managed users can now use
              this domain when their
              organization identity is
              created.
            </p>

            <Link
              className="primary-button"
              to={`/organizations/${organizationId}/identity/users/create`}
            >
              Create user
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}