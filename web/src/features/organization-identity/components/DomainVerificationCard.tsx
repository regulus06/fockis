import type {
  OrganizationDomain,
} from "../types/organizationIdentity.types";

interface Props {
  domain: OrganizationDomain;

  onVerify?: () => void;

  verifying?: boolean;
}

export default function DomainVerificationCard({
  domain,
  onVerify,
  verifying = false,
}: Props) {
  if (domain.status === "verified") {
    return (
      <div className="verification-card verification-card--success">
        <div className="verification-card__icon">
          ✓
        </div>

        <div>
          <strong>
            Domain verified
          </strong>

          <p>
            {domain.domain} is ready
            for organization
            identities.
          </p>

          {domain.verifiedAt && (
            <small>
              Verified{" "}
              {new Date(
                domain.verifiedAt,
              ).toLocaleString()}
            </small>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="verification-card">
      <div className="verification-card__header">
        <div>
          <span className="eyebrow">
            DNS verification
          </span>

          <h2>
            Verify {domain.domain}
          </h2>

          <p>
            Add this TXT record to the
            DNS settings for your domain.
          </p>
        </div>
      </div>

      <div className="dns-record">
        <div className="dns-row">
          <span>Record type</span>
          <code>TXT</code>
        </div>

        <div className="dns-row">
          <span>Host</span>

          <code>
            {domain.verificationHost ||
              "_fockis-verification"}
          </code>
        </div>

        <div className="dns-row">
          <span>Value</span>

          <code>
            {domain.verificationValue ||
              "fockis-domain-verification=..."}
          </code>
        </div>
      </div>

      {onVerify && (
        <button
          type="button"
          className="primary"
          onClick={onVerify}
          disabled={verifying}
        >
          {verifying
            ? "Checking DNS..."
            : "Check verification"}
        </button>
      )}
    </div>
  );
}