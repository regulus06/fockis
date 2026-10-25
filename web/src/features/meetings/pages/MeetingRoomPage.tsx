import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  Copy,
  Info,
  MessageCircle,
  Settings,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { useMeetingsStore } from "../store/meetingsStore";
import { useRoomStore } from "../store/roomStore";
import { meetingsApi } from "../services/meetingsApi";
import type { MeetingParticipant } from "../services/meetingsApi";
import { meetingsSocket } from "../services/meetingsSocket";

import { MeetingTopBar } from "../components/room/MeetingTopBar";
import {
  VideoGrid,
  type LocalConnectionQuality,
  type StageLayout,
} from "../components/room/VideoGrid";
import { RoomSettingsPanel } from "../components/room/RoomSettingsPanel";
import { MeetingToolbar } from "../components/controls/MeetingToolbar";

import { ParticipantsPanel } from "../components/participants/ParticipantsPanel";
import { ChatPanel } from "../components/chat/ChatPanel";
import { SecretaryPanel } from "../components/secretary/SecretaryPanel";

import { HostWaitingRoomPanel } from "../components/waiting-room/HostWaitingRoomPanel";
import { HostControlsMenu } from "../components/host/HostControlsMenu";
import { ScreenShareBanner } from "../components/sharing/ScreenShareBanner";
import { FloatingReaction } from "../components/reactions/FloatingReaction";

import { LateNoticeModal } from "../components/late/LateNoticeModal";
import { HostLateAlert } from "../components/late/HostLateAlert";

import { mockCurrentUser } from "../services/dev-mock/devMockData";
import { MEETING_ROUTES, type RightPanelTab } from "../constants";
import type { LateNotice, Meeting, RoomParticipant } from "../types";
import {
  dedupeParticipants,
  participantMatchesId,
} from "../utils/participantIdentity";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/room.scss";

type OverlayPanel = "none" | "waiting-room" | "meeting-info";

interface FloatingReactionItem {
  id: number;
  emoji: string;
  offset: number;
}

function formatMeetingId(value?: string) {
  if (!value) return "—";
  const clean = value.replace(/\s/g, "");
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return value;
}

function isWaitingEntry(participant: MeetingParticipant) {
  return (
    participant.waiting === true &&
    participant.admitted !== true &&
    participant.role !== "host"
  );
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

  const [waitingList, setWaitingList] = useState<MeetingParticipant[]>([]);
  const [layout, setLayout] = useState<StageLayout>("speaker");
  const [connectionQuality, setConnectionQuality] =
    useState<LocalConnectionQuality>("good");
  const [reactions, setReactions] = useState<FloatingReactionItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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
        if (cancelled) return;

        if (result.ok && result.data) {
          setLoadedMeeting(result.data);
          setMeetingLoadError(null);
        } else {
          setLoadedMeeting(null);
          setMeetingLoadError("Unable to load this meeting.");
        }
      } catch (error) {
        if (cancelled) return;
        setLoadedMeeting(null);
        setMeetingLoadError(
          error instanceof Error ? error.message : "Unable to load this meeting.",
        );
      } finally {
        if (!cancelled) setMeetingLoading(false);
      }
    };

    void loadMeeting();

    return () => {
      cancelled = true;
    };
  }, [id, storeMeeting]);

  // On phones and small tablets the side panel is a drawer over the video, so
  // start with it closed there. Desktop keeps the stored default (Participants).
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(max-width: 900px)").matches &&
      useRoomStore.getState().activePanel
    ) {
      useRoomStore.getState().setActivePanel(null);
    }
  }, []);

  const [overlayPanel, setOverlayPanel] = useState<OverlayPanel>("none");
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [lateNoticeOpen, setLateNoticeOpen] = useState(false);
  const [hostLateAlert, setHostLateAlert] = useState<LateNotice | null>(null);
  const [locked, setLocked] = useState(meeting?.security?.locked ?? false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(
    meeting?.security?.waitingRoomEnabled ?? true,
  );
  const [copiedField, setCopiedField] = useState<"id" | "link" | null>(null);

  useEffect(() => {
    setLocked(meeting?.security?.locked ?? false);
    setWaitingRoomEnabled(meeting?.security?.waitingRoomEnabled ?? true);
  }, [meeting?.security?.locked, meeting?.security?.waitingRoomEnabled]);

  const currentUserId = (() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId?.trim()) return storedUserId.trim();

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as { id?: string; _id?: string };
        return String(parsed?._id ?? parsed?.id ?? "").trim();
      }
    } catch {
      // Ignore malformed local user data.
    }

    return String(mockCurrentUser.id ?? "").trim();
  })();

  const isHost = Boolean(
    meeting?.hostId && currentUserId && String(meeting.hostId) === currentUserId,
  );

  const localDisplayName =
    joinState.displayName?.trim() || meeting?.hostName || "Fockis User";

  useEffect(() => {
    if (!id || !meeting) return;

    let cancelled = false;

    const connectMeeting = async () => {
      useRoomStore.getState().setConnectionState("reconnecting");

      const result = await meetingsSocket.connect(
        id,
        {
          onConnectionStateChanged: (state) => {
            if (!cancelled) useRoomStore.getState().setConnectionState(state);
          },
          onParticipantJoined: (participant) => {
            useRoomStore.getState().upsertParticipant(participant);
          },
          onParticipantLeft: (participantId) => {
            useRoomStore.getState().removeParticipant(participantId);
          },
          onParticipantUpdated: (participant) => {
            useRoomStore.getState().upsertParticipant(participant);
          },
          onMeetingAdmitted: () => {
            useRoomStore.getState().setConnectionState("connected");
          },
          onMeetingRejected: () => {
            useRoomStore.getState().setConnectionState("disconnected");
          },
          onMeetingEnded: () => {
            useRoomStore.getState().setConnectionState("disconnected");
          },
        },
        joinState.passcode,
      );

      if (cancelled) return;

      if (!result.ok) {
        useRoomStore.getState().setConnectionState("disconnected");
        console.error("Fockis meeting realtime connection failed:", result.error);
        return;
      }

      const displayName =
        joinState.displayName?.trim() || meeting.hostName || "Fockis User";

      // Keep the meeting controls, participant state, and LiveKit media
      // publisher aligned with the choices made in the lobby.
      const roomStore = useRoomStore.getState();
      const initialMicOn = joinState.micOn ?? roomStore.micOn;
      const initialCameraOn = joinState.cameraOn ?? roomStore.cameraOn;

      roomStore.setMicOn(initialMicOn);
      roomStore.setCameraOn(initialCameraOn);

      roomStore.upsertParticipant({
        id: currentUserId || "current-user",
        user: {
          id: currentUserId || "current-user",
          displayName,
        },
        role: isHost ? "host" : "participant",
        micOn: initialMicOn,
        cameraOn: initialCameraOn,
        handRaised: false,
        isSpeaking: false,
        screenSharing: roomStore.screenSharing,
        connectionQuality: "good",
        joinedAt: new Date().toISOString(),
      });
    };

    void connectMeeting();

    return () => {
      cancelled = true;
      meetingsSocket.leaveMeeting(id);
      meetingsSocket.disconnect();
      useRoomStore.getState().setConnectionState("disconnected");
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
    if (!id || !meetingsSocket.isConnected()) return;
    meetingsSocket.updateMedia(id, { micOn, cameraOn, screenSharing });
  }, [id, micOn, cameraOn, screenSharing]);

  useEffect(() => {
    if (!id || !meetingsSocket.isConnected()) return;
    meetingsSocket.raiseHand(id, handRaised);
  }, [id, handRaised]);

  // Waiting room: hosts poll the backend so the sidebar shows real requests.
  const waitingRefreshRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (!isHost || !id) {
      setWaitingList([]);
      return;
    }

    let cancelled = false;

    const refreshWaitingRoom = async () => {
      const result = await meetingsApi.getParticipants(id);
      if (cancelled || !result.ok) return;
      const rows = Array.isArray(result.data) ? result.data : [];
      setWaitingList(rows.filter(isWaitingEntry));
    };

    waitingRefreshRef.current = refreshWaitingRoom;
    void refreshWaitingRoom();

    const timer = window.setInterval(() => {
      void refreshWaitingRoom();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, isHost]);

  const waitingRoomCount = waitingList.length;

  // HostWaitingRoomPanel reports its own count after admit/reject. Re-read the
  // list right away when it disagrees so the sidebar never shows stale people.
  const handleWaitingCountChange = useCallback(
    (count: number) => {
      if (count === 0) {
        setWaitingList([]);
      } else if (count !== waitingRoomCount) {
        void waitingRefreshRef.current();
      }
    },
    [waitingRoomCount],
  );

  const isSelf = useCallback(
    (participant: RoomParticipant) =>
      Boolean(currentUserId) && participantMatchesId(participant, currentUserId),
    [currentUserId],
  );

  // One row per person; this browser's media state is authoritative for "You".
  const roomParticipants = useMemo(
    () =>
      dedupeParticipants(participants).map((participant) =>
        isSelf(participant)
          ? {
              ...participant,
              micOn,
              cameraOn,
              handRaised,
              role: isHost ? ("host" as const) : participant.role,
            }
          : participant,
      ),
    [participants, isSelf, micOn, cameraOn, handRaised, isHost],
  );

  const screenSharer = roomParticipants.find((participant) => participant.screenSharing);
  const presenterName = screenSharer
    ? isSelf(screenSharer)
      ? "You"
      : screenSharer.user.displayName
    : screenSharing
      ? "You"
      : null;

  const handleLeave = () => {
    if (id) {
      meetingsSocket.leaveMeeting(id);
      meetingsSocket.disconnect();
      useRoomStore.getState().setConnectionState("disconnected");
    }
    navigate(MEETING_ROUTES.summary(id ?? ""));
  };

  // Open (or close with null) a sidebar tab. Never toggles an open tab closed.
  const handlePanelChange = (panel: RightPanelTab | null) => {
    setOverlayPanel("none");
    setHostMenuOpen(false);
    if (panel === activePanel) return;
    setActivePanel(panel);
  };

  const openOverlay = (panel: Exclude<OverlayPanel, "none">) => {
    setHostMenuOpen(false);
    setOverlayPanel((current) => (current === panel ? "none" : panel));
  };

  const closeSidebar = () => {
    setOverlayPanel("none");
    if (activePanel) setActivePanel(null);
  };

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const inviteLink =
    meeting?.joinLink ||
    (id ? `${window.location.origin}${MEETING_ROUTES.lobby(id)}` : "");

  const copyText = async (value: string, field: "id" | "link", message: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast(message);
      window.setTimeout(() => setCopiedField(null), 1600);
    } catch {
      setCopiedField(null);
      showToast("Couldn't copy. Your browser blocked clipboard access.");
    }
  };

  const copyMeetingId = () =>
    void copyText(
      meeting?.meetingCode || meeting?.id || id || "",
      "id",
      "Meeting ID copied",
    );

  const copyInviteLink = () =>
    void copyText(inviteLink, "link", "Invite link copied. Paste it to invite people.");

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const shareInvite = canShare
    ? () => {
        void navigator
          .share({
            title: meeting?.topic ?? "Fockis Meeting",
            text: `Join my Fockis meeting: ${meeting?.topic ?? ""}`.trim(),
            url: inviteLink,
          })
          .catch(() => undefined);
      }
    : undefined;

  const handleInvite = () => {
    copyInviteLink();
    // Show the Participants tab (and close any overlay) so the host can see
    // who joins.
    handlePanelChange("participants");
  };

  const handleReact = (emoji: string) => {
    const item = { id: Date.now() + Math.random(), emoji, offset: Math.round(Math.random() * 60) };
    setReactions((current) => [...current, item]);
    window.setTimeout(() => {
      setReactions((current) => current.filter((entry) => entry.id !== item.id));
    }, 2300);
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

  const connected = connectionState === "connected";
  const sidebarOpen = Boolean(activePanel) || overlayPanel !== "none";

  const tabs: Array<{ key: RightPanelTab; label: string; icon: typeof Users }> = [
    {
      key: "participants",
      label: `Participants (${roomParticipants.length})`,
      icon: Users,
    },
    { key: "chat", label: "Chat", icon: MessageCircle },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  const renderSidebarBody = () => {
    if (overlayPanel === "waiting-room") {
      return (
        <HostWaitingRoomPanel
          onClose={() => setOverlayPanel("none")}
          onCountChange={handleWaitingCountChange}
        />
      );
    }

    if (overlayPanel === "meeting-info") {
      return (
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
              <span>{locked ? "The meeting is locked." : "Meeting is unlocked."}</span>
            </div>
          </div>

          <div className="fm-meeting-info-panel__body">
            <div className="fm-info-card">
              <span className="fm-info-card__icon"><Users size={17} /></span>
              <div>
                <span className="fm-info-card__label">Participants</span>
                <strong>{roomParticipants.length}</strong>
              </div>
            </div>

            <div className="fm-info-card">
              <span className="fm-info-card__icon"><Copy size={17} /></span>
              <div>
                <span className="fm-info-card__label">Meeting ID</span>
                <strong>{formatMeetingId(meeting?.meetingCode || id)}</strong>
              </div>
              <button type="button" onClick={copyMeetingId} aria-label="Copy meeting ID">
                {copiedField === "id" ? <Check size={15} /> : <Copy size={15} />}
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
      );
    }

    switch (activePanel) {
      case "participants":
        return (
          <ParticipantsPanel
            isHost={isHost}
            participants={roomParticipants}
            isSelf={isSelf}
            waiting={waitingList}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onInvite={copyInviteLink}
            onCopyMeetingId={copyMeetingId}
            onShare={shareInvite}
            onManageWaitingRoom={() => openOverlay("waiting-room")}
          />
        );
      case "chat":
        return (
          <ChatPanel
            embedded
            onClose={() => handlePanelChange(null)}
            authorId={currentUserId || undefined}
            authorName={localDisplayName}
          />
        );
      case "settings":
        return (
          <RoomSettingsPanel
            meetingId={formatMeetingId(meeting?.meetingCode || id)}
            copiedField={copiedField}
            onCopyMeetingId={copyMeetingId}
            onCopyInviteLink={copyInviteLink}
          />
        );
      case "secretary":
        return <SecretaryPanel isHost={isHost} onClose={() => handlePanelChange(null)} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`fockis-meetings-root fockis-meetings-root--dark fm-room${
        sidebarOpen ? " fm-room--sidebar-open" : ""
      }`}
    >
      <MeetingTopBar
        topic={meeting?.topic ?? "Fockis Meeting"}
        startTime={meeting?.startTime ?? null}
        endTime={meeting?.endTime ?? null}
        recording={recording}
        connectionState={connectionState}
        connectionQuality={connectionQuality}
        participantCount={roomParticipants.length}
        waitingRoomEnabled={waitingRoomEnabled}
        locked={locked}
        layout={layout}
        onLayoutChange={setLayout}
        onShowInfo={() => openOverlay("meeting-info")}
        onLeave={handleLeave}
      />

      <div className="fm-room__body">
        <main className="fm-room__main" aria-label="Meeting stage">
          {screenSharing ? <ScreenShareBanner onStop={toggleScreenShare} /> : null}

          <div className="fm-room__stage">
            {meetingLoading ? (
              <div className="fm-room-empty">
                <div className="fm-room-empty__badge">
                  <span />
                  Loading meeting
                </div>
                <h1>Loading your Fockis meeting</h1>
                <p>We are loading the meeting details and host controls.</p>
              </div>
            ) : meetingLoadError ? (
              <div className="fm-room-empty">
                <div className="fm-room-empty__badge fm-room-empty__badge--error">
                  <span />
                  Unable to load meeting
                </div>
                <h1>Meeting unavailable</h1>
                <p>{meetingLoadError}</p>
                <button
                  type="button"
                  className="fm-room-empty__action"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>
            ) : (
              <VideoGrid
                participants={participants}
                layout={layout}
                presenterName={presenterName}
                onInvite={handleInvite}
                onLocalQualityChange={setConnectionQuality}
                localUserId={currentUserId}
              />
            )}

            {reactions.length > 0 && (
              <div className="fm-room__reactions" aria-hidden="true">
                {reactions.map((reaction) => (
                  <span
                    key={reaction.id}
                    className="fm-room__reaction"
                    style={{ left: `${reaction.offset}px` }}
                  >
                    <FloatingReaction emoji={reaction.emoji} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </main>

        {sidebarOpen && (
          <>
            <button
              type="button"
              className="fm-room__scrim"
              aria-label="Close side panel"
              onClick={closeSidebar}
            />
            <aside className="fm-room__sidebar" aria-label="Meeting side panel">
              <div className="fm-sidebar-tabs" role="tablist">
                {tabs.map(({ key, label, icon: Icon }) => {
                  const selected = overlayPanel === "none" && activePanel === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={`fm-sidebar-tabs__tab${selected ? " is-active" : ""}`}
                      onClick={() => handlePanelChange(key)}
                    >
                      <Icon size={22} />
                      <span>{label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="fm-sidebar-tabs__close"
                  aria-label="Close side panel"
                  onClick={closeSidebar}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="fm-room__sidebar-body" role="tabpanel">
                {renderSidebarBody()}
              </div>
            </aside>
          </>
        )}
      </div>

      <div className="fm-room__dock">
        {hostMenuOpen && (
          <div className="fm-room__host-menu-anchor">
            <HostControlsMenu
              locked={locked}
              waitingRoomEnabled={waitingRoomEnabled}
              onClose={() => setHostMenuOpen(false)}
              onMuteAll={() => {}}
              onToggleLock={() => setLocked((value) => !value)}
              onToggleWaitingRoom={() => setWaitingRoomEnabled((value) => !value)}
              onStopAllScreenShare={() => {}}
              onEndMeeting={handleLeave}
            />
          </div>
        )}

        <MeetingToolbar
          micOn={micOn}
          cameraOn={cameraOn}
          handRaised={handRaised}
          screenSharing={screenSharing}
          isHost={isHost}
          activePanel={overlayPanel === "none" ? activePanel : null}
          participantCount={roomParticipants.length}
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
          onReact={handleReact}
          onRunningLate={isHost ? undefined : () => setLateNoticeOpen(true)}
        />
      </div>

      {toast && (
        <div className="fm-room__toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}

      {lateNoticeOpen && (
        <LateNoticeModal onClose={() => setLateNoticeOpen(false)} onSend={sendLateNotice} />
      )}

      {hostLateAlert && (
        <HostLateAlert notice={hostLateAlert} onDismiss={() => setHostLateAlert(null)} />
      )}
    </div>
  );
}

export default MeetingRoomPage;
