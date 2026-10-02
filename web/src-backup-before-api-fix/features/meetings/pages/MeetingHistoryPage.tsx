import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowLeft,
  History,
  RefreshCw,
} from "lucide-react";

import { meetingsApi } from "../services/meetingsApi";

import {
  HistoryFilterTabs,
  type HistoryFilter,
} from "../components/history/HistoryFilterTabs";

import { HistoryListItem } from "../components/history/HistoryListItem";

import { EmptyState } from "../components/common/EmptyState";

import { MEETING_ROUTES } from "../constants";

import type { Meeting } from "../types";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/history.scss";

function getMeetingStart(
  meeting: Meeting,
): number | null {
  if (!meeting.startTime) {
    return null;
  }

  const timestamp = new Date(
    meeting.startTime,
  ).getTime();

  return Number.isNaN(timestamp)
    ? null
    : timestamp;
}

function isPastMeeting(
  meeting: Meeting,
): boolean {
  const status = String(
    meeting.status ?? "",
  )
    .trim()
    .toLowerCase();

  if (
    status === "ended" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return true;
  }

  const start = getMeetingStart(meeting);

  return (
    start !== null &&
    start < Date.now()
  );
}

function sortNewestFirst(
  meetings: Meeting[],
): Meeting[] {
  return [...meetings].sort(
    (a, b) => {
      const aTime =
        getMeetingStart(a) ?? 0;

      const bTime =
        getMeetingStart(b) ?? 0;

      return bTime - aTime;
    },
  );
}

function isCancelled(
  meeting: Meeting,
): boolean {
  return (
    String(meeting.status ?? "")
      .trim()
      .toLowerCase() === "cancelled"
  );
}

export function MeetingHistoryPage() {
  const [meetings, setMeetings] =
    useState<Meeting[]>([]);

  const [filter, setFilter] =
    useState<HistoryFilter>("All");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadHistory = useCallback(
    async (
      showRefreshState = false,
    ) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result =
          await meetingsApi.listRecent();

        if (!result.ok) {
          setError(result.error);
          setMeetings([]);
          return;
        }

        setMeetings(
          sortNewestFirst(
            Array.isArray(result.data)
              ? result.data
              : [],
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load meeting history.",
        );

        setMeetings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const endedMeetings =
    useMemo(() => {
      return meetings.filter(
        isPastMeeting,
      );
    }, [meetings]);

  /*
   * The recent-meetings API returns Meeting[]
   * but does not expose an explicit per-user
   * attendance classification in this response.
   *
   * Therefore Hosted and Attended remain
   * available as filters, but we only apply
   * a reliable Cancelled filter here.
   *
   * This prevents incorrectly labeling every
   * recent meeting as hosted or attended.
   */
  const filteredMeetings =
    useMemo(() => {
      switch (filter) {
        case "Cancelled":
          return endedMeetings.filter(
            isCancelled,
          );

        case "Hosted":
        case "Attended":
          return endedMeetings;

        case "All":
        default:
          return endedMeetings;
      }
    }, [endedMeetings, filter]);

  const emptyDescription =
    filter === "Cancelled"
      ? "Cancelled meetings will appear here."
      : filter === "Hosted"
        ? "Meetings you hosted will appear here."
        : filter === "Attended"
          ? "Meetings you attended will appear here."
          : "Meetings you host or attend will appear here once they end.";

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">
      <div className="fm-subpage">
        <Link
          to={MEETING_ROUTES.root}
          className="fm-back-link"
        >
          <ArrowLeft size={14} />
          Back to Meetings
        </Link>

        <div className="fm-subpage-header fm-subpage-header--with-action">
          <div>
            <span className="fm-eyebrow">
              Fockis Meetings
            </span>

            <h1>Meeting history</h1>

            <p>
              Review meetings that have already
              taken place.
            </p>
          </div>

          <button
            type="button"
            className="fm-page-refresh"
            onClick={() => {
              void loadHistory(true);
            }}
            disabled={
              loading || refreshing
            }
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "fm-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        <HistoryFilterTabs
          active={filter}
          onChange={setFilter}
        />

        {loading ? (
          <div className="fm-dashboard-loading">
            <div className="fm-loading-spinner" />
            Loading meeting history...
          </div>
        ) : error ? (
          <div className="fm-page-error">
            <History size={28} />

            <h3>
              Unable to load meeting history
            </h3>

            <p>{error}</p>

            <button
              type="button"
              className="fm-retry-button"
              onClick={() => {
                void loadHistory();
              }}
            >
              Try again
            </button>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <EmptyState
            icon={<History size={28} />}
            title="No meetings here yet"
            description={emptyDescription}
          />
        ) : (
          <div className="fm-history-list">
            {filteredMeetings.map(
              (meeting) => (
                <HistoryListItem
                  key={meeting.id}
                  meeting={meeting}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingHistoryPage;