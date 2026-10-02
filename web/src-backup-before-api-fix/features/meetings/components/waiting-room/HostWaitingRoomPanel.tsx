import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { meetingsApi } from "../../services/meetingsApi";
import type { MeetingParticipant } from "../../services/meetingsApi";

import "../../styles/components/waiting-room.scss";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const REFRESH_INTERVAL_MS = 3_000;

interface HostWaitingRoomPanelProps {
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

interface ActionState {
  participantId: string;
  action: "admit" | "reject";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const keys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "idToken",
    "id_token",
    "authToken",
    "authorization",
    "fockis_token",
    "fockis_access_token",
  ];

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw?.trim()) continue;

      const clean = raw.trim();
      if (clean.toLowerCase().startsWith("bearer ")) {
        return clean.slice(7).trim();
      }

      if (clean.split(".").length === 3) {
        return clean;
      }

      try {
        const parsed = JSON.parse(clean) as Record<string, unknown>;
        const candidates = [
          parsed.access_token,
          parsed.accessToken,
          parsed.token,
          parsed.jwt,
          parsed.idToken,
          parsed.id_token,
        ];

        for (const candidate of candidates) {
          if (typeof candidate !== "string") continue;
          const token = candidate.trim();
          if (token.toLowerCase().startsWith("bearer ")) {
            return token.slice(7).trim();
          }
          if (token.split(".").length === 3) {
            return token;
          }
        }
      } catch {
        // Not JSON; continue searching other keys.
      }
    } catch {
      // Ignore inaccessible localStorage entries.
    }
  }

  return null;
}

function getParticipantId(participant: MeetingParticipant): string {
  return String(
    participant.userId || participant.id || "",
  ).trim();
}

function getDisplayName(participant: MeetingParticipant): string {
  return (
    participant.displayName?.trim() ||
    participant.email?.trim() ||
    "Guest"
  );
}

function getInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatWaitTime(value?: string): string {
  if (!value) return "Waiting now";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Waiting now";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) {
    return `${Math.max(1, seconds)}s waiting`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m waiting`;
}

async function performHostAction(
  meetingId: string,
  participantId: string,
  action: "admit" | "reject",
): Promise<{ ok: boolean; error?: string }> {
  const token = getAuthToken();

  try {
    const response = await fetch(
      `${API_BASE_URL}/meetings/${encodeURIComponent(
        meetingId,
      )}/participants/${encodeURIComponent(participantId)}/${action}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        credentials: "include",
      },
    );

    const contentType = response.headers.get("content-type") || "";
    let payload: unknown = null;

    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    } else {
      payload = await response.text().catch(() => "");
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}.`;

      if (typeof payload === "string" && payload.trim()) {
        message = payload.trim();
      } else if (payload && typeof payload === "object") {
        const candidate = (payload as Record<string, unknown>).message;
        if (Array.isArray(candidate)) {
          message = candidate.map(String).join(", ");
        } else if (typeof candidate === "string") {
          message = candidate;
        }
      }

      return { ok: false, error: message };
    }

    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to connect to the meetings backend.",
    };
  }
}

export function HostWaitingRoomPanel({
  onClose,
  onCountChange,
}: HostWaitingRoomPanelProps) {
  const [meetingId, setMeetingId] = useState("");
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const meetingsIndex = pathParts.indexOf("meetings");
    const pathMeetingId =
      meetingsIndex >= 0 ? pathParts[meetingsIndex + 1] : "";

    setMeetingId(pathMeetingId || "");
  }, []);

  const waitingParticipants = useMemo(
    () =>
      participants.filter(
        (participant) =>
          participant.waiting === true &&
          participant.admitted !== true &&
          participant.role !== "host",
      ),
    [participants],
  );

  const loadWaitingRoom = useCallback(
    async (showSpinner = false) => {
      if (!meetingId) {
        setLoading(false);
        setError("Meeting ID is missing from this meeting room.");
        onCountChange?.(0);
        return;
      }

      if (showSpinner) {
        setRefreshing(true);
      }

      const result = await meetingsApi.getParticipants(meetingId);

      if (!result.ok) {
        setError(result.error || "Unable to load the waiting room.");
        setParticipants([]);
        onCountChange?.(0);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const rows = Array.isArray(result.data) ? result.data : [];
      setParticipants(rows);

      const waitingCount = rows.filter(
        (participant) =>
          participant.waiting === true &&
          participant.admitted !== true &&
          participant.role !== "host",
      ).length;

      onCountChange?.(waitingCount);
      setError(null);
      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    [meetingId, onCountChange],
  );

  useEffect(() => {
    void loadWaitingRoom();

    const timer = window.setInterval(() => {
      void loadWaitingRoom();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [loadWaitingRoom]);

  const handleAction = async (
    participant: MeetingParticipant,
    action: "admit" | "reject",
  ) => {
    const participantId = getParticipantId(participant);

    if (!meetingId || !participantId || actionState) {
      return;
    }

    setActionState({ participantId, action });
    setError(null);

    const result = await performHostAction(
      meetingId,
      participantId,
      action,
    );

    if (!result.ok) {
      setError(result.error || "The action could not be completed.");
      setActionState(null);
      return;
    }

    setParticipants((current) =>
      current.filter(
        (item) => getParticipantId(item) !== participantId,
      ),
    );

    onCountChange?.(Math.max(0, waitingParticipants.length - 1));
    setActionState(null);

    // Re-read from the backend so the host view always reflects MongoDB.
    window.setTimeout(() => {
      void loadWaitingRoom(true);
    }, 250);
  };

  return (
    <>
      <style>{`
        .fm-waiting-room-panel {
          display: flex;
          flex-direction: column;
          width: min(430px, 100%);
          height: 100%;
          min-height: 0;
          background: #0d1117;
          color: #f5f7fa;
          border-left: 1px solid rgba(255,255,255,.08);
        }
        .fm-waiting-room-panel__header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 22px 22px 16px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }
        .fm-waiting-room-panel__header h2 {
          margin: 3px 0 6px;
          font-size: 22px;
          letter-spacing: -.02em;
        }
        .fm-waiting-room-panel__header p {
          margin: 0;
          color: #8e98a8;
          font-size: 13px;
          line-height: 1.5;
          max-width: 330px;
        }
        .fm-waiting-room-panel__title-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .fm-waiting-room-panel__count {
          display: inline-flex;
          min-width: 24px;
          height: 24px;
          align-items: center;
          justify-content: center;
          padding: 0 7px;
          border-radius: 999px;
          background: rgba(59,130,246,.16);
          color: #78aefc;
          font-size: 12px;
          font-weight: 800;
        }
        .fm-waiting-room-panel__status {
          display: flex;
          align-items: center;
          gap: 11px;
          margin: 16px 18px 12px;
          padding: 12px 13px;
          border: 1px solid rgba(59,130,246,.18);
          border-radius: 12px;
          background: rgba(59,130,246,.07);
        }
        .fm-waiting-room-panel__status-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(59,130,246,.13);
          color: #7fb2ff;
          flex: 0 0 auto;
        }
        .fm-waiting-room-panel__status div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fm-waiting-room-panel__status strong {
          font-size: 13px;
        }
        .fm-waiting-room-panel__status span {
          color: #8994a5;
          font-size: 12px;
        }
        .fm-waiting-room-panel__toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 18px 12px;
        }
        .fm-waiting-room-panel__toolbar-copy {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #aeb7c5;
          font-size: 12px;
          font-weight: 650;
        }
        .fm-waiting-room-panel__refresh {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9px;
          background: rgba(255,255,255,.04);
          color: #cbd3df;
          cursor: pointer;
        }
        .fm-waiting-room-panel__refresh:hover:not(:disabled) {
          background: rgba(255,255,255,.08);
        }
        .fm-waiting-room-panel__refresh:disabled {
          opacity: .5;
          cursor: default;
        }
        .fm-waiting-room-panel__list {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: 0 18px 18px;
        }
        .fm-waiting-room-panel__person {
          padding: 15px;
          margin-bottom: 10px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          background: #131922;
          box-shadow: 0 8px 24px rgba(0,0,0,.14);
        }
        .fm-waiting-room-panel__person-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .fm-waiting-room-panel__avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
          flex: 0 0 auto;
        }
        .fm-waiting-room-panel__avatar--fallback {
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #2b5ea8, #5a7ec1);
          color: white;
          font-size: 13px;
          font-weight: 800;
        }
        .fm-waiting-room-panel__identity {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .fm-waiting-room-panel__identity strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }
        .fm-waiting-room-panel__identity span {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #8994a5;
          font-size: 11px;
        }
        .fm-waiting-room-panel__request-badge {
          padding: 5px 7px;
          border-radius: 7px;
          background: rgba(245,158,11,.1);
          color: #f6bd59;
          font-size: 10px;
          font-weight: 750;
          white-space: nowrap;
        }
        .fm-waiting-room-panel__person-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 13px 0;
        }
        .fm-waiting-room-panel__person-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 7px;
          border-radius: 7px;
          background: rgba(255,255,255,.035);
          color: #9ca7b7;
          font-size: 10px;
        }
        .fm-waiting-room-panel__actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .fm-waiting-room-panel__actions button {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: .15s ease;
        }
        .fm-waiting-room-panel__actions button:disabled {
          opacity: .5;
          cursor: default;
        }
        .fm-waiting-room-panel__reject {
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          color: #c5ccd7;
        }
        .fm-waiting-room-panel__reject:hover:not(:disabled) {
          background: rgba(255,255,255,.075);
        }
        .fm-waiting-room-panel__admit {
          border: 1px solid rgba(59,130,246,.35);
          background: #2563eb;
          color: white;
        }
        .fm-waiting-room-panel__admit:hover:not(:disabled) {
          background: #3473ef;
        }
        .fm-waiting-room-panel__empty {
          min-height: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 24px;
          text-align: center;
          color: #8d98a8;
        }
        .fm-waiting-room-panel__empty strong {
          color: #e9edf3;
          font-size: 14px;
        }
        .fm-waiting-room-panel__empty span {
          max-width: 280px;
          font-size: 12px;
          line-height: 1.5;
        }
        .fm-waiting-room-panel__empty-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin-bottom: 4px;
          border-radius: 14px;
          background: rgba(255,255,255,.05);
          color: #8d98a8;
        }
        .fm-waiting-room-panel__error {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 0 18px 12px;
          padding: 11px 12px;
          border: 1px solid rgba(239,68,68,.2);
          border-radius: 10px;
          background: rgba(239,68,68,.07);
          color: #fca5a5;
          font-size: 12px;
          line-height: 1.45;
        }
        .fm-waiting-room-panel__error strong {
          color: #fecaca;
        }
        .fm-waiting-room-panel__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 18px;
          border-top: 1px solid rgba(255,255,255,.07);
          color: #697586;
          font-size: 10px;
        }
        .fm-waiting-room-panel__footer span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .fm-panel-eyebrow {
          color: #708096;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .12em;
        }
        .fm-panel-close {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9px;
          background: rgba(255,255,255,.04);
          color: #aab4c1;
          cursor: pointer;
        }
        .fm-panel-close:hover {
          background: rgba(255,255,255,.08);
          color: white;
        }
        .is-spinning {
          animation: fmWaitingRoomSpin .8s linear infinite;
        }
        @keyframes fmWaitingRoomSpin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 720px) {
          .fm-waiting-room-panel { width: 100%; }
          .fm-waiting-room-panel__request-badge { display: none; }
        }
      `}</style>
      <div className="fm-waiting-room-panel">
      <div className="fm-waiting-room-panel__header">
        <div>
          <span className="fm-panel-eyebrow">HOST CONTROLS</span>
          <div className="fm-waiting-room-panel__title-row">
            <h2>Waiting room</h2>
            <span className="fm-waiting-room-panel__count">
              {waitingParticipants.length}
            </span>
          </div>
          <p>
            People here have requested access and are waiting for you to let them in.
          </p>
        </div>

        <button
          type="button"
          className="fm-panel-close"
          onClick={onClose}
          aria-label="Close waiting room"
        >
          <X size={18} />
        </button>
      </div>

      <div className="fm-waiting-room-panel__status">
        <span className="fm-waiting-room-panel__status-icon">
          <ShieldCheck size={17} />
        </span>
        <div>
          <strong>Waiting room is active</strong>
          <span>
            You control who enters this meeting.
          </span>
        </div>
      </div>

      <div className="fm-waiting-room-panel__toolbar">
        <div className="fm-waiting-room-panel__toolbar-copy">
          <Users size={16} />
          <span>
            {waitingParticipants.length === 0
              ? "No one is waiting"
              : `${waitingParticipants.length} ${
                  waitingParticipants.length === 1 ? "person" : "people"
                } waiting`}
          </span>
        </div>

        <button
          type="button"
          className="fm-waiting-room-panel__refresh"
          onClick={() => void loadWaitingRoom(true)}
          disabled={loading || refreshing}
          aria-label="Refresh waiting room"
          title="Refresh waiting room"
        >
          <RefreshCw
            size={15}
            className={refreshing ? "is-spinning" : ""}
          />
        </button>
      </div>

      {error ? (
        <div className="fm-waiting-room-panel__error" role="alert">
          <strong>Waiting room error</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="fm-waiting-room-panel__list">
        {loading ? (
          <div className="fm-waiting-room-panel__empty">
            <Loader2 size={24} className="is-spinning" />
            <strong>Loading waiting room…</strong>
            <span>Checking for people who requested access.</span>
          </div>
        ) : waitingParticipants.length === 0 ? (
          <div className="fm-waiting-room-panel__empty">
            <div className="fm-waiting-room-panel__empty-icon">
              <Users size={22} />
            </div>
            <strong>No one is waiting</strong>
            <span>
              When someone clicks Join meeting, their request will appear here.
            </span>
          </div>
        ) : (
          waitingParticipants.map((participant) => {
            const participantId = getParticipantId(participant);
            const displayName = getDisplayName(participant);
            const initials = getInitials(displayName);
            const busy = actionState?.participantId === participantId;

            return (
              <article
                key={participantId}
                className="fm-waiting-room-panel__person"
              >
                <div className="fm-waiting-room-panel__person-top">
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt=""
                      className="fm-waiting-room-panel__avatar"
                    />
                  ) : (
                    <div className="fm-waiting-room-panel__avatar fm-waiting-room-panel__avatar--fallback">
                      {initials}
                    </div>
                  )}

                  <div className="fm-waiting-room-panel__identity">
                    <strong>{displayName}</strong>
                    <span>
                      <Clock3 size={13} />
                      {formatWaitTime(
                        participant.createdAt || participant.updatedAt,
                      )}
                    </span>
                  </div>

                  <span className="fm-waiting-room-panel__request-badge">
                    Wants to join
                  </span>
                </div>

                <div className="fm-waiting-room-panel__person-meta">
                  <span>
                    <UserRound size={13} />
                    {participant.role === "participant"
                      ? "Participant"
                      : participant.role || "Guest"}
                  </span>
                  <span>
                    {participant.micOn === false ? "Mic off" : "Mic ready"}
                  </span>
                  <span>
                    {participant.cameraOn === false
                      ? "Camera off"
                      : "Camera ready"}
                  </span>
                </div>

                <div className="fm-waiting-room-panel__actions">
                  <button
                    type="button"
                    className="fm-waiting-room-panel__reject"
                    onClick={() => void handleAction(participant, "reject")}
                    disabled={Boolean(actionState)}
                  >
                    {busy && actionState?.action === "reject" ? (
                      <Loader2 size={15} className="is-spinning" />
                    ) : (
                      <X size={15} />
                    )}
                    Remove
                  </button>

                  <button
                    type="button"
                    className="fm-waiting-room-panel__admit"
                    onClick={() => void handleAction(participant, "admit")}
                    disabled={Boolean(actionState)}
                  >
                    {busy && actionState?.action === "admit" ? (
                      <Loader2 size={15} className="is-spinning" />
                    ) : (
                      <Check size={15} />
                    )}
                    Admit
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="fm-waiting-room-panel__footer">
        <span>
          <ShieldCheck size={14} />
          Only the host can admit people.
        </span>
        {lastUpdated ? (
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        ) : null}
      </div>
      </div>
    </>
  );
}

export default HostWaitingRoomPanel;
