import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "../styles/TravelUsersPage.scss";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";

type TravelUser = {
  id?: string;
  _id?: string;

  username?: string;
  fockisId?: string;

  firstName?: string;
  lastName?: string;
  name?: string;

  email?: string;
  phone?: string;

  countryCode?: string;
  callingCode?: string;

  profilePicture?: string;

  role?: string;
  accountType?: string;

  verified?: boolean;
  isActive?: boolean;
  online?: boolean;

  lastSeen?: string;
  lastActiveAt?: string;

  createdAt?: string;
  updatedAt?: string;

  fockisIdAccessPaid?: boolean;
  premium?: boolean;

  subscriptionType?: string;
  subscriptionExpiresAt?: string;
};

type UsersResponse = {
  items?: TravelUser[];
  users?: TravelUser[];
  data?: TravelUser[];

  total?: number;
  page?: number;
  limit?: number;
  skip?: number;
};

type UserStatus =
  | "all"
  | "active"
  | "inactive"
  | "online"
  | "offline"
  | "locked";

const getDisplayName = (user: TravelUser): string => {
  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.name ||
    user.username ||
    user.email ||
    "Unknown User"
  );
};

const getInitials = (user: TravelUser): string => {
  const name = getDisplayName(user);

  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const formatDate = (value?: string): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatRole = (role?: string): string => {
  if (!role) {
    return "User";
  }

  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const formatAccountType = (
  accountType?: string,
): string => {
  if (!accountType) {
    return "User";
  }

  return accountType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const getStatusLabel = (
  user: TravelUser,
): string => {
  if (user.online) {
    return "Online";
  }

  if (user.isActive === false) {
    return "Inactive";
  }

  return "Active";
};

const getStatusClass = (
  user: TravelUser,
): string => {
  if (user.online) {
    return "online";
  }

  if (user.isActive === false) {
    return "inactive";
  }

  return "active";
};

const TravelUsersPage: React.FC = () => {
  const [users, setUsers] = useState<TravelUser[]>(
    [],
  );

  const [loading, setLoading] =
    useState<boolean>(true);

  const [refreshing, setRefreshing] =
    useState<boolean>(false);

  const [error, setError] = useState<string>("");

  const [search, setSearch] = useState<string>("");

  const [status, setStatus] =
    useState<UserStatus>("all");

  const [role, setRole] = useState<string>("all");

  const [accountType, setAccountType] =
    useState<string>("all");

  const [countryCode, setCountryCode] =
    useState<string>("all");

  const [page, setPage] = useState<number>(1);

  const limit = 20;

  const [total, setTotal] = useState<number>(0);

  const [selectedUser, setSelectedUser] =
    useState<TravelUser | null>(null);

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit),
  );

  const fetchUsers = useCallback(
    async (
      showRefreshState = false,
    ): Promise<void> => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params: Record<
          string,
          string | number | undefined
        > = {
          page,
          limit,
          search:
            search.trim() || undefined,
          status:
            status !== "all"
              ? status
              : undefined,
          role:
            role !== "all"
              ? role
              : undefined,
          accountType:
            accountType !== "all"
              ? accountType
              : undefined,
          countryCode:
            countryCode !== "all"
              ? countryCode
              : undefined,
          skip: (page - 1) * limit,
        };

        const response =
          (await travelPartnerAdminApi.getUsers(
            params,
          )) as UsersResponse;

        const nextUsers = Array.isArray(
          response.items,
        )
          ? response.items
          : Array.isArray(response.users)
            ? response.users
            : Array.isArray(response.data)
              ? response.data
              : [];

        setUsers(nextUsers);

        setTotal(
          typeof response.total === "number"
            ? response.total
            : nextUsers.length,
        );
      } catch (requestError) {
        console.error(
          "Failed to load Travel users:",
          requestError,
        );

        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load users.";

        setError(message);
        setUsers([]);
        setTotal(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      accountType,
      countryCode,
      page,
      role,
      search,
      status,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    status,
    role,
    accountType,
    countryCode,
  ]);

  const countries = useMemo(() => {
    const values = new Set<string>();

    users.forEach((user) => {
      if (user.countryCode) {
        values.add(
          user.countryCode.toUpperCase(),
        );
      }
    });

    return Array.from(values).sort();
  }, [users]);

  const handlePreviousPage = (): void => {
    setPage((current) =>
      Math.max(1, current - 1),
    );
  };

  const handleNextPage = (): void => {
    setPage((current) =>
      Math.min(totalPages, current + 1),
    );
  };

  const handleClearFilters = (): void => {
    setSearch("");
    setStatus("all");
    setRole("all");
    setAccountType("all");
    setCountryCode("all");
    setPage(1);
  };

  return (
    <div className="travel-users-page">
      <div className="travel-users-page__header">
        <div>
          <div className="travel-users-page__eyebrow">
            FOCKIS TRAVEL ADMIN
          </div>

          <h1>Travel Users</h1>

          <p>
            Manage and review users across the
            Fockis Travel platform.
          </p>
        </div>

        <button
          type="button"
          className="travel-users-page__refresh"
          onClick={() =>
            void fetchUsers(true)
          }
          disabled={loading || refreshing}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      <div className="travel-users-page__stats">
        <div className="travel-users-page__stat-card">
          <span className="travel-users-page__stat-label">
            Total Users
          </span>

          <strong>
            {total.toLocaleString()}
          </strong>
        </div>

        <div className="travel-users-page__stat-card">
          <span className="travel-users-page__stat-label">
            Showing
          </span>

          <strong>{users.length}</strong>
        </div>

        <div className="travel-users-page__stat-card">
          <span className="travel-users-page__stat-label">
            Online
          </span>

          <strong>
            {
              users.filter(
                (user) => user.online,
              ).length
            }
          </strong>
        </div>

        <div className="travel-users-page__stat-card">
          <span className="travel-users-page__stat-label">
            Verified
          </span>

          <strong>
            {
              users.filter(
                (user) => user.verified,
              ).length
            }
          </strong>
        </div>
      </div>

      <div className="travel-users-page__filters">
        <div className="travel-users-page__search">
          <span aria-hidden="true">
            ⌕
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search name, username, email, Fockis ID..."
            aria-label="Search users"
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as UserStatus,
            )
          }
          aria-label="Filter by status"
        >
          <option value="all">
            All statuses
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>

          <option value="online">
            Online
          </option>

          <option value="offline">
            Offline
          </option>

          <option value="locked">
            Locked
          </option>
        </select>

        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value)
          }
          aria-label="Filter by role"
        >
          <option value="all">
            All roles
          </option>

          <option value="user">
            User
          </option>

          <option value="moderator">
            Moderator
          </option>

          <option value="admin">
            Admin
          </option>

          <option value="super_admin">
            Super Admin
          </option>
        </select>

        <select
          value={accountType}
          onChange={(event) =>
            setAccountType(event.target.value)
          }
          aria-label="Filter by account type"
        >
          <option value="all">
            All account types
          </option>

          <option value="user">
            User
          </option>

          <option value="seller">
            Seller
          </option>

          <option value="business">
            Business
          </option>
        </select>

        <select
          value={countryCode}
          onChange={(event) =>
            setCountryCode(event.target.value)
          }
          aria-label="Filter by country"
        >
          <option value="all">
            All countries
          </option>

          {countries.map((country) => (
            <option
              key={country}
              value={country}
            >
              {country}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="travel-users-page__clear"
          onClick={handleClearFilters}
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="travel-users-page__error">
          <strong>
            Unable to load users
          </strong>

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              void fetchUsers(true)
            }
          >
            Try again
          </button>
        </div>
      )}

      <div className="travel-users-page__table-card">
        <div className="travel-users-page__table-header">
          <div>
            <h2>Users</h2>

            <span>
              {total.toLocaleString()} total user
              {total === 1 ? "" : "s"}
            </span>
          </div>

          <div className="travel-users-page__pagination">
            <button
              type="button"
              onClick={
                handlePreviousPage
              }
              disabled={
                loading || page <= 1
              }
              aria-label="Previous page"
            >
              ←
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={
                loading ||
                page >= totalPages ||
                users.length === 0
              }
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </div>

        <div className="travel-users-page__table-wrapper">
          <table className="travel-users-page__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Fockis ID</th>
                <th>Status</th>
                <th>Role</th>
                <th>Account</th>
                <th>Country</th>
                <th>Verified</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {loading &&
                Array.from({
                  length: 6,
                }).map((_, index) => (
                  <tr
                    key={`loading-${index}`}
                    className="travel-users-page__loading-row"
                  >
                    <td colSpan={9}>
                      <div className="travel-users-page__skeleton" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                users.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="travel-users-page__empty"
                    >
                      <div>
                        <span className="travel-users-page__empty-icon">
                          ◌
                        </span>

                        <strong>
                          No users found
                        </strong>

                        <p>
                          Try changing your
                          search or filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

              {!loading &&
                users.map((user) => (
                  <tr
                    key={
                      user.id ||
                      user._id ||
                      `${user.email}-${user.username}`
                    }
                  >
                    <td>
                      <div className="travel-users-page__user">
                        {user.profilePicture ? (
                          <img
                            src={
                              user.profilePicture
                            }
                            alt={getDisplayName(
                              user,
                            )}
                          />
                        ) : (
                          <div className="travel-users-page__avatar">
                            {getInitials(user)}
                          </div>
                        )}

                        <div>
                          <strong>
                            {getDisplayName(
                              user,
                            )}
                          </strong>

                          <span>
                            {user.username
                              ? `@${user.username}`
                              : user.email ||
                                "No email"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {user.fockisId ? (
                        <span className="travel-users-page__fockis-id">
                          {user.fockisId}
                        </span>
                      ) : (
                        <span className="travel-users-page__muted">
                          Not assigned
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`travel-users-page__status travel-users-page__status--${getStatusClass(
                          user,
                        )}`}
                      >
                        <i />
                        {getStatusLabel(
                          user,
                        )}
                      </span>
                    </td>

                    <td>
                      <span className="travel-users-page__role">
                        {formatRole(
                          user.role,
                        )}
                      </span>
                    </td>

                    <td>
                      {formatAccountType(
                        user.accountType,
                      )}
                    </td>

                    <td>
                      {user.countryCode
                        ? user.countryCode.toUpperCase()
                        : "—"}
                    </td>

                    <td>
                      {user.verified ? (
                        <span className="travel-users-page__verified">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="travel-users-page__muted">
                          Not verified
                        </span>
                      )}
                    </td>

                    <td>
                      {formatDate(
                        user.createdAt,
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="travel-users-page__view"
                        onClick={() =>
                          setSelectedUser(
                            user,
                          )
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div
          className="travel-users-page__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedUser(null);
            }
          }}
        >
          <div
            className="travel-users-page__modal"
            role="dialog"
            aria-modal="true"
            aria-label="User details"
          >
            <div className="travel-users-page__modal-header">
              <div>
                <span>User Details</span>

                <h2>
                  {getDisplayName(
                    selectedUser,
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUser(null)
                }
                aria-label="Close user details"
              >
                ×
              </button>
            </div>

            <div className="travel-users-page__modal-profile">
              {selectedUser.profilePicture ? (
                <img
                  src={
                    selectedUser.profilePicture
                  }
                  alt={getDisplayName(
                    selectedUser,
                  )}
                />
              ) : (
                <div className="travel-users-page__modal-avatar">
                  {getInitials(
                    selectedUser,
                  )}
                </div>
              )}

              <div>
                <strong>
                  {getDisplayName(
                    selectedUser,
                  )}
                </strong>

                {selectedUser.username && (
                  <span>
                    @{selectedUser.username}
                  </span>
                )}

                {selectedUser.fockisId && (
                  <b>
                    {selectedUser.fockisId}
                  </b>
                )}
              </div>
            </div>

            <div className="travel-users-page__details">
              <div>
                <span>Email</span>

                <strong>
                  {selectedUser.email ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Phone</span>

                <strong>
                  {selectedUser.phone ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Role</span>

                <strong>
                  {formatRole(
                    selectedUser.role,
                  )}
                </strong>
              </div>

              <div>
                <span>Account Type</span>

                <strong>
                  {formatAccountType(
                    selectedUser.accountType,
                  )}
                </strong>
              </div>

              <div>
                <span>Country</span>

                <strong>
                  {selectedUser.countryCode
                    ? selectedUser.countryCode.toUpperCase()
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Calling Code</span>

                <strong>
                  {selectedUser.callingCode ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Status</span>

                <strong>
                  {getStatusLabel(
                    selectedUser,
                  )}
                </strong>
              </div>

              <div>
                <span>Verified</span>

                <strong>
                  {selectedUser.verified
                    ? "Yes"
                    : "No"}
                </strong>
              </div>

              <div>
                <span>Fockis ID Access</span>

                <strong>
                  {selectedUser.fockisIdAccessPaid
                    ? "Paid"
                    : "Not paid"}
                </strong>
              </div>

              <div>
                <span>Premium</span>

                <strong>
                  {selectedUser.premium
                    ? "Yes"
                    : "No"}
                </strong>
              </div>

              <div>
                <span>Joined</span>

                <strong>
                  {formatDate(
                    selectedUser.createdAt,
                  )}
                </strong>
              </div>

              <div>
                <span>Last Active</span>

                <strong>
                  {formatDate(
                    selectedUser.lastActiveAt ||
                      selectedUser.lastSeen,
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelUsersPage;