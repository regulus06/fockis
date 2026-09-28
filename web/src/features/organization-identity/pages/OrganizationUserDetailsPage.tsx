import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { organizationIdentityApi } from "../services/organizationIdentityApi";
import type {
  ManagedUserRole,
  OrganizationIdentity,
} from "../types/organizationIdentity.types";

import "../styles/OrganizationIdentity.scss";

function formatDate(value?: string | null): string {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function getInitials(user: OrganizationIdentity): string {
  const first = user.firstName?.trim().charAt(0) ?? "";
  const last = user.lastName?.trim().charAt(0) ?? "";

  return `${first}${last}`.toUpperCase() || "U";
}

function getRoleLabel(
  role: ManagedUserRole,
  customRole?: string | null,
): string {
  if (role === "custom" && customRole?.trim()) {
    return customRole.trim();
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function OrganizationUserDetailsPage() {
  const { organizationId, userId } = useParams<{
    organizationId: string;
    userId: string;
  }>();

  const navigate = useNavigate();

  const [user, setUser] = useState<OrganizationIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadUser = async () => {
    if (!organizationId || !userId) {
      setError("Organization ID and user ID are required.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await organizationIdentityApi.getUser(
        organizationId,
        userId,
      );

      setUser(result);
    } catch (err) {
      console.error("Failed to load managed user:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this managed user.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();
  }, [organizationId, userId]);

  const fullName = useMemo(() => {
    if (!user) return "";

    return `${user.firstName} ${user.lastName}`.trim();
  }, [user]);

  const handleSuspendRestore = async () => {
    if (!organizationId || !userId || !user) return;

    if (user.role === "owner") {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      if (user.status === "suspended") {
        await organizationIdentityApi.restoreUser(
          organizationId,
          userId,
        );
      } else {
        await organizationIdentityApi.suspendUser(
          organizationId,
          userId,
        );
      }

      await loadUser();
    } catch (err) {
      console.error("Failed to update managed user status:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the user's status.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!organizationId || !userId || !user) return;

    try {
      setActionLoading(true);
      setError("");

      await organizationIdentityApi.resetPassword(
        organizationId,
        userId,
      );

      window.alert(
        "A password reset process has been started for this user.",
      );
    } catch (err) {
      console.error("Failed to reset managed user password:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset the user's password.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!organizationId || !userId || !user) return;

    if (user.role === "owner") {
      window.alert("The organization owner cannot be removed.");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${fullName || user.username} from this organization's managed identities? This action may not be reversible.`,
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");

      await organizationIdentityApi.removeUser(
        organizationId,
        userId,
      );

      navigate(
        `/organizations/${encodeURIComponent(
          organizationId,
        )}/identity/users`,
      );
    } catch (err) {
      console.error("Failed to remove managed user:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove this managed user.",
      );

      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="organization-identity-page">
        <div className="organization-identity-loading">
          <div className="organization-identity-spinner" />
          <p>Loading managed user...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="organization-identity-page">
        <div className="organization-identity-empty">
          <div className="organization-identity-empty-icon">!</div>

          <h1>User not found</h1>

          <p>
            {error ||
              "We could not find the requested managed identity."}
          </p>

          <Link
            className="organization-identity-button organization-identity-button--primary"
            to={
              organizationId
                ? `/organizations/${encodeURIComponent(
                    organizationId,
                  )}/identity/users`
                : "/"
            }
          >
            Back to Managed Users
          </Link>
        </div>
      </div>
    );
  }

  const roleLabel = getRoleLabel(
    user.role,
    user.customRole,
  );

  const isOwner = user.role === "owner";
  const isSuspended = user.status === "suspended";

  return (
    <div className="organization-identity-page">
      <div className="organization-identity-layout">
        <aside className="organization-identity-sidebar">
          <div className="organization-identity-sidebar-brand">
            <div className="organization-identity-logo">
              F
            </div>

            <div>
              <strong>Fockis</strong>
              <span>Organization Identity</span>
            </div>
          </div>

          <nav className="organization-identity-nav">
            <Link
              to={`/organizations/${encodeURIComponent(
                organizationId ?? "",
              )}/identity`}
              className="organization-identity-nav-link"
            >
              <span>⌂</span>
              Overview
            </Link>

            <Link
              to={`/organizations/${encodeURIComponent(
                organizationId ?? "",
              )}/identity/users`}
              className="organization-identity-nav-link organization-identity-nav-link--active"
            >
              <span>👥</span>
              Managed Users
            </Link>

            <Link
              to={`/organizations/${encodeURIComponent(
                organizationId ?? "",
              )}/identity/users/create`}
              className="organization-identity-nav-link"
            >
              <span>＋</span>
              Create User
            </Link>

            <Link
              to={`/organizations/${encodeURIComponent(
                organizationId ?? "",
              )}/identity/domains`}
              className="organization-identity-nav-link"
            >
              <span>🌐</span>
              Domains
            </Link>

            <Link
              to={`/organizations/${encodeURIComponent(
                organizationId ?? "",
              )}/identity/settings`}
              className="organization-identity-nav-link"
            >
              <span>⚙</span>
              Security & Settings
            </Link>
          </nav>

          <div className="organization-identity-sidebar-footer">
            <div className="organization-identity-sidebar-footer-title">
              Organization Identity
            </div>

            <p>
              Manage organizational accounts, access,
              security policies, and verified domains.
            </p>
          </div>
        </aside>

        <main className="organization-identity-main">
          <header className="organization-identity-header">
            <div>
              <div className="organization-identity-breadcrumbs">
                <Link
                  to={`/organizations/${encodeURIComponent(
                    organizationId ?? "",
                  )}/identity`}
                >
                  Identity
                </Link>

                <span>/</span>

                <Link
                  to={`/organizations/${encodeURIComponent(
                    organizationId ?? "",
                  )}/identity/users`}
                >
                  Managed Users
                </Link>

                <span>/</span>

                <span>{user.username}</span>
              </div>

              <h1>Managed User Details</h1>

              <p>
                View and manage this organization's
                managed identity.
              </p>
            </div>

            <div className="organization-identity-header-actions">
              <Link
                to={`/organizations/${encodeURIComponent(
                  organizationId ?? "",
                )}/identity/users`}
                className="organization-identity-button organization-identity-button--secondary"
              >
                ← Back
              </Link>

              {!isOwner && (
                <Link
                  to={`/organizations/${encodeURIComponent(
                    organizationId ?? "",
                  )}/identity/users/${encodeURIComponent(
                    user.id,
                  )}/edit`}
                  className="organization-identity-button organization-identity-button--primary"
                >
                  Edit User
                </Link>
              )}
            </div>
          </header>

          {error && (
            <div className="organization-identity-alert organization-identity-alert--error">
              <strong>Action failed</strong>
              <span>{error}</span>
            </div>
          )}

          <section className="organization-user-profile-card">
            <div className="organization-user-profile-main">
              <div className="organization-user-avatar organization-user-avatar--large">
                {getInitials(user)}
              </div>

              <div className="organization-user-profile-info">
                <div className="organization-user-profile-name-row">
                  <h2>{fullName || user.username}</h2>

                  <span
                    className={`identity-status-badge identity-status-badge--${user.status}`}
                  >
                    {user.status}
                  </span>
                </div>

                <p className="organization-user-username">
                  @{user.username}
                </p>

                <div className="organization-user-email">
                  <span>✉</span>
                  {user.organizationEmail}
                </div>

                <div className="organization-user-role">
                  <span>Role:</span>
                  <strong>{roleLabel}</strong>
                </div>
              </div>
            </div>

            <div className="organization-user-profile-actions">
              {!isOwner && (
                <button
                  type="button"
                  className={`organization-identity-button ${
                    isSuspended
                      ? "organization-identity-button--success"
                      : "organization-identity-button--warning"
                  }`}
                  onClick={() => void handleSuspendRestore()}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Working..."
                    : isSuspended
                      ? "Restore User"
                      : "Suspend User"}
                </button>
              )}

              <button
                type="button"
                className="organization-identity-button organization-identity-button--secondary"
                onClick={() => void handleResetPassword()}
                disabled={actionLoading}
              >
                Reset Password
              </button>

              {!isOwner && (
                <button
                  type="button"
                  className="organization-identity-button organization-identity-button--danger"
                  onClick={() => void handleRemove()}
                  disabled={actionLoading}
                >
                  Remove User
                </button>
              )}
            </div>
          </section>

          <div className="organization-identity-detail-grid">
            <section className="organization-identity-card">
              <div className="organization-identity-card-header">
                <div>
                  <h2>Identity Information</h2>
                  <p>
                    Basic information associated with this
                    managed identity.
                  </p>
                </div>
              </div>

              <div className="organization-identity-detail-list">
                <div className="organization-identity-detail-row">
                  <span>First name</span>
                  <strong>{user.firstName || "—"}</strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Last name</span>
                  <strong>{user.lastName || "—"}</strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Username</span>
                  <strong>{user.username || "—"}</strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Organization email</span>
                  <strong>
                    {user.organizationEmail || "—"}
                  </strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Recovery email</span>
                  <strong>
                    {user.recoveryEmail || "Not configured"}
                  </strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Department</span>
                  <strong>
                    {user.department || "Not assigned"}
                  </strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Role</span>
                  <strong>{roleLabel}</strong>
                </div>

                {user.domain && (
                  <div className="organization-identity-detail-row">
                    <span>Identity domain</span>
                    <strong>{user.domain}</strong>
                  </div>
                )}
              </div>
            </section>

            <section className="organization-identity-card">
              <div className="organization-identity-card-header">
                <div>
                  <h2>Security</h2>
                  <p>
                    Authentication and account security
                    settings.
                  </p>
                </div>
              </div>

              <div className="organization-security-status-list">
                <div className="organization-security-status-item">
                  <div>
                    <strong>Email verification</strong>
                    <span>
                      Whether the organization email has
                      been verified.
                    </span>
                  </div>

                  <span
                    className={
                      user.emailVerified
                        ? "organization-security-pill organization-security-pill--success"
                        : "organization-security-pill organization-security-pill--warning"
                    }
                  >
                    {user.emailVerified
                      ? "Verified"
                      : "Not verified"}
                  </span>
                </div>

                <div className="organization-security-status-item">
                  <div>
                    <strong>Two-factor authentication</strong>
                    <span>
                      Additional authentication protection.
                    </span>
                  </div>

                  <span
                    className={
                      user.twoFactorEnabled
                        ? "organization-security-pill organization-security-pill--success"
                        : "organization-security-pill organization-security-pill--neutral"
                    }
                  >
                    {user.twoFactorEnabled
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </div>

                <div className="organization-security-status-item">
                  <div>
                    <strong>Password change</strong>
                    <span>
                      Whether the user must change their
                      password.
                    </span>
                  </div>

                  <span
                    className={
                      user.requirePasswordChange
                        ? "organization-security-pill organization-security-pill--warning"
                        : "organization-security-pill organization-security-pill--neutral"
                    }
                  >
                    {user.requirePasswordChange
                      ? "Required"
                      : "Not required"}
                  </span>
                </div>

                <div className="organization-security-status-item">
                  <div>
                    <strong>Account status</strong>
                    <span>
                      Current organizational account state.
                    </span>
                  </div>

                  <span
                    className={`organization-security-pill organization-security-pill--${user.status}`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            </section>

            <section className="organization-identity-card">
              <div className="organization-identity-card-header">
                <div>
                  <h2>Organization Assignment</h2>
                  <p>
                    Information about where this identity
                    belongs.
                  </p>
                </div>
              </div>

              <div className="organization-identity-detail-list">
                <div className="organization-identity-detail-row">
                  <span>Organization ID</span>
                  <strong>
                    {user.organizationId || "—"}
                  </strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Domain</span>
                  <strong>
                    {user.domain || "Fockis-managed identity"}
                  </strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Domain ID</span>
                  <strong>{user.domainId || "—"}</strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Managed user ID</span>
                  <strong>{user.id}</strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Linked account ID</span>
                  <strong>{user.userId || "Not linked"}</strong>
                </div>
              </div>
            </section>

            <section className="organization-identity-card">
              <div className="organization-identity-card-header">
                <div>
                  <h2>Account Activity</h2>
                  <p>
                    Important dates associated with this
                    identity.
                  </p>
                </div>
              </div>

              <div className="organization-identity-detail-list">
                <div className="organization-identity-detail-row">
                  <span>Created</span>
                  <strong>
                    {formatDate(user.createdAt)}
                  </strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Last updated</span>
                  <strong>
                    {formatDate(user.updatedAt)}
                  </strong>
                </div>

                <div className="organization-identity-detail-row">
                  <span>Last login</span>
                  <strong>
                    {formatDate(user.lastLoginAt)}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <section className="organization-identity-card organization-user-management-note">
            <div className="organization-user-management-note-icon">
              🔐
            </div>

            <div>
              <h2>Managed identity security</h2>

              <p>
                This account is controlled by the
                organization according to its Fockis identity
                policies. Organization administrators can
                manage its role, security requirements, and
                account status.
              </p>

              {isOwner && (
                <p className="organization-user-management-note-warning">
                  The organization owner is protected and
                  cannot be suspended or removed from this
                  page.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}