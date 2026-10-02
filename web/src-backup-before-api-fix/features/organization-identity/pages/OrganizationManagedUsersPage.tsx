import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import OrganizationIdentitySidebar from "../components/OrganizationIdentitySidebar";
import ManagedUserTable from "../components/ManagedUserTable";
import CreateManagedUserModal from "../components/CreateManagedUserModal";
import EditManagedUserModal from "../components/EditManagedUserModal";

import {
  useOrganizationIdentities,
} from "../hooks/useOrganizationIdentities";

import {
  useOrganizationDomains,
} from "../hooks/useOrganizationDomains";

import organizationIdentityApi from "../services/organizationIdentityApi";

import type {
  OrganizationIdentity,
} from "../types/organizationIdentity.types";

import "../styles/ManagedUsers.scss";

interface Props {
  organizationId: string;
}

export default function OrganizationManagedUsersPage({
  organizationId,
}: Props) {
  const navigate = useNavigate();

  const {
    users,
    loading,
    error,
    createUser,
    updateUser,
    reload,
  } = useOrganizationIdentities(
    organizationId,
  );

  const {
    domains,
  } = useOrganizationDomains(
    organizationId,
  );

  const [createOpen, setCreateOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<OrganizationIdentity | null>(
      null,
    );

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const filteredUsers =
    users.filter((user) => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return [
        user.firstName,
        user.lastName,
        user.username,
        user.organizationEmail,
        user.role,
        user.department || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

  async function action(
    operation: () => Promise<unknown>,
    successMessage: string,
  ) {
    setMessage("");

    try {
      await operation();

      setMessage(successMessage);

      await reload();
    } catch (errorValue) {
      setMessage(
        errorValue instanceof Error
          ? errorValue.message
          : "The requested action failed.",
      );
    }
  }

  return (
    <div className="identity-layout">
      <OrganizationIdentitySidebar
        organizationId={organizationId}
      />

      <main className="identity-main">
        <header className="identity-header">
          <div>
            <span className="eyebrow">
              Organization users
            </span>

            <h1>
              Managed Users
            </h1>

            <p>
              Create identities, send
              activation emails, manage
              security, reset passwords,
              and suspend accounts.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              setCreateOpen(true)
            }
          >
            + Create User
          </button>
        </header>

        <div className="managed-users-toolbar">
          <div className="search-box">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search users..."
            />
          </div>

          <div className="toolbar-links">
            <button
              type="button"
              onClick={() =>
                void reload()
              }
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/organizations/${organizationId}/identity/domains`,
                )
              }
            >
              Manage domains
            </button>
          </div>
        </div>

        {message && (
          <div className="notice">
            {message}
          </div>
        )}

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <div className="managed-users-summary">
          <span>
            Showing{" "}
            <strong>
              {filteredUsers.length}
            </strong>{" "}
            of{" "}
            <strong>
              {users.length}
            </strong>{" "}
            users
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            Loading managed users...
          </div>
        ) : (
          <ManagedUserTable
            users={filteredUsers}
            onView={(user) =>
              navigate(
                `/organizations/${organizationId}/identity/users/${user.id}`,
              )
            }
            onEdit={setEditing}
            onSuspend={(user) =>
              void action(
                () =>
                  organizationIdentityApi.suspendUser(
                    organizationId,
                    user.id,
                  ),
                "User suspended.",
              )
            }
            onRestore={(user) =>
              void action(
                () =>
                  organizationIdentityApi.restoreUser(
                    organizationId,
                    user.id,
                  ),
                "User restored.",
              )
            }
            onResetPassword={(user) =>
              void action(
                () =>
                  organizationIdentityApi.resetPassword(
                    organizationId,
                    user.id,
                  ),
                "Password reset instructions sent.",
              )
            }
            onResendActivation={(user) =>
              void action(
                () =>
                  organizationIdentityApi.resendActivation(
                    organizationId,
                    user.id,
                  ),
                "Activation email resent.",
              )
            }
            onRemove={(user) => {
              const confirmed =
                window.confirm(
                  `Remove ${user.firstName} ${user.lastName} from this organization?`,
                );

              if (!confirmed) {
                return;
              }

              void action(
                () =>
                  organizationIdentityApi.removeUser(
                    organizationId,
                    user.id,
                  ),
                "User removed.",
              );
            }}
          />
        )}

        <CreateManagedUserModal
          open={createOpen}
          domains={domains}
          onClose={() =>
            setCreateOpen(false)
          }
          onSubmit={createUser}
        />

        <EditManagedUserModal
          user={editing}
          onClose={() =>
            setEditing(null)
          }
          onSubmit={async (payload) => {
            if (!editing) {
              return;
            }

            await updateUser(
              editing.id,
              payload,
            );
          }}
        />
      </main>
    </div>
  );
}