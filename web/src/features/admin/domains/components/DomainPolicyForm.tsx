import {
  useEffect,
  useState,
} from "react";

import type {
  DomainPolicy,
  UpdateDomainPolicyPayload,
} from "../types/domainAdmin.types";

interface Props {
  policy: DomainPolicy | null;

  saving?: boolean;

  onSave: (
    payload: UpdateDomainPolicyPayload,
  ) => Promise<unknown>;
}

const defaultPolicy: UpdateDomainPolicyPayload =
  {
    domainsEnabled: true,

    personalDomainsEnabled: true,
    businessDomainsEnabled: true,

    personalFreeDomainLimit: 1,
    businessFreeDomainLimit: 1,

    additionalPersonalDomainRequiresPayment:
      true,

    additionalBusinessDomainRequiresPayment:
      true,

    personalAdditionalDomainPrice: 9.99,

    businessAdditionalDomainPrice: 19.99,

    currency: "USD",

    allowManualFreeGrants: true,
    allowManualAssignments: true,

    allowUserDomainChanges: true,

    domainChangePrice: 4.99,
  };

export default function DomainPolicyForm({
  policy,
  saving = false,
  onSave,
}: Props) {
  const [form, setForm] =
    useState<UpdateDomainPolicyPayload>(
      defaultPolicy,
    );

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (!policy) return;

    setForm({
      domainsEnabled:
        policy.domainsEnabled,

      personalDomainsEnabled:
        policy.personalDomainsEnabled,

      businessDomainsEnabled:
        policy.businessDomainsEnabled,

      personalFreeDomainLimit:
        policy.personalFreeDomainLimit,

      businessFreeDomainLimit:
        policy.businessFreeDomainLimit,

      additionalPersonalDomainRequiresPayment:
        policy.additionalPersonalDomainRequiresPayment,

      additionalBusinessDomainRequiresPayment:
        policy.additionalBusinessDomainRequiresPayment,

      personalAdditionalDomainPrice:
        policy.personalAdditionalDomainPrice,

      businessAdditionalDomainPrice:
        policy.businessAdditionalDomainPrice,

      currency:
        policy.currency || "USD",

      allowManualFreeGrants:
        policy.allowManualFreeGrants,

      allowManualAssignments:
        policy.allowManualAssignments,

      allowUserDomainChanges:
        policy.allowUserDomainChanges,

      domainChangePrice:
        policy.domainChangePrice,
    });
  }, [policy]);

  function setBoolean(
    field: keyof UpdateDomainPolicyPayload,
    value: boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function setNumber(
    field: keyof UpdateDomainPolicyPayload,
    value: string,
  ) {
    const numberValue =
      Number(value);

    setForm((current) => ({
      ...current,
      [field]: Number.isFinite(
        numberValue,
      )
        ? Math.max(0, numberValue)
        : 0,
    }));
  }

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setMessage("");

    try {
      await onSave(form);

      setMessage(
        "Domain policy saved successfully.",
      );
    } catch {
      // The parent hook handles the error.
    }
  }

  return (
    <form
      className="domain-policy-form"
      onSubmit={submit}
    >
      <div className="domain-form-section">
        <div className="domain-form-section__heading">
          <h3>Domain System</h3>
          <p>
            Control whether Fockis domains
            are available across the platform.
          </p>
        </div>

        <label className="domain-toggle">
          <input
            type="checkbox"
            checked={
              form.domainsEnabled
            }
            onChange={(event) =>
              setBoolean(
                "domainsEnabled",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Enable Fockis Domains
            </strong>

            <small>
              Users and businesses can
              register Fockis domains.
            </small>
          </span>
        </label>
      </div>

      <div className="domain-form-section">
        <div className="domain-form-section__heading">
          <h3>Personal Domains</h3>
          <p>
            Default rules for individual
            Fockis users.
          </p>
        </div>

        <label className="domain-toggle">
          <input
            type="checkbox"
            checked={
              form.personalDomainsEnabled
            }
            onChange={(event) =>
              setBoolean(
                "personalDomainsEnabled",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Enable Personal Domains
            </strong>
          </span>
        </label>

        <div className="domain-form-grid">
          <label>
            <span>
              Free domains per user
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={
                form.personalFreeDomainLimit
              }
              onChange={(event) =>
                setNumber(
                  "personalFreeDomainLimit",
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            <span>
              Additional domain price
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.personalAdditionalDomainPrice
              }
              onChange={(event) =>
                setNumber(
                  "personalAdditionalDomainPrice",
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <label className="domain-toggle">
          <input
            type="checkbox"
            checked={
              form.additionalPersonalDomainRequiresPayment
            }
            onChange={(event) =>
              setBoolean(
                "additionalPersonalDomainRequiresPayment",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Require payment for additional
              personal domains
            </strong>

            <small>
              The free-domain limit above
              remains free.
            </small>
          </span>
        </label>
      </div>

      <div className="domain-form-section">
        <div className="domain-form-section__heading">
          <h3>Business Domains</h3>
          <p>
            Default rules for organizations
            and businesses.
          </p>
        </div>

        <label className="domain-toggle">
          <input
            type="checkbox"
            checked={
              form.businessDomainsEnabled
            }
            onChange={(event) =>
              setBoolean(
                "businessDomainsEnabled",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Enable Business Domains
            </strong>
          </span>
        </label>

        <div className="domain-form-grid">
          <label>
            <span>
              Free domains per organization
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={
                form.businessFreeDomainLimit
              }
              onChange={(event) =>
                setNumber(
                  "businessFreeDomainLimit",
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            <span>
              Additional business domain
              price
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.businessAdditionalDomainPrice
              }
              onChange={(event) =>
                setNumber(
                  "businessAdditionalDomainPrice",
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <label className="domain-toggle">
          <input
            type="checkbox"
            checked={
              form.additionalBusinessDomainRequiresPayment
            }
            onChange={(event) =>
              setBoolean(
                "additionalBusinessDomainRequiresPayment",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Require payment for additional
              business domains
            </strong>
          </span>
        </label>
      </div>

      <div className="domain-form-section">
        <div className="domain-form-section__heading">
          <h3>Super Admin Controls</h3>
          <p>
            Allow administrators to override
            normal domain rules.
          </p>
        </div>

        <label className="domain-toggle">
          <input
            type="checkbox"
            checked={
              form.allowManualFreeGrants
            }
            onChange={(event) =>
              setBoolean(
                "allowManualFreeGrants",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Allow manual free-domain grants
            </strong>

            <small>
              Super Admin can give users or
              organizations additional free
              domains.
            </small>
          </span>
        </label>

        <label className="domain-toggle">
          <input
            type="checkbox"
            checked={
              form.allowManualAssignments
            }
            onChange={(event) =>
              setBoolean(
                "allowManualAssignments",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Allow manual assignments
            </strong>
          </span>
        </label>

        <label className="domain-toggle">
          <input
            type="checkbox"
            checked={
              form.allowUserDomainChanges
            }
            onChange={(event) =>
              setBoolean(
                "allowUserDomainChanges",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Allow users to change domains
            </strong>
          </span>
        </label>

        <label className="domain-form-field">
          <span>
            Domain change price
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={
              form.domainChangePrice
            }
            onChange={(event) =>
              setNumber(
                "domainChangePrice",
                event.target.value,
              )
            }
          />
        </label>
      </div>

      {message && (
        <div
          className="domain-form-success"
          role="status"
        >
          {message}
        </div>
      )}

      <div className="domain-form-actions">
        <button
          type="submit"
          className="domain-primary-button"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Domain Settings"}
        </button>
      </div>
    </form>
  );
}