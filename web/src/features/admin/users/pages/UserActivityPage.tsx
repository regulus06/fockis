import React, {
useCallback,
useEffect,
useMemo,
useState,
} from "react";
import {
Link,
useParams,
} from "react-router-dom";

import adminUsersApi from "../adminUsersApi";
import UserStatusBadge from "../components/UserStatusBadge";

import type {
AdminUserActivity,
} from "../types/adminUsers.types";

const UserActivityPage: React.FC = () => {
const { id } =
useParams<{ id: string }>();

const [
activity,
setActivity,
] = useState<AdminUserActivity[]>(
[],
);

const [loading, setLoading] =
useState(true);

const [error, setError] =
useState("");

const loadActivity =
useCallback(
async (): Promise<void> => {
if (!id) {
setError(
"No user ID was provided.",
);
setLoading(false);
return;
}

    setLoading(true);
    setError("");

    try {
      const result =
        await adminUsersApi.getUserActivity(
          id,
        );

      setActivity(result);
    } catch (
      err: unknown
    ) {
      console.error(
        "Failed to load user activity:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load user activity.",
      );

      setActivity([]);
    } finally {
      setLoading(false);
    }
  },
  [id],
);

useEffect(() => {
void loadActivity();
}, [loadActivity]);

const loginActivity =
useMemo(
() =>
activity.filter(
(item) =>
item.type === "login" ||
item.type === "logout",
),
[activity],
);

const securityActivity =
useMemo(
() =>
activity.filter(
(item) =>
item.type ===
"password_change" ||
item.type ===
"password_reset" ||
item.type ===
"account_suspended" ||
item.type ===
"account_reactivated" ||
item.type ===
"account_locked" ||
item.type ===
"account_unlocked",
),
[activity],
);

const adminActivity =
useMemo(
() =>
activity.filter(
(item) =>
item.type ===
"admin_action",
),
[activity],
);

const formatDate = (
value?:
| string
| Date
| null,
): string => {
if (!value) {
return "—";
}

const date =
  new Date(value);

if (
  Number.isNaN(
    date.getTime(),
  )
) {
  return "—";
}

return date.toLocaleString();
};

const formatType = (
type?: string,
): string => {
if (!type) {
return "Activity";
}

return type
  .replace(
    /_/g,
    " ",
  )
  .replace(
    /\b\w/g,
    (character) =>
      character.toUpperCase(),
  );

};

const getActivityTitle = (
item: AdminUserActivity,
): string => {
if (
item.type === "login"
) {
return "Login";
}

if (
  item.type === "logout"
) {
  return "Logout";
}

if (
  item.type ===
  "profile_update"
) {
  return "Profile Updated";
}

if (
  item.type ===
  "password_change"
) {
  return "Password Changed";
}

if (
  item.type ===
  "password_reset"
) {
  return "Password Reset";
}

if (
  item.type ===
  "fockis_id_payment"
) {
  return "Fockis ID Payment";
}

if (
  item.type ===
  "fockis_id_reveal"
) {
  return "Fockis ID Revealed";
}

if (
  item.type ===
  "account_created"
) {
  return "Account Created";
}

if (
  item.type ===
  "account_suspended"
) {
  return "Account Suspended";
}

if (
  item.type ===
  "account_reactivated"
) {
  return "Account Reactivated";
}

if (
  item.type ===
  "account_locked"
) {
  return "Account Locked";
}

if (
  item.type ===
  "account_unlocked"
) {
  return "Account Unlocked";
}

if (
  item.type ===
  "admin_action"
) {
  return "Administrative Action";
}

return "Activity";

};

const getActivityDescription = (
item: AdminUserActivity,
): string => {
if (item.description) {
return item.description;
}

if (
  item.metadata?.description
) {
  return String(
    item.metadata.description,
  );
}

return "No additional details available.";

};

const getActivityStatus = (
item: AdminUserActivity,
): string => {
if (
item.type ===
"account_suspended"
) {
return "suspended";
}

if (
  item.type ===
  "account_locked"
) {
  return "locked";
}

if (
  item.type ===
    "account_reactivated" ||
  item.type ===
    "account_unlocked"
) {
  return "active";
}

if (
  item.type === "login"
) {
  return "online";
}

if (
  item.type === "logout"
) {
  return "inactive";
}

if (
  item.type ===
  "admin_action"
) {
  return "pending";
}

return "completed";

};

return ( <div className="admin-user-subpage"> <div className="admin-user-subpage__toolbar"> <div>
<Link
to={
id
? "/admin/users/" +
id
: "/admin/users"
}
className="admin-user-subpage__back"
>
← User Overview </Link>

      <span className="admin-user-subpage__eyebrow">
        USER MANAGEMENT
      </span>

      <h1>
        Activity & Security
      </h1>

      <p>
        Review account activity,
        login history, security
        events, and administrative
        actions.
      </p>
    </div>

    <button
      type="button"
      className="admin-user-subpage__refresh"
      onClick={() =>
        void loadActivity()
      }
      disabled={loading}
    >
      {loading
        ? "Loading..."
        : "↻ Refresh"}
    </button>
  </div>

  <section className="admin-user-subpage__summary">
    <div>
      <span>
        Total Events
      </span>

      <strong>
        {activity.length.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>
        Login Events
      </span>

      <strong>
        {loginActivity.length.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>
        Security Events
      </span>

      <strong>
        {securityActivity.length.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>
        Admin Actions
      </span>

      <strong>
        {adminActivity.length.toLocaleString()}
      </strong>
    </div>
  </section>

  <section className="admin-user-subpage__panel">
    {error && (
      <div
        className="admin-user-subpage__error"
        role="alert"
      >
        <strong>
          Unable to load activity
        </strong>

        <span>
          {error}
        </span>

        <button
          type="button"
          onClick={() =>
            void loadActivity()
          }
        >
          Try Again
        </button>
      </div>
    )}

    <div className="admin-user-table-wrapper">
      <table className="admin-user-table">
        <thead>
          <tr>
            <th>
              Event
            </th>

            <th>
              Type
            </th>

            <th>
              Description
            </th>

            <th>
              Status
            </th>

            <th>
              Date
            </th>
          </tr>
        </thead>

        <tbody>
          {loading &&
            Array.from({
              length: 8,
            }).map(
              (_, index) => (
                <tr
                  key={
                    "activity-loading-" +
                    index
                  }
                >
                  <td colSpan={5}>
                    <div className="admin-user-table__skeleton" />
                  </td>
                </tr>
              ),
            )}

          {!loading &&
            activity.length ===
              0 && (
              <tr>
                <td
                  colSpan={5}
                  className="admin-user-table__empty"
                >
                  <strong>
                    No activity found
                  </strong>

                  <span>
                    No activity or
                    security events
                    are available
                    for this user.
                  </span>
                </td>
              </tr>
            )}

          {!loading &&
            activity.map(
              (
                item,
                index,
              ) => {
                const activityId =
                  item.id ??
                  "activity-" +
                    index;

                const status =
                  getActivityStatus(
                    item,
                  );

                return (
                  <tr
                    key={
                      activityId
                    }
                  >
                    <td>
                      <div className="admin-user-table__primary">
                        <strong>
                          {getActivityTitle(
                            item,
                          )}
                        </strong>

                        <small>
                          ID:{" "}
                          {
                            activityId
                          }
                        </small>
                      </div>
                    </td>

                    <td>
                      <span className="admin-user-table__type">
                        {formatType(
                          item.type,
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="admin-user-table__primary">
                        <strong>
                          {getActivityDescription(
                            item,
                          )}
                        </strong>

                        {item.metadata && (
                          <small>
                            Additional
                            activity
                            metadata
                            available
                          </small>
                        )}
                      </div>
                    </td>

                    <td>
                      <UserStatusBadge
                        status={
                          status
                        }
                        size="sm"
                      />
                    </td>

                    <td>
                      {formatDate(
                        item.createdAt,
                      )}
                    </td>
                  </tr>
                );
              },
            )}
        </tbody>
      </table>
    </div>
  </section>
</div>

);
};

export default UserActivityPage;
