import type {
  OrganizationDomain,
} from "../types/organizationIdentity.types";

interface Props {
  domain: OrganizationDomain;

  onOpen?: () => void;
}

export default function DomainCard({
  domain,
  onOpen,
}: Props) {
  return (
    <article className="domain-card">
      <div className="domain-card__main">
        <span className="domain-card__icon">
          @
        </span>

        <div>
          <h3>
            {domain.domain}
          </h3>

          <p>
            {domain.status ===
            "verified"
              ? "Ready for organization identities."
              : "DNS verification required."}
          </p>
        </div>
      </div>

      <span
        className={`domain-status domain-status--${domain.status}`}
      >
        {domain.status}
      </span>

      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
        >
          Manage
        </button>
      )}
    </article>
  );
}