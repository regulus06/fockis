import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Inbox,
  RefreshCw,
} from "lucide-react";

import { meetingsApi } from "../services/meetingsApi";

import { InvitationItem } from "../components/invitations/InvitationItem";
import { EmptyState } from "../components/common/EmptyState";

import { MEETING_ROUTES } from "../constants";

import type {
  Meeting,
  MeetingInvitation,
} from "../types";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/invitations.scss";

function getInvitationMeeting(
  invitation: MeetingInvitation,
): Meeting | null {
  if (!invitation.meeting) {
    return null;
  }

  return invitation.meeting;
}

export function MeetingInvitationsPage() {
  const [invitations, setInvitations] = useState<
    MeetingInvitation[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvitations = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result =
          await meetingsApi.getMyInvitations();

        if (!result.ok) {
          setError(result.error);
          setInvitations([]);
          return;
        }

        setInvitations(result.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load meeting invitations.",
        );
        setInvitations([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const pendingInvitations = useMemo(() => {
    return invitations.filter((invitation) => {
      const status = String(
        invitation.status || "pending",
      ).toLowerCase();

      return (
        status === "pending" ||
        status === "invited"
      );
    });
  }, [invitations]);

  const handleRemoved = useCallback(
    (invitation: MeetingInvitation) => {
      setInvitations((current) =>
        current.filter(
          (item) => item.id !== invitation.id,
        ),
      );
    },
    [],
  );

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">
      <div className="fm-subpage">
        <Link
          to={MEETING_ROUTES.root}
          className="fm-back-link"
        >
          <ArrowLeft size={14} />
          <span>Back to Meetings</span>
        </Link>

        <div className="fm-subpage-header fm-subpage-header--with-action">
          <div className="fm-subpage-header__content">
            <span className="fm-eyebrow">
              Fockis Meetings
            </span>

            <h1>Invitations</h1>

            <p>
              Meetings people have invited you to
              join.
            </p>
          </div>

          <button
            type="button"
            className="fm-page-refresh"
            onClick={() => {
              void loadInvitations(true);
            }}
            disabled={loading || refreshing}
            aria-label="Refresh meeting invitations"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "fm-spin"
                  : undefined
              }
            />

            <span>
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>
        </div>

        {!loading && !error && (
          <div className="fm-invitations-summary">
            <div className="fm-invitations-summary__item">
              <strong>
                {pendingInvitations.length}
              </strong>

              <span>
                Pending{" "}
                {pendingInvitations.length === 1
                  ? "invitation"
                  : "invitations"}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div
            className="fm-dashboard-loading"
            role="status"
            aria-live="polite"
          >
            <div
              className="fm-loading-spinner"
              aria-hidden="true"
            />

            <span>
              Loading invitations...
            </span>
          </div>
        ) : error ? (
          <div
            className="fm-page-error"
            role="alert"
          >
            <Inbox
              size={28}
              aria-hidden="true"
            />

            <h3>
              Unable to load invitations
            </h3>

            <p>{error}</p>

            <button
              type="button"
              className="fm-retry-button"
              onClick={() => {
                void loadInvitations();
              }}
            >
              Try again
            </button>
          </div>
        ) : pendingInvitations.length === 0 ? (
          <EmptyState
            icon={<Inbox size={28} />}
            title="No pending invitations"
            description="Meeting invitations from other users will appear here."
          />
        ) : (
          <div
            className="fm-invitations-list"
            aria-label="Pending meeting invitations"
          >
            {pendingInvitations.map(
              (invitation) => {
                const meeting =
                  getInvitationMeeting(
                    invitation,
                  );

                if (!meeting) {
                  return null;
                }

                return (
                  <InvitationItem
                    key={invitation.id}
                    meeting={meeting}
                    invitation={invitation}
                    onAccepted={() => {
                      handleRemoved(
                        invitation,
                      );
                    }}
                    onDeclined={() => {
                      handleRemoved(
                        invitation,
                      );
                    }}
                  />
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingInvitationsPage;