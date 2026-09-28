import type {
  OrganizationIdentity,
} from "../types/organizationIdentity.types";

import IdentityStatusBadge from "./IdentityStatusBadge";
import OrganizationEmailBadge from "./OrganizationEmailBadge";

interface Props {
  users: OrganizationIdentity[];

  onView?: (
    user: OrganizationIdentity,
  ) => void;

  onEdit?: (
    user: OrganizationIdentity,
  ) => void;

  onSuspend?: (
    user: OrganizationIdentity,
  ) => void;

  onRestore?: (
    user: OrganizationIdentity,
  ) => void;

  onResetPassword?: (
    user: OrganizationIdentity,
  ) => void;

  onResendActivation?: (
    user: OrganizationIdentity,
  ) => void;

  onRemove?: (
    user: OrganizationIdentity,
  ) => void;
}

export default function ManagedUserTable({
  users,
  onView,
  onEdit,
  onSuspend,
  onRestore,
  onResetPassword,
  onResendActivation,
  onRemove,
}: Props) {
  return (
    <div className="managed-user-table-wrap">
      <table className="managed-user-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Organization email</th>
            <th>Status</th>
            <th>Security</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => {
            const isOwner =
              user.role === "owner";

            const suspended =
              user.status === "suspended";

            const invited =
              user.status === "invited";

            return (
              <tr key={user.id}>
                <td>
                  <div className="table-user">
                    <div className="table-user__avatar">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </div>

                    <div>
                      <strong>
                        {user.firstName}{" "}
                        {user.lastName}
                      </strong>

                      <small>
                        @{user.username}
                      </small>
                    </div>
                  </div>
                </td>

                <td>
                  <span className="role-label">
                    {user.customRole ||
                      user.role}
                  </span>
                </td>

                <td>
                  <OrganizationEmailBadge
                    email={
                      user.organizationEmail
                    }
                  />
                </td>

                <td>
                  <IdentityStatusBadge
                    status={user.status}
                  />
                </td>

                <td>
                  <div className="security-summary">
                    <span
                      className={
                        user.emailVerified
                          ? "security-ok"
                          : "security-warn"
                      }
                    >
                      {user.emailVerified
                        ? "Email verified"
                        : "Email pending"}
                    </span>

                    <span>
                      {user.twoFactorEnabled
                        ? "2FA enabled"
                        : "2FA disabled"}
                    </span>

                    {user.requirePasswordChange && (
                      <span className="security-warn">
                        Password change required
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  <div className="table-actions">
                    {onView && (
                      <button
                        type="button"
                        onClick={() =>
                          onView(user)
                        }
                      >
                        View
                      </button>
                    )}

                    {!isOwner &&
                      onEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            onEdit(user)
                          }
                        >
                          Edit
                        </button>
                      )}

                    {!isOwner &&
                      suspended &&
                      onRestore && (
                        <button
                          type="button"
                          onClick={() =>
                            onRestore(user)
                          }
                        >
                          Restore
                        </button>
                      )}

                    {!isOwner &&
                      !suspended &&
                      onSuspend && (
                        <button
                          type="button"
                          onClick={() =>
                            onSuspend(user)
                          }
                        >
                          Suspend
                        </button>
                      )}

                    {!isOwner &&
                      invited &&
                      onResendActivation && (
                        <button
                          type="button"
                          onClick={() =>
                            onResendActivation(
                              user,
                            )
                          }
                        >
                          Resend
                        </button>
                      )}

                    {!isOwner &&
                      onResetPassword && (
                        <button
                          type="button"
                          onClick={() =>
                            onResetPassword(
                              user,
                            )
                          }
                        >
                          Reset
                        </button>
                      )}

                    {!isOwner &&
                      onRemove && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            onRemove(user)
                          }
                        >
                          Remove
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="empty-state">
          <strong>
            No managed users yet
          </strong>

          <p>
            Create your first organization
            identity to get started.
          </p>
        </div>
      )}
    </div>
  );
}