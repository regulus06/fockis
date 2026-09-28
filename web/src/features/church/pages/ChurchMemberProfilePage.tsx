/**
 * OrganizationMemberProfilePage.tsx
 * -----------------------------------------------------------------------------
 * FOCKIS ORGANIZATION — MEMBER PROFILE
 *
 * Generic member profile for any Fockis organization:
 * - Member overview
 * - Contact information
 * - Organization membership information
 * - Departments / Teams
 * - Groups / Communities
 * - Member history timeline
 * - Milestones
 * - Membership status
 *
 * Route:
 * /organizations/:organizationId/members/:memberId
 *
 * Existing membersApi and church.types are intentionally preserved for
 * compatibility with the current backend during the Church → Organization
 * migration.
 * -----------------------------------------------------------------------------
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { membersApi } from "../api/membersApi";

import type {
  Member,
  MemberMilestone,
  MemberMilestoneType,
} from "../types/church.types";

import "../styles/OrganizationMemberProfilePage.scss";

/* ============================================================
   TYPES
   ============================================================ */

interface MemberRecord {
  id: string;
  organizationId?: string;
  memberId?: string;
  type?: string;
  title?: string;
  description?: string | null;
  eventDate?: string;
  date?: string;
  createdAt?: string;
  location?: string | null;
  performedBy?: {
    id?: string;
    displayName?: string;
    avatarUrl?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
}

interface TimelineItem {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  type: string;
  source: "milestone" | "record";
  location?: string | null;
}

/* ============================================================
   LABELS
   ============================================================ */

const MILESTONE_LABELS: Record<string, string> = {
  joined_organization: "Joined Organization",
  baptism: "Baptism",
  child_dedication: "Child Dedication",
  marriage: "Marriage",
  ordination: "Ordination",
  role_change: "Role Change",
  department_joined: "Joined Department",
  department_left: "Left Department",
  group_joined: "Joined Group",
  group_left: "Left Group",
  membership_status_change: "Membership Status Change",
  attendance_milestone: "Attendance Milestone",
  volunteer_milestone: "Volunteer Milestone",
  training_completed: "Training Completed",
  certification: "Certification",
  appointment: "Appointment",
  custom: "Milestone",
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  baptism: "Baptism",
  child_dedication: "Child Dedication",
  marriage: "Marriage",
  ordination: "Ordination",
  appointment: "Appointment",
  training: "Training",
  certification: "Certification",
  attendance: "Attendance",
  volunteer: "Volunteer",
  membership: "Membership",
  role_change: "Role Change",
  department: "Department",
  group: "Group",
  custom: "Organization Record",
};

/* ============================================================
   HELPERS
   ============================================================ */

function formatDate(value?: string | null): string {
  if (!value) {
    return "Date not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getMilestoneIcon(type: string): string {
  switch (type) {
    case "joined_organization":
      return "🏠";

    case "baptism":
      return "💧";

    case "child_dedication":
      return "👶";

    case "marriage":
      return "💍";

    case "ordination":
      return "🙏";

    case "role_change":
      return "🎖️";

    case "department_joined":
    case "department_left":
      return "🏢";

    case "group_joined":
    case "group_left":
      return "👥";

    case "membership_status_change":
      return "📋";

    case "attendance_milestone":
      return "📊";

    case "volunteer_milestone":
      return "🤝";

    case "training_completed":
      return "📚";

    case "certification":
      return "🏆";

    case "appointment":
      return "⭐";

    default:
      return "📌";
  }
}

function getRecordIcon(type?: string): string {
  switch (type) {
    case "baptism":
      return "💧";

    case "child_dedication":
      return "👶";

    case "marriage":
      return "💍";

    case "ordination":
      return "🙏";

    case "training":
      return "📚";

    case "certification":
      return "🏆";

    case "attendance":
      return "📊";

    case "volunteer":
      return "🤝";

    case "role_change":
      return "🎖️";

    case "department":
      return "🏢";

    case "group":
      return "👥";

    default:
      return "📄";
  }
}

function getInitials(name?: string | null): string {
  if (!name) {
    return "?";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeMilestone(
  milestone: MemberMilestone,
): TimelineItem {
  return {
    id: `milestone-${milestone.id}`,
    title:
      milestone.title ||
      MILESTONE_LABELS[milestone.type] ||
      "Organization Milestone",
    description: milestone.description,
    date: milestone.eventDate,
    type: milestone.type,
    source: "milestone",
  };
}

function normalizeRecord(
  record: MemberRecord,
): TimelineItem {
  const type = record.type || "custom";

  return {
    id: `record-${record.id}`,
    title:
      record.title ||
      RECORD_TYPE_LABELS[type] ||
      "Organization Record",
    description: record.description,
    date:
      record.eventDate ||
      record.date ||
      record.createdAt ||
      "",
    type,
    source: "record",
    location: record.location,
  };
}

function areTimelineItemsDuplicate(
  first: TimelineItem,
  second: TimelineItem,
): boolean {
  if (!first.date || !second.date) {
    return false;
  }

  const firstTime = new Date(first.date).getTime();
  const secondTime = new Date(second.date).getTime();

  if (
    Number.isNaN(firstTime) ||
    Number.isNaN(secondTime)
  ) {
    return false;
  }

  const sameDay =
    Math.abs(firstTime - secondTime) <
    24 * 60 * 60 * 1000;

  if (!sameDay) {
    return false;
  }

  const firstTitle = first.title
    .trim()
    .toLowerCase();

  const secondTitle = second.title
    .trim()
    .toLowerCase();

  return (
    firstTitle === secondTitle ||
    first.type === second.type
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function OrganizationMemberProfilePage(): React.JSX.Element {
  const {
    organizationId,
    memberId,
  } = useParams<{
    organizationId: string;
    memberId: string;
  }>();

  const [member, setMember] =
    useState<Member | null>(null);

  const [records, setRecords] =
    useState<MemberRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingHistory, setLoadingHistory] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [historyFilter, setHistoryFilter] =
    useState<
      "all" | "milestones" | "records"
    >("all");

  /* ==========================================================
     LOAD MEMBER
     ========================================================== */

  const loadMember = useCallback(
    async (signal?: AbortSignal) => {
      if (!organizationId || !memberId) {
        setError(
          "A valid organization and member are required.",
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result =
          await membersApi.getMember(
            organizationId,
            memberId,
            signal,
          );

        setMember(result);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[OrganizationMemberProfilePage] Failed to load member:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this member.",
        );
      } finally {
        setLoading(false);
      }
    },
    [organizationId, memberId],
  );

  /* ==========================================================
     LOAD MEMBER HISTORY
     ========================================================== */

  const loadHistory = useCallback(
    async (signal?: AbortSignal) => {
      if (!organizationId || !memberId) {
        setLoadingHistory(false);

        return;
      }

      try {
        setLoadingHistory(true);

        const result =
          await membersApi.listMemberRecords(
            organizationId,
            memberId,
            {
              page: 1,
              pageSize: 100,
            },
            signal,
          );

        setRecords(
          Array.isArray(result.items)
            ? (result.items as MemberRecord[])
            : [],
        );
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.warn(
          "[OrganizationMemberProfilePage] Member records unavailable:",
          err,
        );

        setRecords([]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [organizationId, memberId],
  );

  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    const controller =
      new AbortController();

    void Promise.all([
      loadMember(controller.signal),
      loadHistory(controller.signal),
    ]);

    return () => {
      controller.abort();
    };
  }, [loadMember, loadHistory]);

  /* ==========================================================
     TIMELINE
     ========================================================== */

  const timeline =
    useMemo<TimelineItem[]>(() => {
      const milestoneItems =
        member?.milestones?.map(
          normalizeMilestone,
        ) ?? [];

      const recordItems =
        records.map(normalizeRecord);

      let combined: TimelineItem[];

      if (
        historyFilter === "milestones"
      ) {
        combined = milestoneItems;
      } else if (
        historyFilter === "records"
      ) {
        combined = recordItems;
      } else {
        combined = [
          ...milestoneItems,
          ...recordItems.filter(
            (record) =>
              !milestoneItems.some(
                (milestone) =>
                  areTimelineItemsDuplicate(
                    milestone,
                    record,
                  ),
              ),
          ),
        ];
      }

      return [...combined].sort(
        (a, b) => {
          const aTime =
            new Date(a.date).getTime();

          const bTime =
            new Date(b.date).getTime();

          if (Number.isNaN(aTime)) {
            return 1;
          }

          if (Number.isNaN(bTime)) {
            return -1;
          }

          return bTime - aTime;
        },
      );
    }, [
      member?.milestones,
      records,
      historyFilter,
    ]);

  /* ==========================================================
     SUMMARY
     ========================================================== */

  const milestoneCount =
    member?.milestoneSummary
      ?.milestoneCount ??
    member?.milestones?.length ??
    0;

  const organizationJoinedAt =
    member?.milestoneSummary
      ?.organizationJoinedAt ??
    member?.privateProfile?.joinedAt ??
    member?.joinedAt;

  const baptismDate =
    member?.milestoneSummary?.baptismDate ??
    member?.milestones?.find(
      (milestone) =>
        milestone.type ===
        ("baptism" as MemberMilestoneType),
    )?.eventDate;

  /* ==========================================================
     LOADING STATE
     ========================================================== */

  if (loading) {
    return (
      <div className="church-page organization-page church-member-profile-page organization-member-profile-page">
        <div className="church-page__container">
          <div className="church-loading-card">
            <div className="church-loading-spinner" />

            <p>
              Loading member profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     ERROR STATE
     ========================================================== */

  if (error || !member) {
    return (
      <div className="church-page organization-page church-member-profile-page organization-member-profile-page">
        <div className="church-page__container">
          <div className="church-error-card">
            <div className="church-error-card__icon">
              ⚠️
            </div>

            <h1>
              Member Profile Unavailable
            </h1>

            <p>
              {error ||
                "We could not find this organization member."}
            </p>

            <Link
              to={
                organizationId
                  ? `/organizations/${organizationId}/members`
                  : "/organizations"
              }
              className="church-button church-button--primary"
            >
              ← Back to Members
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     DISPLAY VALUES
     ========================================================== */

  const displayName =
    member.profile?.displayName ||
    "Organization Member";

  const avatarUrl =
    member.profile?.avatarUrl ||
    null;

  const roleLabel =
    member.profile?.role
      ? member.profile.role.replace(
          /_/g,
          " ",
        )
      : "Member";

  const statusLabel =
    member.status.replace(
      /_/g,
      " ",
    );

  return (
    <div className="church-page organization-page church-member-profile-page organization-member-profile-page">
      <div className="church-page__container">

        {/* ====================================================
            BREADCRUMBS
            ==================================================== */}

        <nav
          className="church-member-profile__breadcrumbs"
          aria-label="Breadcrumb"
        >
          <Link to="/organizations">
            Organizations
          </Link>

          <span aria-hidden="true">
            ›
          </span>

          <Link
            to={
              organizationId
                ? `/organizations/${organizationId}`
                : "/organizations"
            }
          >
            Organization
          </Link>

          <span aria-hidden="true">
            ›
          </span>

          <Link
            to={
              organizationId
                ? `/organizations/${organizationId}/members`
                : "/organizations"
            }
          >
            Members
          </Link>

          <span aria-hidden="true">
            ›
          </span>

          <span>
            {displayName}
          </span>
        </nav>

        {/* ====================================================
            PROFILE HEADER
            ==================================================== */}

        <section className="church-member-profile__hero">
          <div className="church-member-profile__identity">

            <div className="church-member-profile__avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                />
              ) : (
                <span>
                  {getInitials(
                    displayName,
                  )}
                </span>
              )}
            </div>

            <div className="church-member-profile__identity-content">
              <div className="church-member-profile__eyebrow">
                Organization Member
              </div>

              <h1>
                {displayName}
              </h1>

              <p className="church-member-profile__role">
                {roleLabel}
              </p>

              <div className="church-member-profile__badges">

                <span
                  className={`church-status-badge church-status-badge--${member.status}`}
                >
                  {statusLabel}
                </span>

                {member.isOwner && (
                  <span className="church-status-badge church-status-badge--owner">
                    Organization Owner
                  </span>
                )}

                {member.isAdmin && (
                  <span className="church-status-badge church-status-badge--admin">
                    Administrator
                  </span>
                )}

              </div>
            </div>
          </div>

          <div className="church-member-profile__actions">

            <Link
              to={
                organizationId
                  ? `/organizations/${organizationId}/members`
                  : "/organizations"
              }
              className="church-button church-button--secondary"
            >
              ← Members
            </Link>

            {member.isSelf && (
              <Link
                to="/member/settings"
                className="church-button church-button--primary"
              >
                Member Settings
              </Link>
            )}

          </div>
        </section>

        {/* ====================================================
            PROFILE SUMMARY
            ==================================================== */}

        <section className="church-member-profile__summary-grid">

          <div className="church-member-profile__summary-card">
            <span className="church-member-profile__summary-icon">
              📅
            </span>

            <div>
              <span className="church-member-profile__summary-label">
                Joined
              </span>

              <strong>
                {organizationJoinedAt
                  ? formatDate(
                      organizationJoinedAt,
                    )
                  : "Not recorded"}
              </strong>
            </div>
          </div>

          <div className="church-member-profile__summary-card">
            <span className="church-member-profile__summary-icon">
              💧
            </span>

            <div>
              <span className="church-member-profile__summary-label">
                Baptism
              </span>

              <strong>
                {baptismDate
                  ? formatDate(
                      baptismDate,
                    )
                  : "Not recorded"}
              </strong>
            </div>
          </div>

          <div className="church-member-profile__summary-card">
            <span className="church-member-profile__summary-icon">
              📌
            </span>

            <div>
              <span className="church-member-profile__summary-label">
                Milestones
              </span>

              <strong>
                {milestoneCount}
              </strong>
            </div>
          </div>

          <div className="church-member-profile__summary-card">
            <span className="church-member-profile__summary-icon">
              📚
            </span>

            <div>
              <span className="church-member-profile__summary-label">
                History Records
              </span>

              <strong>
                {timeline.length}
              </strong>
            </div>
          </div>

        </section>

        {/* ====================================================
            MAIN CONTENT
            ==================================================== */}

        <div className="church-member-profile__layout">

          {/* ==================================================
              LEFT COLUMN
              ================================================== */}

          <main className="church-member-profile__main">

            {/* =================================================
                MEMBER HISTORY
                ================================================= */}

            <section className="church-member-profile__card">

              <div className="church-member-profile__card-header">

                <div>
                  <span className="church-member-profile__section-eyebrow">
                    Organization Journey
                  </span>

                  <h2>
                    Member History
                  </h2>

                  <p>
                    Important milestones,
                    membership events, and
                    organization records
                    associated with this
                    member.
                  </p>
                </div>

                <div className="church-member-profile__history-count">
                  {timeline.length}
                </div>

              </div>

              <div
                className="church-member-profile__filters"
                role="tablist"
                aria-label="Member history filter"
              >

                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    historyFilter === "all"
                  }
                  className={
                    historyFilter === "all"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setHistoryFilter(
                      "all",
                    )
                  }
                >
                  All History
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    historyFilter ===
                    "milestones"
                  }
                  className={
                    historyFilter ===
                    "milestones"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setHistoryFilter(
                      "milestones",
                    )
                  }
                >
                  Milestones
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    historyFilter ===
                    "records"
                  }
                  className={
                    historyFilter ===
                    "records"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setHistoryFilter(
                      "records",
                    )
                  }
                >
                  Records
                </button>

              </div>

              {loadingHistory ? (
                <div className="church-member-profile__history-loading">
                  <div className="church-loading-spinner" />

                  <span>
                    Loading member history...
                  </span>
                </div>
              ) : timeline.length === 0 ? (
                <div className="church-member-profile__empty-history">

                  <div className="church-member-profile__empty-history-icon">
                    📌
                  </div>

                  <h3>
                    No history recorded yet
                  </h3>

                  <p>
                    Organization milestones
                    and member records will
                    appear here as they are
                    recorded.
                  </p>

                </div>
              ) : (
                <div className="church-member-profile__timeline">

                  {timeline.map(
                    (item, index) => (
                      <article
                        key={item.id}
                        className="church-member-profile__timeline-item"
                      >

                        <div className="church-member-profile__timeline-rail">

                          <div className="church-member-profile__timeline-icon">
                            {item.source ===
                            "milestone"
                              ? getMilestoneIcon(
                                  item.type,
                                )
                              : getRecordIcon(
                                  item.type,
                                )}
                          </div>

                          {index <
                            timeline.length -
                              1 && (
                            <div className="church-member-profile__timeline-line" />
                          )}

                        </div>

                        <div className="church-member-profile__timeline-content">

                          <div className="church-member-profile__timeline-meta">

                            <span className="church-member-profile__timeline-type">
                              {item.source ===
                              "milestone"
                                ? MILESTONE_LABELS[
                                    item.type
                                  ] ||
                                  "Milestone"
                                : RECORD_TYPE_LABELS[
                                    item.type
                                  ] ||
                                  "Organization Record"}
                            </span>

                            {item.date && (
                              <time
                                dateTime={
                                  item.date
                                }
                              >
                                {formatShortDate(
                                  item.date,
                                )}
                              </time>
                            )}

                          </div>

                          <h3>
                            {item.title}
                          </h3>

                          {item.description && (
                            <p>
                              {
                                item.description
                              }
                            </p>
                          )}

                          {item.location && (
                            <div className="church-member-profile__timeline-location">
                              📍{" "}
                              {
                                item.location
                              }
                            </div>
                          )}

                        </div>
                      </article>
                    ),
                  )}

                </div>
              )}

            </section>

            {/* =================================================
                DEPARTMENTS
                ================================================= */}

            <section className="church-member-profile__card">

              <div className="church-member-profile__card-header">

                <div>
                  <span className="church-member-profile__section-eyebrow">
                    Organization Service
                  </span>

                  <h2>
                    Departments &amp; Teams
                  </h2>
                </div>

              </div>

              {member.profile?.departmentNames
                ?.length ? (
                <div className="church-member-profile__tag-list">

                  {member.profile.departmentNames.map(
                    (name) => (
                      <span
                        key={name}
                        className="church-member-profile__tag"
                      >
                        🏢 {name}
                      </span>
                    ),
                  )}

                </div>
              ) : (
                <p className="church-member-profile__muted">
                  No departments or teams
                  recorded.
                </p>
              )}

            </section>

            {/* =================================================
                GROUPS
                ================================================= */}

            <section className="church-member-profile__card">

              <div className="church-member-profile__card-header">

                <div>
                  <span className="church-member-profile__section-eyebrow">
                    Community
                  </span>

                  <h2>
                    Groups &amp; Communities
                  </h2>
                </div>

              </div>

              {member.profile?.groupNames
                ?.length ? (
                <div className="church-member-profile__tag-list">

                  {member.profile.groupNames.map(
                    (name) => (
                      <span
                        key={name}
                        className="church-member-profile__tag"
                      >
                        👥 {name}
                      </span>
                    ),
                  )}

                </div>
              ) : (
                <p className="church-member-profile__muted">
                  No groups or communities
                  recorded.
                </p>
              )}

            </section>

          </main>

          {/* ==================================================
              RIGHT COLUMN
              ================================================== */}

          <aside className="church-member-profile__sidebar">

            {/* =================================================
                CONTACT
                ================================================= */}

            <section className="church-member-profile__card">

              <div className="church-member-profile__card-header">

                <div>
                  <span className="church-member-profile__section-eyebrow">
                    Contact
                  </span>

                  <h2>
                    Contact Information
                  </h2>
                </div>

              </div>

              <div className="church-member-profile__details">

                {member.profile?.email && (
                  <div className="church-member-profile__detail">

                    <span>✉️</span>

                    <div>
                      <small>
                        Email
                      </small>

                      <a
                        href={`mailto:${member.profile.email}`}
                      >
                        {
                          member.profile
                            .email
                        }
                      </a>
                    </div>

                  </div>
                )}

                {member.profile?.phone && (
                  <div className="church-member-profile__detail">

                    <span>📱</span>

                    <div>
                      <small>
                        Phone
                      </small>

                      <a
                        href={`tel:${member.profile.phone}`}
                      >
                        {
                          member.profile
                            .phone
                        }
                      </a>
                    </div>

                  </div>
                )}

                {!member.profile?.email &&
                  !member.profile?.phone && (
                    <p className="church-member-profile__muted">
                      No contact information
                      available.
                    </p>
                  )}

              </div>

            </section>

            {/* =================================================
                MEMBERSHIP
                ================================================= */}

            <section className="church-member-profile__card">

              <div className="church-member-profile__card-header">

                <div>
                  <span className="church-member-profile__section-eyebrow">
                    Membership
                  </span>

                  <h2>
                    Membership Details
                  </h2>
                </div>

              </div>

              <div className="church-member-profile__details">

                <div className="church-member-profile__detail">

                  <span>🪪</span>

                  <div>
                    <small>
                      Member ID
                    </small>

                    <strong>
                      {member.memberId ||
                        member.id}
                    </strong>
                  </div>

                </div>

                <div className="church-member-profile__detail">

                  <span>🎖️</span>

                  <div>
                    <small>
                      Role
                    </small>

                    <strong>
                      {roleLabel}
                    </strong>
                  </div>

                </div>

                <div className="church-member-profile__detail">

                  <span>📋</span>

                  <div>
                    <small>
                      Status
                    </small>

                    <strong>
                      {statusLabel}
                    </strong>
                  </div>

                </div>

                {organizationJoinedAt && (
                  <div className="church-member-profile__detail">

                    <span>📅</span>

                    <div>
                      <small>
                        Member Since
                      </small>

                      <strong>
                        {formatDate(
                          organizationJoinedAt,
                        )}
                      </strong>
                    </div>

                  </div>
                )}

              </div>

            </section>

            {/* =================================================
                PRIVATE PROFILE
                ================================================= */}

            {member.canViewPrivateProfile && (
              <section className="church-member-profile__card church-member-profile__private-card">

                <div className="church-member-profile__card-header">

                  <div>
                    <span className="church-member-profile__section-eyebrow">
                      Private Information
                    </span>

                    <h2>
                      Private Profile
                    </h2>
                  </div>

                </div>

                <p>
                  You have permission to
                  view this member's
                  private profile
                  information.
                </p>

                {member.privateProfile
                  ?.address && (
                  <div className="church-member-profile__address">

                    <strong>
                      Address
                    </strong>

                    <span>
                      {
                        member
                          .privateProfile
                          .address
                          .line1
                      }
                    </span>

                    {member
                      .privateProfile
                      .address
                      .line2 && (
                      <span>
                        {
                          member
                            .privateProfile
                            .address
                            .line2
                        }
                      </span>
                    )}

                    <span>
                      {
                        member
                          .privateProfile
                          .address
                          .city
                      }

                      {member
                        .privateProfile
                        .address
                        .state
                        ? `, ${member.privateProfile.address.state}`
                        : ""}

                      {member
                        .privateProfile
                        .address
                        .postalCode
                        ? ` ${member.privateProfile.address.postalCode}`
                        : ""}
                    </span>

                    <span>
                      {
                        member
                          .privateProfile
                          .address
                          .country
                      }
                    </span>

                  </div>
                )}

                {member.privateProfile
                  ?.dateOfBirth && (
                  <div className="church-member-profile__private-row">

                    <span>
                      Date of Birth
                    </span>

                    <strong>
                      {formatDate(
                        member.privateProfile
                          .dateOfBirth,
                      )}
                    </strong>

                  </div>
                )}

              </section>
            )}

          </aside>
        </div>
      </div>
    </div>
  );
}