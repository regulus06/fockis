import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import organizationIdentityApi from "../../organization-identity/services/organizationIdentityApi";

import type {
  OrganizationDomain,
  OrganizationIdentity,
} from "../../organization-identity/types/organizationIdentity.types";

import producerApi, {
  type ProducerTeamMember,
  type ProducerTeamPermissions,
  type ProducerTeamRole,
} from "../services/producerApi";

import "../styles/MusicProducerTeam.scss";

// ============================================================================
// TYPES
// ============================================================================

type NonOwnerProducerTeamRole = Exclude<
  ProducerTeamRole,
  "owner"
>;

type PermissionKey =
  keyof ProducerTeamPermissions;

// ============================================================================
// ROLE DEFAULTS
// ============================================================================

const ROLE_DEFAULTS: Record<
  ProducerTeamRole,
  ProducerTeamPermissions
> = {
  owner: {
    profile: true,
    content: true,
    publishing: true,
    analytics: true,
    marketing: true,
    moderation: true,
    team: true,
    earnings: true,
  },

  admin: {
    profile: true,
    content: true,
    publishing: true,
    analytics: true,
    marketing: true,
    moderation: true,
    team: true,
    earnings: false,
  },

  manager: {
    profile: true,
    content: true,
    publishing: true,
    analytics: true,
    marketing: false,
    moderation: false,
    team: false,
    earnings: false,
  },

  editor: {
    profile: false,
    content: true,
    publishing: false,
    analytics: false,
    marketing: false,
    moderation: false,
    team: false,
    earnings: false,
  },

  marketing: {
    profile: false,
    content: false,
    publishing: false,
    analytics: true,
    marketing: true,
    moderation: false,
    team: false,
    earnings: false,
  },

  analyst: {
    profile: false,
    content: false,
    publishing: false,
    analytics: true,
    marketing: false,
    moderation: false,
    team: false,
    earnings: false,
  },

  moderator: {
    profile: false,
    content: true,
    publishing: false,
    analytics: false,
    marketing: false,
    moderation: true,
    team: false,
    earnings: false,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function clonePermissions(
  permissions: ProducerTeamPermissions,
): ProducerTeamPermissions {
  return {
    profile: permissions.profile,
    content: permissions.content,
    publishing: permissions.publishing,
    analytics: permissions.analytics,
    marketing: permissions.marketing,
    moderation: permissions.moderation,
    team: permissions.team,
    earnings: permissions.earnings,
  };
}

function getRoleDefinition(
  role: ProducerTeamRole,
): ProducerTeamPermissions {
  return clonePermissions(
    ROLE_DEFAULTS[role],
  );
}

function formatRole(
  role: ProducerTeamRole,
): string {
  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  );
}

function formatStatus(
  status: ProducerTeamMember["status"],
): string {
  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

function getStatusClass(
  status: ProducerTeamMember["status"],
): string {
  return `status-${status}`;
}

function getRoleClass(
  role: ProducerTeamRole,
): string {
  return `role-${role}`;
}

function getInitials(
  name: string,
): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function parseApiError(
  errorValue: unknown,
): string {
  if (
    errorValue &&
    typeof errorValue === "object"
  ) {
    const value =
      errorValue as {
        message?: unknown;
        response?: {
          data?: {
            message?: unknown;
          };
        };
      };

    const responseMessage =
      value.response?.data?.message;

    if (
      typeof responseMessage ===
        "string" &&
      responseMessage.trim()
    ) {
      return responseMessage;
    }

    if (
      Array.isArray(responseMessage)
    ) {
      return responseMessage
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .join(", ");
    }

    if (
      typeof value.message ===
        "string" &&
      value.message.trim()
    ) {
      return value.message;
    }
  }

  if (
    errorValue instanceof Error
  ) {
    return errorValue.message;
  }

  return "Something went wrong. Please try again.";
}

function isProducerAccessError(
  errorValue: unknown,
): boolean {
  const message =
    parseApiError(errorValue)
      .toLowerCase();

  return (
    message.includes("producer profile") ||
    message.includes("producer application") ||
    message.includes("become a producer") ||
    message.includes("not a producer") ||
    message.includes("producer access")
  );
}

function normalizeDomain(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function getIdentityDisplayName(
  identity: OrganizationIdentity,
): string {
  const fullName = [
    identity.firstName,
    identity.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    identity.username ||
    identity.organizationEmail
  );
}

function getDomainForIdentity(
  identity: OrganizationIdentity,
): string {
  return normalizeDomain(
    identity.domain ?? "",
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function MusicProducerTeamPage() {
  const {
    organizationId = "",
  } = useParams<{
    organizationId: string;
  }>();

  // ==========================================================================
  // CREATOR TEAM
  // ==========================================================================

  const [members, setMembers] =
    useState<ProducerTeamMember[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [producerRequired, setProducerRequired] =
    useState(false);

  // ==========================================================================
  // ORGANIZATION IDENTITY
  // ==========================================================================

  const [organizationMembers, setOrganizationMembers] =
    useState<OrganizationIdentity[]>([]);

  const [organizationDomains, setOrganizationDomains] =
    useState<OrganizationDomain[]>([]);

  const [organizationLoading, setOrganizationLoading] =
    useState(false);

  const [organizationError, setOrganizationError] =
    useState("");

  // ==========================================================================
  // MODAL
  // ==========================================================================

  const [showInvite, setShowInvite] =
    useState(false);

  const [editingMember, setEditingMember] =
    useState<ProducerTeamMember | null>(
      null,
    );

  const [
    selectedOrganizationIdentityId,
    setSelectedOrganizationIdentityId,
  ] = useState("");

  const [selectedRole, setSelectedRole] =
    useState<NonOwnerProducerTeamRole>(
      "editor",
    );

  const [customPermissions, setCustomPermissions] =
    useState<ProducerTeamPermissions>(
      getRoleDefinition("editor"),
    );

  const [saving, setSaving] =
    useState(false);

  // ==========================================================================
  // LOAD CREATOR TEAM
  // ==========================================================================

  const loadTeam = useCallback(
    async (
      showLoader = true,
    ) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");
      setProducerRequired(false);

      try {
        const result =
          await producerApi.getTeam();

        /*
         * producerApi.getTeam() returns:
         *
         * ProducerTeamMember[]
         *
         * NOT:
         *
         * { members: ProducerTeamMember[] }
         */
        setMembers(
          Array.isArray(result)
            ? result
            : [],
        );
      } catch (errorValue) {
        if (
          isProducerAccessError(
            errorValue,
          )
        ) {
          setProducerRequired(true);
          setMembers([]);
        } else {
          setError(
            parseApiError(errorValue),
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // ==========================================================================
  // LOAD ORGANIZATION MEMBERS + DOMAINS
  // ==========================================================================

  const loadOrganizationData =
    useCallback(async () => {
      if (!organizationId.trim()) {
        setOrganizationMembers([]);
        setOrganizationDomains([]);

        setOrganizationError(
          "An organization is required to manage organization Creator Team members.",
        );

        return;
      }

      setOrganizationLoading(true);
      setOrganizationError("");

      try {
        const [
          loadedMembers,
          loadedDomains,
        ] = await Promise.all([
          organizationIdentityApi.getUsers(
            organizationId,
          ),
          organizationIdentityApi.getDomains(
            organizationId,
          ),
        ]);

        setOrganizationMembers(
          loadedMembers ?? [],
        );

        setOrganizationDomains(
          loadedDomains ?? [],
        );
      } catch (errorValue) {
        setOrganizationMembers([]);
        setOrganizationDomains([]);

        setOrganizationError(
          parseApiError(errorValue),
        );
      } finally {
        setOrganizationLoading(false);
      }
    }, [organizationId]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    void loadOrganizationData();
  }, [loadOrganizationData]);

  // ==========================================================================
  // REGISTERED ORGANIZATION DOMAIN
  // ==========================================================================

  const organizationDomain =
    useMemo(() => {
      const verifiedDomains =
        organizationDomains.filter(
          (domain) =>
            domain.status ===
            "verified",
        );

      const organizationTypedDomain =
        organizationDomains.find(
          (domain) => {
            const value =
              domain as OrganizationDomain & {
                domainType?: string;
              };

            return (
              domain.status ===
                "verified" &&
              value.domainType ===
                "organization"
            );
          },
        );

      if (
        organizationTypedDomain
      ) {
        return organizationTypedDomain;
      }

      const unassignedVerifiedDomain =
        verifiedDomains.find(
          (domain) => {
            const value =
              domain as OrganizationDomain & {
                domainType?: string;
                parentDomainId?: string | null;
                assignedUserId?: string | null;
                assignedMembershipId?: string | null;
              };

            return (
              value.domainType !==
                "member" &&
              !value.parentDomainId &&
              !value.assignedUserId &&
              !value.assignedMembershipId
            );
          },
        );

      return (
        unassignedVerifiedDomain ??
        verifiedDomains[0] ??
        null
      );
    }, [organizationDomains]);

  const registeredDomain =
    organizationDomain
      ? normalizeDomain(
          organizationDomain.domain,
        )
      : "";

  // ==========================================================================
  // ELIGIBLE ORGANIZATION MEMBERS
  // ==========================================================================

  const eligibleOrganizationMembers =
    useMemo(() => {
      const existingEmails =
        new Set(
          members
            .map((member) =>
              member.email
                ?.trim()
                .toLowerCase(),
            )
            .filter(Boolean),
        );

      const existingUserIds =
        new Set(
          members
            .map(
              (member) =>
                member.userId
                  ?.trim(),
            )
            .filter(Boolean),
        );

      return organizationMembers
        .filter((identity) => {
          if (
            identity.status !==
            "active"
          ) {
            return false;
          }

          if (
            !identity.organizationEmail?.trim()
          ) {
            return false;
          }

          const email =
            identity.organizationEmail
              .trim()
              .toLowerCase();

          if (
            existingEmails.has(
              email,
            )
          ) {
            return false;
          }

          if (
            identity.userId &&
            existingUserIds.has(
              identity.userId,
            )
          ) {
            return false;
          }

          if (!registeredDomain) {
            return true;
          }

          const identityDomain =
            getDomainForIdentity(
              identity,
            );

          if (identityDomain) {
            return (
              identityDomain ===
                registeredDomain ||
              identityDomain.endsWith(
                `.${registeredDomain}`,
              )
            );
          }

          return email.endsWith(
            `@${registeredDomain}`,
          );
        })
        .sort((a, b) =>
          getIdentityDisplayName(
            a,
          ).localeCompare(
            getIdentityDisplayName(
              b,
            ),
          ),
        );
    }, [
      organizationMembers,
      members,
      registeredDomain,
    ]);

  // ==========================================================================
  // STATS
  // ==========================================================================

  const teamStats =
    useMemo(() => {
      const total =
        members.length;

      const active =
        members.filter(
          (member) =>
            member.status ===
            "active",
        ).length;

      const invited =
        members.filter(
          (member) =>
            member.status ===
            "invited",
        ).length;

      const suspended =
        members.filter(
          (member) =>
            member.status ===
            "suspended",
        ).length;

      const admins =
        members.filter(
          (member) =>
            member.role ===
              "admin" ||
            member.role ===
              "owner",
        ).length;

      return {
        total,
        active,
        invited,
        suspended,
        admins,
      };
    }, [members]);

  // ==========================================================================
  // SELECTED ORGANIZATION MEMBER
  // ==========================================================================

  const selectedOrganizationMember =
    useMemo(() => {
      if (
        !selectedOrganizationIdentityId
      ) {
        return null;
      }

      return (
        organizationMembers.find(
          (identity) =>
            identity.id ===
            selectedOrganizationIdentityId,
        ) ?? null
      );
    }, [
      organizationMembers,
      selectedOrganizationIdentityId,
    ]);

  // ==========================================================================
  // OPEN INVITE
  // ==========================================================================

  const openInvite =
    useCallback(() => {
      setEditingMember(null);

      setSelectedOrganizationIdentityId(
        "",
      );

      setSelectedRole("editor");

      setCustomPermissions(
        getRoleDefinition("editor"),
      );

      setError("");
      setSuccess("");
      setShowInvite(true);
    }, []);

  // ==========================================================================
  // OPEN EDIT
  // ==========================================================================

  const openEdit =
    useCallback(
      (member: ProducerTeamMember) => {
        setEditingMember(member);

        setSelectedOrganizationIdentityId(
          "",
        );

        const role =
          member.role === "owner"
            ? "admin"
            : member.role;

        setSelectedRole(
          role as NonOwnerProducerTeamRole,
        );

        setCustomPermissions(
          clonePermissions(
            member.permissions,
          ),
        );

        setError("");
        setSuccess("");
        setShowInvite(true);
      },
      [],
    );

  // ==========================================================================
  // CLOSE MODAL
  // ==========================================================================

  const closeModal =
    useCallback(() => {
      if (saving) {
        return;
      }

      setShowInvite(false);
      setEditingMember(null);

      setSelectedOrganizationIdentityId(
        "",
      );

      setError("");
    }, [saving]);

  // ==========================================================================
  // ROLE CHANGE
  // ==========================================================================

  const handleRoleChange =
    useCallback(
      (
        role: NonOwnerProducerTeamRole,
      ) => {
        setSelectedRole(role);

        setCustomPermissions(
          getRoleDefinition(role),
        );
      },
      [],
    );

  // ==========================================================================
  // PERMISSION CHANGE
  // ==========================================================================

  const handlePermissionChange =
    useCallback(
      (
        key: PermissionKey,
      ) => {
        setCustomPermissions(
          (current) => ({
            ...current,
            [key]: !current[key],
          }),
        );
      },
      [],
    );

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  const handleInviteSubmit =
    useCallback(
      async (
        event: FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        // --------------------------------------------------------------------
        // EDIT EXISTING TEAM MEMBER
        // --------------------------------------------------------------------

        if (editingMember) {
          setSaving(true);

          try {
            await producerApi.updateTeamMember(
              editingMember.id,
              {
                role: selectedRole,
                permissions:
                  customPermissions,
              },
            );

            setSuccess(
              `${editingMember.name} has been updated.`,
            );

            setShowInvite(false);
            setEditingMember(null);

            await loadTeam(false);
          } catch (errorValue) {
            setError(
              parseApiError(errorValue),
            );
          } finally {
            setSaving(false);
          }

          return;
        }

        // --------------------------------------------------------------------
        // ORGANIZATION REQUIRED
        // --------------------------------------------------------------------

        if (!organizationId.trim()) {
          setError(
            "This Creator Team must be managed from an organization.",
          );

          return;
        }

        // --------------------------------------------------------------------
        // DOMAIN REQUIRED
        // --------------------------------------------------------------------

        if (!registeredDomain) {
          setError(
            "Your organization does not have a verified organization domain yet. Register and verify the organization domain before adding Creator Team members.",
          );

          return;
        }

        // --------------------------------------------------------------------
        // MEMBER REQUIRED
        // --------------------------------------------------------------------

        if (
          !selectedOrganizationIdentityId
        ) {
          setError(
            "Select an existing organization member.",
          );

          return;
        }

        // --------------------------------------------------------------------
        // FIND SELECTED MEMBER
        // --------------------------------------------------------------------

        const selectedMember =
          organizationMembers.find(
            (identity) =>
              identity.id ===
              selectedOrganizationIdentityId,
          );

        if (!selectedMember) {
          setError(
            "The selected organization member could not be found.",
          );

          return;
        }

        // --------------------------------------------------------------------
        // ACTIVE MEMBER
        // --------------------------------------------------------------------

        if (
          selectedMember.status !==
          "active"
        ) {
          setError(
            "Only active organization members can be added to the Creator Team.",
          );

          return;
        }

        // --------------------------------------------------------------------
        // ORGANIZATION EMAIL
        // --------------------------------------------------------------------

        const organizationEmail =
          selectedMember.organizationEmail
            ?.trim()
            .toLowerCase();

        if (!organizationEmail) {
          setError(
            "The selected organization member does not have an organization email.",
          );

          return;
        }

        // --------------------------------------------------------------------
        // DOMAIN VALIDATION
        // --------------------------------------------------------------------

        const memberDomain =
          getDomainForIdentity(
            selectedMember,
          );

        const emailBelongsToDomain =
          organizationEmail.endsWith(
            `@${registeredDomain}`,
          );

        const identityBelongsToDomain =
          !memberDomain ||
          memberDomain ===
            registeredDomain ||
          memberDomain.endsWith(
            `.${registeredDomain}`,
          );

        if (
          !emailBelongsToDomain ||
          !identityBelongsToDomain
        ) {
          setError(
            `The selected organization member does not belong to the registered organization domain ${registeredDomain}.`,
          );

          return;
        }

        // --------------------------------------------------------------------
        // DUPLICATE
        // --------------------------------------------------------------------

        const duplicate =
          members.some(
            (member) =>
              member.email
                ?.trim()
                .toLowerCase() ===
              organizationEmail,
          );

        if (duplicate) {
          setError(
            "This organization member is already on the Creator Team.",
          );

          return;
        }

        // --------------------------------------------------------------------
        // CREATE TEAM MEMBER
        // --------------------------------------------------------------------

        setSaving(true);

        try {
          await producerApi.inviteTeamMember(
            {
              organizationIdentityId:
                selectedMember.id,

              email:
                organizationEmail,

              role:
                selectedRole,

              permissions:
                customPermissions,
            },
          );

          setSuccess(
            `${getIdentityDisplayName(
              selectedMember,
            )} has been added to the Creator Team.`,
          );

          setShowInvite(false);

          setSelectedOrganizationIdentityId(
            "",
          );

          setSelectedRole("editor");

          setCustomPermissions(
            getRoleDefinition("editor"),
          );

          await loadTeam(false);
        } catch (errorValue) {
          setError(
            parseApiError(errorValue),
          );
        } finally {
          setSaving(false);
        }
      },
      [
        editingMember,
        selectedRole,
        customPermissions,
        organizationId,
        registeredDomain,
        selectedOrganizationIdentityId,
        organizationMembers,
        members,
        loadTeam,
      ],
    );

  // ==========================================================================
  // SUSPEND / RESTORE
  // ==========================================================================

  const handleToggleStatus =
    useCallback(
      async (
        member: ProducerTeamMember,
      ) => {
        if (
          member.role === "owner"
        ) {
          return;
        }

        setError("");
        setSuccess("");

        try {
          if (
            member.status ===
            "suspended"
          ) {
            await producerApi.restoreTeamMember(
              member.id,
            );

            setSuccess(
              `${member.name} has been restored.`,
            );
          } else {
            await producerApi.suspendTeamMember(
              member.id,
            );

            setSuccess(
              `${member.name} has been suspended.`,
            );
          }

          await loadTeam(false);
        } catch (errorValue) {
          setError(
            parseApiError(errorValue),
          );
        }
      },
      [loadTeam],
    );

  // ==========================================================================
  // CANCEL INVITATION
  // ==========================================================================

  const handleCancelInvitation =
    useCallback(
      async (
        member: ProducerTeamMember,
      ) => {
        if (
          member.status !==
          "invited"
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            `Cancel the invitation for ${member.name}?`,
          );

        if (!confirmed) {
          return;
        }

        setError("");
        setSuccess("");

        try {
          await producerApi.removeTeamMember(
            member.id,
          );

          setSuccess(
            `The invitation for ${member.name} was cancelled.`,
          );

          await loadTeam(false);
        } catch (errorValue) {
          setError(
            parseApiError(errorValue),
          );
        }
      },
      [loadTeam],
    );

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  const handleRemove =
    useCallback(
      async (
        member: ProducerTeamMember,
      ) => {
        if (
          member.role === "owner"
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            `Remove ${member.name} from the Creator Team?`,
          );

        if (!confirmed) {
          return;
        }

        setError("");
        setSuccess("");

        try {
          await producerApi.removeTeamMember(
            member.id,
          );

          setSuccess(
            `${member.name} was removed from the Creator Team.`,
          );

          await loadTeam(false);
        } catch (errorValue) {
          setError(
            parseApiError(errorValue),
          );
        }
      },
      [loadTeam],
    );

  // ==========================================================================
  // PERMISSION LABELS
  // ==========================================================================

  const permissionLabels: Record<
    PermissionKey,
    string
  > = {
    profile: "Profile",
    content: "Content",
    publishing: "Publishing",
    analytics: "Analytics",
    marketing: "Marketing",
    moderation: "Moderation",
    team: "Team",
    earnings: "Earnings",
  };

  // ==========================================================================
  // PRODUCER ACCESS
  // ==========================================================================

  if (producerRequired) {
    return (
      <main className="music-producer-team">
        <section className="music-producer-team__empty">
          <div className="music-producer-team__empty-icon">
            🎵
          </div>

          <h1>
            Creator Team
          </h1>

          <p>
            You need an approved producer
            profile before you can manage a
            Creator Team.
          </p>

          <Link
            to="/music/become-producer"
            className="music-producer-team__primary-button"
          >
            Become a Producer
          </Link>
        </section>
      </main>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <main className="music-producer-team">
      <div className="music-producer-team__container">

        {/* HEADER */}

        <header className="music-producer-team__header">
          <div>
            <div className="music-producer-team__eyebrow">
              Fockis Music
            </div>

            <h1>
              Creator Team
            </h1>

            <p>
              Manage the people who help
              operate your music producer
              profile, content, publishing,
              analytics, and marketing.
            </p>

            {organizationId && (
              <div className="music-producer-team__organization">
                <span>
                  Organization
                </span>

                <strong>
                  {organizationId}
                </strong>
              </div>
            )}
          </div>

          <div className="music-producer-team__header-actions">
            <Link
              to={
                organizationId
                  ? `/organizations/${organizationId}/music/producer/profile`
                  : "/music/producer/profile"
              }
              className="music-producer-team__secondary-button"
            >
              Producer Profile
            </Link>

            <Link
              to="/music/studio"
              className="music-producer-team__secondary-button"
            >
              Creator Manager
            </Link>

            <button
              type="button"
              className="music-producer-team__primary-button"
              onClick={openInvite}
              disabled={
                !organizationId ||
                organizationLoading ||
                !registeredDomain
              }
            >
              + Add Organization Member
            </button>
          </div>
        </header>

        {/* DOMAIN */}

        <section className="music-producer-team__domain-card">
          <div className="music-producer-team__domain-icon">
            @
          </div>

          <div className="music-producer-team__domain-content">
            <span className="music-producer-team__domain-label">
              Registered Organization Domain
            </span>

            {organizationLoading ? (
              <strong>
                Loading organization...
              </strong>
            ) : registeredDomain ? (
              <>
                <strong>
                  {registeredDomain}
                </strong>

                <small>
                  Creator Team members are
                  selected from active
                  organization identities
                  belonging to this domain.
                </small>
              </>
            ) : (
              <>
                <strong>
                  No verified organization
                  domain
                </strong>

                <small>
                  Register and verify your
                  organization's Fockis domain
                  before adding Creator Team
                  members.
                </small>
              </>
            )}
          </div>

          {organizationId && (
            <Link
              to={`/organizations/${organizationId}/identity/domains`}
              className="music-producer-team__domain-link"
            >
              Manage Domain
            </Link>
          )}
        </section>

        {/* ALERTS */}

        {organizationError && (
          <div className="music-producer-team__alert music-producer-team__alert--error">
            <strong>
              Organization Identity
            </strong>

            <span>
              {organizationError}
            </span>

            <button
              type="button"
              onClick={() =>
                void loadOrganizationData()
              }
            >
              Retry
            </button>
          </div>
        )}

        {error && (
          <div className="music-producer-team__alert music-producer-team__alert--error">
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="music-producer-team__alert music-producer-team__alert--success">
            <span>
              {success}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STATS */}

        <section className="music-producer-team__stats">
          <div className="music-producer-team__stat-card">
            <span>
              Total Members
            </span>

            <strong>
              {teamStats.total}
            </strong>
          </div>

          <div className="music-producer-team__stat-card">
            <span>
              Active
            </span>

            <strong>
              {teamStats.active}
            </strong>
          </div>

          <div className="music-producer-team__stat-card">
            <span>
              Invited
            </span>

            <strong>
              {teamStats.invited}
            </strong>
          </div>

          <div className="music-producer-team__stat-card">
            <span>
              Suspended
            </span>

            <strong>
              {teamStats.suspended}
            </strong>
          </div>

          <div className="music-producer-team__stat-card">
            <span>
              Admins
            </span>

            <strong>
              {teamStats.admins}
            </strong>
          </div>
        </section>

        {/* TEAM */}

        <section className="music-producer-team__panel">
          <div className="music-producer-team__panel-header">
            <div>
              <h2>
                Creator Team Members
              </h2>

              <p>
                Organization members assigned
                to your Creator Team.
              </p>
            </div>

            <button
              type="button"
              className="music-producer-team__refresh-button"
              onClick={() =>
                void loadTeam(false)
              }
              disabled={
                refreshing
              }
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="music-producer-team__loading">
              <div className="music-producer-team__spinner" />

              <span>
                Loading Creator Team...
              </span>
            </div>
          ) : members.length === 0 ? (
            <div className="music-producer-team__empty-table">
              <div className="music-producer-team__empty-icon">
                👥
              </div>

              <h3>
                No Creator Team members yet
              </h3>

              <p>
                Select an existing organization
                member and assign a Creator Team
                role.
              </p>

              <button
                type="button"
                className="music-producer-team__primary-button"
                onClick={openInvite}
                disabled={
                  !organizationId ||
                  !registeredDomain
                }
              >
                Add Organization Member
              </button>
            </div>
          ) : (
            <div className="music-producer-team__table-wrapper">
              <table className="music-producer-team__table">
                <thead>
                  <tr>
                    <th>
                      Member
                    </th>

                    <th>
                      Role
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Permissions
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {members.map(
                    (member) => (
                      <tr
                        key={
                          member.id
                        }
                      >
                        <td>
                          <div className="music-producer-team__member">
                            <div className="music-producer-team__avatar">
                              {getInitials(
                                member.name,
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  member.name
                                }
                              </strong>

                              <span>
                                {
                                  member.email
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`music-producer-team__role ${getRoleClass(
                              member.role,
                            )}`}
                          >
                            {formatRole(
                              member.role,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`music-producer-team__status ${getStatusClass(
                              member.status,
                            )}`}
                          >
                            {formatStatus(
                              member.status,
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="music-producer-team__permissions">
                            {(
                              Object.keys(
                                permissionLabels,
                              ) as PermissionKey[]
                            )
                              .filter(
                                (
                                  key,
                                ) =>
                                  member
                                    .permissions[
                                    key
                                  ],
                              )
                              .map(
                                (
                                  key,
                                ) => (
                                  <span
                                    key={
                                      key
                                    }
                                  >
                                    {
                                      permissionLabels[
                                        key
                                      ]
                                    }
                                  </span>
                                ),
                              )}
                          </div>
                        </td>

                        <td>
                          <div className="music-producer-team__actions">
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  member,
                                )
                              }
                            >
                              Edit
                            </button>

                            {member.role !==
                              "owner" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleToggleStatus(
                                    member,
                                  )
                                }
                              >
                                {member.status ===
                                "suspended"
                                  ? "Restore"
                                  : "Suspend"}
                              </button>
                            )}

                            {member.status ===
                              "invited" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCancelInvitation(
                                    member,
                                  )
                                }
                              >
                                Cancel
                              </button>
                            )}

                            {member.role !==
                              "owner" && (
                              <button
                                type="button"
                                className="music-producer-team__danger-action"
                                onClick={() =>
                                  void handleRemove(
                                    member,
                                  )
                                }
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ROLE GUIDE */}

        <section className="music-producer-team__role-guide">
          <div className="music-producer-team__panel-header">
            <div>
              <h2>
                Creator Team Roles
              </h2>

              <p>
                Assign the appropriate level
                of access to each organization
                member.
              </p>
            </div>
          </div>

          <div className="music-producer-team__role-grid">
            {(
              [
                "admin",
                "manager",
                "editor",
                "marketing",
                "analyst",
                "moderator",
              ] as NonOwnerProducerTeamRole[]
            ).map((role) => {
              const permissions =
                ROLE_DEFAULTS[role];

              const enabledPermissions =
                (
                  Object.keys(
                    permissionLabels,
                  ) as PermissionKey[]
                ).filter(
                  (key) =>
                    permissions[key],
                );

              return (
                <article
                  key={role}
                  className="music-producer-team__role-card"
                >
                  <div className="music-producer-team__role-card-header">
                    <span
                      className={`music-producer-team__role ${getRoleClass(
                        role,
                      )}`}
                    >
                      {formatRole(
                        role,
                      )}
                    </span>
                  </div>

                  <div className="music-producer-team__role-card-permissions">
                    {enabledPermissions.map(
                      (key) => (
                        <span
                          key={key}
                        >
                          ✓{" "}
                          {
                            permissionLabels[
                              key
                            ]
                          }
                        </span>
                      ),
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* SECURITY */}

        <section className="music-producer-team__security">
          <div className="music-producer-team__security-icon">
            🔐
          </div>

          <div>
            <h3>
              Organization-based access
            </h3>

            <p>
              Creator Team members are selected
              from your organization's existing
              identities. The organization domain
              controls which accounts can be
              assigned to this team.
            </p>
          </div>
        </section>
      </div>

      {/* MODAL */}

      {showInvite && (
        <div
          className="music-producer-team__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="music-producer-team__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="creator-team-modal-title"
          >
            <div className="music-producer-team__modal-header">
              <div>
                <span className="music-producer-team__eyebrow">
                  {editingMember
                    ? "Creator Team"
                    : "Organization Identity"}
                </span>

                <h2 id="creator-team-modal-title">
                  {editingMember
                    ? "Edit Team Member"
                    : "Add Organization Member"}
                </h2>

                {!editingMember &&
                  registeredDomain && (
                    <p>
                      Select an existing member
                      from{" "}
                      <strong>
                        {registeredDomain}
                      </strong>
                      .
                    </p>
                  )}
              </div>

              <button
                type="button"
                className="music-producer-team__modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleInviteSubmit
              }
            >
              {!editingMember && (
                <div className="music-producer-team__form-group">
                  <label htmlFor="organization-member">
                    Organization Member
                  </label>

                  {organizationLoading ? (
                    <div className="music-producer-team__select-loading">
                      Loading organization
                      members...
                    </div>
                  ) : eligibleOrganizationMembers.length ===
                    0 ? (
                    <div className="music-producer-team__no-members">
                      <strong>
                        No eligible organization
                        members found.
                      </strong>

                      <span>
                        Create an organization
                        member first, then return
                        here to assign them to the
                        Creator Team.
                      </span>

                      {organizationId && (
                        <Link
                          to={`/organizations/${organizationId}/identity/users/new`}
                          onClick={
                            closeModal
                          }
                        >
                          Create Organization
                          Member
                        </Link>
                      )}
                    </div>
                  ) : (
                    <select
                      id="organization-member"
                      value={
                        selectedOrganizationIdentityId
                      }
                      onChange={(event) =>
                        setSelectedOrganizationIdentityId(
                          event.target.value,
                        )
                      }
                      disabled={
                        saving
                      }
                      required
                    >
                      <option value="">
                        Select an organization
                        member...
                      </option>

                      {eligibleOrganizationMembers.map(
                        (
                          identity,
                        ) => (
                          <option
                            key={
                              identity.id
                            }
                            value={
                              identity.id
                            }
                          >
                            {getIdentityDisplayName(
                              identity,
                            )}{" "}
                            —{" "}
                            {
                              identity.organizationEmail
                            }
                          </option>
                        ),
                      )}
                    </select>
                  )}

                  {selectedOrganizationMember && (
                    <div className="music-producer-team__selected-member">
                      <div className="music-producer-team__avatar">
                        {getInitials(
                          getIdentityDisplayName(
                            selectedOrganizationMember,
                          ),
                        )}
                      </div>

                      <div>
                        <strong>
                          {getIdentityDisplayName(
                            selectedOrganizationMember,
                          )}
                        </strong>

                        <span>
                          {
                            selectedOrganizationMember.organizationEmail
                          }
                        </span>

                        {selectedOrganizationMember.department && (
                          <small>
                            {
                              selectedOrganizationMember.department
                            }
                          </small>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingMember && (
                <div className="music-producer-team__editing-member">
                  <div className="music-producer-team__avatar">
                    {getInitials(
                      editingMember.name,
                    )}
                  </div>

                  <div>
                    <strong>
                      {
                        editingMember.name
                      }
                    </strong>

                    <span>
                      {
                        editingMember.email
                      }
                    </span>
                  </div>
                </div>
              )}

              <div className="music-producer-team__form-group">
                <label htmlFor="creator-team-role">
                  Creator Team Role
                </label>

                <select
                  id="creator-team-role"
                  value={selectedRole}
                  onChange={(event) =>
                    handleRoleChange(
                      event.target
                        .value as NonOwnerProducerTeamRole,
                    )
                  }
                  disabled={
                    saving ||
                    editingMember?.role ===
                      "owner"
                  }
                >
                  <option value="admin">
                    Admin
                  </option>

                  <option value="manager">
                    Manager
                  </option>

                  <option value="editor">
                    Editor
                  </option>

                  <option value="marketing">
                    Marketing
                  </option>

                  <option value="analyst">
                    Analyst
                  </option>

                  <option value="moderator">
                    Moderator
                  </option>
                </select>
              </div>

              <div className="music-producer-team__form-group">
                <div className="music-producer-team__permission-heading">
                  <div>
                    <label>
                      Permissions
                    </label>

                    <small>
                      Adjust the permissions
                      granted to this Creator Team
                      member.
                    </small>
                  </div>
                </div>

                <div className="music-producer-team__permission-grid">
                  {(
                    Object.keys(
                      permissionLabels,
                    ) as PermissionKey[]
                  ).map((key) => (
                    <label
                      key={key}
                      className="music-producer-team__permission"
                    >
                      <input
                        type="checkbox"
                        checked={
                          customPermissions[
                            key
                          ]
                        }
                        onChange={() =>
                          handlePermissionChange(
                            key,
                          )
                        }
                        disabled={
                          saving ||
                          editingMember?.role ===
                            "owner"
                        }
                      />

                      <span>
                        {
                          permissionLabels[
                            key
                          ]
                        }
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="music-producer-team__modal-footer">
                <button
                  type="button"
                  className="music-producer-team__secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="music-producer-team__primary-button"
                  disabled={
                    saving ||
                    (
                      !editingMember &&
                      (
                        !organizationId ||
                        !registeredDomain ||
                        !selectedOrganizationIdentityId ||
                        eligibleOrganizationMembers.length ===
                          0
                      )
                    )
                  }
                >
                  {saving
                    ? "Saving..."
                    : editingMember
                      ? "Save Changes"
                      : "Add to Creator Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}