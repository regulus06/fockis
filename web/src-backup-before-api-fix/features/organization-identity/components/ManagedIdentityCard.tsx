import type {
  OrganizationIdentity,
} from "../types/organizationIdentity.types";

import IdentityStatusBadge from "./IdentityStatusBadge";
import OrganizationEmailBadge from "./OrganizationEmailBadge";

interface Props {
  identity: OrganizationIdentity;
  onClick?: () => void;
}

export default function ManagedIdentityCard({
  identity,
  onClick,
}: Props) {
  const initials =
    `${identity.firstName.charAt(0)}${identity.lastName.charAt(0)}`.toUpperCase();

  return (
    <article
      className={`identity-card${
        onClick
          ? " identity-card--clickable"
          : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (
          onClick &&
          (event.key === "Enter" ||
            event.key === " ")
        ) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="identity-card__avatar">
        {initials}
      </div>

      <div className="identity-card__body">
        <div className="identity-card__top">
          <div>
            <h3>
              {identity.firstName}{" "}
              {identity.lastName}
            </h3>

            <p>
              @{identity.username}
            </p>
          </div>

          <IdentityStatusBadge
            status={identity.status}
          />
        </div>

        <OrganizationEmailBadge
          email={identity.organizationEmail}
        />

        <div className="identity-card__meta">
          <span>
            {identity.customRole ||
              identity.role}
          </span>

          {identity.department && (
            <span>
              {identity.department}
            </span>
          )}

          <span>
            {identity.twoFactorEnabled
              ? "2FA enabled"
              : "2FA off"}
          </span>
        </div>
      </div>
    </article>
  );
}