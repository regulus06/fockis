import {
  NavLink,
} from "react-router-dom";

interface Props {
  organizationId: string;
}

export default function OrganizationIdentitySidebar({
  organizationId,
}: Props) {
  const normalizedOrganizationId =
    organizationId.trim();

  const base =
    `/organizations/${encodeURIComponent(
      normalizedOrganizationId,
    )}/identity`;

  return (
    <aside className="identity-sidebar">
      <div className="identity-sidebar__brand">
        <div className="identity-sidebar__logo">
          F
        </div>

        <div>
          <strong>
            Fockis
          </strong>

          <small>
            Organization Identity
          </small>
        </div>
      </div>

      <nav className="identity-sidebar__nav">
        {/* Overview */}
        <NavLink
          end
          to={base}
        >
          <span>⌂</span>
          Overview
        </NavLink>

        {/* Managed Users */}
        <NavLink
          end
          to={`${base}/users`}
        >
          <span>♙</span>
          Managed Users
        </NavLink>

        {/* Create User */}
        <NavLink
          to={`${base}/users/new`}
        >
          <span>＋</span>
          Create User
        </NavLink>

        {/* Domains */}
        <NavLink
          end
          to={`${base}/domains`}
        >
          <span>@</span>
          Domains
        </NavLink>

        {/* Security & Settings */}
        <NavLink
          to={`${base}/settings`}
        >
          <span>⚙</span>
          Security & Settings
        </NavLink>
      </nav>

      <div className="identity-sidebar__footer">
        <strong>
          Fockis-managed identities
        </strong>

        <p>
          Organizations can create
          identities without buying a
          domain.
        </p>
      </div>
    </aside>
  );
}