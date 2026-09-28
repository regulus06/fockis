import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import "../styles/CreateManagedUserModal.scss";

import type {
  CreateManagedUserPayload,
  ManagedUserRole,
  OrganizationDomain,
} from "../types/organizationIdentity.types";

interface Props {
  open: boolean;
  domains: OrganizationDomain[];
  onClose: () => void;
  onSubmit: (
    payload: CreateManagedUserPayload,
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

const initialForm: CreateManagedUserPayload = {
  firstName: "",
  lastName: "",
  username: "",
  role: "member",
  customRole: "",
  department: "",
  domain: "",
  domainId: "",
  recoveryEmail: "",
  sendActivationEmail: true,
  requirePasswordChange: true,
  requireTwoFactor: false,
};

/* ============================================================
   FOCKIS DOMAIN VALIDATION
   ============================================================ */

const FOCKIS_ORGANIZATION_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

const FOCKIS_MEMBER_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

function isFockisOrganizationDomain(
  value: string,
): boolean {
  return FOCKIS_ORGANIZATION_DOMAIN_PATTERN.test(
    normalizeDomain(value),
  );
}

function isFockisMemberDomain(
  value: string,
): boolean {
  return FOCKIS_MEMBER_DOMAIN_PATTERN.test(
    normalizeDomain(value),
  );
}

function memberDomainBelongsToOrganization(
  memberDomain: string,
  organizationDomain: string,
): boolean {
  const member = normalizeDomain(memberDomain);
  const organization = normalizeDomain(
    organizationDomain,
  );

  if (!isFockisMemberDomain(member)) {
    return false;
  }

  if (!isFockisOrganizationDomain(organization)) {
    return false;
  }

  return member.endsWith(`.${organization}`);
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function CreateManagedUserModal({
  open,
  domains,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] =
    useState<CreateManagedUserPayload>(
      initialForm,
    );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...initialForm,
    });

    setError("");
    setBusy(false);
  }, [open]);

  /* ==========================================================
     ORGANIZATION DOMAINS
     ========================================================== */

  const validOrganizationDomains = useMemo(() => {
    return domains
      .map((domain) => ({
        ...domain,
        domain: normalizeDomain(domain.domain),
      }))
      .filter((domain) =>
        isFockisOrganizationDomain(domain.domain),
      );
  }, [domains]);

  const verifiedOrganizationDomains =
    useMemo(() => {
      return validOrganizationDomains.filter(
        (domain) =>
          domain.status === "verified",
      );
    }, [validOrganizationDomains]);

  const organizationDomains =
    verifiedOrganizationDomains.length > 0
      ? verifiedOrganizationDomains
      : validOrganizationDomains;

  /* ==========================================================
     MATCH MEMBER DOMAIN TO ORGANIZATION
     ========================================================== */

  const matchingOrganizationDomain =
    useMemo(() => {
      const enteredDomain = normalizeDomain(
        form.domain,
      );

      if (!enteredDomain) {
        return null;
      }

      return (
        organizationDomains.find(
          (organizationDomain) =>
            memberDomainBelongsToOrganization(
              enteredDomain,
              organizationDomain.domain,
            ),
        ) || null
      );
    }, [
      form.domain,
      organizationDomains,
    ]);

  /* ==========================================================
     DOMAIN VALIDATION
     ========================================================== */

  const domainValidation = useMemo(() => {
    const domain = normalizeDomain(
      form.domain,
    );

    if (!domain) {
      return {
        valid: false,
        message:
          "A Fockis member domain is required.",
      };
    }

    if (!isFockisMemberDomain(domain)) {
      return {
        valid: false,
        message:
          "Enter a valid Fockis member domain.",
      };
    }

    if (organizationDomains.length === 0) {
      return {
        valid: false,
        message:
          "This organization does not have a valid Fockis organization domain.",
      };
    }

    if (!matchingOrganizationDomain) {
      return {
        valid: false,
        message:
          "This member domain does not belong to this organization.",
      };
    }

    return {
      valid: true,
      message:
        matchingOrganizationDomain.domain,
    };
  }, [
    form.domain,
    organizationDomains,
    matchingOrganizationDomain,
  ]);

  if (!open) {
    return null;
  }

  /* ==========================================================
     FORM UPDATE
     ========================================================== */

  const update = <
    K extends keyof CreateManagedUserPayload
  >(
    key: K,
    value: CreateManagedUserPayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (error) {
      setError("");
    }
  };

  /* ==========================================================
     SUBMIT
     ========================================================== */

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    const firstName =
      form.firstName.trim();

    const lastName =
      form.lastName.trim();

    const username =
      form.username
        .trim()
        .toLowerCase();

    const domain =
      normalizeDomain(form.domain);

    if (!firstName) {
      setError(
        "First name is required.",
      );
      return;
    }

    if (!lastName) {
      setError(
        "Last name is required.",
      );
      return;
    }

    if (!username) {
      setError(
        "Username is required.",
      );
      return;
    }

    if (
      !/^[a-z0-9._-]+$/i.test(
        username,
      )
    ) {
      setError(
        "Username may only contain letters, numbers, dots, underscores, and hyphens.",
      );
      return;
    }

    if (!domain) {
      setError(
        "Fockis member domain is required.",
      );
      return;
    }

    if (!isFockisMemberDomain(domain)) {
      setError(
        "Enter a valid Fockis member domain, for example username.yourdomain.fockis.com.",
      );
      return;
    }

    if (organizationDomains.length === 0) {
      setError(
        "This organization does not have a valid Fockis organization domain.",
      );
      return;
    }

    if (!matchingOrganizationDomain) {
      setError(
        "The member domain must belong to this organization.",
      );
      return;
    }

    /* ========================================================
       USERNAME / MEMBER DOMAIN MATCH
       ======================================================== */

    const memberPrefix =
      domain.split(".")[0];

    if (memberPrefix !== username) {
      setError(
        `The member domain must start with the username "${username}". Example: ${username}.yourdomain.fockis.com`,
      );
      return;
    }

    if (
      form.role === "custom" &&
      !form.customRole?.trim()
    ) {
      setError(
        "Enter a custom role.",
      );
      return;
    }

    setBusy(true);

    try {
      await onSubmit({
        ...form,
        firstName,
        lastName,
        username,
        domain,
        domainId:
          matchingOrganizationDomain?.id ||
          undefined,
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
          : "Unable to create the managed user.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div
      className="identity-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <form
        className="identity-modal"
        onSubmit={submit}
      >
        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="identity-modal__header">
          <div>
            <span className="eyebrow">
              Organization identity
            </span>

            <h2>
              Create managed user
            </h2>

            <p>
              Create a Fockis identity for
              a member of this organization.
              A Fockis member domain is
              required.
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            ×
          </button>
        </div>

        {/* =====================================================
            ERROR
            ===================================================== */}

        {error && (
          <div
            className="form-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* =====================================================
            FORM
            ===================================================== */}

        <div className="form-grid">
          {/* FIRST NAME */}

          <label>
            First name

            <input
              type="text"
              value={form.firstName}
              onChange={(event) =>
                update(
                  "firstName",
                  event.target.value,
                )
              }
              autoComplete="given-name"
              disabled={busy}
              required
            />
          </label>

          {/* LAST NAME */}

          <label>
            Last name

            <input
              type="text"
              value={form.lastName}
              onChange={(event) =>
                update(
                  "lastName",
                  event.target.value,
                )
              }
              autoComplete="family-name"
              disabled={busy}
              required
            />
          </label>

          {/* USERNAME */}

          <label>
            Username

            <input
              type="text"
              value={form.username}
              onChange={(event) =>
                update(
                  "username",
                  event.target.value
                    .replace(
                      /\s/g,
                      "",
                    )
                    .toLowerCase(),
                )
              }
              placeholder="john"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy}
              required
            />

            <small>
              Example:{" "}
              <strong>
                john
              </strong>
            </small>
          </label>

          {/* ROLE */}

          <label>
            Role

            <select
              value={form.role}
              onChange={(event) =>
                update(
                  "role",
                  event.target
                    .value as ManagedUserRole,
                )
              }
              disabled={busy}
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

          {/* CUSTOM ROLE */}

          {form.role === "custom" && (
            <label>
              Custom role

              <input
                type="text"
                value={
                  form.customRole || ""
                }
                onChange={(event) =>
                  update(
                    "customRole",
                    event.target.value,
                  )
                }
                placeholder="Coordinator"
                disabled={busy}
                required
              />
            </label>
          )}

          {/* DEPARTMENT */}

          <label>
            Department

            <input
              type="text"
              value={
                form.department || ""
              }
              onChange={(event) =>
                update(
                  "department",
                  event.target.value,
                )
              }
              placeholder="Student Services"
              disabled={busy}
            />
          </label>

          {/* =================================================
              MEMBER DOMAIN
              ================================================= */}

          <label className="form-grid__wide">
            <span>
              Fockis member domain

              <span
                aria-hidden="true"
                style={{
                  marginLeft: 4,
                  color: "#c62828",
                }}
              >
                *
              </span>
            </span>

            <input
              className="member-domain-input"
              type="text"
              value={form.domain}
              onChange={(event) =>
                update(
                  "domain",
                  event.target.value
                    .replace(
                      /\s/g,
                      "",
                    )
                    .toLowerCase(),
                )
              }
              placeholder="john.yourdomain.fockis.com"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy}
              required
              aria-invalid={
                form.domain.trim()
                  ? !domainValidation.valid
                  : undefined
              }
            />

            {form.domain.trim() && (
              <small
                className={
                  domainValidation.valid
                    ? "form-success"
                    : "form-error-text"
                }
              >
                {domainValidation.valid
                  ? `✓ Valid member domain for ${domainValidation.message}`
                  : `✕ ${domainValidation.message}`}
              </small>
            )}

            <small>
              Enter the complete member
              domain.
              <br />
              Example:{" "}
              <strong>
                john.yourdomain.fockis.com
              </strong>
            </small>
          </label>

          {/* =================================================
              ORGANIZATION DOMAIN
              ================================================= */}

          <label className="form-grid__wide">
            Organization Fockis domain

            {organizationDomains.length >
            0 ? (
              <div className="organization-domain-display">
                <span className="organization-domain-display__icon">
                  @
                </span>

                <div>
                  <strong>
                    {matchingOrganizationDomain?.domain ||
                      organizationDomains[0]
                        ?.domain}
                  </strong>

                  <small>
                    Organization namespace
                  </small>
                </div>
              </div>
            ) : (
              <div className="organization-domain-display organization-domain-display--empty">
                No Fockis organization
                domain configured
              </div>
            )}

            <small>
              The member domain must belong
              to this organization's Fockis
              namespace.
            </small>
          </label>

          {/* RECOVERY EMAIL */}

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
              placeholder="john@gmail.com"
              autoComplete="email"
              disabled={busy}
            />

            <small>
              Used for activation, password
              recovery, and security
              notifications.
            </small>
          </label>
        </div>

        {/* =====================================================
            SECURITY OPTIONS
            ===================================================== */}

        <div className="checkbox-list">
          <label>
            <input
              type="checkbox"
              checked={
                form.sendActivationEmail
              }
              onChange={(event) =>
                update(
                  "sendActivationEmail",
                  event.target.checked,
                )
              }
              disabled={busy}
            />

            <span>
              Send activation email
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={
                form.requirePasswordChange
              }
              onChange={(event) =>
                update(
                  "requirePasswordChange",
                  event.target.checked,
                )
              }
              disabled={busy}
            />

            <span>
              Require password change
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={
                form.requireTwoFactor
              }
              onChange={(event) =>
                update(
                  "requireTwoFactor",
                  event.target.checked,
                )
              }
              disabled={busy}
            />

            <span>
              Require two-factor
              authentication
            </span>
          </label>
        </div>

        {/* =====================================================
            FOOTER
            ===================================================== */}

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
            disabled={
              busy ||
              !domainValidation.valid
            }
          >
            {busy
              ? "Creating..."
              : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}