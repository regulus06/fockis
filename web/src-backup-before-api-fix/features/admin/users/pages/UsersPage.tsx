import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import adminUsersApi from "../adminUsersApi";
import UserActions from "../components/UserActions";
import UserSearch from "../components/UserSearch";
import UserStatsCards from "../components/UserStatsCards";
import UserStatusBadge from "../components/UserStatusBadge";

import type {
  AdminUser,
  AdminUserAccountType,
  AdminUserListFilters,
  AdminUserRole,
  AdminUserStats,
  AdminUserStatus,
} from "../types/adminUsers.types";

import "../styles/Users.scss";

interface UserNavigationItem {
  label: string;
  description: string;
  icon: string;
  requiresUser: boolean;
  path?: string;
}

const UsersPage: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminUserStatus | "">("");
  const [role, setRole] = useState<AdminUserRole | "">("");
  const [accountType, setAccountType] =
    useState<AdminUserAccountType | "">("");
  const [verified, setVerified] = useState("");
  const [locked, setLocked] = useState("");
  const [premium, setPremium] = useState("");
  const [fockisIdAccessPaid, setFockisIdAccessPaid] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo<AdminUserListFilters>(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      role: role || undefined,
      accountType: accountType || undefined,
      verified:
        verified === "" ? undefined : verified === "true",
      locked:
        locked === "" ? undefined : locked === "true",
      premium:
        premium === "" ? undefined : premium === "true",
      fockisIdAccessPaid:
        fockisIdAccessPaid === ""
          ? undefined
          : fockisIdAccessPaid === "true",
      page,
      limit,
    }),
    [
      search,
      status,
      role,
      accountType,
      verified,
      locked,
      premium,
      fockisIdAccessPaid,
      page,
      limit,
    ],
  );

  const loadStats = useCallback(async (): Promise<void> => {
    setStatsLoading(true);

    try {
      const result = await adminUsersApi.getStats();
      setStats(result);
    } catch (err: unknown) {
      console.error("Failed to load user statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      const response = await adminUsersApi.getUsers(filters);

      setUsers(response.items ?? response.users ?? []);
      setTotal(response.total ?? 0);
    } catch (err: unknown) {
      console.error("Failed to load users:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load users.",
      );

      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setRole("");
    setAccountType("");
    setVerified("");
    setLocked("");
    setPremium("");
    setFockisIdAccessPaid("");
    setPage(1);
  };

  const handleUserUpdated = (updatedUser: AdminUser) => {
    const updatedId = updatedUser._id ?? updatedUser.id;

    setUsers((currentUsers) =>
      currentUsers.map((user) => {
        const userId = user._id ?? user.id;
        return userId === updatedId ? updatedUser : user;
      }),
    );

    void loadStats();
  };

  const handleExport = async () => {
    try {
      const blob = await adminUsersApi.exportUsers(filters);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download =
        "fockis-users-" +
        new Date()
          .toISOString()
          .slice(0, 10) +
        ".csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Unable to export users.",
      );
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit),
  );

  const firstResult =
    total === 0 ? 0 : (page - 1) * limit + 1;

  const lastResult =
    total === 0
      ? 0
      : Math.min(page * limit, total);

  /*
   * Dashboard navigation.
   *
   * Links that require a selected user stay disabled here because
   * there is no user ID on /admin/users yet. Select a user from the
   * table to activate all of these destinations.
   */
  const userNavigation: UserNavigationItem[] = [
    {
      label: "User Overview",
      description: "Account summary and administrator controls.",
      icon: "▣",
      requiresUser: true,
    },
    {
      label: "Profile",
      description: "Profile information and account identity.",
      icon: "◉",
      requiresUser: true,
    },
    {
      label: "Account",
      description: "Status, activation, suspension, and deletion.",
      icon: "⚙",
      requiresUser: true,
    },
    {
      label: "Security",
      description: "Sessions, locks, passwords, and security history.",
      icon: "🔒",
      requiresUser: true,
    },
    {
      label: "Roles & Permissions",
      description: "Roles and user-level permissions.",
      icon: "◆",
      requiresUser: true,
    },
    {
      label: "Verification",
      description: "Verification status and administration.",
      icon: "✓",
      requiresUser: true,
    },
    {
      label: "Premium",
      description: "Premium access and subscription state.",
      icon: "★",
      requiresUser: true,
    },
    {
      label: "Fockis ID",
      description: "Fockis ID access and payment status.",
      icon: "F",
      requiresUser: true,
    },
    {
      label: "Activity",
      description: "Account activity and recent events.",
      icon: "◷",
      requiresUser: true,
    },
    {
      label: "Messages",
      description: "Messages and conversation administration.",
      icon: "✉",
      requiresUser: true,
    },
    {
      label: "Bookings",
      description: "Bookings associated with the user.",
      icon: "▣",
      requiresUser: true,
    },
    {
      label: "Payments",
      description: "Payment activity associated with the user.",
      icon: "$",
      requiresUser: true,
    },
    {
      label: "Reports",
      description: "Reports involving the user.",
      icon: "⚑",
      requiresUser: true,
    },
    {
      label: "Fockis Shop",
      description: "Orders, purchases, and seller activity.",
      icon: "🛍",
      requiresUser: true,
    },
    {
      label: "Live",
      description: "Streams, gifts, and live activity.",
      icon: "●",
      requiresUser: true,
    },
    {
      label: "Music",
      description: "Music purchases and creator activity.",
      icon: "♫",
      requiresUser: true,
    },
    {
      label: "Travel",
      description: "Travel bookings and activity.",
      icon: "✈",
      requiresUser: true,
    },
    {
      label: "Real Estate",
      description: "Real-estate listings and activity.",
      icon: "⌂",
      requiresUser: true,
    },
    {
      label: "Fockis AI",
      description: "AI usage and account activity.",
      icon: "✦",
      requiresUser: true,
    },
    {
      label: "Finance",
      description: "Financial activity for the account.",
      icon: "$",
      requiresUser: true,
    },
    {
      label: "Admin History",
      description: "Administrator actions on the account.",
      icon: "▤",
      requiresUser: true,
    },
  ];

  const handleNavigationClick = (
    item: UserNavigationItem,
  ) => {
    if (item.requiresUser) {
      window.alert(
        "Select a user from the table first. The user administration links will then be available.",
      );
      return;
    }

    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="admin-users-page">
      <section className="admin-users-page__intro">
        <div>
          <span className="admin-users-page__eyebrow">
            USER ADMINISTRATION
          </span>

          <h2>User Admin Dashboard</h2>

          <p>
            Monitor and manage Fockis users, accounts,
            security, verification, premium access,
            Fockis ID access, and platform activity.
          </p>
        </div>

        <div className="admin-users-page__intro-actions">
          <button
            type="button"
            className="admin-users-page__secondary-button"
            onClick={handleExport}
            disabled={loading || total === 0}
          >
            Export Users
          </button>

          <button
            type="button"
            className="admin-users-page__primary-button"
            onClick={() => {
              void loadUsers();
              void loadStats();
            }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="admin-users-dashboard-navigation">
        <div className="admin-users-dashboard-navigation__header">
          <div>
            <span className="admin-users-page__eyebrow">
              USER ADMINISTRATION
            </span>
            <h3>User Management</h3>
            <p>
              Select a user below to open their complete account
              administration area.
            </p>
          </div>

          <span className="admin-users-dashboard-navigation__hint">
            Select a user to activate controls
          </span>
        </div>

        <div className="admin-users-dashboard-navigation__grid">
          {userNavigation.map((item) => (
            <button
              key={item.label}
              type="button"
              className={[
                "admin-users-dashboard-navigation__button",
                item.requiresUser
                  ? "is-user-dependent"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleNavigationClick(item)}
              disabled={item.requiresUser}
              title={
                item.requiresUser
                  ? "Select a user from All Users first"
                  : undefined
              }
            >
              <span
                className="admin-users-dashboard-navigation__icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span className="admin-users-dashboard-navigation__content">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>

              <span
                className="admin-users-dashboard-navigation__arrow"
                aria-hidden="true"
              >
                →
              </span>
            </button>
          ))}
        </div>
      </section>

      <UserStatsCards
        stats={stats}
        loading={statsLoading}
      />

      <section className="admin-users-panel">
        <div className="admin-users-panel__header">
          <div>
            <h3>All Users</h3>
            <span>
              {total.toLocaleString()} total users
            </span>
          </div>
        </div>

        <div className="admin-users-filters">
          <UserSearch
            value={search}
            onChange={setSearch}
            onSearch={handleSearch}
            disabled={loading}
          />

          <div className="admin-users-filters__controls">
            <select
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value as
                    | AdminUserStatus
                    | "",
                );
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="locked">Locked</option>
              <option value="deleted">Deleted</option>
            </select>

            <select
              value={role}
              onChange={(event) => {
                setRole(
                  event.target.value as
                    | AdminUserRole
                    | "",
                );
                setPage(1);
              }}
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">
                Super Admin
              </option>
            </select>

            <select
              value={accountType}
              onChange={(event) => {
                setAccountType(
                  event.target.value as
                    | AdminUserAccountType
                    | "",
                );
                setPage(1);
              }}
              aria-label="Filter by account type"
            >
              <option value="">All account types</option>
              <option value="user">User</option>
              <option value="seller">Seller</option>
              <option value="business">Business</option>
            </select>

            <select
              value={verified}
              onChange={(event) => {
                setVerified(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by verification"
            >
              <option value="">Verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>

            <select
              value={locked}
              onChange={(event) => {
                setLocked(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by lock status"
            >
              <option value="">Lock status</option>
              <option value="true">Locked</option>
              <option value="false">Unlocked</option>
            </select>

            <select
              value={premium}
              onChange={(event) => {
                setPremium(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by premium status"
            >
              <option value="">Premium</option>
              <option value="true">Premium</option>
              <option value="false">Standard</option>
            </select>

            <select
              value={fockisIdAccessPaid}
              onChange={(event) => {
                setFockisIdAccessPaid(
                  event.target.value,
                );
                setPage(1);
              }}
              aria-label="Filter by Fockis ID access"
            >
              <option value="">Fockis ID access</option>
              <option value="true">Paid</option>
              <option value="false">Unpaid</option>
            </select>

            <button
              type="button"
              className="admin-users-filters__reset"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div
            className="admin-users-alert admin-users-alert--error"
            role="alert"
          >
            <strong>Unable to load users</strong>
            <span>{error}</span>

            <button
              type="button"
              onClick={() => void loadUsers()}
            >
              Try Again
            </button>
          </div>
        )}

        <div className="admin-users-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Fockis ID</th>
                <th>Status</th>
                <th>Role</th>
                <th>Account</th>
                <th>Verification</th>
                <th>Premium</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading &&
                Array.from({ length: 8 }).map(
                  (_, index) => (
                    <tr
                      key={`loading-${index}`}
                      className="admin-users-table__loading-row"
                    >
                      <td colSpan={9}>
                        <div />
                      </td>
                    </tr>
                  ),
                )}

              {!loading &&
                users.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="admin-users-table__empty"
                    >
                      <div>
                        <strong>No users found</strong>
                        <span>
                          Try changing your search
                          or filters.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

              {!loading &&
                users.map((user) => {
                  const userId =
                    user._id ?? user.id;

                  const fullName =
                    [
                      user.firstName,
                      user.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    user.username ||
                    "Unnamed User";

                  const lastActive =
                    user.lastActiveAt ??
                    user.lastLoginAt ??
                    user.lastSeen;

                  return (
                    <tr key={userId}>
                      <td>
                        <button
                          type="button"
                          className="admin-users-user-cell"
                          onClick={() => {
                            if (!userId) return;

                            navigate(
                              `/admin/users/${userId}`,
                            );
                          }}
                        >
                          <span className="admin-users-user-cell__avatar">
                            {user.profilePicture ? (
                              <img
                                src={user.profilePicture}
                                alt=""
                              />
                            ) : (
                              fullName
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </span>

                          <span className="admin-users-user-cell__info">
                            <strong>{fullName}</strong>
                            <small>
                              @{user.username}
                            </small>
                            <small>
                              {user.email}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td>
                        <span className="admin-users-fockis-id">
                          {user.fockisId ??
                            "Not assigned"}
                        </span>
                      </td>

                      <td>
                        <UserStatusBadge user={user} />
                      </td>

                      <td>
                        <span className="admin-users-role">
                          {user.role}
                        </span>
                      </td>

                      <td>
                        <span className="admin-users-account-type">
                          {user.accountType}
                        </span>
                      </td>

                      <td>
                        <UserStatusBadge
                          status={
                            user.verified
                              ? "verified"
                              : "unverified"
                          }
                          size="sm"
                        />
                      </td>

                      <td>
                        {user.premium ? (
                          <UserStatusBadge
                            status="premium"
                            size="sm"
                          />
                        ) : (
                          <span className="admin-users-muted">
                            Standard
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="admin-users-last-active">
                          {lastActive
                            ? new Date(
                                lastActive,
                              ).toLocaleString()
                            : "Never"}
                        </span>
                      </td>

                      <td>
                        <UserActions
                          user={user}
                          onUpdated={
                            handleUserUpdated
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 && (
          <footer className="admin-users-pagination">
            <span>
              Showing {firstResult.toLocaleString()}–
              {lastResult.toLocaleString()} of{" "}
              {total.toLocaleString()}
            </span>

            <div className="admin-users-pagination__controls">
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1),
                  )
                }
                disabled={page <= 1}
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                  )
                }
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>
  );
};

export default UsersPage;
