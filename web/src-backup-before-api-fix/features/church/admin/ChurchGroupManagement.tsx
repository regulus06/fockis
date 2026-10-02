/**
 * ChurchGroupManagement.tsx
 * -----------------------------------------------------------------------------
 * Organization-specific group management.
 *
 * Supports:
 *   - Create groups
 *   - Edit groups
 *   - Archive groups
 *   - View group members
 *   - Add existing church members to a group
 *   - Remove members from a group
 *
 * IMPORTANT:
 *   Member accounts/memberships are created elsewhere and must already have
 *   a valid Fockis member domain, for example:
 *
 *      john.springfieldchurch.fockis.com
 *
 *   This page only attaches an existing organization member to a group.
 *
 * Route:
 *   /church/organizations/:organizationId/admin/groups
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  addGroupMember,
  createGroup,
  deleteGroup,
  listGroupMembers,
  listGroups,
  removeGroupMember,
  updateGroup,
} from "../api/groupsApi";

import {
  GROUP_TYPE_LABELS,
  GroupType,
  type ChurchGroup,
  type CreateGroupInput,
  type Member,
} from "../types/church.types";

import "../styles/ChurchAdmin.scss";

/* ============================================================================
 * EMPTY DRAFT
 * ========================================================================== */

const EMPTY_DRAFT: CreateGroupInput = {
  organizationId: "",
  name: "",
  groupType: GroupType.SmallGroup,
  description: "",
  meetingSchedule: "",
  location: "",
  capacity: undefined,
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function getMemberDisplayName(member: Member): string {
  return (
    member.profile?.displayName?.trim() ||
    member.memberId ||
    member.userId ||
    "Unnamed member"
  );
}

function getMemberDomain(member: Member): string {
  /*
   * The Member type is expected to contain `domain` after the member-domain
   * update. The fallback keeps this component tolerant of older API responses
   * during migration.
   */
  const domain = (member as Member & {
    domain?: string;
  }).domain;

  return domain?.trim() || "";
}

/* ============================================================================
 * COMPONENT
 * ========================================================================== */

export default function ChurchGroupManagement(): React.JSX.Element {
  const { organizationId = "" } =
    useParams<{ organizationId: string }>();

  /* --------------------------------------------------------------------------
   * GROUP STATE
   * ------------------------------------------------------------------------ */

  const [groups, setGroups] = useState<ChurchGroup[]>([]);

  const [draft, setDraft] =
    useState<CreateGroupInput>({
      ...EMPTY_DRAFT,
      organizationId,
    });

  const [editingId, setEditingId] =
    useState<string | null>(null);

  /* --------------------------------------------------------------------------
   * GENERAL STATE
   * ------------------------------------------------------------------------ */

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* --------------------------------------------------------------------------
   * MEMBER MANAGEMENT STATE
   * ------------------------------------------------------------------------ */

  const [selectedGroup, setSelectedGroup] =
    useState<ChurchGroup | null>(null);

  const [groupMembers, setGroupMembers] =
    useState<Member[]>([]);

  const [isLoadingMembers, setIsLoadingMembers] =
    useState(false);

  const [memberSearch, setMemberSearch] =
    useState("");

  const [memberToAdd, setMemberToAdd] =
    useState("");

  const [isAddingMember, setIsAddingMember] =
    useState(false);

  const [isRemovingMember, setIsRemovingMember] =
    useState<string | null>(null);

  /* ==========================================================================
   * LOAD GROUPS
   * ======================================================================== */

  useEffect(() => {
    const controller = new AbortController();

    async function loadGroups() {
      if (!organizationId) {
        setError(
          "Unable to determine the organization.",
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await listGroups(
          organizationId,
          {
            pageSize: 100,
          },
          controller.signal,
        );

        setGroups(result.items);
      } catch (err) {
        if (
          !(
            err instanceof DOMException &&
            err.name === "AbortError"
          )
        ) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load groups.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadGroups();

    return () => controller.abort();
  }, [organizationId]);

  /* ==========================================================================
   * RESET DRAFT
   * ======================================================================== */

  const resetDraft = () => {
    setDraft({
      ...EMPTY_DRAFT,
      organizationId,
    });

    setEditingId(null);
  };

  /* ==========================================================================
   * EDIT GROUP
   * ======================================================================== */

  const handleEdit = (
    group: ChurchGroup,
  ) => {
    setEditingId(group.id);

    setDraft({
      organizationId,
      name: group.name,
      groupType: group.groupType,
      description:
        group.description ?? "",
      meetingSchedule:
        group.meetingSchedule ?? "",
      location:
        group.location ?? "",
      capacity:
        group.capacity ?? undefined,
      departmentId:
        group.departmentId ?? undefined,
      photoUrl:
        group.photoUrl ?? undefined,
      leaderIds:
        group.leaderIds ?? undefined,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ==========================================================================
   * LOAD GROUP MEMBERS
   * ======================================================================== */

  async function loadMembers(
    groupId: string,
    search = "",
  ) {
    if (!organizationId) {
      return;
    }

    setIsLoadingMembers(true);
    setError(null);

    try {
      const result =
        await listGroupMembers(
          organizationId,
          groupId,
          {
            pageSize: 100,
            search:
              search.trim() ||
              undefined,
          },
        );

      /*
       * listGroupMembers returns:
       *
       * PaginatedResult<Member>
       *
       * Therefore we store:
       *
       * result.items
       *
       * rather than the complete pagination object.
       */
      setGroupMembers(
        result.items,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load group members.",
      );
    } finally {
      setIsLoadingMembers(false);
    }
  }

  /* ==========================================================================
   * SAVE GROUP
   * ======================================================================== */

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (!organizationId) {
      setError(
        "Unable to determine the organization.",
      );
      return;
    }

    if (!draft.name.trim()) {
      setError(
        "Group name is required.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingId) {
        const updated =
          await updateGroup(
            organizationId,
            editingId,
            {
              name: draft.name.trim(),
              groupType:
                draft.groupType,
              description:
                draft.description?.trim() ||
                undefined,
              meetingSchedule:
                draft.meetingSchedule?.trim() ||
                undefined,
              location:
                draft.location?.trim() ||
                undefined,
              capacity:
                draft.capacity,
              departmentId:
                draft.departmentId,
              photoUrl:
                draft.photoUrl,
              leaderIds:
                draft.leaderIds,
            },
          );

        setGroups((items) =>
          items.map((item) =>
            item.id === editingId
              ? updated
              : item,
          ),
        );
      } else {
        const created =
          await createGroup({
            ...draft,
            organizationId,
            name: draft.name.trim(),
            description:
              draft.description?.trim() ||
              undefined,
            meetingSchedule:
              draft.meetingSchedule?.trim() ||
              undefined,
            location:
              draft.location?.trim() ||
              undefined,
          });

        setGroups((items) => [
          created,
          ...items,
        ]);

        /*
         * Automatically open member management
         * for the newly created group.
         */
        setSelectedGroup(created);
        setMemberSearch("");
        setMemberToAdd("");

        await loadMembers(
          created.id,
          "",
        );
      }

      resetDraft();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this group.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ==========================================================================
   * ARCHIVE GROUP
   * ======================================================================== */

  const handleDelete = async (
    groupId: string,
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to archive this group?",
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await deleteGroup(
        organizationId,
        groupId,
      );

      setGroups((items) =>
        items.filter(
          (item) =>
            item.id !== groupId,
        ),
      );

      if (
        selectedGroup?.id === groupId
      ) {
        closeMemberPanel();
      }

      if (editingId === groupId) {
        resetDraft();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to archive this group.",
      );
    }
  };

  /* ==========================================================================
   * OPEN MEMBER PANEL
   * ======================================================================== */

  const handleManageMembers = async (
    group: ChurchGroup,
  ) => {
    setSelectedGroup(group);
    setMemberSearch("");
    setMemberToAdd("");

    await loadMembers(
      group.id,
      "",
    );
  };

  /* ==========================================================================
   * CLOSE MEMBER PANEL
   * ======================================================================== */

  const closeMemberPanel = () => {
    setSelectedGroup(null);
    setGroupMembers([]);
    setMemberSearch("");
    setMemberToAdd("");
  };

  /* ==========================================================================
   * SEARCH MEMBERS
   * ======================================================================== */

  const handleMemberSearch = async (
    value: string,
  ) => {
    setMemberSearch(value);

    if (!selectedGroup) {
      return;
    }

    await loadMembers(
      selectedGroup.id,
      value,
    );
  };

  /* ==========================================================================
   * ADD EXISTING MEMBER
   * ======================================================================== */

  const handleAddMember = async () => {
    if (!selectedGroup) {
      return;
    }

    const value =
      memberToAdd.trim();

    if (!value) {
      setError(
        "Enter a member user ID or email.",
      );
      return;
    }

    setIsAddingMember(true);
    setError(null);

    try {
      /*
       * IMPORTANT:
       *
       * This does NOT create a new member account.
       *
       * The member must already exist in the organization and therefore
       * should already have a Fockis member domain such as:
       *
       *   john.springfieldchurch.fockis.com
       *
       * This API simply adds the existing organization member to this group.
       */
      const input =
        value.includes("@")
          ? {
              email: value,
            }
          : {
              userId: value,
            };

      const added =
        await addGroupMember(
          organizationId,
          selectedGroup.id,
          input,
        );

      setGroupMembers(
        (items) => [
          ...items,
          added,
        ],
      );

      setGroups((items) =>
        items.map((group) =>
          group.id ===
          selectedGroup.id
            ? {
                ...group,
                memberCount:
                  group.memberCount + 1,
              }
            : group,
        ),
      );

      setSelectedGroup(
        (current) =>
          current
            ? {
                ...current,
                memberCount:
                  current.memberCount + 1,
              }
            : current,
      );

      setMemberToAdd("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add this member.",
      );
    } finally {
      setIsAddingMember(false);
    }
  };

  /* ==========================================================================
   * REMOVE MEMBER
   * ======================================================================== */

  const handleRemoveMember = async (
    member: Member,
  ) => {
    if (!selectedGroup) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${getMemberDisplayName(
          member,
        )} from this group?`,
      );

    if (!confirmed) {
      return;
    }

    setIsRemovingMember(
      member.id,
    );

    setError(null);

    try {
      await removeGroupMember(
        organizationId,
        selectedGroup.id,
        member.id,
      );

      setGroupMembers(
        (items) =>
          items.filter(
            (item) =>
              item.id !==
              member.id,
          ),
      );

      setGroups((items) =>
        items.map((group) =>
          group.id ===
          selectedGroup.id
            ? {
                ...group,
                memberCount:
                  Math.max(
                    0,
                    group.memberCount -
                      1,
                  ),
              }
            : group,
        ),
      );

      setSelectedGroup(
        (current) =>
          current
            ? {
                ...current,
                memberCount:
                  Math.max(
                    0,
                    current.memberCount -
                      1,
                  ),
              }
            : current,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove this member.",
      );
    } finally {
      setIsRemovingMember(null);
    }
  };

  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <div className="church-admin-page">
      {/* ======================================================================
          HEADER
      ====================================================================== */}

      <header className="church-admin-header">
        <div>
          <span className="church-admin-eyebrow">
            Church administration
          </span>

          <h1>
            Group management
          </h1>

          <p>
            Create and manage groups
            for this organization.
          </p>
        </div>
      </header>

      {/* ======================================================================
          ERROR
      ====================================================================== */}

      {error && (
        <div
          className="church-admin-alert church-admin-alert--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ======================================================================
          CREATE / EDIT GROUP
      ====================================================================== */}

      <section className="church-admin-panel">
        <div className="church-admin-panel__header">
          <div>
            <span className="church-admin-eyebrow">
              {editingId
                ? "Edit"
                : "New group"}
            </span>

            <h2>
              {editingId
                ? "Edit group"
                : "Create group"}
            </h2>
          </div>
        </div>

        <form
          className="church-admin-form"
          onSubmit={handleSubmit}
        >
          {/* NAME + TYPE */}

          <div className="church-admin-field-row">
            <label className="church-admin-field">
              <span>
                Group name
              </span>

              <input
                className="church-admin-input"
                value={draft.name}
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      name:
                        event.target
                          .value,
                    }),
                  )
                }
                placeholder="e.g. Tuesday Bible Study"
                required
              />
            </label>

            <label className="church-admin-field">
              <span>
                Group type
              </span>

              <select
                className="church-admin-select"
                value={
                  draft.groupType
                }
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      groupType:
                        event.target
                          .value as GroupType,
                    }),
                  )
                }
              >
                {Object.values(
                  GroupType,
                ).map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {
                        GROUP_TYPE_LABELS[
                          value
                        ]
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {/* SCHEDULE / LOCATION / CAPACITY */}

          <div className="church-admin-field-row">
            <label className="church-admin-field">
              <span>
                Meeting schedule
              </span>

              <input
                className="church-admin-input"
                placeholder="e.g. Tuesdays at 7:00 PM"
                value={
                  draft.meetingSchedule ??
                  ""
                }
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      meetingSchedule:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label className="church-admin-field">
              <span>
                Location
              </span>

              <input
                className="church-admin-input"
                placeholder="e.g. Fellowship Hall"
                value={
                  draft.location ??
                  ""
                }
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      location:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label className="church-admin-field">
              <span>
                Capacity
              </span>

              <input
                type="number"
                min={0}
                className="church-admin-input"
                placeholder="Optional"
                value={
                  draft.capacity ?? ""
                }
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      capacity:
                        event.target
                          .value
                          ? Number(
                              event
                                .target
                                .value,
                            )
                          : undefined,
                    }),
                  )
                }
              />
            </label>
          </div>

          {/* DESCRIPTION */}

          <label className="church-admin-field">
            <span>
              Description
            </span>

            <textarea
              className="church-admin-textarea"
              rows={4}
              placeholder="Describe this group..."
              value={
                draft.description ??
                ""
              }
              onChange={(event) =>
                setDraft(
                  (current) => ({
                    ...current,
                    description:
                      event.target
                        .value,
                  }),
                )
              }
            />
          </label>

          {/* ACTIONS */}

          <div className="church-admin-form-actions">
            <button
              type="submit"
              className="church-admin-btn church-admin-btn--primary"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create group"}
            </button>

            {editingId && (
              <button
                type="button"
                className="church-admin-btn church-admin-btn--ghost"
                onClick={
                  resetDraft
                }
                disabled={isSaving}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ======================================================================
          GROUP LIST
      ====================================================================== */}

      <section className="church-admin-panel">
        <div className="church-admin-panel__header">
          <div>
            <span className="church-admin-eyebrow">
              Organization
            </span>

            <h2>
              All groups
            </h2>
          </div>

          <span>
            {groups.length}{" "}
            {groups.length === 1
              ? "group"
              : "groups"}
          </span>
        </div>

        {isLoading ? (
          <p className="church-admin-empty">
            Loading groups...
          </p>
        ) : groups.length === 0 ? (
          <p className="church-admin-empty">
            No groups yet. Create the
            first group above.
          </p>
        ) : (
          <div className="church-admin-table-wrap">
            <table className="church-admin-table">
              <thead>
                <tr>
                  <th>
                    Name
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Schedule
                  </th>

                  <th>
                    Members
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {groups.map(
                  (group) => (
                    <tr
                      key={
                        group.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            group.name
                          }
                        </strong>

                        {group.description && (
                          <div>
                            {
                              group.description
                            }
                          </div>
                        )}
                      </td>

                      <td>
                        {
                          GROUP_TYPE_LABELS[
                            group.groupType
                          ]
                        }
                      </td>

                      <td>
                        {
                          group.meetingSchedule ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          group.memberCount
                        }

                        {group.capacity
                          ? ` / ${group.capacity}`
                          : ""}
                      </td>

                      <td>
                        <div className="church-admin-table__actions">
                          <button
                            type="button"
                            className="church-admin-btn church-admin-btn--primary church-admin-btn--sm"
                            onClick={() =>
                              void handleManageMembers(
                                group,
                              )
                            }
                          >
                            Members
                          </button>

                          <button
                            type="button"
                            className="church-admin-btn church-admin-btn--secondary church-admin-btn--sm"
                            onClick={() =>
                              handleEdit(
                                group,
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                            onClick={() =>
                              void handleDelete(
                                group.id,
                              )
                            }
                          >
                            Archive
                          </button>
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

      {/* ======================================================================
          MEMBER MANAGEMENT
      ====================================================================== */}

      {selectedGroup && (
        <section className="church-admin-panel">
          <div className="church-admin-panel__header">
            <div>
              <span className="church-admin-eyebrow">
                Group members
              </span>

              <h2>
                {selectedGroup.name}
              </h2>

              <p>
                {selectedGroup.memberCount}{" "}
                members
              </p>
            </div>

            <button
              type="button"
              className="church-admin-btn church-admin-btn--ghost"
              onClick={
                closeMemberPanel
              }
            >
              Close
            </button>
          </div>

          {/* ADD EXISTING MEMBER */}

          <div className="church-admin-panel">
            <h3>
              Add existing member
            </h3>

            <p>
              Add a member who already
              belongs to this organization.
              Their Fockis member domain is
              created when their membership
              is established.
            </p>

            <div className="church-admin-field-row">
              <label className="church-admin-field">
                <span>
                  User ID or email
                </span>

                <input
                  className="church-admin-input"
                  value={
                    memberToAdd
                  }
                  onChange={(event) =>
                    setMemberToAdd(
                      event.target
                        .value,
                    )
                  }
                  placeholder="member@example.com"
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();
                      void handleAddMember();
                    }
                  }}
                />

                <small>
                  Enter the existing
                  organization's member
                  user ID or email address.
                </small>
              </label>

              <div className="church-admin-form-actions">
                <button
                  type="button"
                  className="church-admin-btn church-admin-btn--primary"
                  onClick={
                    handleAddMember
                  }
                  disabled={
                    isAddingMember ||
                    !memberToAdd.trim()
                  }
                >
                  {isAddingMember
                    ? "Adding..."
                    : "Add member"}
                </button>
              </div>
            </div>
          </div>

          {/* MEMBER SEARCH */}

          <div className="church-admin-field">
            <span>
              Search group members
            </span>

            <input
              type="search"
              className="church-admin-input"
              placeholder="Search members..."
              value={
                memberSearch
              }
              onChange={(event) =>
                void handleMemberSearch(
                  event.target
                    .value,
                )
              }
            />
          </div>

          {/* MEMBERS */}

          {isLoadingMembers ? (
            <p className="church-admin-empty">
              Loading members...
            </p>
          ) : groupMembers.length ===
            0 ? (
            <p className="church-admin-empty">
              This group has no members
              yet.
            </p>
          ) : (
            <div className="church-admin-table-wrap">
              <table className="church-admin-table">
                <thead>
                  <tr>
                    <th>
                      Member
                    </th>

                    <th>
                      Fockis domain
                    </th>

                    <th>
                      Member ID
                    </th>

                    <th>
                      Role
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {groupMembers.map(
                    (member) => {
                      const memberDomain =
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
                            <strong>
                              {getMemberDisplayName(
                                member,
                              )}
                            </strong>

                            {member
                              .profile
                              ?.email && (
                              <div>
                                {
                                  member
                                    .profile
                                    .email
                                }
                              </div>
                            )}
                          </td>

                          <td>
                            {memberDomain ? (
                              <code>
                                {
                                  memberDomain
                                }
                              </code>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td>
                            {
                              member.memberId ||
                              "—"
                            }
                          </td>

                          <td>
                            {
                              member.role
                            }
                          </td>

                          <td>
                            <button
                              type="button"
                              className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                              disabled={
                                isRemovingMember ===
                                member.id
                              }
                              onClick={() =>
                                void handleRemoveMember(
                                  member,
                                )
                              }
                            >
                              {isRemovingMember ===
                              member.id
                                ? "Removing..."
                                : "Remove"}
                            </button>
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
      )}
    </div>
  );
}