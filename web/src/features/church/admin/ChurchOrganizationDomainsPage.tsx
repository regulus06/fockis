/**
 * ChurchOrganizationDomainsPage.tsx
 * -----------------------------------------------------------------------------
 * Fockis Church — Organization Domain Management
 *
 * Organization administrators can:
 *
 * 1. Create one base Fockis organization domain.
 * 2. View the organization base domain.
 * 3. View organization members.
 * 4. Create one Fockis subdomain for each member.
 * 5. Associate the member domain with:
 *      - user ID
 *      - membership ID
 *      - parent organization domain
 * 6. Verify domains.
 * 7. Remove domains.
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

import { listMembers } from "../api/membersApi";

import type { Member } from "../types/church.types";

import {
  checkOrganizationDomainAvailability,
  createBaseOrganizationDomain,
  createMemberOrganizationDomain,
  deleteOrganizationDomain,
  getBaseOrganizationDomain,
  getMemberOrganizationDomains,
  verifyOrganizationDomain,
  type OrganizationDomain,
} from "../api/organizationIdentityApi";

import "../styles/ChurchAdmin.scss";

// ============================================================================
// TYPES
// ============================================================================

type MemberIdentity = Member & {
  _id?: string;

  userId?: string;

  membershipId?: string;

  memberId?: string;
};

type MemberDomainMap = Record<
  string,
  OrganizationDomain | undefined
>;

// ============================================================================
// MEMBER USER ID
// ============================================================================

function getUserId(
  member: MemberIdentity,
): string {
  return (
    member.userId ||
    (member as any).user?.id ||
    (member as any).user?._id ||
    member.id ||
    ""
  );
}

// ============================================================================
// MEMBER MEMBERSHIP ID
// ============================================================================

function getMembershipId(
  member: MemberIdentity,
): string {
  return (
    member.membershipId ||
    member.memberId ||
    member.id ||
    member._id ||
    ""
  );
}

// ============================================================================
// DISPLAY NAME
// ============================================================================

function getMemberName(
  member: MemberIdentity,
): string {
  return (
    member.profile?.displayName ||
    (member as any).profile?.name ||
    (member as any).user?.profile?.displayName ||
    "Unknown member"
  );
}

// ============================================================================
// DOMAIN SLUG
// ============================================================================

function slugify(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// ============================================================================
// MEMBER DOMAIN PREFIX
// ============================================================================

function getMemberSlug(
  member: MemberIdentity,
): string {
  const displayName =
    getMemberName(member);

  const slug =
    slugify(displayName);

  if (slug) {
    return slug;
  }

  return slugify(
    getMembershipId(member),
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ChurchOrganizationDomainsPage(): React.JSX.Element {
  const {
    organizationId = "",
  } = useParams<{
    organizationId: string;
  }>();

  // ==========================================================================
  // BASE DOMAIN
  // ==========================================================================

  const [
    baseDomain,
    setBaseDomain,
  ] = useState<OrganizationDomain | null>(
    null,
  );

  const [
    baseDomainInput,
    setBaseDomainInput,
  ] = useState("");

  const [
    baseAvailability,
    setBaseAvailability,
  ] = useState<boolean | null>(
    null,
  );

  const [
    isCreatingBase,
    setIsCreatingBase,
  ] = useState(false);

  // ==========================================================================
  // MEMBERS
  // ==========================================================================

  const [
    members,
    setMembers,
  ] = useState<Member[]>([]);

  const [
    memberDomains,
    setMemberDomains,
  ] = useState<MemberDomainMap>({});

  const [
    memberSearch,
    setMemberSearch,
  ] = useState("");

  const [
    selectedMemberId,
    setSelectedMemberId,
  ] = useState("");

  const [
    memberDomainInput,
    setMemberDomainInput,
  ] = useState("");

  const [
    isCreatingMemberDomain,
    setIsCreatingMemberDomain,
  ] = useState(false);

  // ==========================================================================
  // GENERAL STATE
  // ==========================================================================

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    success,
    setSuccess,
  ] = useState<string | null>(null);

  const [
    busyDomainId,
    setBusyDomainId,
  ] = useState<string | null>(null);

  // ==========================================================================
  // LOAD DATA
  // ==========================================================================

  const loadData = useCallback(
    async () => {
      if (!organizationId) {
        setError(
          "No organization was selected.",
        );

        setIsLoading(false);

        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [
          organizationDomain,
          memberResult,
        ] = await Promise.all([
          getBaseOrganizationDomain(
            organizationId,
          ),

          listMembers(
            organizationId,
            {
              page: 1,
              pageSize: 100,
            },
          ),
        ]);

        setBaseDomain(
          organizationDomain,
        );

        setMembers(
          memberResult.items ?? [],
        );

        if (organizationDomain) {
          const domains =
            await getMemberOrganizationDomains(
              organizationId,
              organizationDomain.id,
            );

          const map: MemberDomainMap =
            {};

          for (const domain of domains) {
            if (
              domain.assignedUserId
            ) {
              map[
                domain.assignedUserId
              ] = domain;
            }
          }

          setMemberDomains(map);
        } else {
          setMemberDomains({});
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load organization domains.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ==========================================================================
  // BASE DOMAIN AVAILABILITY
  // ==========================================================================

  const checkBaseAvailability =
    async (): Promise<void> => {
      const value =
        baseDomainInput.trim();

      if (!value) {
        setError(
          "Enter a Fockis domain first.",
        );

        return;
      }

      setError(null);

      try {
        const result =
          await checkOrganizationDomainAvailability(
            organizationId,
            value,
          );

        setBaseAvailability(
          result.available,
        );

        if (!result.available) {
          setError(
            result.message ||
              result.reason ||
              "That domain is not available.",
          );
        }
      } catch (err) {
        setBaseAvailability(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to check domain availability.",
        );
      }
    };

  // ==========================================================================
  // CREATE BASE DOMAIN
  // ==========================================================================

  const handleCreateBaseDomain =
    async (
      event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
      event.preventDefault();

      if (!organizationId) {
        setError(
          "No organization was selected.",
        );

        return;
      }

      const domain =
        baseDomainInput.trim();

      if (!domain) {
        setError(
          "Enter your organization domain.",
        );

        return;
      }

      setIsCreatingBase(true);
      setError(null);
      setSuccess(null);

      try {
        const created =
          await createBaseOrganizationDomain(
            organizationId,
            domain,
          );

        setBaseDomain(created);

        setBaseDomainInput("");

        setBaseAvailability(null);

        setSuccess(
          `Organization domain created: ${created.domain}`,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to create organization domain.",
        );
      } finally {
        setIsCreatingBase(false);
      }
    };

  // ==========================================================================
  // SELECTED MEMBER
  // ==========================================================================

  const selectedMember =
    useMemo(
      () =>
        members.find(
          (member) =>
            member.id ===
            selectedMemberId,
        ) as MemberIdentity | undefined,
      [
        members,
        selectedMemberId,
      ],
    );

  // ==========================================================================
  // AUTO-GENERATE MEMBER DOMAIN
  // ==========================================================================

  useEffect(() => {
    if (
      !selectedMember ||
      !baseDomain
    ) {
      return;
    }

    const existing =
      memberDomains[
        getUserId(selectedMember)
      ];

    if (existing) {
      setMemberDomainInput(
        existing.domain,
      );

      return;
    }

    const prefix =
      getMemberSlug(
        selectedMember,
      );

    const base =
      baseDomain.domain;

    setMemberDomainInput(
      `${prefix}.${base}`,
    );
  }, [
    selectedMember,
    baseDomain,
    memberDomains,
  ]);

  // ==========================================================================
  // CREATE MEMBER DOMAIN
  // ==========================================================================

  const handleCreateMemberDomain =
    async (
      event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
      event.preventDefault();

      if (!organizationId) {
        setError(
          "No organization was selected.",
        );

        return;
      }

      if (!baseDomain) {
        setError(
          "Create the organization base domain first.",
        );

        return;
      }

      if (!selectedMember) {
        setError(
          "Select an organization member.",
        );

        return;
      }

      const userId =
        getUserId(selectedMember);

      const membershipId =
        getMembershipId(
          selectedMember,
        );

      if (!userId) {
        setError(
          "This member does not have a usable user ID.",
        );

        return;
      }

      if (!membershipId) {
        setError(
          "This member does not have a usable membership ID.",
        );

        return;
      }

      const domain =
        memberDomainInput.trim();

      if (!domain) {
        setError(
          "Enter a member domain.",
        );

        return;
      }

      setIsCreatingMemberDomain(
        true,
      );

      setError(null);
      setSuccess(null);

      try {
        const created =
          await createMemberOrganizationDomain(
            organizationId,
            {
              domain,
              parentDomainId:
                baseDomain.id,
              assignedUserId:
                userId,
              assignedMembershipId:
                membershipId,
            },
          );

        setMemberDomains(
          (current) => ({
            ...current,
            [userId]: created,
          }),
        );

        setSuccess(
          `Member domain created: ${created.domain}`,
        );

        setSelectedMemberId("");
        setMemberDomainInput("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to create member domain.",
        );
      } finally {
        setIsCreatingMemberDomain(
          false,
        );
      }
    };

  // ==========================================================================
  // VERIFY DOMAIN
  // ==========================================================================

  const handleVerify =
    async (
      domain: OrganizationDomain,
    ): Promise<void> => {
      setBusyDomainId(
        domain.id,
      );

      setError(null);
      setSuccess(null);

      try {
        const verified =
          await verifyOrganizationDomain(
            organizationId,
            domain.id,
          );

        if (
          domain.domainType ===
          "base"
        ) {
          setBaseDomain(
            verified,
          );
        }

        if (
          verified.assignedUserId
        ) {
          setMemberDomains(
            (current) => ({
              ...current,
              [verified.assignedUserId!]:
                verified,
            }),
          );
        }

        setSuccess(
          `Domain verified: ${verified.domain}`,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to verify domain.",
        );
      } finally {
        setBusyDomainId(null);
      }
    };

  // ==========================================================================
  // DELETE DOMAIN
  // ==========================================================================

  const handleDelete =
    async (
      domain: OrganizationDomain,
    ): Promise<void> => {
      const confirmed =
        window.confirm(
          `Remove the Fockis domain "${domain.domain}"?`,
        );

      if (!confirmed) {
        return;
      }

      setBusyDomainId(
        domain.id,
      );

      setError(null);
      setSuccess(null);

      try {
        await deleteOrganizationDomain(
          organizationId,
          domain.id,
        );

        if (
          domain.domainType ===
          "base"
        ) {
          setBaseDomain(null);
          setMemberDomains({});
        } else if (
          domain.assignedUserId
        ) {
          setMemberDomains(
            (current) => {
              const next = {
                ...current,
              };

              delete next[
                domain.assignedUserId!
              ];

              return next;
            },
          );
        }

        setSuccess(
          `Domain removed: ${domain.domain}`,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to remove domain.",
        );
      } finally {
        setBusyDomainId(null);
      }
    };

  // ==========================================================================
  // FILTER MEMBERS
  // ==========================================================================

  const filteredMembers =
    useMemo(() => {
      const query =
        memberSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return members;
      }

      return members.filter(
        (member) => {
          const item =
            member as MemberIdentity;

          const name =
            getMemberName(
              item,
            ).toLowerCase();

          const identity =
            getMembershipId(
              item,
            ).toLowerCase();

          return (
            name.includes(query) ||
            identity.includes(query)
          );
        },
      );
    }, [
      members,
      memberSearch,
    ]);

  // ==========================================================================
  // NO ORGANIZATION
  // ==========================================================================

  if (!organizationId) {
    return (
      <div className="church-admin-page">
        <div className="church-admin-alert church-admin-alert--error">
          No organization was selected.
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="church-admin-page">

      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <header className="church-admin-header">
        <div>
          <span className="church-admin-eyebrow">
            Fockis Organization Identity
          </span>

          <h1>
            Fockis Domains
          </h1>

          <p>
            Create your organization's Fockis
            domain and give organization
            members their own Fockis subdomains.
          </p>
        </div>
      </header>

      {/* ====================================================================
          MESSAGES
      ==================================================================== */}

      {error && (
        <div className="church-admin-alert church-admin-alert--error">
          {error}
        </div>
      )}

      {success && (
        <div className="church-admin-alert church-admin-alert--success">
          {success}
        </div>
      )}

      {/* ====================================================================
          BASE DOMAIN
      ==================================================================== */}

      <section className="church-admin-card">
        <div className="church-admin-card__header">
          <div>
            <span className="church-admin-eyebrow">
              Organization Domain
            </span>

            <h2>
              Base Fockis Domain
            </h2>

            <p>
              Every organization can have one
              primary Fockis domain.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="church-admin-empty">
            Loading organization domain…
          </div>
        ) : baseDomain ? (
          <div>
            <div
              style={{
                padding: "20px",
                borderRadius: "14px",
                border: "1px solid #d1d5db",
                marginBottom: "16px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: "22px",
                  marginBottom: "8px",
                }}
              >
                🌐 {baseDomain.domain}
              </strong>

              <div>
                Status:{" "}
                <strong>
                  {baseDomain.verified
                    ? "Verified"
                    : "Pending verification"}
                </strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {!baseDomain.verified && (
                <button
                  type="button"
                  className="church-admin-btn church-admin-btn--primary"
                  disabled={
                    busyDomainId ===
                    baseDomain.id
                  }
                  onClick={() =>
                    void handleVerify(
                      baseDomain,
                    )
                  }
                >
                  {busyDomainId ===
                  baseDomain.id
                    ? "Verifying…"
                    : "✓ Verify Domain"}
                </button>
              )}

              <button
                type="button"
                className="church-admin-btn church-admin-btn--ghost"
                disabled={
                  busyDomainId ===
                  baseDomain.id
                }
                onClick={() =>
                  void handleDelete(
                    baseDomain,
                  )
                }
              >
                Remove Domain
              </button>
            </div>
          </div>
        ) : (
          <form
            className="church-admin-form"
            onSubmit={
              handleCreateBaseDomain
            }
          >
            <label className="church-admin-field">
              <span>
                Organization Fockis domain
              </span>

              <input
                type="text"
                className="church-admin-input"
                placeholder="springfieldchurch.fockis.com"
                value={
                  baseDomainInput
                }
                onChange={(event) => {
                  setBaseDomainInput(
                    event.target.value,
                  );

                  setBaseAvailability(
                    null,
                  );

                  setError(null);
                  setSuccess(null);
                }}
              />
            </label>

            {baseAvailability !==
              null && (
              <div
                className={`church-admin-alert ${
                  baseAvailability
                    ? "church-admin-alert--success"
                    : "church-admin-alert--error"
                }`}
              >
                {baseAvailability
                  ? "✓ Domain is available."
                  : "This domain is not available."}
              </div>
            )}

            <div className="church-admin-form__actions">
              <button
                type="button"
                className="church-admin-btn church-admin-btn--ghost"
                disabled={
                  !baseDomainInput.trim()
                }
                onClick={() =>
                  void checkBaseAvailability()
                }
              >
                Check Availability
              </button>

              <button
                type="submit"
                className="church-admin-btn church-admin-btn--primary"
                disabled={
                  isCreatingBase ||
                  !baseDomainInput.trim()
                }
              >
                {isCreatingBase
                  ? "Creating…"
                  : "Create Organization Domain"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ====================================================================
          MEMBER DOMAINS
      ==================================================================== */}

      <section className="church-admin-card">
        <div className="church-admin-card__header">
          <div>
            <span className="church-admin-eyebrow">
              Member Identity
            </span>

            <h2>
              Member Fockis Domains
            </h2>

            <p>
              Assign a unique Fockis subdomain
              to each organization member.
            </p>
          </div>
        </div>

        {!baseDomain ? (
          <div className="church-admin-alert">
            <strong>
              Create the organization base
              domain first.
            </strong>

            <p>
              Member domains are children of
              the organization's base domain.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                marginBottom: "20px",
                padding: "14px 16px",
                borderRadius: "10px",
                background: "#f3f4f6",
              }}
            >
              Base domain:{" "}
              <strong>
                {baseDomain.domain}
              </strong>
            </div>

            <label className="church-admin-field">
              <span>
                Search members
              </span>

              <input
                type="search"
                className="church-admin-input"
                placeholder="Search by member name or ID…"
                value={
                  memberSearch
                }
                onChange={(event) =>
                  setMemberSearch(
                    event.target.value,
                  )
                }
              />
            </label>

            <div
              className="church-admin-table-wrap"
              style={{
                marginTop: "20px",
              }}
            >
              <table className="church-admin-table">
                <thead>
                  <tr>
                    <th>
                      Member
                    </th>

                    <th>
                      Membership ID
                    </th>

                    <th>
                      Fockis Domain
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMembers.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          padding: "24px",
                        }}
                      >
                        No organization members
                        found.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map(
                      (member) => {
                        const item =
                          member as MemberIdentity;

                        const userId =
                          getUserId(item);

                        const membershipId =
                          getMembershipId(
                            item,
                          );

                        const domain =
                          memberDomains[
                            userId
                          ];

                        return (
                          <tr
                            key={
                              member.id
                            }
                          >
                            <td>
                              <strong>
                                {getMemberName(
                                  item,
                                )}
                              </strong>
                            </td>

                            <td>
                              <code>
                                {membershipId ||
                                  "Not assigned"}
                              </code>
                            </td>

                            <td>
                              {domain ? (
                                <code>
                                  {domain.domain}
                                </code>
                              ) : (
                                <span>
                                  No domain
                                </span>
                              )}
                            </td>

                            <td>
                              {domain ? (
                                <span
                                  className="church-admin-status"
                                >
                                  {domain.verified
                                    ? "Verified"
                                    : "Pending"}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td>
                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap: "8px",
                                  flexWrap:
                                    "wrap",
                                }}
                              >
                                {!domain && (
                                  <button
                                    type="button"
                                    className="church-admin-btn church-admin-btn--primary church-admin-btn--sm"
                                    onClick={() => {
                                      setSelectedMemberId(
                                        member.id,
                                      );

                                      setSuccess(
                                        null,
                                      );

                                      setError(
                                        null,
                                      );
                                    }}
                                  >
                                    Create Domain
                                  </button>
                                )}

                                {domain &&
                                  !domain.verified && (
                                    <button
                                      type="button"
                                      className="church-admin-btn church-admin-btn--primary church-admin-btn--sm"
                                      disabled={
                                        busyDomainId ===
                                        domain.id
                                      }
                                      onClick={() =>
                                        void handleVerify(
                                          domain,
                                        )
                                      }
                                    >
                                      {busyDomainId ===
                                      domain.id
                                        ? "Verifying…"
                                        : "Verify"}
                                    </button>
                                  )}

                                {domain && (
                                  <button
                                    type="button"
                                    className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                                    disabled={
                                      busyDomainId ===
                                      domain.id
                                    }
                                    onClick={() =>
                                      void handleDelete(
                                        domain,
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ====================================================================
          CREATE MEMBER DOMAIN
      ==================================================================== */}

      {selectedMember &&
        baseDomain && (
        <section className="church-admin-card">
          <div className="church-admin-card__header">
            <div>
              <span className="church-admin-eyebrow">
                Create Member Domain
              </span>

              <h2>
                {getMemberName(
                  selectedMember,
                )}
              </h2>

              <p>
                Create a Fockis subdomain for
                this organization member.
              </p>
            </div>
          </div>

          <form
            className="church-admin-form"
            onSubmit={
              handleCreateMemberDomain
            }
          >
            <div className="church-admin-alert">
              This member's domain will be
              connected to their user account
              and organization membership.
            </div>

            <label className="church-admin-field">
              <span>
                Member Fockis domain
              </span>

              <input
                type="text"
                className="church-admin-input"
                value={
                  memberDomainInput
                }
                onChange={(event) =>
                  setMemberDomainInput(
                    event.target.value,
                  )
                }
                placeholder={`member.${baseDomain.domain}`}
              />
            </label>

            <div
              style={{
                display: "grid",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <div>
                <strong>
                  User ID:
                </strong>{" "}
                <code>
                  {getUserId(
                    selectedMember,
                  ) || "Not available"}
                </code>
              </div>

              <div>
                <strong>
                  Membership ID:
                </strong>{" "}
                <code>
                  {getMembershipId(
                    selectedMember,
                  ) || "Not available"}
                </code>
              </div>

              <div>
                <strong>
                  Parent domain:
                </strong>{" "}
                <code>
                  {baseDomain.domain}
                </code>
              </div>
            </div>

            <div className="church-admin-form__actions">
              <button
                type="button"
                className="church-admin-btn church-admin-btn--ghost"
                disabled={
                  isCreatingMemberDomain
                }
                onClick={() => {
                  setSelectedMemberId("");
                  setMemberDomainInput("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="church-admin-btn church-admin-btn--primary"
                disabled={
                  isCreatingMemberDomain ||
                  !memberDomainInput.trim()
                }
              >
                {isCreatingMemberDomain
                  ? "Creating…"
                  : "Create Member Domain"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}