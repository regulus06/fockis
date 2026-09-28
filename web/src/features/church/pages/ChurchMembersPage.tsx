import {
useCallback,
useEffect,
useMemo,
useState,
} from "react";

import {
useParams,
useSearchParams,
} from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import ChurchSidebar from "../components/ChurchSidebar";
import MemberCard from "../components/MemberCard";

import {
approveMembershipRequest,
disableMember,
enableMember,
getMyMembership,
listMembers,
rejectMembershipRequest,
removeMember,
} from "../api/membersApi";

import {
MEMBER_ROLE_LABELS,
MEMBERSHIP_STATUS_LABELS,
MemberRole,
MembershipStatus,
type Member,
} from "../types/church.types";

import {
useFockisTranslation,
} from "../../../i18n/useFockisTranslation";

import "../styles/ChurchOrganizationPage.scss";

/* ============================================================================

FOCKIS ORGANIZATION MEMBER DIRECTORY
============================================================================
Compatibility:
This page remains under features/church so existing imports and routes
continue to work.
The UI is organization-neutral:
Church
School
Business
Nonprofit
Ministry
Community
Club
Team
Association
Other organizations
Backend authorization remains authoritative.
Frontend permissions only determine which controls are displayed.
========================================================================== */

/* ============================================================================

PERMISSIONS
========================================================================== */

const PERMISSION_APPROVE_MEMBER =
"approve_member";

const PERMISSION_UPDATE_MEMBER =
"update_member";

const PERMISSION_REMOVE_MEMBER =
"remove_member";

/* ============================================================================

HELPERS
========================================================================== */

function isAbortError(
error: unknown,
): boolean {
if (
typeof DOMException !== "undefined" &&
error instanceof DOMException
) {
return error.name === "AbortError";
}

return (
error instanceof Error &&
error.name === "AbortError"
);
}

function getErrorMessage(
error: unknown,
fallback: string,
): string {
if (
error instanceof Error &&
error.message.trim()
) {
return error.message;
}

if (
typeof error === "string" &&
error.trim()
) {
return error;
}

if (
typeof error === "object" &&
error !== null &&
"message" in error
) {
const message =
(
error as {
message?: unknown;
}
).message;

if (
  typeof message === "string" &&
  message.trim()
) {
  return message;
}

}

return fallback;
}

function getTranslatedValue(
t: (
key: string,
variables?: Record<
string,
string | number
>,
) => string,
key: string,
fallback: string,
): string {
const translated = t(key);

return translated === key
? fallback
: translated;
}

/* ============================================================================

PAGE
========================================================================== */

export default function OrganizationMembersPage() {
const { t } =
useFockisTranslation();

const {
organizationId: rawOrganizationId,
} =
useParams<{
organizationId: string;
}>();

const organizationId =
rawOrganizationId?.trim() ?? "";

const [
searchParams,
setSearchParams,
] = useSearchParams();

/* ==========================================================================
FILTERS
======================================================================== */

const search =
searchParams.get("search") ?? "";

const statusParam =
searchParams.get("status");

const roleParam =
searchParams.get("role");

const status =
statusParam &&
Object.values(
MembershipStatus,
).includes(
statusParam as MembershipStatus,
)
? (statusParam as MembershipStatus)
: undefined;

const role =
roleParam &&
Object.values(
MemberRole,
).includes(
roleParam as MemberRole,
)
? (roleParam as MemberRole)
: undefined;

/* ==========================================================================
DATA
======================================================================== */

const [
members,
setMembers,
] = useState<Member[]>([]);

const [
total,
setTotal,
] = useState(0);

/* ==========================================================================
LOADING
======================================================================== */

const [
isLoading,
setIsLoading,
] = useState(true);

const [
isLoadingMembership,
setIsLoadingMembership,
] = useState(true);

/* ==========================================================================
ERRORS
======================================================================== */

const [
error,
setError,
] = useState<string | null>(
null,
);

const [
actionError,
setActionError,
] = useState<string | null>(
null,
);

/* ==========================================================================
CURRENT USER MEMBERSHIP
======================================================================== */

const [
currentMembership,
setCurrentMembership,
] = useState<Member | null>(
null,
);

/* ==========================================================================
ACTION STATE
======================================================================== */

const [
updatingMemberId,
setUpdatingMemberId,
] = useState<string | null>(
null,
);

const [
removingMemberId,
setRemovingMemberId,
] = useState<string | null>(
null,
);

/* ==========================================================================
CURRENT USER PERMISSIONS
======================================================================== */

const currentPermissions =
useMemo(() => {
if (!currentMembership) {
return new Set<string>();
}

  if (
    currentMembership.isOwner
  ) {
    return new Set<string>([
      PERMISSION_APPROVE_MEMBER,
      PERMISSION_UPDATE_MEMBER,
      PERMISSION_REMOVE_MEMBER,
    ]);
  }

  return new Set<string>(
    Array.isArray(
      currentMembership.permissions,
    )
      ? currentMembership.permissions
      : [],
  );
}, [
  currentMembership,
]);

const isOwner =
currentMembership?.isOwner ===
true;

const canApprove =
isOwner ||
currentPermissions.has(
PERMISSION_APPROVE_MEMBER,
);

const canUpdate =
isOwner ||
currentPermissions.has(
PERMISSION_UPDATE_MEMBER,
);

const canRemove =
isOwner ||
currentPermissions.has(
PERMISSION_REMOVE_MEMBER,
);

/* ==========================================================================
CURRENT USER MEMBERSHIP
======================================================================== */

const loadCurrentMembership =
useCallback(
async (
signal?: AbortSignal,
): Promise<void> => {
if (!organizationId) {
setCurrentMembership(
null,
);

      setIsLoadingMembership(
        false,
      );

      return;
    }

    setIsLoadingMembership(
      true,
    );

    try {
      const membership =
        await getMyMembership(
          organizationId,
          signal,
        );

      if (
        signal?.aborted
      ) {
        return;
      }

      setCurrentMembership(
        membership ?? null,
      );
    } catch (err) {
      if (
        isAbortError(err)
      ) {
        return;
      }

      if (
        !signal?.aborted
      ) {
        setCurrentMembership(
          null,
        );
      }
    } finally {
      if (
        !signal?.aborted
      ) {
        setIsLoadingMembership(
          false,
        );
      }
    }
  },
  [
    organizationId,
  ],
);

useEffect(() => {
const controller =
new AbortController();

void loadCurrentMembership(
  controller.signal,
);

return () => {
  controller.abort();
};

}, [
loadCurrentMembership,
]);

/* ==========================================================================
LOAD MEMBERS
======================================================================== */

const loadMembers =
useCallback(
async (
signal?: AbortSignal,
): Promise<void> => {
if (!organizationId) {
setMembers([]);
setTotal(0);
setError(
t(
"church.organization.members.invalidOrganization",
),
);
setIsLoading(false);

      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result =
        await listMembers(
          organizationId,
          {
            search:
              search.trim() ||
              undefined,

            status,

            role,

            pageSize: 24,
          },
          signal,
        );

      if (
        signal?.aborted
      ) {
        return;
      }

      setMembers(
        Array.isArray(
          result?.items,
        )
          ? result.items
          : [],
      );

      setTotal(
        Number.isFinite(
          result?.total,
        )
          ? result.total
          : 0,
      );
    } catch (err) {
      if (
        isAbortError(err)
      ) {
        return;
      }

      if (
        !signal?.aborted
      ) {
        setError(
          getErrorMessage(
            err,
            t(
              "church.organization.members.loadError",
            ),
          ),
        );
      }
    } finally {
      if (
        !signal?.aborted
      ) {
        setIsLoading(false);
      }
    }
  },
  [
    organizationId,
    search,
    status,
    role,
    t,
  ],
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

}, [
loadMembers,
]);

/* ==========================================================================
FILTER UPDATE
======================================================================== */

const updateParam =
useCallback(
(
key: string,
value: string | null,
): void => {
const next =
new URLSearchParams(
searchParams,
);

    if (
      value &&
      value.trim()
    ) {
      next.set(
        key,
        value,
      );
    } else {
      next.delete(key);
    }

    setSearchParams(next);
  },
  [
    searchParams,
    setSearchParams,
  ],
);

/* ==========================================================================
REFRESH
======================================================================== */

const refreshMembers =
useCallback(
async (): Promise<void> => {
if (!organizationId) {
return;
}

    setActionError(null);

    try {
      const result =
        await listMembers(
          organizationId,
          {
            search:
              search.trim() ||
              undefined,

            status,

            role,

            pageSize: 24,
          },
        );

      setMembers(
        Array.isArray(
          result?.items,
        )
          ? result.items
          : [],
      );

      setTotal(
        Number.isFinite(
          result?.total,
        )
          ? result.total
          : 0,
      );
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          t(
            "church.organization.members.refreshError",
          ),
        ),
      );
    }
  },
  [
    organizationId,
    search,
    status,
    role,
    t,
  ],
);

/* ==========================================================================
MEMBER PROTECTION
======================================================================== */

const isTargetOwner =
useCallback(
(
member: Member,
): boolean =>
member.isOwner === true,
[],
);

const isFinalAdministrator =
useCallback(
(
member: Member,
): boolean => {
if (
!member.role ||
![
MemberRole.Administrator,
MemberRole.PastorDirector,
].includes(
member.role,
)
) {
return false;
}

    if (
      member.status !==
      MembershipStatus.Active
    ) {
      return false;
    }

    const activeAdministrators =
      members.filter(
        (item) =>
          item.status ===
            MembershipStatus.Active &&
          [
            MemberRole.Administrator,
            MemberRole.PastorDirector,
          ].includes(
            item.role,
          ),
      );

    return (
      activeAdministrators.length ===
        1 &&
      activeAdministrators[0]?.id ===
        member.id
    );
  },
  [
    members,
  ],
);

/* ==========================================================================
ENABLE / APPROVE
======================================================================== */

const handleEnable =
async (
member: Member,
): Promise<void> => {
if (
!organizationId ||
updatingMemberId ||
removingMemberId
) {
return;
}

  setActionError(null);

  if (
    isTargetOwner(member)
  ) {
    setActionError(
      t(
        "church.organization.members.ownerCannotChange",
      ),
    );

    return;
  }

  if (
    member.status ===
    MembershipStatus.Pending
  ) {
    if (!canApprove) {
      setActionError(
        t(
          "church.organization.members.approvePermissionRequired",
        ),
      );

      return;
    }
  } else if (
    member.status ===
    MembershipStatus.Inactive
  ) {
    if (!canUpdate) {
      setActionError(
        t(
          "church.organization.members.enablePermissionRequired",
        ),
      );

      return;
    }
  } else {
    return;
  }

  setUpdatingMemberId(
    member.id,
  );

  try {
    if (
      member.status ===
      MembershipStatus.Pending
    ) {
      await approveMembershipRequest(
        organizationId,
        member.id,
      );
    } else {
      await enableMember(
        organizationId,
        member.id,
      );
    }

    await refreshMembers();
  } catch (err) {
    setActionError(
      getErrorMessage(
        err,
        t(
          "church.organization.members.enableError",
        ),
      ),
    );
  } finally {
    setUpdatingMemberId(
      null,
    );
  }
};

/* ==========================================================================
DISABLE
======================================================================== */

const handleDisable =
async (
member: Member,
): Promise<void> => {
if (
!organizationId ||
updatingMemberId ||
removingMemberId
) {
return;
}

  setActionError(null);

  if (
    isTargetOwner(member)
  ) {
    setActionError(
      t(
        "church.organization.members.ownerCannotDisable",
      ),
    );

    return;
  }

  if (!canUpdate) {
    setActionError(
      t(
        "church.organization.members.disablePermissionRequired",
      ),
    );

    return;
  }

  if (
    isFinalAdministrator(
      member,
    )
  ) {
    setActionError(
      t(
        "church.organization.members.finalAdministratorCannotDisable",
      ),
    );

    return;
  }

  if (
    member.status !==
    MembershipStatus.Active
  ) {
    return;
  }

  setUpdatingMemberId(
    member.id,
  );

  try {
    await disableMember(
      organizationId,
      member.id,
    );

    await refreshMembers();
  } catch (err) {
    setActionError(
      getErrorMessage(
        err,
        t(
          "church.organization.members.disableError",
        ),
      ),
    );
  } finally {
    setUpdatingMemberId(
      null,
    );
  }
};

/* ==========================================================================
DECLINE
======================================================================== */

const handleDecline =
async (
member: Member,
): Promise<void> => {
if (
!organizationId ||
updatingMemberId ||
removingMemberId
) {
return;
}

  setActionError(null);

  if (!canApprove) {
    setActionError(
      t(
        "church.organization.members.rejectPermissionRequired",
      ),
    );

    return;
  }

  if (
    isTargetOwner(member)
  ) {
    setActionError(
      t(
        "church.organization.members.ownerCannotReject",
      ),
    );

    return;
  }

  if (
    member.status !==
    MembershipStatus.Pending
  ) {
    return;
  }

  const memberName =
    member.profile
      ?.displayName ??
    t(
      "church.organization.members.thisMember",
    );

  const confirmed =
    window.confirm(
      t(
        "church.organization.members.declineConfirm",
        {
          name: memberName,
        },
      ),
    );

  if (!confirmed) {
    return;
  }

  setUpdatingMemberId(
    member.id,
  );

  try {
    await rejectMembershipRequest(
      organizationId,
      member.id,
    );

    await refreshMembers();
  } catch (err) {
    setActionError(
      getErrorMessage(
        err,
        t(
          "church.organization.members.rejectError",
        ),
      ),
    );
  } finally {
    setUpdatingMemberId(
      null,
    );
  }
};

/* ==========================================================================
REMOVE
======================================================================== */

const handleRemove =
async (
member: Member,
): Promise<void> => {
if (
!organizationId ||
updatingMemberId ||
removingMemberId
) {
return;
}

  setActionError(null);

  if (
    isTargetOwner(member)
  ) {
    setActionError(
      t(
        "church.organization.members.ownerCannotRemove",
      ),
    );

    return;
  }

  if (!canRemove) {
    setActionError(
      t(
        "church.organization.members.removePermissionRequired",
      ),
    );

    return;
  }

  if (
    isFinalAdministrator(
      member,
    )
  ) {
    setActionError(
      t(
        "church.organization.members.finalAdministratorCannotRemove",
      ),
    );

    return;
  }

  const memberName =
    member.profile
      ?.displayName ??
    t(
      "church.organization.members.thisMember",
    );

  const confirmed =
    window.confirm(
      t(
        "church.organization.members.removeConfirm",
        {
          name: memberName,
        },
      ),
    );

  if (!confirmed) {
    return;
  }

  setRemovingMemberId(
    member.id,
  );

  try {
    await removeMember(
      organizationId,
      member.id,
    );

    await refreshMembers();
  } catch (err) {
    setActionError(
      getErrorMessage(
        err,
        t(
          "church.organization.members.removeError",
        ),
      ),
    );
  } finally {
    setRemovingMemberId(
      null,
    );
  }
};

/* ==========================================================================
LABELS
======================================================================== */

const organizationLabel =
getTranslatedValue(
t,
"church.organization.organization",
"Organization",
);

const memberDirectoryLabel =
getTranslatedValue(
t,
"church.organization.members.memberDirectory",
"Member Directory",
);

const memberDirectoryDescription =
getTranslatedValue(
t,
"church.organization.members.directoryDescription",
"Manage members and membership requests for your organization.",
);

/* ==========================================================================
RENDER
======================================================================== */

return (
<div className="church-page organization-members-page">
<ChurchHeader />

  <div className="church-container church-org-layout">
    <ChurchSidebar
      organizationId={
        organizationId
      }
    />

    <main className="church-org-content">
      {/* ==================================================================
          HEADER
      ================================================================== */}

      <div className="church-section__heading">
        <div>
          <div
            style={{
              fontSize:
                "12px",
              fontWeight: 800,
              letterSpacing:
                "0.08em",
              textTransform:
                "uppercase",
              color:
                "#667085",
              marginBottom:
                "6px",
            }}
          >
            {organizationLabel}
          </div>

          <h1>
            {memberDirectoryLabel}
          </h1>

          <p>
            {memberDirectoryDescription}
          </p>
        </div>
      </div>

      {/* ==================================================================
          ORGANIZATION CONTEXT
      ================================================================== */}

      {organizationId && (
        <div
          style={{
            marginBottom:
              "18px",
            padding:
              "12px 16px",
            borderRadius:
              "10px",
            background:
              "#f8fafc",
            border:
              "1px solid rgba(22,34,63,.08)",
            color:
              "#667085",
            fontSize:
              "13px",
          }}
        >
          <strong
            style={{
              color:
                "#344054",
            }}
          >
            {getTranslatedValue(
              t,
              "church.organization.members.organizationId",
              "Organization ID",
            )}
            :
          </strong>{" "}
          {organizationId}
        </div>
      )}

      {/* ==================================================================
          CURRENT USER ACCESS
      ================================================================== */}

      {!isLoadingMembership &&
        currentMembership && (
          <div
            style={{
              marginBottom:
                "18px",
              padding:
                "14px 16px",
              borderRadius:
                "12px",
              background:
                "#f8fafc",
              border:
                "1px solid rgba(22,34,63,.08)",
              color:
                "#475467",
              fontSize:
                "14px",
            }}
          >
            <strong>
              {getTranslatedValue(
                t,
                "church.organization.members.yourAccess",
                "Your organization access",
              )}
              :
            </strong>{" "}

            {isOwner
              ? getTranslatedValue(
                  t,
                  "church.organization.members.organizationOwner",
                  "Organization Owner",
                )
              : currentMembership.role
                ? getTranslatedValue(
                    t,
                    `church.organization.memberRoles.${String(
                      currentMembership.role,
                    )}`,
                    MEMBER_ROLE_LABELS[
                      currentMembership.role
                    ] ??
                      String(
                        currentMembership.role,
                      ),
                  )
                : getTranslatedValue(
                    t,
                    "church.organization.members.member",
                    "Member",
                  )}

            {canApprove ||
            canUpdate ||
            canRemove ? (
              <span
                style={{
                  marginLeft:
                    "10px",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  padding:
                    "4px 8px",
                  borderRadius:
                    "999px",
                  background:
                    "#ecfdf3",
                  color:
                    "#027a48",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                }}
              >
                {getTranslatedValue(
                  t,
                  "church.organization.members.managementAccess",
                  "Management access",
                )}
              </span>
            ) : (
              <span
                style={{
                  marginLeft:
                    "10px",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  padding:
                    "4px 8px",
                  borderRadius:
                    "999px",
                  background:
                    "#f2f4f7",
                  color:
                    "#667085",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                }}
              >
                {getTranslatedValue(
                  t,
                  "church.organization.members.viewOnly",
                  "View only",
                )}
              </span>
            )}
          </div>
        )}

      {/* ==================================================================
          FILTERS
      ================================================================== */}

      <div className="church-org-filters">
        <input
          type="search"
          className="church-input"
          placeholder={getTranslatedValue(
            t,
            "church.organization.members.searchPlaceholder",
            "Search members…",
          )}
          value={search}
          onChange={(event) =>
            updateParam(
              "search",
              event.target.value ||
                null,
            )
          }
          aria-label={getTranslatedValue(
            t,
            "church.organization.members.searchLabel",
            "Search organization members",
          )}
        />

        <select
          className="church-select"
          value={
            status ?? ""
          }
          onChange={(event) =>
            updateParam(
              "status",
              event.target.value ||
                null,
            )
          }
          aria-label={getTranslatedValue(
            t,
            "church.organization.members.statusFilter",
            "Filter by membership status",
          )}
        >
          <option value="">
            {getTranslatedValue(
              t,
              "church.organization.members.allStatuses",
              "All statuses",
            )}
          </option>

          {Object.values(
            MembershipStatus,
          ).map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {getTranslatedValue(
                  t,
                  `church.organization.membershipStatuses.${String(
                    value,
                  )}`,
                  MEMBERSHIP_STATUS_LABELS[
                    value
                  ] ??
                    String(
                      value,
                    ),
                )}
              </option>
            ),
          )}
        </select>

        <select
          className="church-select"
          value={
            role ?? ""
          }
          onChange={(event) =>
            updateParam(
              "role",
              event.target.value ||
                null,
            )
          }
          aria-label={getTranslatedValue(
            t,
            "church.organization.members.roleFilter",
            "Filter by member role",
          )}
        >
          <option value="">
            {getTranslatedValue(
              t,
              "church.organization.members.allRoles",
              "All roles",
            )}
          </option>

          {Object.values(
            MemberRole,
          ).map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {getTranslatedValue(
                  t,
                  `church.organization.memberRoles.${String(
                    value,
                  )}`,
                  MEMBER_ROLE_LABELS[
                    value
                  ] ??
                    String(
                      value,
                    ),
                )}
              </option>
            ),
          )}
        </select>
      </div>

      {/* ==================================================================
          ERRORS
      ================================================================== */}

      {error && (
        <div
          className="church-alert church-alert--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {actionError && (
        <div
          className="church-alert church-alert--error"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {/* ==================================================================
          CONTENT
      ================================================================== */}

      {isLoading ? (
        <div
          className="church-empty-state"
          aria-live="polite"
        >
          <div
            style={{
              fontSize:
                "30px",
              marginBottom:
                "10px",
            }}
            aria-hidden="true"
          >
            ⏳
          </div>

          {getTranslatedValue(
            t,
            "church.organization.members.loading",
            "Loading organization members…",
          )}
        </div>
      ) : members.length ===
        0 ? (
        <div className="church-empty-state">
          <div
            style={{
              fontSize:
                "34px",
              marginBottom:
                "10px",
            }}
            aria-hidden="true"
          >
            👥
          </div>

          <strong
            style={{
              display:
                "block",
              marginBottom:
                "6px",
              color:
                "#344054",
            }}
          >
            {getTranslatedValue(
              t,
              "church.organization.members.noMembersFound",
              "No members found",
            )}
          </strong>

          <span>
            {status ===
            MembershipStatus.Pending
              ? getTranslatedValue(
                  t,
                  "church.organization.members.noPendingRequests",
                  "There are no pending membership requests.",
                )
              : getTranslatedValue(
                  t,
                  "church.organization.members.noMatchingMembers",
                  "No members match your current filters.",
                )}
          </span>
        </div>
      ) : (
        <>
          {/* ==============================================================
              RESULTS COUNT
          ============================================================== */}

          <p className="church-results-count">
            {total.toLocaleString()}{" "}

            {total === 1
              ? getTranslatedValue(
                  t,
                  "church.organization.members.member",
                  "member",
                )
              : getTranslatedValue(
                  t,
                  "church.organization.members.members",
                  "members",
                )}
          </p>

          {/* ==============================================================
              MEMBER GRID
          ============================================================== */}

          <div className="church-member-grid">
            {members.map(
              (member) => {
                const isPending =
                  member.status ===
                  MembershipStatus.Pending;

                const isActive =
                  member.status ===
                  MembershipStatus.Active;

                const isInactive =
                  member.status ===
                  MembershipStatus.Inactive;

                const isUpdating =
                  updatingMemberId ===
                  member.id;

                const isRemoving =
                  removingMemberId ===
                  member.id;

                const targetIsOwner =
                  isTargetOwner(
                    member,
                  );

                const finalAdmin =
                  isFinalAdministrator(
                    member,
                  );

                const canApproveThis =
                  canApprove &&
                  !targetIsOwner &&
                  isPending;

                const canEnableThis =
                  canUpdate &&
                  !targetIsOwner &&
                  isInactive;

                const canDisableThis =
                  canUpdate &&
                  !targetIsOwner &&
                  !finalAdmin &&
                  isActive;

                const canRemoveThis =
                  canRemove &&
                  !targetIsOwner &&
                  !finalAdmin;

                return (
                  <div
                    key={
                      member.id
                    }
                    className="church-member-item"
                  >
                    <MemberCard
                      member={
                        member
                      }
                    />

                    <div
                      className="church-member-actions"
                      style={{
                        display:
                          "flex",
                        gap:
                          "8px",
                        flexWrap:
                          "wrap",
                        marginTop:
                          "12px",
                      }}
                    >
                      {/* ==================================================
                          OWNER
                      ================================================== */}

                      {targetIsOwner && (
                        <span
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap:
                              "6px",
                            padding:
                              "8px 11px",
                            borderRadius:
                              "8px",
                            background:
                              "#eef3ff",
                            color:
                              "#344054",
                            fontSize:
                              "13px",
                            fontWeight:
                              700,
                          }}
                        >
                          <span
                            aria-hidden="true"
                          >
                            👑
                          </span>

                          {getTranslatedValue(
                            t,
                            "church.organization.members.organizationOwner",
                            "Organization Owner",
                          )}
                        </span>
                      )}

                      {/* ==================================================
                          PENDING
                      ================================================== */}

                      {isPending &&
                        canApproveThis && (
                          <>
                            <button
                              type="button"
                              disabled={
                                isUpdating ||
                                isRemoving
                              }
                              onClick={() =>
                                void handleEnable(
                                  member,
                                )
                              }
                              className="church-button church-button--primary"
                            >
                              {isUpdating
                                ? getTranslatedValue(
                                    t,
                                    "church.organization.members.updating",
                                    "Updating…",
                                  )
                                : getTranslatedValue(
                                    t,
                                    "church.organization.members.approve",
                                    "Approve",
                                  )}
                            </button>

                            <button
                              type="button"
                              disabled={
                                isUpdating ||
                                isRemoving
                              }
                              onClick={() =>
                                void handleDecline(
                                  member,
                                )
                              }
                              className="church-button church-button--secondary"
                            >
                              {isUpdating
                                ? getTranslatedValue(
                                    t,
                                    "church.organization.members.updating",
                                    "Updating…",
                                  )
                                : getTranslatedValue(
                                    t,
                                    "church.organization.members.decline",
                                    "Decline",
                                  )}
                            </button>
                          </>
                        )}

                      {/* ==================================================
                          INACTIVE
                      ================================================== */}

                      {isInactive &&
                        canEnableThis && (
                          <button
                            type="button"
                            disabled={
                              isUpdating ||
                              isRemoving
                            }
                            onClick={() =>
                              void handleEnable(
                                member,
                              )
                            }
                            className="church-button church-button--primary"
                          >
                            {isUpdating
                              ? getTranslatedValue(
                                  t,
                                  "church.organization.members.enabling",
                                  "Enabling…",
                                )
                              : getTranslatedValue(
                                  t,
                                  "church.organization.members.enable",
                                  "Enable",
                                )}
                          </button>
                        )}

                      {/* ==================================================
                          ACTIVE
                      ================================================== */}

                      {isActive &&
                        canDisableThis && (
                          <button
                            type="button"
                            disabled={
                              isUpdating ||
                              isRemoving
                            }
                            onClick={() =>
                              void handleDisable(
                                member,
                              )
                            }
                            className="church-button church-button--secondary"
                          >
                            {isUpdating
                              ? getTranslatedValue(
                                  t,
                                  "church.organization.members.disabling",
                                  "Disabling…",
                                )
                              : getTranslatedValue(
                                  t,
                                  "church.organization.members.disable",
                                  "Disable",
                                )}
                          </button>
                        )}

                      {/* ==================================================
                          REMOVE
                      ================================================== */}

                      {canRemoveThis && (
                        <button
                          type="button"
                          disabled={
                            isUpdating ||
                            isRemoving
                          }
                          onClick={() =>
                            void handleRemove(
                              member,
                            )
                          }
                          className="church-button church-button--danger"
                        >
                          {isRemoving
                            ? getTranslatedValue(
                                t,
                                "church.organization.members.removing",
                                "Removing…",
                              )
                            : getTranslatedValue(
                                t,
                                "church.organization.members.remove",
                                "Remove",
                              )}
                        </button>
                      )}

                      {/* ==================================================
                          FINAL ADMINISTRATOR
                      ================================================== */}

                      {finalAdmin &&
                        !targetIsOwner && (
                          <span
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              fontSize:
                                "12px",
                              color:
                                "#b42318",
                              alignSelf:
                                "center",
                              fontWeight:
                                600,
                            }}
                          >
                            {getTranslatedValue(
                              t,
                              "church.organization.members.finalAdministratorWarning",
                              "Final administrator — cannot disable or remove",
                            )}
                          </span>
                        )}

                      {/* ==================================================
                          VIEW ONLY
                      ================================================== */}

                      {!targetIsOwner &&
                        !finalAdmin &&
                        !canApprove &&
                        !canUpdate &&
                        !canRemove &&
                        !isPending && (
                          <span
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap:
                                "5px",
                              fontSize:
                                "12px",
                              color:
                                "#667085",
                              alignSelf:
                                "center",
                              fontWeight:
                                600,
                            }}
                          >
                            <span
                              aria-hidden="true"
                            >
                              👁
                            </span>

                            {getTranslatedValue(
                              t,
                              "church.organization.members.viewOnly",
                              "View only",
                            )}
                          </span>
                        )}

                      {/* ==================================================
                          PENDING WITHOUT PERMISSION
                      ================================================== */}

                      {isPending &&
                        !targetIsOwner &&
                        !canApprove && (
                          <span
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap:
                                "5px",
                              fontSize:
                                "12px",
                              color:
                                "#667085",
                              alignSelf:
                                "center",
                              fontWeight:
                                600,
                            }}
                          >
                            <span
                              aria-hidden="true"
                            >
                              👁
                            </span>

                            {getTranslatedValue(
                              t,
                              "church.organization.members.approvalPermissionRequired",
                              "Approval permission required",
                            )}
                          </span>
                        )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </>
      )}
    </main>
  </div>
</div>

);
}