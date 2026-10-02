/**
 * ChurchMemberManagement.tsx
 * -----------------------------------------------------------------------------
 * Fockis Church — Administration — Member Management
 *
 * Features:
 * - View/search/filter church members
 * - Prominent pending membership request section
 * - Approve pending membership requests
 * - Reject pending membership requests
 * - Change membership status
 * - Change member role
 * - Remove members
 * - Create member accounts
 * - Required Fockis member domain
 * - Display/copy permanent Member ID
 * - Display member Fockis domain
 *
 * Member domain examples:
 *   john.springfieldchurch.fockis.com
 *   mary.springfieldchurch.fockis.org
 *   david.springfieldchurch.fockis.net
 *   admin.springfieldchurch.fockis.church
 *
 * Organization domain:
 *   springfieldchurch.fockis.com
 *
 * IMPORTANT:
 * - Backend remains responsible for authorization.
 * - Backend remains responsible for permanent Member ID generation.
 * - Backend remains responsible for final domain validation.
 * - Backend must verify that the member domain belongs to this organization.
 * - Pending approval uses the dedicated /accept endpoint.
 * - Pending rejection uses the dedicated /reject endpoint.
 * - We intentionally do NOT use MembershipStatus.Rejected because that
 *   enum value does not exist in the current membership model.
 * -----------------------------------------------------------------------------
 */

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams } from "react-router-dom";

import {
  approveMembershipRequest,
  listMembers,
  rejectMembershipRequest,
  removeMember,
  updateMemberRole,
  updateMembershipStatus,
} from "../api/membersApi";

import {
  MEMBER_ROLE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  MemberRole,
  MembershipStatus,
  type Member,
} from "../types/church.types";

import "../styles/ChurchAdmin.scss";

// ============================================================================
// FOCKIS DOMAIN VALIDATION
// ============================================================================

/**
 * Organization domains:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 *   springfieldchurch.fockis.net
 *   springfieldchurch.fockis.edu
 *   springfieldchurch.fockis.church
 *   springfieldchurch.fockis.co
 *   springfieldchurch.fockis.io
 */
const FOCKIS_ORGANIZATION_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/**
 * Member domains:
 *
 *   john.springfieldchurch.fockis.com
 *   mary.springfieldchurch.fockis.org
 *   david.springfieldchurch.fockis.net
 *   admin.springfieldchurch.fockis.church
 */
const FOCKIS_MEMBER_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

// ============================================================================
// DOMAIN NORMALIZATION
// ============================================================================

function normalizeDomain(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

// ============================================================================
// MEMBER DOMAIN VALIDATION
// ============================================================================

function validateMemberDomain(
  value: string,
): string | null {
  const normalized =
    normalizeDomain(value);

  if (!normalized) {
    return "Member Fockis domain is required.";
  }

  if (
    normalized.length > 253
  ) {
    return "The member domain is too long.";
  }

  if (
    !FOCKIS_MEMBER_DOMAIN_PATTERN.test(
      normalized,
    )
  ) {
    return (
      "Enter a valid Fockis member domain, for example " +
      "john.springfieldchurch.fockis.com."
    );
  }

  /**
   * Explicitly reject an organization domain.
   *
   * A member must have:
   *
   *   member.organization.fockis.tld
   *
   * not:
   *
   *   organization.fockis.tld
   */
  if (
    FOCKIS_ORGANIZATION_DOMAIN_PATTERN.test(
      normalized,
    )
  ) {
    return (
      "A member domain must include a member name before the organization domain."
    );
  }

  return null;
}

// ============================================================================
// MEMBER DOMAIN PARTS
// ============================================================================

function getMemberDomainLabel(
  domain: string,
): string {
  const normalized =
    normalizeDomain(domain);

  const parts =
    normalized.split(".");

  if (parts.length < 5) {
    return "";
  }

  return parts[0] || "";
}

// ============================================================================
// CREATE MEMBER FORM
// ============================================================================

interface CreateMemberForm {
  firstName: string;
  lastName: string;
  email: string;
  domain: string;
  role: MemberRole;
  status: MembershipStatus;
}

// ============================================================================
// MEMBER ID SUPPORT
// ============================================================================

type MemberWithIdentity = Member & {
  memberId?: string;
  membershipId?: string;
  _id?: string;
  domain?: string;
};

// ============================================================================
// DEFAULT FORM
// ============================================================================

const DEFAULT_FORM: CreateMemberForm = {
  firstName: "",
  lastName: "",
  email: "",
  domain: "",
  role: MemberRole.Member,
  status: MembershipStatus.Active,
};

// ============================================================================
// MEMBER ID
// ============================================================================

function getMemberId(
  member: MemberWithIdentity,
): string {
  return (
    member.memberId ||
    member.membershipId ||
    member.id ||
    member._id ||
    "Not assigned"
  );
}

// ============================================================================
// MEMBER DOMAIN
// ============================================================================

function getMemberDomain(
  member: Member,
): string {
  const value =
    (member as MemberWithIdentity)
      .domain;

  return (
    typeof value === "string" &&
    value.trim()
      ? value.trim()
      : "Not assigned"
  );
}

// ============================================================================
// COPY MEMBER ID
// ============================================================================

async function copyMemberId(
  memberId: string,
): Promise<void> {
  if (
    !memberId ||
    memberId === "Not assigned"
  ) {
    return;
  }

  try {
    if (
      navigator.clipboard
        ?.writeText
    ) {
      await navigator.clipboard.writeText(
        memberId,
      );

      return;
    }
  } catch {
    // Continue to fallback.
  }

  const textarea =
    document.createElement(
      "textarea",
    );

  textarea.value = memberId;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(
    textarea,
  );

  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
  } catch {
    // Ignore clipboard failures.
  }

  document.body.removeChild(
    textarea,
  );
}

// ============================================================================
// CREATE MEMBER ACCOUNT
// ============================================================================
//
// Backend contract:
//
// POST
// /church/organizations/:organizationId/members
//
// Expected payload:
//
// {
//   email,
//   domain,
//   role,
//   profile: {
//     displayName
//   }
// }
//
// Backend remains responsible for:
// - creating/locating the Fockis user
// - creating the church membership
// - generating the permanent Member ID
// - validating that the member domain belongs to this organization
// - enforcing duplicate-email rules
// - enforcing duplicate-domain rules
// - enforcing administrator authorization
//
// ============================================================================

async function createMemberAccount(
  organizationId: string,
  form: CreateMemberForm,
): Promise<Member> {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem(
      "access_token",
    );

  const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000";

  const firstName =
    form.firstName.trim();

  const lastName =
    form.lastName.trim();

  const displayName =
    `${firstName} ${lastName}`
      .replace(/\s+/g, " ")
      .trim();

  const normalizedDomain =
    normalizeDomain(
      form.domain,
    );

  const domainError =
    validateMemberDomain(
      normalizedDomain,
    );

  if (domainError) {
    throw new Error(
      domainError,
    );
  }

  if (!displayName) {
    throw new Error(
      "Member display name is required.",
    );
  }

  const response =
    await fetch(
      `${API_BASE}/church/organizations/${encodeURIComponent(
        organizationId,
      )}/members`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },

        body: JSON.stringify({
          email:
            form.email.trim(),

          domain:
            normalizedDomain,

          role:
            form.role,

          profile: {
            displayName,
          },
        }),
      },
    );

  const text =
    await response.text();

  let data: any = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    let message =
      data?.message ||
      data?.error;

    if (
      Array.isArray(message)
    ) {
      message =
        message.join(", ");
    }

    throw new Error(
      message ||
        `Unable to create member account (${response.status}).`,
    );
  }

  const created =
    data?.member ||
    data?.membership ||
    data?.data ||
    data;

  if (
    created &&
    data?.memberId &&
    !created.memberId
  ) {
    created.memberId =
      data.memberId;
  }

  if (
    created &&
    data?.membershipId &&
    !created.membershipId
  ) {
    created.membershipId =
      data.membershipId;
  }

  if (
    created &&
    data?.domain &&
    !created.domain
  ) {
    created.domain =
      data.domain;
  }

  return created as Member;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ChurchMemberManagement(): React.JSX.Element {
  const {
    organizationId = "",
  } = useParams<{
    organizationId: string;
  }>();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [
    members,
    setMembers,
  ] = useState<Member[]>([]);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    MembershipStatus | ""
  >("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    busyMemberId,
    setBusyMemberId,
  ] = useState<string | null>(
    null,
  );

  // ==========================================================================
  // CREATE FORM
  // ==========================================================================

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    createForm,
    setCreateForm,
  ] =
    useState<CreateMemberForm>(
      DEFAULT_FORM,
    );

  const [
    isCreating,
    setIsCreating,
  ] = useState(false);

  const [
    createError,
    setCreateError,
  ] = useState<string | null>(
    null,
  );

  const [
    createSuccess,
    setCreateSuccess,
  ] = useState<string | null>(
    null,
  );

  const [
    copiedMemberId,
    setCopiedMemberId,
  ] = useState<string | null>(
    null,
  );

  // ==========================================================================
  // DOMAIN VALIDATION STATE
  // ==========================================================================

  const normalizedCreateDomain =
    useMemo(
      () =>
        normalizeDomain(
          createForm.domain,
        ),
      [createForm.domain],
    );

  const createDomainError =
    useMemo(
      () => {
        if (
          !createForm.domain.trim()
        ) {
          return null;
        }

        return validateMemberDomain(
          normalizedCreateDomain,
        );
      },
      [
        createForm.domain,
        normalizedCreateDomain,
      ],
    );

  const createDomainLabel =
    useMemo(
      () =>
        getMemberDomainLabel(
          normalizedCreateDomain,
        ),
      [normalizedCreateDomain],
    );

  // ==========================================================================
  // LOAD MEMBERS
  // ==========================================================================

  const loadMembers =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        if (!organizationId) {
          setMembers([]);
          setIsLoading(false);
          setError(
            "No church organization was selected.",
          );
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const result =
            await listMembers(
              organizationId,
              {
                page: 1,
                pageSize: 100,
                search:
                  search.trim() ||
                  undefined,
                role: undefined,
                status: undefined,
              },
              signal,
            );

          if (signal?.aborted) {
            return;
          }

          setMembers(
            result.items ?? [],
          );
        } catch (err) {
          if (
            err instanceof
              DOMException &&
            err.name ===
              "AbortError"
          ) {
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load members.",
          );
        } finally {
          if (!signal?.aborted) {
            setIsLoading(false);
          }
        }
      },
      [organizationId, search],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadMembers(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadMembers]);

  // ==========================================================================
  // FILTER MEMBERS LOCALLY
  // ==========================================================================

  const filteredMembers =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return members.filter(
        (member) => {
          const matchesStatus =
            !statusFilter ||
            member.status ===
              statusFilter;

          if (!matchesStatus) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          const displayName =
            member.profile
              ?.displayName
              ?.toLowerCase() ||
            "";

          const email =
            member.privateProfile
              ?.email
              ?.toLowerCase() ||
            "";

          const domain =
            getMemberDomain(
              member,
            ).toLowerCase();

          const memberIdentity =
            getMemberId(
              member as MemberWithIdentity,
            ).toLowerCase();

          return (
            displayName.includes(
              normalizedSearch,
            ) ||
            email.includes(
              normalizedSearch,
            ) ||
            domain.includes(
              normalizedSearch,
            ) ||
            memberIdentity.includes(
              normalizedSearch,
            )
          );
        },
      );
    }, [
      members,
      search,
      statusFilter,
    ]);

  // ==========================================================================
  // PENDING REQUESTS
  // ==========================================================================

  const pendingMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            member.status ===
            MembershipStatus.Pending,
        ),
      [members],
    );

  // ==========================================================================
  // ACTIVE MEMBERS
  // ==========================================================================

  const activeMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            member.status ===
            MembershipStatus.Active,
        ),
      [members],
    );

  // ==========================================================================
  // COUNTS
  // ==========================================================================

  const memberCount =
    members.length;

  // ==========================================================================
  // CREATE FORM FIELD
  // ==========================================================================

  const updateCreateField = <
    K extends keyof CreateMemberForm,
  >(
    field: K,
    value: CreateMemberForm[K],
  ) => {
    setCreateForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setCreateError(null);
    setCreateSuccess(null);
  };

  // ==========================================================================
  // DOMAIN INPUT
  // ==========================================================================

  const handleDomainChange = (
    value: string,
  ) => {
    /**
     * Keep domain input clean while
     * preserving dots and hyphens.
     */
    const normalized =
      value
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(
          /[^a-z0-9.-]/g,
          "",
        );

    updateCreateField(
      "domain",
      normalized,
    );
  };

  // ==========================================================================
  // RESET CREATE FORM
  // ==========================================================================

  const resetCreateForm =
    () => {
      setCreateForm({
        ...DEFAULT_FORM,
      });

      setCreateError(null);
      setCreateSuccess(null);
    };

  // ==========================================================================
  // CREATE MEMBER
  // ==========================================================================

  const handleCreateMember =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (!organizationId) {
        setCreateError(
          "No church organization was selected.",
        );
        return;
      }

      if (
        !createForm.firstName.trim()
      ) {
        setCreateError(
          "First name is required.",
        );
        return;
      }

      if (
        !createForm.lastName.trim()
      ) {
        setCreateError(
          "Last name is required.",
        );
        return;
      }

      if (
        !createForm.email.trim()
      ) {
        setCreateError(
          "Email address is required.",
        );
        return;
      }

      const domainError =
        validateMemberDomain(
          createForm.domain,
        );

      if (domainError) {
        setCreateError(
          domainError,
        );
        return;
      }

      setIsCreating(true);
      setCreateError(null);
      setCreateSuccess(null);

      try {
        const created =
          await createMemberAccount(
            organizationId,
            {
              ...createForm,
              domain:
                normalizedCreateDomain,
            },
          );

        if (created) {
          setMembers(
            (current) => [
              created,
              ...current.filter(
                (member) =>
                  member.id !==
                  created.id,
              ),
            ],
          );
        }

        const identity =
          getMemberId(
            created as MemberWithIdentity,
          );

        const createdDomain =
          getMemberDomain(
            created,
          );

        setCreateSuccess(
          identity !==
            "Not assigned"
            ? `Member account created successfully. Member ID: ${identity}. Fockis domain: ${createdDomain}`
            : `Member account created successfully. Fockis domain: ${createdDomain}`,
        );

        setCreateForm({
          ...DEFAULT_FORM,
        });

        setShowCreateForm(
          false,
        );

        /**
         * Refresh from the backend so
         * the UI uses the authoritative
         * membership record.
         */
        await loadMembers();
      } catch (err) {
        setCreateError(
          err instanceof Error
            ? err.message
            : "Unable to create member account.",
        );
      } finally {
        setIsCreating(false);
      }
    };

  // ==========================================================================
  // GENERIC STATUS CHANGE
  // ==========================================================================

  const handleStatusChange =
    async (
      memberId: string,
      status: MembershipStatus,
    ) => {
      if (
        !organizationId ||
        !memberId
      ) {
        return;
      }

      setBusyMemberId(
        memberId,
      );

      setError(null);

      try {
        const updated =
          await updateMembershipStatus(
            organizationId,
            memberId,
            status,
          );

        setMembers(
          (items) =>
            items.map(
              (member) =>
                member.id ===
                memberId
                  ? updated
                  : member,
            ),
        );

        await loadMembers();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to update membership status.",
        );
      } finally {
        setBusyMemberId(null);
      }
    };

  // ==========================================================================
  // APPROVE PENDING MEMBERSHIP
  // ==========================================================================

  const handleApprove =
    async (
      member: Member,
    ) => {
      if (
        member.status !==
        MembershipStatus.Pending
      ) {
        return;
      }

      if (!organizationId) {
        setError(
          "No church organization was selected.",
        );
        return;
      }

      setBusyMemberId(
        member.id,
      );

      setError(null);

      try {
        await approveMembershipRequest(
          organizationId,
          member.id,
        );

        await loadMembers();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to approve this membership request.",
        );
      } finally {
        setBusyMemberId(null);
      }
    };

  // ==========================================================================
  // REJECT PENDING MEMBERSHIP
  // ==========================================================================

  const handleReject =
    async (
      member: Member,
    ) => {
      if (
        member.status !==
        MembershipStatus.Pending
      ) {
        return;
      }

      if (!organizationId) {
        setError(
          "No church organization was selected.",
        );
        return;
      }

      const displayName =
        member.profile
          ?.displayName ||
        "this member";

      const confirmed =
        window.confirm(
          `Reject the membership request from ${displayName}? This will remove the pending membership request.`,
        );

      if (!confirmed) {
        return;
      }

      setBusyMemberId(
        member.id,
      );

      setError(null);

      try {
        await rejectMembershipRequest(
          organizationId,
          member.id,
        );

        await loadMembers();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to reject this membership request.",
        );
      } finally {
        setBusyMemberId(null);
      }
    };

  // ==========================================================================
  // ROLE
  // ==========================================================================

  const handleRoleChange =
    async (
      memberId: string,
      role: MemberRole,
    ) => {
      if (
        !organizationId ||
        !memberId
      ) {
        return;
      }

      setBusyMemberId(
        memberId,
      );

      setError(null);

      try {
        const updated =
          await updateMemberRole(
            organizationId,
            memberId,
            role,
          );

        setMembers(
          (items) =>
            items.map(
              (member) =>
                member.id ===
                memberId
                  ? updated
                  : member,
            ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to update member role.",
        );
      } finally {
        setBusyMemberId(null);
      }
    };

  // ==========================================================================
  // REMOVE MEMBER
  // ==========================================================================

  const handleRemove =
    async (
      memberId: string,
    ) => {
      if (!organizationId) {
        setError(
          "No church organization was selected.",
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to remove this church member?",
        );

      if (!confirmed) {
        return;
      }

      setBusyMemberId(
        memberId,
      );

      setError(null);

      try {
        await removeMember(
          organizationId,
          memberId,
        );

        setMembers(
          (items) =>
            items.filter(
              (member) =>
                member.id !==
                memberId,
            ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to remove this member.",
        );
      } finally {
        setBusyMemberId(null);
      }
    };

  // ==========================================================================
  // COPY MEMBER ID
  // ==========================================================================

  const handleCopyMemberId =
    async (
      memberId: string,
    ) => {
      await copyMemberId(
        memberId,
      );

      setCopiedMemberId(
        memberId,
      );

      window.setTimeout(
        () => {
          setCopiedMemberId(null);
        },
        1500,
      );
    };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="church-admin-page">

      {/* ====================================================================
          HEADER
      ===================================================================== */}

      <header className="church-admin-header">
        <div>
          <span className="church-admin-eyebrow">
            Church Administration
          </span>

          <h1>
            Member management
          </h1>

          <p>
            Manage membership requests,
            Fockis member domains, Member
            IDs, roles, and membership
            status.
          </p>
        </div>

        <button
          type="button"
          className="church-admin-btn church-admin-btn--primary"
          onClick={() => {
            setCreateError(null);
            setCreateSuccess(null);

            setShowCreateForm(
              (current) =>
                !current,
            );
          }}
        >
          {showCreateForm
            ? "✕ Close"
            : "＋ Create Member Account"}
        </button>
      </header>

      {/* ====================================================================
          PENDING REQUESTS
      ===================================================================== */}

      <section
        className="church-admin-card"
        aria-labelledby="pending-requests-heading"
        style={{
          marginBottom: "24px",
          border:
            pendingMembers.length >
            0
              ? "2px solid #f59e0b"
              : undefined,
        }}
      >
        <div
          className="church-admin-card__header"
          style={{
            alignItems: "center",
          }}
        >
          <div>
            <span className="church-admin-eyebrow">
              Membership requests
            </span>

            <h2 id="pending-requests-heading">
              Pending membership requests
            </h2>

            <p>
              Review people who requested
              to join this church.
            </p>
          </div>

          <div
            aria-label={`${pendingMembers.length} pending membership requests`}
            style={{
              minWidth: "52px",
              height: "52px",
              padding: "0 14px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "20px",
              border:
                "2px solid #f59e0b",
              background:
                pendingMembers.length >
                0
                  ? "#fff7ed"
                  : "transparent",
              color:
                pendingMembers.length >
                0
                  ? "#c2410c"
                  : "inherit",
            }}
          >
            {pendingMembers.length}
          </div>
        </div>

        {isLoading ? (
          <div className="church-admin-empty">
            Loading membership requests…
          </div>
        ) : pendingMembers.length ===
          0 ? (
          <div className="church-admin-empty">
            <strong>
              No pending membership requests.
            </strong>

            <p>
              New requests to join this
              church will appear here.
            </p>
          </div>
        ) : (
          <div className="church-admin-table-wrap">
            <table className="church-admin-table">
              <thead>
                <tr>
                  <th scope="col">
                    Member
                  </th>

                  <th scope="col">
                    Fockis Domain
                  </th>

                  <th scope="col">
                    Email
                  </th>

                  <th scope="col">
                    Member ID
                  </th>

                  <th scope="col">
                    Status
                  </th>

                  <th scope="col">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {pendingMembers.map(
                  (member) => {
                    const isBusy =
                      busyMemberId ===
                      member.id;

                    const identity =
                      getMemberId(
                        member as MemberWithIdentity,
                      );

                    const domain =
                      getMemberDomain(
                        member,
                      );

                    return (
                      <tr
                        key={
                          member.id
                        }
                      >
                        <td>
                          <div className="church-admin-table__member">
                            <span className="church-admin-table__name">
                              {member
                                .profile
                                ?.displayName ||
                                "Unknown member"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <code
                            style={{
                              whiteSpace:
                                "nowrap",
                              fontSize:
                                "0.84rem",
                            }}
                          >
                            {domain}
                          </code>
                        </td>

                        <td>
                          {member
                            .privateProfile
                            ?.email ??
                            "—"}
                        </td>

                        <td>
                          <code>
                            {
                              identity
                            }
                          </code>
                        </td>

                        <td>
                          <span className="church-admin-status church-admin-status--pending">
                            Pending
                          </span>
                        </td>

                        <td>
                          <div
                            className="church-admin-table__actions"
                            style={{
                              display:
                                "flex",
                              gap: "8px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="church-admin-btn church-admin-btn--primary church-admin-btn--sm"
                              disabled={
                                isBusy
                              }
                              onClick={() =>
                                void handleApprove(
                                  member,
                                )
                              }
                              style={{
                                fontWeight:
                                  800,
                                minWidth:
                                  "100px",
                              }}
                            >
                              {isBusy
                                ? "Updating…"
                                : "✓ Approve"}
                            </button>

                            <button
                              type="button"
                              className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                              disabled={
                                isBusy
                              }
                              onClick={() =>
                                void handleReject(
                                  member,
                                )
                              }
                              style={{
                                minWidth:
                                  "90px",
                              }}
                            >
                              {isBusy
                                ? "Rejecting…"
                                : "Reject"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ====================================================================
          CREATE MEMBER
      ===================================================================== */}

      {showCreateForm && (
        <section
          className="church-admin-card"
          aria-labelledby="create-member-heading"
        >
          <div className="church-admin-card__header">
            <div>
              <span className="church-admin-eyebrow">
                New Member
              </span>

              <h2 id="create-member-heading">
                Create member account
              </h2>

              <p>
                Create a church member
                account with a permanent
                Fockis member domain. The
                backend automatically assigns
                the permanent Member ID.
              </p>
            </div>
          </div>

          {createError && (
            <div className="church-admin-alert church-admin-alert--error">
              {createError}
            </div>
          )}

          <form
            className="church-admin-form"
            onSubmit={
              handleCreateMember
            }
          >
            <div className="church-admin-form__grid">

              {/* ==========================================================
                  FIRST NAME
              =========================================================== */}

              <label className="church-admin-field">
                <span>
                  First name
                  <strong aria-hidden="true">
                    {" "}*
                  </strong>
                </span>

                <input
                  type="text"
                  className="church-admin-input"
                  value={
                    createForm.firstName
                  }
                  onChange={(event) =>
                    updateCreateField(
                      "firstName",
                      event.target
                        .value,
                    )
                  }
                  autoComplete="given-name"
                  required
                />
              </label>

              {/* ==========================================================
                  LAST NAME
              =========================================================== */}

              <label className="church-admin-field">
                <span>
                  Last name
                  <strong aria-hidden="true">
                    {" "}*
                  </strong>
                </span>

                <input
                  type="text"
                  className="church-admin-input"
                  value={
                    createForm.lastName
                  }
                  onChange={(event) =>
                    updateCreateField(
                      "lastName",
                      event.target
                        .value,
                    )
                  }
                  autoComplete="family-name"
                  required
                />
              </label>

              {/* ==========================================================
                  EMAIL
              =========================================================== */}

              <label className="church-admin-field">
                <span>
                  Email address
                  <strong aria-hidden="true">
                    {" "}*
                  </strong>
                </span>

                <input
                  type="email"
                  className="church-admin-input"
                  value={
                    createForm.email
                  }
                  onChange={(event) =>
                    updateCreateField(
                      "email",
                      event.target
                        .value,
                    )
                  }
                  autoComplete="email"
                  required
                />
              </label>

              {/* ==========================================================
                  ROLE
              =========================================================== */}

              <label className="church-admin-field">
                <span>
                  Church role
                </span>

                <select
                  className="church-admin-select"
                  value={
                    createForm.role
                  }
                  onChange={(event) =>
                    updateCreateField(
                      "role",
                      event.target
                        .value as MemberRole,
                    )
                  }
                >
                  {Object.values(
                    MemberRole,
                  ).map(
                    (value) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {
                          MEMBER_ROLE_LABELS[
                            value
                          ]
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              {/* ==========================================================
                  STATUS
              =========================================================== */}

              <label className="church-admin-field">
                <span>
                  Membership status
                </span>

                <select
                  className="church-admin-select"
                  value={
                    createForm.status
                  }
                  onChange={(event) =>
                    updateCreateField(
                      "status",
                      event.target
                        .value as MembershipStatus,
                    )
                  }
                >
                  {Object.values(
                    MembershipStatus,
                  ).map(
                    (value) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {
                          MEMBERSHIP_STATUS_LABELS[
                            value
                          ]
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              {/* ==========================================================
                  FOCKIS MEMBER DOMAIN
              =========================================================== */}

              <label
                className="church-admin-field"
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <span>
                  Fockis member domain
                  <strong aria-hidden="true">
                    {" "}*
                  </strong>
                </span>

                <input
                  type="text"
                  className="church-admin-input"
                  value={
                    createForm.domain
                  }
                  onChange={(event) =>
                    handleDomainChange(
                      event.target
                        .value,
                    )
                  }
                  placeholder="john.springfieldchurch.fockis.com"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  aria-invalid={
                    Boolean(
                      createDomainError,
                    )
                  }
                  aria-describedby="member-domain-help member-domain-validation"
                />

                <small
                  id="member-domain-help"
                  style={{
                    display:
                      "block",
                    marginTop:
                      "7px",
                    lineHeight:
                      1.5,
                    color:
                      "#66788a",
                  }}
                >
                  Required. Use one member
                  label followed by the
                  organization's Fockis
                  domain.
                  <br />
                  Example:
                  {" "}
                  <code>
                    john.springfieldchurch.fockis.com
                  </code>
                </small>

                <div
                  id="member-domain-validation"
                  style={{
                    marginTop:
                      "8px",
                  }}
                >
                  {createForm.domain.trim() &&
                    createDomainError && (
                      <span
                        style={{
                          color:
                            "#b42318",
                          fontWeight:
                            700,
                        }}
                      >
                        {createDomainError}
                      </span>
                    )}

                  {createForm.domain.trim() &&
                    !createDomainError && (
                      <span
                        style={{
                          color:
                            "#027a48",
                          fontWeight:
                            700,
                        }}
                      >
                        ✓ Valid Fockis member
                        domain
                        {createDomainLabel
                          ? ` — ${createDomainLabel}`
                          : ""}
                      </span>
                    )}
                </div>
              </label>
            </div>

            {/* ============================================================
                DOMAIN EXPLANATION
            ============================================================= */}

            <div
              className="church-admin-alert"
              style={{
                marginTop: "16px",
              }}
            >
              <strong>
                Fockis member identity:
              </strong>

              <p
                style={{
                  margin:
                    "8px 0 0",
                }}
              >
                Each member account must
                have its own Fockis domain.
                For example, if the church
                domain is
                {" "}
                <code>
                  springfieldchurch.fockis.com
                </code>
                , a member domain can be
                {" "}
                <code>
                  john.springfieldchurch.fockis.com
                </code>
                .
              </p>

              <p
                style={{
                  margin:
                    "8px 0 0",
                }}
              >
                The organization domain by
                itself cannot be used as a
                member domain.
              </p>
            </div>

            {/* ============================================================
                MEMBER ID
            ============================================================= */}

            <div
              className="church-admin-alert"
              style={{
                marginTop: "16px",
              }}
            >
              <strong>
                Member ID:
              </strong>{" "}
              Generated automatically by
              the backend and permanently
              assigned to the membership.
            </div>

            {/* ============================================================
                ACTIONS
            ============================================================= */}

            <div className="church-admin-form__actions">
              <button
                type="button"
                className="church-admin-btn church-admin-btn--ghost"
                disabled={
                  isCreating
                }
                onClick={() => {
                  resetCreateForm();

                  setShowCreateForm(
                    false,
                  );
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="church-admin-btn church-admin-btn--primary"
                disabled={
                  isCreating ||
                  !createForm.firstName.trim() ||
                  !createForm.lastName.trim() ||
                  !createForm.email.trim() ||
                  !createForm.domain.trim() ||
                  Boolean(
                    createDomainError,
                  )
                }
              >
                {isCreating
                  ? "Creating account…"
                  : "Create Member Account"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ====================================================================
          SUCCESS
      ===================================================================== */}

      {createSuccess && (
        <div className="church-admin-alert church-admin-alert--success">
          {createSuccess}
        </div>
      )}

      {/* ====================================================================
          ERROR
      ===================================================================== */}

      {error && (
        <div className="church-admin-alert church-admin-alert--error">
          {error}
        </div>
      )}

      {/* ====================================================================
          SUMMARY
      ===================================================================== */}

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <strong>
          {memberCount} member
          {memberCount === 1
            ? ""
            : "s"}
        </strong>

        <span>•</span>

        <strong>
          {pendingMembers.length} pending
        </strong>

        <span>•</span>

        <strong>
          {activeMembers.length} active
        </strong>
      </div>

      {/* ====================================================================
          FILTERS
      ===================================================================== */}

      <div className="church-admin-toolbar">
        <input
          type="search"
          className="church-admin-input"
          placeholder="Search members, domains, or Member IDs…"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
        />

        <select
          className="church-admin-select"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as
                | MembershipStatus
                | "",
            )
          }
        >
          <option value="">
            All statuses
          </option>

          {Object.values(
            MembershipStatus,
          ).map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {
                  MEMBERSHIP_STATUS_LABELS[
                    value
                  ]
                }
              </option>
            ),
          )}
        </select>
      </div>

      {/* ====================================================================
          ALL MEMBERS
      ===================================================================== */}

      {isLoading ? (
        <p className="church-admin-empty">
          Loading members…
        </p>
      ) : filteredMembers.length ===
        0 ? (
        <div className="church-admin-empty">
          <p>
            No members match your filters.
          </p>

          <button
            type="button"
            className="church-admin-btn church-admin-btn--primary"
            onClick={() => {
              setCreateError(null);
              setCreateSuccess(null);
              setShowCreateForm(
                true,
              );
            }}
          >
            ＋ Create the first member
          </button>
        </div>
      ) : (
        <div className="church-admin-table-wrap">
          <table className="church-admin-table">
            <thead>
              <tr>
                <th scope="col">
                  Member ID
                </th>

                <th scope="col">
                  Member
                </th>

                <th scope="col">
                  Fockis Domain
                </th>

                <th scope="col">
                  Status
                </th>

                <th scope="col">
                  Role
                </th>

                <th scope="col">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map(
                (member) => {
                  const isBusy =
                    busyMemberId ===
                    member.id;

                  const identity =
                    getMemberId(
                      member as MemberWithIdentity,
                    );

                  const domain =
                    getMemberDomain(
                      member,
                    );

                  return (
                    <tr
                      key={
                        member.id
                      }
                    >
                      {/* ==================================================
                          MEMBER ID
                      =================================================== */}

                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "8px",
                            minWidth:
                              "150px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <code
                            style={{
                              fontWeight:
                                700,
                              letterSpacing:
                                "0.04em",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              identity
                            }
                          </code>

                          {identity !==
                            "Not assigned" && (
                            <button
                              type="button"
                              className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                              onClick={() =>
                                void handleCopyMemberId(
                                  identity,
                                )
                              }
                            >
                              {copiedMemberId ===
                              identity
                                ? "✓"
                                : "Copy"}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* ==================================================
                          MEMBER
                      =================================================== */}

                      <td>
                        <div className="church-admin-table__member">
                          <span className="church-admin-table__name">
                            {member
                              .profile
                              ?.displayName ||
                              "Unknown member"}
                          </span>
                        </div>
                      </td>

                      {/* ==================================================
                          DOMAIN
                      =================================================== */}

                      <td>
                        <code
                          style={{
                            display:
                              "inline-block",
                            maxWidth:
                              "280px",
                            wordBreak:
                              "break-word",
                            fontSize:
                              "0.84rem",
                            lineHeight:
                              1.4,
                          }}
                        >
                          {
                            domain
                          }
                        </code>
                      </td>

                      {/* ==================================================
                          STATUS
                      =================================================== */}

                      <td>
                        {member.status ===
                        MembershipStatus.Pending ? (
                          <span className="church-admin-status church-admin-status--pending">
                            Pending
                          </span>
                        ) : (
                          <select
                            className="church-admin-select church-admin-select--sm"
                            value={
                              member.status
                            }
                            disabled={
                              isBusy
                            }
                            onChange={(
                              event,
                            ) =>
                              void handleStatusChange(
                                member.id,
                                event
                                  .target
                                  .value as MembershipStatus,
                              )
                            }
                          >
                            {Object.values(
                              MembershipStatus,
                            ).map(
                              (
                                value,
                              ) => (
                                <option
                                  key={
                                    value
                                  }
                                  value={
                                    value
                                  }
                                >
                                  {
                                    MEMBERSHIP_STATUS_LABELS[
                                      value
                                    ]
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        )}
                      </td>

                      {/* ==================================================
                          ROLE
                      =================================================== */}

                      <td>
                        <select
                          className="church-admin-select church-admin-select--sm"
                          value={
                            member.role
                          }
                          disabled={
                            isBusy
                          }
                          onChange={(
                            event,
                          ) =>
                            void handleRoleChange(
                              member.id,
                              event
                                .target
                                .value as MemberRole,
                            )
                          }
                        >
                          {Object.values(
                            MemberRole,
                          ).map(
                            (
                              value,
                            ) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {
                                  MEMBER_ROLE_LABELS[
                                    value
                                  ]
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      {/* ==================================================
                          ACTIONS
                      =================================================== */}

                      <td>
                        <div
                          className="church-admin-table__actions"
                          style={{
                            display:
                              "flex",
                            gap: "8px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          {member.status ===
                            MembershipStatus.Pending && (
                            <>
                              <button
                                type="button"
                                className="church-admin-btn church-admin-btn--primary church-admin-btn--sm"
                                disabled={
                                  isBusy
                                }
                                onClick={() =>
                                  void handleApprove(
                                    member,
                                  )
                                }
                              >
                                {isBusy
                                  ? "Updating…"
                                  : "✓ Approve"}
                              </button>

                              <button
                                type="button"
                                className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                                disabled={
                                  isBusy
                                }
                                onClick={() =>
                                  void handleReject(
                                    member,
                                  )
                                }
                              >
                                {isBusy
                                  ? "Rejecting…"
                                  : "Reject"}
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                            disabled={
                              isBusy
                            }
                            onClick={() =>
                              void handleRemove(
                                member.id,
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}