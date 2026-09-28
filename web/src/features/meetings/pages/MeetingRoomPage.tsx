import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Info,
  ShieldCheck,
  Wifi,
  WifiOff,
  Clock3,
  Users,
  MessageCircle,
  Sparkles,
  MoreHorizontal,
  Copy,
  Check,
  X,
} from "lucide-react";

import { useMeetingsStore } from "../store/meetingsStore";
import { useRoomStore } from "../store/roomStore";
import { meetingsApi } from "../services/meetingsApi";
import { meetingsSocket } from "../services/meetingsSocket";

import { MeetingTopBar } from "../components/room/MeetingTopBar";
import { VideoGrid } from "../components/room/VideoGrid";
import { ScreenShareView } from "../components/room/ScreenShareView";
import { MeetingToolbar } from "../components/controls/MeetingToolbar";

import { ParticipantsPanel } from "../components/participants/ParticipantsPanel";
import { ChatPanel } from "../components/chat/ChatPanel";
import { SecretaryPanel } from "../components/secretary/SecretaryPanel";

import { HostWaitingRoomPanel } from "../components/waiting-room/HostWaitingRoomPanel";
import { HostControlsMenu } from "../components/host/HostControlsMenu";
import { ScreenShareBanner } from "../components/sharing/ScreenShareBanner";

import { LateNoticeModal } from "../components/late/LateNoticeModal";
import { HostLateAlert } from "../components/late/HostLateAlert";

import { mockCurrentUser } from "../services/dev-mock/devMockData";
import { MEETING_ROUTES } from "../constants";
import type { LateNotice, Meeting } from "../types";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/room.scss";

type OverlayPanel = "none" | "waiting-room" | "meeting-info";

function formatMeetingId(value?: string) {
  if (!value) return "—";
  const clean = value.replace(/\s/g, "");
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return value;
}

export function MeetingRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const storeMeeting = useMeetingsStore((state) => state.getById(id ?? ""));
  const [loadedMeeting, setLoadedMeeting] = useState<Meeting | null>(
    storeMeeting ?? null,
  );
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingLoadError, setMeetingLoadError] = useState<string | null>(null);

  const meeting = loadedMeeting ?? storeMeeting;

  const joinState = (location.state ?? {}) as {
    displayName?: string;
    passcode?: string;
    micOn?: boolean;
    cameraOn?: boolean;
  };

  const participants = useRoomStore((state) => state.participants);
  const activePanel = useRoomStore((state) => state.activePanel);
  const setActivePanel = useRoomStore((state) => state.setActivePanel);

  const micOn = useRoomStore((state) => state.micOn);
  const cameraOn = useRoomStore((state) => state.cameraOn);
  const handRaised = useRoomStore((state) => state.handRaised);
  const screenSharing = useRoomStore((state) => state.screenSharing);
  const recording = useRoomStore((state) => state.recording);
  const connectionState = useRoomStore((state) => state.connectionState);

  const toggleMic = useRoomStore((state) => state.toggleMic);
  const toggleCamera = useRoomStore((state) => state.toggleCamera);
  const toggleHandRaised = useRoomStore((state) => state.toggleHandRaised);
  const toggleScreenShare = useRoomStore((state) => state.toggleScreenShare);
  const [waitingRoomCount, setWaitingRoomCount] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoadedMeeting(null);
      setMeetingLoadError("Meeting ID is missing.");
      return;
    }

    if (storeMeeting) {
      setLoadedMeeting(storeMeeting);
      setMeetingLoadError(null);
      return;
    }

    let cancelled = false;

    const loadMeeting = async () => {
      setMeetingLoading(true);
      setMeetingLoadError(null);

      try {
        const result = await meetingsApi.getById(id);

        if (cancelled) {
          return;
        }

        if (result.ok && result.data) {
          setLoadedMeeting(result.data);
          setMeetingLoadError(null);
        } else {
          setLoadedMeeting(null);
          setMeetingLoadError("Unable to load this meeting.");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadedMeeting(null);
        setMeetingLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load this meeting.",
        );
      } finally {
        if (!cancelled) {
          setMeetingLoading(false);
        }
      }
    };

    void loadMeeting();

    return () => {
      cancelled = true;
    };
  }, [id, storeMeeting]);

  const [overlayPanel, setOverlayPanel] = useState<OverlayPanel>("none");
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [lateNoticeOpen, setLateNoticeOpen] = useState(false);
  const [hostLateAlert, setHostLateAlert] = useState<LateNotice | null>(null);
  const [locked, setLocked] = useState(meeting?.security?.locked ?? false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(
    meeting?.security?.waitingRoomEnabled ?? true,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocked(meeting?.security?.locked ?? false);
    setWaitingRoomEnabled(
      meeting?.security?.waitingRoomEnabled ?? true,
    );
  }, [
    meeting?.security?.locked,
    meeting?.security?.waitingRoomEnabled,
  ]);

  const currentUserId = (() => {
    const storedUserId = localStorage.getItem("userId");

    if (storedUserId?.trim()) {
      return storedUserId.trim();
    }

    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const parsed = JSON.parse(storedUser) as {
          id?: string;
          _id?: string;
        };

        return String(parsed?._id ?? parsed?.id ?? "").trim();
      }
    } catch {
      // Ignore malformed local user data.
    }

    return String(mockCurrentUser.id ?? "").trim();
  })();

  const isHost = Boolean(
    meeting?.hostId &&
      currentUserId &&
      String(meeting.hostId) === currentUserId,
  );

  useEffect(() => {
    if (!id || !meeting) {
      return;
    }

    let cancelled = false;

    const connectMeeting = async () => {
      useRoomStore.getState().setConnectionState("reconnecting");

      const result = await meetingsSocket.connect(
        id,
        {
          onConnectionStateChanged: (state) => {
            if (!cancelled) {
              useRoomStore
                .getState()
                .setConnectionState(state);
            }
          },

          onParticipantJoined: (participant) => {
            useRoomStore
              .getState()
              .upsertParticipant(participant);
          },

          onParticipantLeft: (participantId) => {
            useRoomStore
              .getState()
              .removeParticipant(participantId);
          },

          onParticipantUpdated: (participant) => {
            useRoomStore
              .getState()
              .upsertParticipant(participant);
          },

          onMeetingAdmitted: () => {
            useRoomStore
              .getState()
              .setConnectionState("connected");
          },

          onMeetingRejected: () => {
            useRoomStore
              .getState()
              .setConnectionState("disconnected");
          },

          onMeetingEnded: () => {
            useRoomStore
              .getState()
              .setConnectionState("disconnected");
          },
        },
        joinState.passcode,
      );

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        useRoomStore
          .getState()
          .setConnectionState("disconnected");

        console.error(
          "Fockis meeting realtime connection failed:",
          result.error,
        );
        return;
      }

      const displayName =
        joinState.displayName?.trim() ||
        meeting.hostName ||
        "Fockis User";

      useRoomStore
        .getState()
        .upsertParticipant({
          id: currentUserId || "current-user",
          user: {
            id: currentUserId || "current-user",
            displayName,
          },
          role: isHost ? "host" : "participant",
          micOn:
            joinState.micOn ??
            useRoomStore.getState().micOn,
          cameraOn:
            joinState.cameraOn ??
            useRoomStore.getState().cameraOn,
          handRaised: false,
          isSpeaking: false,
          screenSharing:
            useRoomStore.getState().screenSharing,
          connectionQuality: "good",
          joinedAt: new Date().toISOString(),
        });
    };

    void connectMeeting();

    return () => {
      cancelled = true;
      meetingsSocket.leaveMeeting(id);
      meetingsSocket.disconnect();
      useRoomStore
        .getState()
        .setConnectionState("disconnected");
    };
  }, [
    id,
    meeting?.id,
    meeting?.hostName,
    isHost,
    currentUserId,
    joinState.passcode,
    joinState.displayName,
    joinState.micOn,
    joinState.cameraOn,
  ]);

  useEffect(() => {
    if (!id || !meetingsSocket.isConnected()) {
      return;
    }

    meetingsSocket.updateMedia(id, {
      micOn,
      cameraOn,
      screenSharing,
    });
  }, [id, micOn, cameraOn, screenSharing]);

  useEffect(() => {
    if (!id || !meetingsSocket.isConnected()) {
      return;
    }

    meetingsSocket.raiseHand(id, handRaised);
  }, [id, handRaised]);

  useEffect(() => {
    if (!isHost || !id) {
      setWaitingRoomCount(0);
      return;
    }

    let cancelled = false;

    const refreshWaitingRoomCount = async () => {
      const result = await meetingsApi.getParticipants(id);

      if (cancelled || !result.ok) {
        return;
      }

      const waitingCount = result.data.filter(
        (participant) =>
          participant.waiting === true &&
          participant.admitted !== true &&
          participant.role !== "host",
      ).length;

      setWaitingRoomCount(waitingCount);
    };

    void refreshWaitingRoomCount();

    const timer = window.setInterval(() => {
      void refreshWaitingRoomCount();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, isHost]);
  const screenSharer = participants.find((participant) => participant.screenSharing);

  const handleLeave = () => {
    if (id) {
      meetingsSocket.leaveMeeting(id);
      meetingsSocket.disconnect();
      useRoomStore
        .getState()
        .setConnectionState("disconnected");
    }

    navigate(MEETING_ROUTES.summary(id ?? ""));
  };

  const handlePanelChange = (panel: typeof activePanel) => {
    setOverlayPanel("none");
    setHostMenuOpen(false);
    setActivePanel(panel);
  };

  const handleShowInfo = () => {
    setActivePanel(null);
    setHostMenuOpen(false);
    setOverlayPanel((current) =>
      current === "meeting-info" ? "none" : "meeting-info",
    );
  };

  const handleWaitingRoom = () => {
    setActivePanel(null);
    setHostMenuOpen(false);
    setOverlayPanel((current) =>
      current === "waiting-room" ? "none" : "waiting-room",
    );
  };

  const sendLateNotice = (minutes: number, message: string) => {
    setLateNoticeOpen(false);
    setHostLateAlert({
      id: `ln-${Date.now()}`,
      participantId: mockCurrentUser.id,
      participantName: mockCurrentUser.displayName,
      expectedMinutes: minutes,
      message,
      sentAt: new Date().toISOString(),
    });
  };

  const copyMeetingId = async () => {
    const value = meeting?.meetingCode || meeting?.id || id || "";
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const connected = connectionState === "connected";
  const panelOpen =
    Boolean(activePanel) || overlayPanel !== "none";

  return (
    <div className="fockis-meetings-root fockis-meetings-root--dark fm-room">
      <div className={`fm-room__main ${panelOpen ? "fm-room__main--panel" : ""}`}>
        <MeetingTopBar
          topic={meeting?.topic ?? "Fockis Meeting"}
          startedAt={meeting?.startTime ?? new Date().toISOString()}
          recording={recording}
          connectionState={connectionState}
          participantCount={participants.length}
          onShowInfo={handleShowInfo}
        />

        <div className="fm-room__secure-strip">
          <div className="fm-room__secure">
            <ShieldCheck size={15} />
            <span>Secure Fockis meeting</span>
          </div>
          <div className="fm-room__connection">
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connected ? "Connection looks good" : "Disconnected"}</span>
          </div>
        </div>

        {screenSharing || screenSharer ? (
          <ScreenShareBanner onStop={toggleScreenShare} />
        ) : null}

        <div
          className={`fm-room__stage ${
            panelOpen ? "fm-room__stage--with-panel" : ""
          }`}
        >
          <div className="fm-room__stage-glow" />

          <div className="fm-room__stage-content">
            {meetingLoading ? (
              <div className="fm-room-empty">
                <div className="fm-room-empty__orb">
                  <span>F</span>
                </div>

                <div className="fm-room-empty__badge">
                  <span />
                  Loading meeting
                </div>

                <h1>Loading your Fockis meeting</h1>

                <p>
                  We are loading the meeting details and host controls.
                </p>
              </div>
            ) : meetingLoadError ? (
              <div className="fm-room-empty">
                <div className="fm-room-empty__orb">
                  <span>!</span>
                </div>

                <div className="fm-room-empty__badge">
                  <span />
                  Unable to load meeting
                </div>

                <h1>Meeting unavailable</h1>

                <p>{meetingLoadError}</p>

                <button
                  type="button"
                  className="fm-room-empty__waiting"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>
            ) : participants.length === 0 && !screenSharer ? (
              <div className="fm-room-empty">
                <div className="fm-room-empty__orb">
                  <span>F</span>
                </div>

                <div className="fm-room-empty__badge">
                  <span />
                  Waiting for participants
                </div>

                <h1>{meeting?.topic ?? "Fockis Meeting"}</h1>

                <p>
                  Your meeting is ready. Participants will appear here
                  when they join.
                </p>

                <div className="fm-room-empty__meta">
                  <span>
                    <Users size={15} />
                    {participants.length} participants
                  </span>
                  <span>
                    <Clock3 size={15} />
                    Meeting is ready
                  </span>
                </div>

                {isHost ? (
                  <button
                    type="button"
                    className="fm-room-empty__waiting"
                    onClick={handleWaitingRoom}
                  >
                    <Users size={16} />
                    {waitingRoomCount > 0
                      ? `${waitingRoomCount} waiting to join`
                      : "Open host waiting room"}
                  </button>
                ) : null}
              </div>
            ) : screenSharer ? (
              <ScreenShareView presenterName={screenSharer.user.displayName} />
            ) : (
              <VideoGrid participants={participants} />
            )}
          </div>

          <div className="fm-room__stage-footer">
            <div className="fm-room__meeting-code">
              <span>Meeting ID</span>
              <strong>{formatMeetingId(meeting?.meetingCode || id)}</strong>
              <button
                type="button"
                onClick={() => void copyMeetingId()}
                aria-label="Copy meeting ID"
                title="Copy meeting ID"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            <div className="fm-room__stage-hint">
              <span className="fm-room__live-dot" />
              {recording ? "Recording is on" : "Meeting is live"}
            </div>
          </div>
        </div>

        <div className="fm-room__toolbar-wrap">
          {hostMenuOpen && (
            <div className="fm-room__host-menu-anchor">
              <HostControlsMenu
                locked={locked}
                waitingRoomEnabled={waitingRoomEnabled}
                onClose={() => setHostMenuOpen(false)}
                onMuteAll={() => {}}
                onToggleLock={() => setLocked((value) => !value)}
                onToggleWaitingRoom={() =>
                  setWaitingRoomEnabled((value) => !value)
                }
                onStopAllScreenShare={() => {}}
                onEndMeeting={handleLeave}
              />
            </div>
          )}

          <div className="fm-room__toolbar-shell">
            <MeetingToolbar
              micOn={micOn}
              cameraOn={cameraOn}
              handRaised={handRaised}
              screenSharing={screenSharing}
              isHost={isHost}
              activePanel={activePanel}
              onToggleMic={toggleMic}
              onToggleCamera={toggleCamera}
              onToggleHand={toggleHandRaised}
              onToggleScreenShare={toggleScreenShare}
              onSetPanel={handlePanelChange}
              onOpenHostMenu={() => {
                setOverlayPanel("none");
                setHostMenuOpen((value) => !value);
              }}
              onLeave={handleLeave}
              onReact={() => {}}
            />

            {isHost ? (
              <button
                type="button"
                className={`fm-room__toolbar-waiting${
                  waitingRoomCount > 0
                    ? " fm-room__toolbar-waiting--active"
                    : ""
                }`}
                onClick={handleWaitingRoom}
                aria-label={
                  waitingRoomCount > 0
                    ? `${waitingRoomCount} participant${
                        waitingRoomCount === 1 ? "" : "s"
                      } waiting to join`
                    : "Open waiting room"
                }
              >
                <span className="fm-room__toolbar-waiting-icon">
                  <Users size={16} />
                </span>
                <span className="fm-room__toolbar-waiting-text">
                  Waiting Room
                </span>
                <span className="fm-room__toolbar-waiting-count">
                  {waitingRoomCount}
                </span>
              </button>
            ) : null}

            <div className="fm-room__toolbar-labels" aria-hidden="true">
              <span><span className="fm-room__toolbar-dot" /> Your controls</span>
              <span>Fockis Meetings</span>
            </div>
          </div>
        </div>
      </div>

      {panelOpen && (
        <aside className="fm-room__panel">
          <div className="fm-room__panel-accent" />

          {overlayPanel === "waiting-room" ? (
            <HostWaitingRoomPanel
              onClose={() => setOverlayPanel("none")}
              onCountChange={setWaitingRoomCount}
            />
          ) : overlayPanel === "meeting-info" ? (
            <div className="fm-meeting-info-panel">
              <div className="fm-meeting-info-panel__header">
                <div>
                  <span className="fm-panel-eyebrow">MEETING DETAILS</span>
                  <h2>{meeting?.topic ?? "Fockis Meeting"}</h2>
                </div>

                <button
                  type="button"
                  className="fm-panel-close"
                  onClick={() => setOverlayPanel("none")}
                  aria-label="Close meeting information"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="fm-meeting-info-panel__status">
                <span className="fm-meeting-info-panel__status-icon">
                  <ShieldCheck size={17} />
                </span>
                <div>
                  <strong>Protected meeting</strong>
                  <span>
                    {locked ? "The meeting is locked." : "Meeting is unlocked."}
                  </span>
                </div>
              </div>

              <div className="fm-meeting-info-panel__body">
                <div className="fm-info-card">
                  <span className="fm-info-card__icon"><Users size={17} /></span>
                  <div>
                    <span className="fm-info-card__label">Participants</span>
                    <strong>{participants.length}</strong>
                  </div>
                </div>

                <div className="fm-info-card">
                  <span className="fm-info-card__icon"><Copy size={17} /></span>
                  <div>
                    <span className="fm-info-card__label">Meeting ID</span>
                    <strong>{formatMeetingId(meeting?.meetingCode || id)}</strong>
                  </div>
                  <button type="button" onClick={() => void copyMeetingId()}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>

                <div className="fm-info-card">
                  <span className="fm-info-card__icon">
                    {connected ? <Wifi size={17} /> : <WifiOff size={17} />}
                  </span>
                  <div>
                    <span className="fm-info-card__label">Connection</span>
                    <strong>{connected ? "Connected" : "Disconnected"}</strong>
                  </div>
                </div>

                <div className="fm-info-card">
                  <span className="fm-info-card__icon"><Info size={17} /></span>
                  <div>
                    <span className="fm-info-card__label">Host</span>
                    <strong>{meeting?.hostName ?? "Fockis Host"}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : activePanel === "participants" ? (
            <ParticipantsPanel
              isHost={isHost}
              onClose={() => setActivePanel(null)}
            />
          ) : activePanel === "chat" ? (
            <ChatPanel onClose={() => setActivePanel(null)} />
          ) : activePanel === "secretary" ? (
            <SecretaryPanel
              isHost={isHost}
              onClose={() => setActivePanel(null)}
            />
          ) : (
            <div className="fm-room__fallback-panel">
              <div className="fm-room__fallback-icon">
                <MoreHorizontal size={22} />
              </div>
              <h3>Meeting tools</h3>
              <p>Select a meeting tool from the toolbar.</p>
            </div>
          )}
        </aside>
      )}

      {isHost && overlayPanel !== "waiting-room" && (
        <button
          type="button"
          className={`fm-room__waiting-pill${
            waitingRoomCount > 0 ? " fm-room__waiting-pill--active" : ""
          }`}
          onClick={handleWaitingRoom}
          aria-label="Open waiting room"
        >
          <span className="fm-room__waiting-dot" />
          <Users size={15} />
          <span>Waiting room</span>
          <strong>{waitingRoomCount}</strong>
        </button>
      )}

      {!isHost && (
        <button
          type="button"
          className="fm-room__late-pill"
          onClick={() => setLateNoticeOpen(true)}
        >
          <Clock3 size={15} />
          Running late?
        </button>
      )}

      {lateNoticeOpen && (
        <LateNoticeModal
          onClose={() => setLateNoticeOpen(false)}
          onSend={sendLateNotice}
        />
      )}

      {hostLateAlert && (
        <HostLateAlert
          notice={hostLateAlert}
          onDismiss={() => setHostLateAlert(null)}
        />
      )}
    </div>
  );
}

export default MeetingRoomPage;
