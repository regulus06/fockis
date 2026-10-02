import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import adminUsersApi from "../adminUsersApi";
import UserActions from "../components/UserActions";
import UserStatusBadge from "../components/UserStatusBadge";
import type { AdminUser } from "../types/adminUsers.types";

import "../styles/UserDetails.scss";

interface UserAdminNavigationItem {
  label: string;
  description: string;
  icon: string;
  path: string;
}

const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUser = useCallback(async () => {
    if (!id) {
      setError("No user ID was provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await adminUsersApi.getUser(id);
      setUser(result);
    } catch (err: unknown) {
      console.error("Failed to load user:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load user details.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const navigationItems = useMemo<UserAdminNavigationItem[]>(
    () => [
      {
        label: "Overview",
        description: "Account summary and administrator controls.",
        icon: "▣",
        path: `/admin/users/${id ?? ""}`,
      },
      {
        label: "Profile",
        description: "Profile information and account identity.",
        icon: "◉",
        path: `/admin/users/${id ?? ""}/profile`,
      },
      {
        label: "Account",
        description: "Status, activation, suspension, and deletion.",
        icon: "⚙",
        path: `/admin/users/${id ?? ""}/account`,
      },
      {
        label: "Security",
        description: "Sessions, locks, passwords, and security history.",
        icon: "🔒",
        path: `/admin/users/${id ?? ""}/security`,
      },
      {
        label: "Roles & Permissions",
        description: "Roles and user-level permissions.",
        icon: "◆",
        path: `/admin/users/${id ?? ""}/roles`,
      },
      {
        label: "Verification",
        description: "Verification status and administration.",
        icon: "✓",
        path: `/admin/users/${id ?? ""}/verification`,
      },
      {
        label: "Premium",
        description: "Premium access and subscription state.",
        icon: "★",
        path: `/admin/users/${id ?? ""}/premium`,
      },
      {
        label: "Fockis ID",
        description: "Fockis ID access and payment status.",
        icon: "F",
        path: `/admin/users/${id ?? ""}/fockis-id`,
      },
      {
        label: "Activity",
        description: "Account activity and recent events.",
        icon: "◷",
        path: `/admin/users/${id ?? ""}/activity`,
      },
      {
        label: "Messages",
        description: "Messages and conversation administration.",
        icon: "✉",
        path: `/admin/users/${id ?? ""}/messages`,
      },
      {
        label: "Bookings",
        description: "Bookings associated with the user.",
        icon: "▣",
        path: `/admin/users/${id ?? ""}/bookings`,
      },
      {
        label: "Payments",
        description: "Payment activity associated with the user.",
        icon: "$",
        path: `/admin/users/${id ?? ""}/payments`,
      },
      {
        label: "Reports",
        description: "Reports involving the user.",
        icon: "⚑",
        path: `/admin/users/${id ?? ""}/reports`,
      },
      {
        label: "Fockis Shop",
        description: "Orders, purchases, and seller activity.",
        icon: "🛍",
        path: `/admin/users/${id ?? ""}/shop`,
      },
      {
        label: "Live",
        description: "Streams, gifts, and live activity.",
        icon: "●",
        path: `/admin/users/${id ?? ""}/live`,
      },
      {
        label: "Music",
        description: "Music purchases and creator activity.",
        icon: "♫",
        path: `/admin/users/${id ?? ""}/music`,
      },
      {
        label: "Travel",
        description: "Travel bookings and activity.",
        icon: "✈",
        path: `/admin/users/${id ?? ""}/travel`,
      },
      {
        label: "Real Estate",
        description: "Real-estate listings and activity.",
        icon: "⌂",
        path: `/admin/users/${id ?? ""}/real-estate`,
      },
      {
        label: "Fockis AI",
        description: "AI usage and account activity.",
        icon: "✦",
        path: `/admin/users/${id ?? ""}/ai`,
      },
      {
        label: "Finance",
        description: "Financial activity for the account.",
        icon: "$",
        path: `/admin/users/${id ?? ""}/finance`,
      },
      {
        label: "Admin History",
        description: "Administrator actions on the account.",
        icon: "▤",
        path: `/admin/users/${id ?? ""}/admin-history`,
      },
    ],
    [id],
  );

  if (loading) {
    return (
      <div className="admin-user-details-page">
        <div className="admin-user-details-loading">
          <div className="admin-user-details-loading__avatar" />
          <div className="admin-user-details-loading__content">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="admin-user-details-page">
        <button
          type="button"
          className="admin-user-details-back"
          onClick={() => navigate("/admin/users")}
        >
          ← Back to Users
        </button>

        <section className="admin-user-details-error">
          <div className="admin-user-details-error__icon">!</div>
          <h2>Unable to load user</h2>
          <p>{error || "The requested user could not be found."}</p>
          <button type="button" onClick={() => void loadUser()}>
            Try Again
          </button>
        </section>
      </div>
    );
  }

  const userId = user._id ?? user.id;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Unnamed User";

  const joinedName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "Not provided";

  const lockedUntilDate = user.lockedUntil
    ? new Date(user.lockedUntil)
    : null;

  const isLocked =
    lockedUntilDate !== null &&
    !Number.isNaN(lockedUntilDate.getTime()) &&
    lockedUntilDate.getTime() > Date.now();

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "Unknown";

  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString()
    : "Never";

  const lastActive = user.lastActiveAt
    ? new Date(user.lastActiveAt).toLocaleString()
    : "Never";

  const passwordChanged = user.passwordChangedAt
    ? new Date(user.passwordChangedAt).toLocaleString()
    : "Unknown";

  /*
   * AdminUser does not currently expose a `status` property.
   * Derive the display status from the fields that are actually
   * available on AdminUser.
   */
  const accountStatusLabel = isLocked
    ? "Locked"
    : user.online
      ? "Online"
      : "Active";

  const sellerStatus = user.sellerApproved ? "Approved" : "Not approved";
  const fockisId = user.fockisId || "Not assigned";

  const serviceSummary = [
    {
      label: "Fockis Shop",
      description: "Orders, purchases, and seller activity.",
      icon: "🛍",
      path: `/admin/users/${userId}/shop`,
      value: user.sellerApproved
        ? "Seller account active"
        : "Customer account",
    },
    {
      label: "Live",
      description: "Streams, gifts, and live activity.",
      icon: "●",
      path: `/admin/users/${userId}/live`,
      value: "View live activity",
    },
    {
      label: "Music",
      description: "Purchases and creator activity.",
      icon: "♫",
      path: `/admin/users/${userId}/music`,
      value: "View music activity",
    },
    {
      label: "Travel",
      description: "Bookings and travel activity.",
      icon: "✈",
      path: `/admin/users/${userId}/travel`,
      value: "View travel activity",
    },
    {
      label: "Real Estate",
      description: "Listings and property activity.",
      icon: "⌂",
      path: `/admin/users/${userId}/real-estate`,
      value: "View real-estate activity",
    },
    {
      label: "Fockis AI",
      description: "AI usage and account activity.",
      icon: "✦",
      path: `/admin/users/${userId}/ai`,
      value: "View AI activity",
    },
    {
      label: "Finance",
      description: "Payments and financial activity.",
      icon: "$",
      path: `/admin/users/${userId}/finance`,
      value: "View financial activity",
    },
  ];

  return (
    <div className="admin-user-details-page">
      <div className="admin-user-details-toolbar">
        <button
          type="button"
          className="admin-user-details-back"
          onClick={() => navigate("/admin/users")}
        >
          ← Back to Users
        </button>

        <button
          type="button"
          className="admin-user-details-refresh"
          onClick={() => void loadUser()}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      <section className="admin-user-details-profile">
        <div className="admin-user-details-profile__avatar">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={fullName} />
          ) : (
            fullName.charAt(0).toUpperCase()
          )}

          {user.online && (
            <span
              className="admin-user-details-profile__online"
              aria-label="Online"
            />
          )}
        </div>

        <div className="admin-user-details-profile__identity">
          <span className="admin-user-details-profile__eyebrow">
            USER ACCOUNT
          </span>

          <h1>{fullName}</h1>

          <p>@{user.username}</p>

          <div className="admin-user-details-profile__meta">
            <span>{fockisId}</span>
            <span>{user.email}</span>
          </div>

          <div className="admin-user-details-profile__badges">
            <UserStatusBadge user={user} />

            <UserStatusBadge
              status={user.verified ? "verified" : "unverified"}
              size="sm"
            />

            {user.premium && (
              <UserStatusBadge
                status="premium"
                size="sm"
              />
            )}
          </div>
        </div>

        <div className="admin-user-details-profile__actions">
          <UserActions user={user} onUpdated={setUser} />
        </div>
      </section>

      <nav
        className="admin-user-details-navigation"
        aria-label="User administration navigation"
      >
        {navigationItems.map((item) => {
          const isActive = item.label === "Overview";

          return (
            <Link
              key={item.label}
              to={item.path}
              className={isActive ? "is-active" : ""}
            >
              <span className="admin-user-details-navigation__icon">
                {item.icon}
              </span>

              <span className="admin-user-details-navigation__text">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </Link>
          );
        })}
      </nav>

      <section className="admin-user-details-section-heading">
        <span>USER ADMINISTRATION</span>
        <h2>User Overview</h2>
        <p>
          Review this account and move directly into any user administration
          area.
        </p>
      </section>

      <section className="admin-user-details-overview-stats">
        <div>
          <span>ACCOUNT STATUS</span>
          <strong>{accountStatusLabel}</strong>
        </div>

        <div>
          <span>ROLE</span>
          <strong>{user.role || "user"}</strong>
        </div>

        <div>
          <span>VERIFICATION</span>
          <strong>{user.verified ? "Verified" : "Unverified"}</strong>
        </div>

        <div>
          <span>PREMIUM</span>
          <strong>{user.premium ? "Premium" : "Standard"}</strong>
        </div>

        <div>
          <span>FOCKIS ID</span>
          <strong>{user.fockisIdAccessPaid ? "Paid" : "Unpaid"}</strong>
        </div>

        <div>
          <span>SELLER</span>
          <strong>{sellerStatus}</strong>
        </div>
      </section>

      <div className="admin-user-details-grid">
        <section className="admin-user-details-card">
          <div className="admin-user-details-card__header">
            <div>
              <span>PROFILE</span>
              <h2>Personal Information</h2>
            </div>
            <Link to={`/admin/users/${userId}/profile`}>Manage</Link>
          </div>

          <div className="admin-user-details-fields">
            <div>
              <label>Full Name</label>
              <strong>{joinedName}</strong>
            </div>

            <div>
              <label>Username</label>
              <strong>@{user.username}</strong>
            </div>

            <div>
              <label>Email</label>
              <strong>{user.email}</strong>
            </div>

            <div>
              <label>Phone</label>
              <strong>{user.phone || "Not provided"}</strong>
            </div>

            <div>
              <label>Country</label>
              <strong>{user.countryCode || "Not provided"}</strong>
            </div>

            <div>
              <label>Location</label>
              <strong>{user.location || "Not provided"}</strong>
            </div>

            <div className="is-wide">
              <label>Website</label>
              <strong>{user.website || "Not provided"}</strong>
            </div>

            <div className="is-wide">
              <label>Bio</label>
              <strong>{user.bio || "No biography provided."}</strong>
            </div>
          </div>
        </section>

        <section className="admin-user-details-card">
          <div className="admin-user-details-card__header">
            <div>
              <span>ACCOUNT</span>
              <h2>Account Information</h2>
            </div>
            <Link to={`/admin/users/${userId}/account`}>Manage</Link>
          </div>

          <div className="admin-user-details-fields">
            <div>
              <label>User ID</label>
              <strong>{userId}</strong>
            </div>

            <div>
              <label>Fockis ID</label>
              <strong>{fockisId}</strong>
            </div>

            <div>
              <label>Role</label>
              <strong>{user.role || "user"}</strong>
            </div>

            <div>
              <label>Account Type</label>
              <strong>{user.accountType || "user"}</strong>
            </div>

            <div>
              <label>Member Since</label>
              <strong>{memberSince}</strong>
            </div>

            <div>
              <label>Account Status</label>
              <UserStatusBadge user={user} />
            </div>

            <div>
              <label>Verified</label>
              <UserStatusBadge
                status={user.verified ? "verified" : "unverified"}
                size="sm"
              />
            </div>

            <div>
              <label>Premium</label>
              <UserStatusBadge
                status={user.premium ? "premium" : "unverified"}
                label={user.premium ? "Premium" : "Standard"}
                size="sm"
              />
            </div>
          </div>
        </section>

        <section className="admin-user-details-card">
          <div className="admin-user-details-card__header">
            <div>
              <span>FOCKIS ID</span>
              <h2>Identity Access</h2>
            </div>
            <Link to={`/admin/users/${userId}/fockis-id`}>Manage</Link>
          </div>

          <div className="admin-user-details-fockis">
            <div className="admin-user-details-fockis__id">
              <span>Fockis ID</span>
              <strong>{fockisId}</strong>
            </div>

            <div className="admin-user-details-fockis__status">
              <span>Access Status</span>
              <UserStatusBadge
                status={user.fockisIdAccessPaid ? "paid" : "unpaid"}
                label={
                  user.fockisIdAccessPaid
                    ? "Access Paid"
                    : "Payment Required"
                }
              />
            </div>

            <div>
              <span>Access</span>
              <strong>
                {user.fockisIdAccessPaid
                  ? "Fockis ID access enabled"
                  : "Payment required"}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-user-details-card">
          <div className="admin-user-details-card__header">
            <div>
              <span>SECURITY</span>
              <h2>Security Status</h2>
            </div>
            <Link to={`/admin/users/${userId}/security`}>Manage</Link>
          </div>

          <div className="admin-user-security-grid">
            <div>
              <span>Account Locked</span>
              <strong className={isLocked ? "is-danger" : "is-good"}>
                {isLocked ? "Yes" : "No"}
              </strong>
            </div>

            <div>
              <span>Failed Login Attempts</span>
              <strong>{user.failedLoginAttempts ?? 0}</strong>
            </div>

            <div>
              <span>Last Login</span>
              <strong>{lastLogin}</strong>
            </div>

            <div>
              <span>Last Active</span>
              <strong>{lastActive}</strong>
            </div>

            <div>
              <span>Password Change Required</span>
              <strong>{user.mustChangePassword ? "Yes" : "No"}</strong>
            </div>

            <div>
              <span>Password Changed</span>
              <strong>{passwordChanged}</strong>
            </div>
          </div>
        </section>

        <section className="admin-user-details-card">
          <div className="admin-user-details-card__header">
            <div>
              <span>SOCIAL</span>
              <h2>Social Statistics</h2>
            </div>
            <Link to={`/admin/users/${userId}/activity`}>View Activity</Link>
          </div>

          <div className="admin-user-details-stats">
            <div>
              <strong>{(user.followersCount ?? 0).toLocaleString()}</strong>
              <span>Followers</span>
            </div>

            <div>
              <strong>{(user.followingCount ?? 0).toLocaleString()}</strong>
              <span>Following</span>
            </div>

            <div>
              <strong>{(user.friendsCount ?? 0).toLocaleString()}</strong>
              <span>Friends</span>
            </div>

            <div>
              <strong>{(user.postsCount ?? 0).toLocaleString()}</strong>
              <span>Posts</span>
            </div>

            <div>
              <strong>{(user.likesReceived ?? 0).toLocaleString()}</strong>
              <span>Likes Received</span>
            </div>
          </div>
        </section>

        <section className="admin-user-details-card">
          <div className="admin-user-details-card__header">
            <div>
              <span>SELLER</span>
              <h2>Seller & Business</h2>
            </div>
            <Link to={`/admin/users/${userId}/shop`}>
              Open Shop Activity
            </Link>
          </div>

          <div className="admin-user-details-fields">
            <div>
              <label>Seller Approved</label>
              <strong>{user.sellerApproved ? "Yes" : "No"}</strong>
            </div>

            <div>
              <label>Store Name</label>
              <strong>{user.storeName || "No store"}</strong>
            </div>

            <div className="is-wide">
              <label>Store Description</label>
              <strong>
                {user.storeDescription || "No store description."}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-user-details-card admin-user-details-card--full">
          <div className="admin-user-details-card__header">
            <div>
              <span>FOCKIS SERVICES</span>
              <h2>Platform Activity</h2>
            </div>

            <span className="admin-user-details-card__header-note">
              Open a service to manage this user's activity
            </span>
          </div>

          <div className="admin-user-service-grid">
            {serviceSummary.map((service) => (
              <Link
                key={service.label}
                to={service.path}
                className="admin-user-service-card"
              >
                <span className="admin-user-service-card__icon">
                  {service.icon}
                </span>

                <span className="admin-user-service-card__content">
                  <strong>{service.label}</strong>
                  <small>{service.description}</small>
                  <em>{service.value}</em>
                </span>

                <span className="admin-user-service-card__arrow">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-user-details-card admin-user-details-card--full">
          <div className="admin-user-details-card__header">
            <div>
              <span>QUICK ADMINISTRATION</span>
              <h2>Account Administration</h2>
            </div>
          </div>

          <div className="admin-user-quick-actions">
            {navigationItems
              .filter((item) =>
                [
                  "Roles & Permissions",
                  "Verification",
                  "Premium",
                  "Messages",
                  "Bookings",
                  "Payments",
                  "Reports",
                  "Admin History",
                ].includes(item.label),
              )
              .map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className="admin-user-quick-action"
                >
                  <span>{item.icon}</span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                  <b>→</b>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default UserDetailsPage;