/**
 * ============================================================================
 * MeetingsPage.tsx
 * ============================================================================
 * FOCKIS MEETINGS
 *
 * Main Fockis Meetings dashboard.
 *
 * Responsibilities:
 * - Show meeting actions
 * - Show meeting statistics
 * - Show the next/current meeting
 * - Show Today / Upcoming / Recent meetings
 * - Provide Meeting Center navigation
 * - Provide Attendance / Transcript / AI Summary navigation
 *
 * This page intentionally uses the existing meetings store and child
 * components so the replacement does not require backend changes.
 * ============================================================================
 */

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  Video,
  LogIn,
  CalendarPlus,
  Inbox,
  History,
  FileText,
  ClipboardCheck,
  Sparkles,
  Users,
  ChevronRight,
  Clock3,
  PlayCircle,
  Plus,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Radio,
  CalendarClock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { useMeetingsStore } from "../store/meetingsStore";
import { MeetingCard } from "../components/dashboard/MeetingCard";
import { SectionTabs } from "../components/dashboard/SectionTabs";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { MEETING_ROUTES } from "../constants";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/dashboard.scss";

/* ============================================================================
 * TYPES
 * ========================================================================== */

const TABS = [
  "Today",
  "Upcoming",
  "Recent",
] as const;

type MeetingTab = (typeof TABS)[number];

type MeetingLike = {
  id: string;
  topic?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  timezone?: string;
  status?: string;
  participantCount?: number;
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function normalizeStatus(
  meeting: MeetingLike | undefined,
): string {
  if (!meeting) {
    return "scheduled";
  }

  return String(meeting.status ?? "scheduled")
    .trim()
    .toLowerCase();
}

function getStatusLabel(
  meeting: MeetingLike | undefined,
): string {
  const status = normalizeStatus(meeting);

  switch (status) {
    case "live":
      return "Live";

    case "starting_soon":
      return "Starting soon";

    case "late":
      return "Late";

    case "ended":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "scheduled":
    default:
      return "Scheduled";
  }
}

function getStatusIcon(
  meeting: MeetingLike | undefined,
): ReactNode {
  const status = normalizeStatus(meeting);

  switch (status) {
    case "live":
      return <Radio size={14} />;

    case "starting_soon":
    case "late":
      return <CalendarClock size={14} />;

    case "ended":
      return <CheckCircle2 size={14} />;

    case "cancelled":
      return <XCircle size={14} />;

    case "scheduled":
    default:
      return <Clock3 size={14} />;
  }
}

function getStatusClass(
  meeting: MeetingLike | undefined,
): string {
  const status = normalizeStatus(meeting);

  switch (status) {
    case "live":
      return "is-live";

    case "starting_soon":
      return "is-starting";

    case "late":
      return "is-late";

    case "ended":
      return "is-completed";

    case "cancelled":
      return "is-cancelled";

    case "scheduled":
    default:
      return "is-scheduled";
  }
}

/**
 * Converts a meeting date/time into a Date when possible.
 *
 * The Meetings backend uses startTime/endTime values, while some older
 * meeting records may also contain a separate date field.
 */
function parseMeetingDate(
  meeting: MeetingLike | undefined,
  field: "startTime" | "endTime",
): Date | null {
  if (!meeting) {
    return null;
  }

  const value = meeting[field];

  if (!value) {
    return null;
  }

  const direct = new Date(value);

  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  if (meeting.date) {
    const combined = new Date(
      `${meeting.date}T${value}`,
    );

    if (!Number.isNaN(combined.getTime())) {
      return combined;
    }
  }

  return null;
}

function formatMeetingTime(
  meeting: MeetingLike | undefined,
): string {
  if (!meeting) {
    return "Time unavailable";
  }

  const start = parseMeetingDate(
    meeting,
    "startTime",
  );

  const end = parseMeetingDate(
    meeting,
    "endTime",
  );

  if (start && end) {
    const formatter = new Intl.DateTimeFormat(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
      },
    );

    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }

  if (start) {
    return new Intl.DateTimeFormat(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
      },
    ).format(start);
  }

  return "Time unavailable";
}

function formatMeetingDate(
  meeting: MeetingLike | undefined,
): string {
  if (!meeting) {
    return "Date unavailable";
  }

  const start = parseMeetingDate(
    meeting,
    "startTime",
  );

  if (start) {
    return new Intl.DateTimeFormat(
      undefined,
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      },
    ).format(start);
  }

  if (meeting.date) {
    const date = new Date(
      `${meeting.date}T00:00:00`,
    );

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(
        undefined,
        {
          weekday: "short",
          month: "short",
          day: "numeric",
        },
      ).format(date);
    }
  }

  return "Date unavailable";
}

function getMeetingTitle(
  meeting: MeetingLike | undefined,
): string {
  return (
    meeting?.topic?.trim() ||
    "Fockis Meeting"
  );
}

function getParticipantCount(
  meeting: MeetingLike | undefined,
): number {
  if (!meeting) {
    return 0;
  }

  return Number.isFinite(
    meeting.participantCount,
  )
    ? Number(meeting.participantCount)
    : 0;
}

/**
 * Prefer an active meeting when selecting the meeting used by the
 * Meeting Center and intelligence cards.
 */
function selectPrimaryMeeting<T extends MeetingLike>(
  today: T[],
  upcoming: T[],
  recent: T[],
): T | undefined {
  const live = today.find(
    (meeting) =>
      normalizeStatus(meeting) === "live",
  );

  if (live) {
    return live;
  }

  const starting = today.find((meeting) => {
    const status = normalizeStatus(meeting);

    return (
      status === "starting_soon" ||
      status === "late"
    );
  });

  if (starting) {
    return starting;
  }

  return (
    upcoming[0] ??
    today[0] ??
    recent[0]
  );
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export function MeetingsPage() {
  const navigate = useNavigate();

  const today = useMeetingsStore(
    (state) => state.today,
  );

  const upcoming = useMeetingsStore(
    (state) => state.upcoming,
  );

  const recent = useMeetingsStore(
    (state) => state.recent,
  );

  const isLoading = useMeetingsStore(
    (state) => state.isLoading,
  );

  const error = useMeetingsStore(
    (state) => state.error,
  );

  const loadMeetings = useMeetingsStore(
    (state) => state.loadMeetings,
  );

  const [tab, setTab] =
    useState<MeetingTab>("Today");

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  /* ==========================================================================
   * CURRENT LIST
   * ======================================================================== */

  const list = useMemo(() => {
    switch (tab) {
      case "Today":
        return today;

      case "Upcoming":
        return upcoming;

      case "Recent":
        return recent;

      default:
        return today;
    }
  }, [
    tab,
    today,
    upcoming,
    recent,
  ]);

  /* ==========================================================================
   * SELECTED / PRIMARY MEETING
   * ======================================================================== */

  const selectedMeeting =
    selectPrimaryMeeting(
      today,
      upcoming,
      recent,
    );

  const selectedMeetingId =
    selectedMeeting?.id ?? "";

  /**
   * The next meeting should prioritize a currently live or starting meeting.
   * Otherwise use the first upcoming meeting, then today's meeting.
   */
  const nextMeeting =
    today.find((meeting) => {
      const status =
        normalizeStatus(meeting);

      return (
        status === "live" ||
        status === "starting_soon" ||
        status === "late"
      );
    }) ??
    upcoming[0] ??
    today[0];

  /* ==========================================================================
   * ROUTES
   * ======================================================================== */

  const roomRoute = selectedMeetingId
    ? MEETING_ROUTES.room(
        selectedMeetingId,
      )
    : MEETING_ROUTES.schedule;

  const lobbyRoute = selectedMeetingId
    ? MEETING_ROUTES.lobby(
        selectedMeetingId,
      )
    : MEETING_ROUTES.schedule;

  const detailsRoute = selectedMeetingId
    ? MEETING_ROUTES.details(
        selectedMeetingId,
      )
    : MEETING_ROUTES.schedule;

  /**
   * Overall meeting history.
   *
   * Do not use the selected meeting's history route here.
   * This is the main Meetings History page.
   */
  const historyRoute =
    "/meetings/history";

  /**
   * Meeting intelligence belongs to a specific meeting.
   *
   * If no meeting exists, send the user to the overall history page rather
   * than incorrectly sending them to Schedule Meeting.
   */
  const attendanceRoute =
    selectedMeetingId
      ? MEETING_ROUTES.attendance(
          selectedMeetingId,
        )
      : historyRoute;

  const transcriptRoute =
    selectedMeetingId
      ? MEETING_ROUTES.transcript(
          selectedMeetingId,
        )
      : historyRoute;

  const summaryRoute =
    selectedMeetingId
      ? MEETING_ROUTES.summary(
          selectedMeetingId,
        )
      : historyRoute;

  /* ==========================================================================
   * JOIN
   * ======================================================================== */

  const joinMeeting = () => {
    navigate("/meetings/join");
  };

  /* ==========================================================================
   * DERIVED UI
   * ======================================================================== */

  const nextStatus =
    normalizeStatus(nextMeeting);

  const nextStatusLabel =
    getStatusLabel(nextMeeting);

  const nextMeetingIsLive =
    nextStatus === "live";

  const nextMeetingIsCancelled =
    nextStatus === "cancelled";

  const nextMeetingTitle =
    getMeetingTitle(nextMeeting);

  const nextMeetingTime =
    formatMeetingTime(nextMeeting);

  const nextMeetingDate =
    formatMeetingDate(nextMeeting);

  const totalMeetings =
    today.length +
    upcoming.length +
    recent.length;

  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">

      {/* =====================================================================
       * HERO
       * =================================================================== */}

      <section className="fm-dashboard-header">

        <div className="fm-dashboard-header__content">

          <div className="fm-dashboard-header__eyebrow">
            Fockis Meetings
          </div>

          <h1 className="fm-dashboard-header__greeting">
            Meet, connect, and collaborate.
          </h1>

          <p className="fm-dashboard-header__description">
            Start an instant meeting, schedule one
            for later, or join a meeting with your
            team.
          </p>

        </div>

        <div className="fm-dashboard-header__actions">

          <Link
            to={MEETING_ROUTES.schedule}
            className="fm-dashboard-primary-action"
          >
            <Video size={18} />
            New Meeting
          </Link>

          <button
            type="button"
            className="fm-dashboard-secondary-action"
            onClick={joinMeeting}
          >
            <LogIn size={18} />
            Join Meeting
          </button>

        </div>

      </section>

      {/* =====================================================================
       * ERROR
       * =================================================================== */}

      {error && (
        <div
          className="fm-dashboard-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* =====================================================================
       * QUICK ACTIONS
       * =================================================================== */}

      <section className="fm-meetings-quick-actions">

        <QuickAction
          icon={<CalendarPlus size={22} />}
          title="Schedule"
          description="Plan a meeting for later."
          to={MEETING_ROUTES.schedule}
        />

        <QuickAction
          icon={<LogIn size={22} />}
          title="Join"
          description="Join with a meeting ID."
          onClick={joinMeeting}
        />

        <QuickAction
          icon={<Inbox size={22} />}
          title="Invitations"
          description="View meetings you've been invited to."
          to={MEETING_ROUTES.invitations}
        />

        <QuickAction
          icon={<History size={22} />}
          title="History"
          description="Review your previous meetings."
          to={historyRoute}
        />

      </section>

      {/* =====================================================================
       * STATS
       * =================================================================== */}

      <section className="fm-meeting-stats">

        <StatCard
          icon={<CalendarDays size={20} />}
          label="Today"
          value={today.length}
        />

        <StatCard
          icon={<Clock3 size={20} />}
          label="Upcoming"
          value={upcoming.length}
        />

        <StatCard
          icon={<CircleCheck size={20} />}
          label="Completed"
          value={recent.length}
        />

        <StatCard
          icon={<Users size={20} />}
          label="Total"
          value={totalMeetings}
        />

      </section>

      {/* =====================================================================
       * NEXT MEETING
       * =================================================================== */}

      {nextMeeting && (
        <section
          className={[
            "fm-next-meeting",
            getStatusClass(nextMeeting),
          ].join(" ")}
        >

          <div className="fm-next-meeting__left">

            <div className="fm-next-meeting__icon">
              {nextMeetingIsLive ? (
                <Radio size={24} />
              ) : (
                <Video size={24} />
              )}
            </div>

            <div>

              <div className="fm-next-meeting__label-row">

                <span className="fm-next-meeting__label">
                  {nextMeetingIsLive
                    ? "Meeting is live"
                    : today.some(
                        (meeting) =>
                          meeting.id ===
                          nextMeeting.id,
                      )
                      ? "Next meeting today"
                      : "Upcoming meeting"}
                </span>

                <span
                  className={[
                    "fm-meeting-status",
                    getStatusClass(
                      nextMeeting,
                    ),
                  ].join(" ")}
                >
                  {getStatusIcon(
                    nextMeeting,
                  )}
                  {nextStatusLabel}
                </span>

              </div>

              <h2>
                {nextMeetingTitle}
              </h2>

              <p>
                {nextMeetingDate}
                {" · "}
                {nextMeetingTime}
              </p>

              <div className="fm-next-meeting__meta">

                {getParticipantCount(
                  nextMeeting,
                ) > 0 && (
                  <span>
                    <Users size={14} />
                    {getParticipantCount(
                      nextMeeting,
                    )}{" "}
                    participant
                    {getParticipantCount(
                      nextMeeting,
                    ) === 1
                      ? ""
                      : "s"}
                  </span>
                )}

                {nextMeetingIsLive && (
                  <span>
                    <Radio size={14} />
                    Join now
                  </span>
                )}

              </div>

            </div>

          </div>

          <div className="fm-next-meeting__actions">

            {!nextMeetingIsCancelled && (
              <>
                <Link
                  to={lobbyRoute}
                  className="fm-next-meeting__secondary"
                >
                  Lobby
                </Link>

                <Link
                  to={
                    nextMeetingIsLive
                      ? roomRoute
                      : lobbyRoute
                  }
                  className="fm-next-meeting__primary"
                >
                  <PlayCircle size={17} />
                  {nextMeetingIsLive
                    ? "Join Meeting"
                    : "Enter Lobby"}
                </Link>
              </>
            )}

            {nextMeetingIsCancelled && (
              <Link
                to={detailsRoute}
                className="fm-next-meeting__secondary"
              >
                View details
              </Link>
            )}

          </div>

        </section>
      )}

      {/* =====================================================================
       * MAIN CONTENT
       * =================================================================== */}

      <div className="fm-dashboard-grid">

        <main className="fm-dashboard-main">

          {/* ===================================================================
           * MY MEETINGS
           * ================================================================= */}

          <section className="fm-meetings-section">

            <div className="fm-section-heading">

              <div>

                <h2>
                  My Meetings
                </h2>

                <p>
                  Your meetings and recent activity.
                </p>

              </div>

              <Link
                to={MEETING_ROUTES.schedule}
                className="fm-section-link"
              >
                <Plus size={16} />
                Schedule
              </Link>

            </div>

            <SectionTabs
              tabs={[...TABS]}
              active={tab}
              onChange={(value) => {
                setTab(
                  value as MeetingTab,
                );
              }}
            />

            {isLoading && (
              <div
                className="fm-dashboard-loading"
                role="status"
              >
                Loading your meetings...
              </div>
            )}

            {!isLoading &&
              list.length === 0 && (
                <EmptyState
                  icon={
                    <CalendarDays size={32} />
                  }
                  title={
                    tab === "Recent"
                      ? "No past meetings yet"
                      : tab === "Upcoming"
                        ? "No upcoming meetings"
                        : "Nothing on today's list"
                  }
                  description={
                    tab === "Recent"
                      ? "Meetings you host or attend will appear here after they end."
                      : tab === "Upcoming"
                        ? "Schedule a meeting to plan your next conversation."
                        : "Schedule a meeting or join one using a meeting ID."
                  }
                  action={
                    <Link
                      to={
                        tab === "Today"
                          ? "/meetings/join"
                          : MEETING_ROUTES.schedule
                      }
                    >
                      <Button
                        variant="primary"
                        size="sm"
                      >
                        {tab === "Today"
                          ? "Join Meeting"
                          : "Schedule Meeting"}
                      </Button>
                    </Link>
                  }
                />
              )}

            {!isLoading &&
              list.length > 0 && (
                <div className="fm-dashboard-list">

                  {list.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                    />
                  ))}

                </div>
              )}

          </section>

          {/* ===================================================================
           * MEETING INTELLIGENCE
           * ================================================================= */}

          <section className="fm-dashboard-feature-grid">

            <FeatureCard
              icon={
                <ClipboardCheck size={21} />
              }
              title="Attendance"
              description="Review who joined your meeting."
              to={attendanceRoute}
            />

            <FeatureCard
              icon={<FileText size={21} />}
              title="Transcript"
              description="Read the conversation from your meeting."
              to={transcriptRoute}
            />

            <FeatureCard
              icon={<Sparkles size={21} />}
              title="AI Summary"
              description="Review summaries and action items."
              to={summaryRoute}
            />

          </section>

        </main>

        {/* =====================================================================
         * SIDEBAR
         * =================================================================== */}

        <aside className="fm-dashboard-side">

          <div className="fm-sidebar-heading">

            <h3>
              Meeting Center
            </h3>

            <p>
              Everything you need for your meetings.
            </p>

          </div>

          <SideCard
            icon={
              <PlayCircle size={19} />
            }
            title="Meeting Room"
            description="Enter your selected meeting."
            to={roomRoute}
            label={
              selectedMeetingId
                ? "Open room"
                : "Create meeting"
            }
          />

          <SideCard
            icon={<LogIn size={19} />}
            title="Lobby"
            description="Check your microphone and camera."
            to={lobbyRoute}
            label={
              selectedMeetingId
                ? "Open lobby"
                : "Create meeting"
            }
          />

          <SideCard
            icon={
              <CalendarDays size={19} />
            }
            title="Meeting Details"
            description="View meeting information and settings."
            to={detailsRoute}
            label={
              selectedMeetingId
                ? "View details"
                : "Create meeting"
            }
          />

          <SideCard
            icon={<History size={19} />}
            title="Meeting History"
            description={`${recent.length} recent meeting${
              recent.length === 1
                ? ""
                : "s"
            }`}
            to={historyRoute}
            label="View history"
          />

        </aside>

      </div>

    </div>
  );
}

/* ============================================================================
 * QUICK ACTION
 * ========================================================================== */

function QuickAction({
  icon,
  title,
  description,
  to,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  to?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="fm-quick-action__icon">
        {icon}
      </div>

      <div className="fm-quick-action__content">

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

      <ChevronRight size={17} />
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="fm-quick-action"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={
        to ??
        MEETING_ROUTES.schedule
      }
      className="fm-quick-action"
    >
      {content}
    </Link>
  );
}

/* ============================================================================
 * STAT CARD
 * ========================================================================== */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="fm-stat-card">

      <div className="fm-stat-card__icon">
        {icon}
      </div>

      <div>

        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>

      </div>

    </div>
  );
}

/* ============================================================================
 * FEATURE CARD
 * ========================================================================== */

function FeatureCard({
  icon,
  title,
  description,
  to,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="fm-feature-card"
    >

      <div className="fm-feature-card__icon">
        {icon}
      </div>

      <div>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>

      <ArrowRight size={17} />

    </Link>
  );
}

/* ============================================================================
 * SIDEBAR CARD
 * ========================================================================== */

function SideCard({
  icon,
  title,
  description,
  to,
  label,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  to: string;
  label: string;
}) {
  return (
    <div className="fm-side-card">

      <div className="fm-side-card__top">

        <div className="fm-side-card__icon">
          {icon}
        </div>

        <div>

          <h4 className="fm-side-card__title">
            {title}
          </h4>

          <p className="fm-side-card__desc">
            {description}
          </p>

        </div>

      </div>

      <Link
        to={to}
        className="fm-side-card__link"
      >
        {label}
        <ChevronRight size={15} />
      </Link>

    </div>
  );
}

/* ============================================================================
 * DEFAULT EXPORT
 * ========================================================================== */

export default MeetingsPage;