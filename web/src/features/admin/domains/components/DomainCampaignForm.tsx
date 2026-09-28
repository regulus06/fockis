import {
  useState,
} from "react";

import type {
  CreateDomainCampaignPayload,
} from "../types/domainAdmin.types";

interface Props {
  saving?: boolean;

  onSubmit: (
    payload: CreateDomainCampaignPayload,
  ) => Promise<unknown>;

  onCancel?: () => void;
}

export default function DomainCampaignForm({
  saving = false,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [freeDomainLimit, setFreeDomainLimit] =
    useState(1000);

  const [domainsPerUser, setDomainsPerUser] =
    useState(1);

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [eligibleUsers, setEligibleUsers] =
    useState(true);

  const [
    eligibleOrganizations,
    setEligibleOrganizations,
  ] = useState(false);

  const [eligibleNewUsers, setEligibleNewUsers] =
    useState(true);

  const [
    eligibleExistingUsers,
    setEligibleExistingUsers,
  ] = useState(true);

  const [error, setError] =
    useState("");

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError(
        "Campaign name is required.",
      );
      return;
    }

    if (freeDomainLimit < 1) {
      setError(
        "Free domain limit must be at least 1.",
      );
      return;
    }

    if (domainsPerUser < 1) {
      setError(
        "Domains per user must be at least 1.",
      );
      return;
    }

    if (!startDate || !endDate) {
      setError(
        "Start and end dates are required.",
      );
      return;
    }

    if (
      new Date(endDate) <
      new Date(startDate)
    ) {
      setError(
        "End date cannot be before the start date.",
      );
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),

        description:
          description.trim() ||
          undefined,

        freeDomainLimit,

        domainsPerUser,

        startDate,

        endDate,

        eligibleUsers,

        eligibleOrganizations,

        eligibleNewUsers,

        eligibleExistingUsers,
      });

      setName("");
      setDescription("");
      setFreeDomainLimit(1000);
      setDomainsPerUser(1);
      setStartDate("");
      setEndDate("");
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Unable to create campaign.",
      );
    }
  }

  return (
    <form
      className="domain-campaign-form"
      onSubmit={submit}
    >
      <div className="domain-form-grid">
        <label>
          <span>Campaign name</span>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="September Free Domain Promotion"
          />
        </label>

        <label>
          <span>Free domains available</span>

          <input
            type="number"
            min="1"
            value={freeDomainLimit}
            onChange={(event) =>
              setFreeDomainLimit(
                Number(event.target.value),
              )
            }
          />
        </label>

        <label>
          <span>Free domains per user</span>

          <input
            type="number"
            min="1"
            value={domainsPerUser}
            onChange={(event) =>
              setDomainsPerUser(
                Number(event.target.value),
              )
            }
          />
        </label>

        <label>
          <span>Start date</span>

          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          <span>End date</span>

          <input
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(
                event.target.value,
              )
            }
          />
        </label>
      </div>

      <label>
        <span>Description</span>

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value,
            )
          }
          placeholder="Get your free Fockis domain this month."
          rows={4}
        />
      </label>

      <div className="domain-checkbox-grid">
        <label className="domain-checkbox">
          <input
            type="checkbox"
            checked={eligibleUsers}
            onChange={(event) =>
              setEligibleUsers(
                event.target.checked,
              )
            }
          />
          <span>Individual users</span>
        </label>

        <label className="domain-checkbox">
          <input
            type="checkbox"
            checked={
              eligibleOrganizations
            }
            onChange={(event) =>
              setEligibleOrganizations(
                event.target.checked,
              )
            }
          />
          <span>Organizations</span>
        </label>

        <label className="domain-checkbox">
          <input
            type="checkbox"
            checked={eligibleNewUsers}
            onChange={(event) =>
              setEligibleNewUsers(
                event.target.checked,
              )
            }
          />
          <span>New users</span>
        </label>

        <label className="domain-checkbox">
          <input
            type="checkbox"
            checked={
              eligibleExistingUsers
            }
            onChange={(event) =>
              setEligibleExistingUsers(
                event.target.checked,
              )
            }
          />
          <span>Existing users</span>
        </label>
      </div>

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
            ? "Creating..."
            : "Create Campaign"}
        </button>
      </div>
    </form>
  );
}