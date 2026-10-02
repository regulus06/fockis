import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  ManagedUserRole,
  OrganizationIdentity,
  UpdateManagedUserPayload,
} from "../types/organizationIdentity.types";

interface Props {
  user: OrganizationIdentity | null;

  onClose: () => void;

  onSubmit: (
    payload: UpdateManagedUserPayload,
  ) => Promise<void>;
}

const roles: ManagedUserRole[] = [
  "member",
  "student",
  "teacher",
  "staff",
  "manager",
  "admin",
  "custom",
];

export default function EditManagedUserModal({
  user,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] =
    useState<UpdateManagedUserPayload>(
      {},
    );

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      customRole:
        user.customRole || "",
      department:
        user.department || "",
      recoveryEmail:
        user.recoveryEmail || "",
      requirePasswordChange:
        user.requirePasswordChange,
      requireTwoFactor:
        user.twoFactorEnabled,
    });

    setError("");
  }, [user]);

  if (!user) {
    return null;
  }

  const update = <
    K extends keyof UpdateManagedUserPayload
  >(
    key: K,
    value: UpdateManagedUserPayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      await onSubmit({
        ...form,
        firstName:
          form.firstName?.trim(),
        lastName:
          form.lastName?.trim(),
        username:
          form.username
            ?.trim()
            .toLowerCase(),
        customRole:
          form.role === "custom"
            ? form.customRole?.trim()
            : undefined,
        department:
          form.department?.trim() ||
          undefined,
        recoveryEmail:
          form.recoveryEmail?.trim() ||
          undefined,
      });

      onClose();
    } catch (errorValue) {
      setError(
        errorValue instanceof Error
          ? errorValue.message
          : "Unable to update the user.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="identity-modal-backdrop">
      <form
        className="identity-modal"
        onSubmit={submit}
      >
        <div className="identity-modal__header">
          <div>
            <span className="eyebrow">
              Organization identity
            </span>

            <h2>
              Edit {user.firstName}{" "}
              {user.lastName}
            </h2>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <div className="form-grid">
          <label>
            First name
            <input
              value={
                form.firstName || ""
              }
              onChange={(event) =>
                update(
                  "firstName",
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            Last name
            <input
              value={
                form.lastName || ""
              }
              onChange={(event) =>
                update(
                  "lastName",
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            Username
            <input
              value={
                form.username || ""
              }
              onChange={(event) =>
                update(
                  "username",
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            Role
            <select
              value={
                form.role || "member"
              }
              onChange={(event) =>
                update(
                  "role",
                  event.target
                    .value as ManagedUserRole,
                )
              }
            >
              {roles.map((role) => (
                <option
                  key={role}
                  value={role}
                >
                  {role}
                </option>
              ))}
            </select>
          </label>

          {form.role === "custom" && (
            <label>
              Custom role
              <input
                value={
                  form.customRole || ""
                }
                onChange={(event) =>
                  update(
                    "customRole",
                    event.target.value,
                  )
                }
              />
            </label>
          )}

          <label>
            Department
            <input
              value={
                form.department || ""
              }
              onChange={(event) =>
                update(
                  "department",
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-grid__wide">
            Recovery email
            <input
              type="email"
              value={
                form.recoveryEmail || ""
              }
              onChange={(event) =>
                update(
                  "recoveryEmail",
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <div className="checkbox-list">
          <label>
            <input
              type="checkbox"
              checked={Boolean(
                form.requirePasswordChange,
              )}
              onChange={(event) =>
                update(
                  "requirePasswordChange",
                  event.target.checked,
                )
              }
            />

            Require password change
          </label>

          <label>
            <input
              type="checkbox"
              checked={Boolean(
                form.requireTwoFactor,
              )}
              onChange={(event) =>
                update(
                  "requireTwoFactor",
                  event.target.checked,
                )
              }
            />

            Require two-factor authentication
          </label>
        </div>

        <div className="identity-modal__footer">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary"
            disabled={busy}
          >
            {busy
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}