import {
  useState,
} from "react";

import type {
  CreateDomainAuthorizationPayload,
} from "../types/domainAdmin.types";

interface Props {
  saving?: boolean;

  onSubmit: (
    payload: CreateDomainAuthorizationPayload,
  ) => Promise<unknown>;

  onCancel?: () => void;
}

export default function DomainAuthorizationForm({
  saving = false,
  onSubmit,
  onCancel,
}: Props) {
  const [authorizationType, setAuthorizationType] =
    useState<"user" | "organization">(
      "user",
    );

  const [ownerId, setOwnerId] =
    useState("");

  const [freeDomainLimit, setFreeDomainLimit] =
    useState(1);

  const [unlimited, setUnlimited] =
    useState(false);

  const [reason, setReason] =
    useState("");

  const [expiresAt, setExpiresAt] =
    useState("");

  const [error, setError] =
    useState("");

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError("");

    if (!ownerId.trim()) {
      setError(
        authorizationType === "user"
          ? "User ID is required."
          : "Organization ID is required.",
      );
      return;
    }

    if (
      !unlimited &&
      freeDomainLimit < 1
    ) {
      setError(
        "Free domain limit must be at least 1.",
      );
      return;
    }

    try {
      await onSubmit({
        authorizationType,

        ownerId: ownerId.trim(),

        freeDomainLimit:

          unlimited
            ? 0
            : freeDomainLimit,

        unlimited,

        reason:
          reason.trim() ||
          undefined,

        expiresAt:
          expiresAt ||
          null,
      });

      setOwnerId("");
      setFreeDomainLimit(1);
      setUnlimited(false);
      setReason("");
      setExpiresAt("");
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Unable to grant authorization.",
      );
    }
  }

  return (
    <form
      className="domain-authorization-form"
      onSubmit={submit}
    >
      <div className="domain-form-grid">
        <label>
          <span>
            Authorization type
          </span>

          <select
            value={authorizationType}
            onChange={(event) =>
              setAuthorizationType(
                event.target.value as
                  | "user"
                  | "organization",
              )
            }
          >
            <option value="user">
              Individual User
            </option>

            <option value="organization">
              Organization / Business
            </option>
          </select>
        </label>

        <label>
          <span>
            {authorizationType ===
            "user"
              ? "User ID"
              : "Organization ID"}
          </span>

          <input
            value={ownerId}
            onChange={(event) =>
              setOwnerId(
                event.target.value,
              )
            }
            placeholder={
              authorizationType ===
              "user"
                ? "User ID"
                : "Organization ID"
            }
          />
        </label>

        <label>
          <span>
            Free domains allowed
          </span>

          <input
            type="number"
            min="1"
            disabled={unlimited}
            value={freeDomainLimit}
            onChange={(event) =>
              setFreeDomainLimit(
                Number(event.target.value),
              )
            }
          />
        </label>

        <label>
          <span>
            Expires
          </span>

          <input
            type="date"
            value={expiresAt}
            onChange={(event) =>
              setExpiresAt(
                event.target.value,
              )
            }
          />
        </label>
      </div>

      <label className="domain-toggle">
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(event) =>
            setUnlimited(
              event.target.checked,
            )
          }
        />

        <span>
          <strong>
            Unlimited free domains
          </strong>

          <small>
            Give this user or organization
            unlimited free-domain access.
          </small>
        </span>
      </label>

      <label>
        <span>Reason</span>

        <textarea
          value={reason}
          onChange={(event) =>
            setReason(
              event.target.value,
            )
          }
          placeholder="Partner, promotion, staff, special authorization..."
          rows={3}
        />
      </label>

      {error && (
        <div
          className="domain-form-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="domain-form-actions">
        {onCancel && (
          <button
            type="button"
            className="domain-secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          className="domain-primary-button"
          disabled={saving}
        >
          {saving
            ? "Granting..."
            : "Grant Free Authorization"}
        </button>
      </div>
    </form>
  );
}