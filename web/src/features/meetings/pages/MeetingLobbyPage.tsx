import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import {
  Lock,
  Settings,
  Users,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useMeetingsStore } from "../store/meetingsStore";
import { meetingsApi } from "../services/meetingsApi";
import type { Meeting, MeetingStatus } from "../types";

import { CameraPreview } from "../components/lobby/CameraPreview";
import { DeviceSelect } from "../components/lobby/DeviceSelect";
import { Button } from "../components/common/Button";

import { useMediaDevices } from "../hooks/useMediaDevices";
import { MEETING_ROUTES } from "../constants";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/lobby.scss";

/* ============================================================================
 * PRESENTATION HELPERS
 * ========================================================================== */

const STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  starting_soon: "Starting soon",
  late: "Host running late",
  live: "Live now",
  ended: "Ended",
  cancelled: "Cancelled",
};

const STATUS_MESSAGE: Record<MeetingStatus, string> = {
  scheduled: "This meeting hasn't started yet.",
  starting_soon: "Your meeting is starting soon.",
  late: "The host is running late. You'll be admitted as soon as they arrive.",
  live: "Meeting is live — you can join now.",
  ended: "This meeting has ended.",
  cancelled: "This meeting has been cancelled.",
};

const MEETING_REFRESH_INTERVAL_MS = 20_000;
const JOIN_POLL_INTERVAL_MS = 6_000;
const SPEAKER_TEST_DURATION_MS = 1_200;

function formatMeetingDate(meeting: Meeting): string {
  const source = meeting.startTime || meeting.date;
  const parsed = new Date(source);

  if (Number.isNaN(parsed.getTime())) {
    return meeting.date;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMeetingTime(meeting: Meeting): string {
  const parsed = new Date(meeting.startTime);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Best-effort, non-security-critical prefill for the display name field.
 * This does NOT determine host status or gate any functionality — it is
 * purely a convenience default until a real auth hook/store is wired in.
 */
function getStoredDisplayName(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const raw =
      window.localStorage.getItem("fockis_user") ||
      window.localStorage.getItem("auth_user") ||
      window.localStorage.getItem("user");

    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw) as {
      displayName?: unknown;
      name?: unknown;
    };

    if (typeof parsed.displayName === "string") {
      return parsed.displayName;
    }

    if (typeof parsed.name === "string") {
      return parsed.name;
    }

    return "";
  } catch {
    return "";
  }
}

function isJoinableStatus(meeting: Meeting): boolean {
  if (meeting.status === "live") return true;
  if (meeting.status === "starting_soon") return true;
  if (meeting.status === "late") return true;
  if (meeting.status === "scheduled") {
    // A waiting room is specifically designed to let participants
    // request access before the host admits them. Keep the explicit
    // allowJoinBeforeHost setting as an additional way to permit entry.
    return Boolean(
      meeting.security?.waitingRoomEnabled ||
        meeting.security?.allowJoinBeforeHost,
    );
  }
  return false;
}

/* ============================================================================
 * COMPONENT
 * ========================================================================== */

export function MeetingLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const lobbyState = (location.state ?? {}) as {
    displayName?: string;
    passcode?: string;
    micOn?: boolean;
    cameraOn?: boolean;
    joinToken?: string;
  };

  const joinToken = (() => {
    const match = window.location.pathname.match(/\/meet\/([^/]+)/);
    const pathToken = match?.[1] ? decodeURIComponent(match[1]) : "";
    return pathToken || lobbyState.joinToken?.trim() || "";
  })();

  const nameFieldId = useId();
  const passcodeFieldId = useId();

  /* --------------------------------------------------------------------------
   * MEETING DATA
   * ------------------------------------------------------------------------ */

  const storeMeeting = useMeetingsStore((s) => s.getById(id ?? ""));

  const [fetchedMeeting, setFetchedMeeting] = useState<Meeting | undefined>(
    undefined,
  );
  const [meetingLoading, setMeetingLoading] = useState(true);
  const [meetingError, setMeetingError] = useState<string | null>(null);

  const meeting = fetchedMeeting ?? storeMeeting;

  // Must be declared before attemptJoin/handleJoinClick so TypeScript
  // does not report TS2448/TS2454.
  const requiresPasscode = Boolean(
    (meeting as Meeting & { hasPasscode?: boolean })?.hasPasscode ??
      meeting?.passcode,
  );

  const loadMeeting = useCallback(async () => {
    if (!id) {
      setMeetingLoading(false);
      return;
    }

    if (joinToken) {
      const resolved = await meetingsApi.resolveJoinToken(joinToken);
      if (!resolved.ok || !resolved.data?.meetingId) {
        setMeetingError(resolved.ok ? "This meeting link could not be resolved." : resolved.error);
        setMeetingLoading(false);
        return;
      }
      const resolvedId = String(resolved.data.meetingId);
      if (resolvedId !== id) {
        navigate(MEETING_ROUTES.lobby(resolvedId), {
          replace: true,
          state: { ...lobbyState, joinToken },
        });
        return;
      }
      const data = resolved.data;
      const normalizedMeeting = {
        ...data, id: resolvedId, topic: data.topic ?? "Fockis Meeting",
        hostName: data.hostName ?? "Fockis Host", date: data.startTime ?? new Date().toISOString(),
        startTime: data.startTime ?? new Date().toISOString(), endTime: data.endTime ?? data.startTime ?? new Date().toISOString(),
        durationMinutes: data.durationMinutes ?? 60, timezone: data.timezone ?? "UTC",
        meetingCode: data.meetingCode ?? "",
        joinLink: data.joinLink ?? `/meet/${joinToken}`,
        passcode: data.hasPasscode ? "__REQUIRED__" : undefined,
        hostId: "",
        status: data.status as Meeting["status"],
        participantCount: 0,
        participants: [],
        agenda: [],
        security: {
          waitingRoomEnabled: data.security?.waitingRoomEnabled ?? true,
          allowJoinBeforeHost:
            data.security?.allowJoinBeforeHost ?? false,
          muteParticipantsOnEntry:
            data.security?.muteParticipantsOnEntry ?? true,
          locked: data.security?.locked ?? false,
          screenShareWhoCanShare:
            data.security?.screenShareWhoCanShare ?? "host_only",
        },
        secretary: {},
      } as unknown as Meeting;
      setMeetingError(null); setFetchedMeeting(normalizedMeeting); setMeetingLoading(false); return;
    }

    const result = await meetingsApi.getById(id);

    if (!result.ok) {
      setMeetingError(result.error);
      setMeetingLoading(false);
      return;
    }

    setMeetingError(null);
    setFetchedMeeting(result.data);
    setMeetingLoading(false);

    const currentMeetings = useMeetingsStore.getState().meetings;

    useMeetingsStore.getState().setMeetings(
      Array.from(
        new Map(
          [...currentMeetings, result.data].map((m) => [m.id, m]),
        ).values(),
      ),
    );
  }, [id, joinToken, navigate]);

  useEffect(() => {
    setMeetingLoading(true);
    loadMeeting();
  }, [loadMeeting]);

  useEffect(() => {
    if (!meeting) return;

    const terminal =
      meeting.status === "ended" || meeting.status === "cancelled";

    if (terminal) return;

    const interval = window.setInterval(() => {
      loadMeeting();
    }, MEETING_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [meeting, loadMeeting]);

  /* --------------------------------------------------------------------------
   * CONNECTION STATUS
   * ------------------------------------------------------------------------ */

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* --------------------------------------------------------------------------
   * DEVICES
   * ------------------------------------------------------------------------ */

  const { microphones, speakers, cameras } = useMediaDevices();

  const [micOn, setMicOn] = useState(lobbyState.micOn ?? true);
  const [cameraOn, setCameraOn] = useState(lobbyState.cameraOn ?? true);

  const [selectedMicId, setSelectedMicId] = useState("");
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("");

  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Reset a selected device if it disappears from the device list
  // (e.g. unplugged) so we don't keep requesting a dead device id.
  useEffect(() => {
    if (
      selectedMicId &&
      !microphones.some((m) => m.deviceId === selectedMicId)
    ) {
      setSelectedMicId("");
    }
  }, [microphones, selectedMicId]);

  useEffect(() => {
    if (
      selectedCameraId &&
      !cameras.some((c) => c.deviceId === selectedCameraId)
    ) {
      setSelectedCameraId("");
    }
  }, [cameras, selectedCameraId]);

  useEffect(() => {
    if (
      selectedSpeakerId &&
      !speakers.some((s) => s.deviceId === selectedSpeakerId)
    ) {
      setSelectedSpeakerId("");
    }
  }, [speakers, selectedSpeakerId]);

  /* --------------------------------------------------------------------------
   * MICROPHONE LEVEL METER
   *
   * CameraPreview only ever requests video (audio: false), so the lobby
   * page owns the microphone stream itself for the level meter. This
   * mirrors CameraPreview's own lifecycle: acquire when on, fully release
   * when off, on device change, or on unmount.
   * ------------------------------------------------------------------------ */

  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);

  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!micOn || !navigator.mediaDevices?.getUserMedia) {
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedMicId
            ? { deviceId: { exact: selectedMicId } }
            : true,
          video: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(
          constraints,
        );

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        micStreamRef.current = stream;
        setMicError(null);

        const AudioCtxCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;

        const ctx = new AudioCtxCtor();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        micAudioCtxRef.current = ctx;
        micAnalyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg =
            data.reduce((sum, value) => sum + value, 0) / data.length;
          setMicLevel(Math.min(100, Math.round((avg / 255) * 200)));
          micRafRef.current = requestAnimationFrame(tick);
        };

        tick();
      } catch (error) {
        if (cancelled) return;

        const domError = error as DOMException;

        const message =
          domError?.name === "NotAllowedError"
            ? "Microphone access was denied"
            : domError?.name === "NotFoundError" ||
                domError?.name === "OverconstrainedError"
              ? "No microphone was found"
              : "Microphone access unavailable";

        setMicError(message);
        setMicLevel(0);
      }
    }

    start();

    return () => {
      cancelled = true;

      if (micRafRef.current !== null) {
        cancelAnimationFrame(micRafRef.current);
        micRafRef.current = null;
      }

      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;

      if (micAudioCtxRef.current) {
        micAudioCtxRef.current.close().catch(() => {
          // Already closed or closing — safe to ignore.
        });
        micAudioCtxRef.current = null;
      }

      micAnalyserRef.current = null;
      setMicLevel(0);
    };
  }, [micOn, selectedMicId]);

  /* --------------------------------------------------------------------------
   * SPEAKER TEST
   * ------------------------------------------------------------------------ */

  const speakerTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerTestCleanupRef = useRef<(() => void) | null>(null);

  const [testingSpeaker, setTestingSpeaker] = useState(false);
  const [speakerTestError, setSpeakerTestError] = useState<string | null>(
    null,
  );

  const supportsSinkId =
    typeof window !== "undefined" &&
    typeof window.HTMLMediaElement !== "undefined" &&
    "setSinkId" in window.HTMLMediaElement.prototype;

  useEffect(() => {
    return () => {
      speakerTestCleanupRef.current?.();
    };
  }, []);

  const testSpeaker = useCallback(async () => {
    if (testingSpeaker) return;

    setSpeakerTestError(null);

    try {
      const AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      const ctx = new AudioCtxCtor();
      const destination = ctx.createMediaStreamDestination();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 440;
      gain.gain.value = 0.15;

      oscillator.connect(gain);
      gain.connect(destination);

      if (!speakerTestAudioRef.current) {
        speakerTestAudioRef.current = new Audio();
      }

      const audioEl = speakerTestAudioRef.current;
      audioEl.srcObject = destination.stream;

      if (supportsSinkId && selectedSpeakerId) {
        await (
          audioEl as unknown as {
            setSinkId: (id: string) => Promise<void>;
          }
        ).setSinkId(selectedSpeakerId);
      }

      const cleanup = () => {
        oscillator.stop();
        audioEl.pause();
        audioEl.srcObject = null;
        ctx.close().catch(() => {
          // Already closed — safe to ignore.
        });
        setTestingSpeaker(false);
        speakerTestCleanupRef.current = null;
      };

      speakerTestCleanupRef.current = cleanup;

      setTestingSpeaker(true);
      oscillator.start();
      await audioEl.play();

      window.setTimeout(cleanup, SPEAKER_TEST_DURATION_MS);
    } catch {
      setSpeakerTestError("Unable to play a test sound on this device.");
      setTestingSpeaker(false);
    }
  }, [testingSpeaker, supportsSinkId, selectedSpeakerId]);

  /* --------------------------------------------------------------------------
   * IDENTITY / DISPLAY NAME
   * ------------------------------------------------------------------------ */

  const [displayName, setDisplayName] = useState(
    lobbyState.displayName?.trim() || getStoredDisplayName(),
  );
  const [passcode, setPasscode] = useState(lobbyState.passcode ?? "");

  /* --------------------------------------------------------------------------
   * JOIN FLOW
   * ------------------------------------------------------------------------ */

  const [joining, setJoining] = useState(false);
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const joinPollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (joinPollRef.current !== null) {
        window.clearInterval(joinPollRef.current);
        joinPollRef.current = null;
      }
    };
  }, []);

  const attemptJoin = useCallback(async () => {
    if (!id) return;

    const trimmedPasscode = passcode.trim();

    if (requiresPasscode && !trimmedPasscode) {
      setPasscodeError("Enter the meeting passcode to continue.");
      setJoinError(null);
      setJoining(false);
      return;
    }

    setPasscodeError(null);

    const result = await meetingsApi.requestToJoin(
      id,
      trimmedPasscode || undefined,
    );

    if (!result.ok) {
      setJoinError(result.error);
      setJoining(false);
      setWaitingForHost(false);

      if (joinPollRef.current !== null) {
        window.clearInterval(joinPollRef.current);
        joinPollRef.current = null;
      }

      return;
    }

    if (!result.data.admitted) {
      setWaitingForHost(true);
      setJoinError(null);
      setJoining(false);

      if (joinPollRef.current === null) {
        joinPollRef.current = window.setInterval(() => {
          attemptJoin();
        }, JOIN_POLL_INTERVAL_MS);
      }

      return;
    }

    if (joinPollRef.current !== null) {
      window.clearInterval(joinPollRef.current);
      joinPollRef.current = null;
    }

    setWaitingForHost(false);
    setJoining(false);

    navigate(MEETING_ROUTES.room(id), {
      state: {
        displayName: displayName.trim(),

        // The HTTP join request has already validated this passcode.
        // Carry the same value into the realtime room connection.
        passcode: requiresPasscode
          ? passcode.trim()
          : undefined,

        micOn,
        cameraOn,
        cameraDeviceId: selectedCameraId || undefined,
        microphoneDeviceId: selectedMicId || undefined,
        speakerDeviceId: selectedSpeakerId || undefined,
        joinResponse: result.data,
      },
    });
  }, [
    id,
    passcode,
    requiresPasscode,
    navigate,
    displayName,
    micOn,
    cameraOn,
    selectedCameraId,
    selectedMicId,
    selectedSpeakerId,
  ]);

  const handleCancelWaiting = useCallback(() => {
    if (joinPollRef.current !== null) {
      window.clearInterval(joinPollRef.current);
      joinPollRef.current = null;
    }

    setWaitingForHost(false);
    setJoining(false);
  }, []);

  const handleJoinClick = useCallback(async () => {
    if (!id || joining || !meeting) return;

    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setJoinError("Please enter your name to continue.");
      return;
    }

    if (meeting.security?.locked) {
      setJoinError("This meeting is locked by the host.");
      return;
    }

    if (meeting.status === "ended") {
      setJoinError("This meeting has ended.");
      return;
    }

    if (meeting.status === "cancelled") {
      setJoinError("This meeting has been cancelled.");
      return;
    }

    if (!isJoinableStatus(meeting)) {
      setJoinError(
        "You can join once the host starts the meeting, or when it's closer to the scheduled time.",
      );
      return;
    }

    if (requiresPasscode && !passcode.trim()) {
      setPasscodeError("Enter the meeting passcode to continue.");
      setJoinError(null);
      return;
    }

    setPasscodeError(null);
    setJoining(true);
    setJoinError(null);

    await attemptJoin();
  }, [id, joining, meeting, displayName, requiresPasscode, passcode, attemptJoin]);

  /* --------------------------------------------------------------------------
   * DERIVED STATE
   * ------------------------------------------------------------------------ */

  const joinable = meeting ? isJoinableStatus(meeting) : false;

  const joinDisabled =
    joining ||
    !meeting ||
    !id ||
    meeting.status === "ended" ||
    meeting.status === "cancelled" ||
    Boolean(meeting.security?.locked) ||
    !joinable ||
    !displayName.trim();

  const joinLabel = waitingForHost
    ? "Waiting for host…"
    : joining
      ? "Joining…"
      : "Join meeting";

  /* --------------------------------------------------------------------------
   * INVALID / MISSING ID
   * ------------------------------------------------------------------------ */

  if (!id) {
    return (
      <div className="fockis-meetings-root">
        <div className="fm-lobby">
          <div className="fm-lobby__error-page">
            <h1>Invalid meeting link</h1>
            <p>This meeting link is missing a meeting ID.</p>
            <Button variant="primary" onClick={() => navigate(MEETING_ROUTES.root)}>
              Back to meetings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
   * LOADING
   * ------------------------------------------------------------------------ */

  if (meetingLoading && !meeting) {
    return (
      <div className="fockis-meetings-root">
        <div className="fm-lobby">
          <div className="fm-lobby__loading" role="status" aria-live="polite">
            Loading meeting…
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
   * NOT FOUND / ERROR
   * ------------------------------------------------------------------------ */

  if (!meeting) {
    return (
      <div className="fockis-meetings-root">
        <div className="fm-lobby">
          <div className="fm-lobby__error-page">
            <h1>Meeting not found</h1>
            <p>
              {meetingError ||
                "This meeting may have been removed, or you may not have access to it."}
            </p>
            <Button variant="primary" onClick={() => navigate(MEETING_ROUTES.root)}>
              Back to meetings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
   * MAIN LAYOUT
   * ------------------------------------------------------------------------ */

  const hasWaitingRoom = Boolean(meeting.security?.waitingRoomEnabled);
  const isLive = meeting.status === "live";
  const formattedDate = formatMeetingDate(meeting);
  const formattedTime = formatMeetingTime(meeting);

  return (
    <div className="fockis-meetings-root">
      <div className="fm-lobby">
        <div className="fm-lobby__grid">
          <CameraPreview
            name={displayName || "You"}
            micOn={micOn}
            cameraOn={cameraOn}
            onToggleMic={() => setMicOn((value) => !value)}
            onToggleCamera={() => setCameraOn((value) => !value)}
            cameraDeviceId={selectedCameraId || undefined}
            onError={setCameraError}
          />

          <div className="fm-lobby__panel">
            <div className="fm-lobby__meta">
              <div className="fm-lobby__title-row">
                <h1>{meeting.topic}</h1>
                <span
                  className={`fm-lobby__badge fm-lobby__badge--${meeting.status}`}
                >
                  {isLive && <span className="fm-lobby__live-dot" aria-hidden="true" />}
                  {STATUS_LABEL[meeting.status]}
                </span>
              </div>

              <div
                className={`fm-lobby__conn ${!isOnline ? "fm-lobby__conn--offline" : ""}`}
              >
                {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
                {isOnline ? "Connection looks good" : "You appear to be offline"}
              </div>
            </div>

            <div
              className={`fm-lobby__status fm-lobby__status--${meeting.status}`}
              role="status"
              aria-live="polite"
            >
              {STATUS_MESSAGE[meeting.status]}
              {hasWaitingRoom &&
                meeting.status !== "ended" &&
                meeting.status !== "cancelled" && (
                  <span className="fm-lobby__status-note">
                    {" "}
                    This meeting has a waiting room — the host may need to
                    let you in.
                  </span>
                )}
            </div>

            <dl className="fm-lobby__info">
              <div className="fm-lobby__info-row">
                <dt>Host</dt>
                <dd>{meeting.hostName}</dd>
              </div>

              <div className="fm-lobby__info-row">
                <dt>Date</dt>
                <dd>{formattedDate}</dd>
              </div>

              {formattedTime && (
                <div className="fm-lobby__info-row">
                  <dt>Time</dt>
                  <dd>
                    {formattedTime}
                    {meeting.timezone ? ` (${meeting.timezone})` : ""}
                  </dd>
                </div>
              )}

              <div className="fm-lobby__info-row">
                <dt>Meeting ID</dt>
                <dd>{meeting.meetingCode}</dd>
              </div>

              <div className="fm-lobby__info-row">
                <dt>
                  <Users size={13} aria-hidden="true" /> Participants
                </dt>
                <dd>{meeting.participantCount}</dd>
              </div>

              {meeting.security?.locked && (
                <div className="fm-lobby__info-row">
                  <dt>
                    <Lock size={13} aria-hidden="true" /> Access
                  </dt>
                  <dd>Locked by host</dd>
                </div>
              )}
            </dl>

            <div className="fm-field">
              <label className="fm-field__label" htmlFor={nameFieldId}>
                Your name
              </label>
              <input
                id={nameFieldId}
                className="fm-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Enter your name"
                disabled={joining}
                required
                aria-required="true"
              />
            </div>

            {requiresPasscode && (
              <div className="fm-field">
                <label className="fm-field__label" htmlFor={passcodeFieldId}>
                  Meeting passcode
                </label>
                <input
                  id={passcodeFieldId}
                  className={`fm-input${passcodeError ? " fm-input--error" : ""}`}
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value);
                    if (passcodeError) setPasscodeError(null);
                    if (joinError) setJoinError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !joinDisabled) {
                      event.preventDefault();
                      void handleJoinClick();
                    }
                  }}
                  placeholder="Enter passcode"
                  type="password"
                  disabled={joining}
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={Boolean(passcodeError)}
                  aria-describedby={
                    passcodeError ? `${passcodeFieldId}-error` : undefined
                  }
                />
                {passcodeError && (
                  <span
                    id={`${passcodeFieldId}-error`}
                    className="fm-form-error"
                    role="alert"
                  >
                    {passcodeError}
                  </span>
                )}
              </div>
            )}

            <DeviceSelect
              label="Microphone"
              options={microphones}
              emptyLabel="Default Microphone"
              value={selectedMicId}
              onChange={setSelectedMicId}
            />

            <DeviceSelect
              label="Camera"
              options={cameras}
              emptyLabel="Default Camera"
              value={selectedCameraId}
              onChange={setSelectedCameraId}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Settings size={15} />}
              onClick={() => setShowDeviceSettings((value) => !value)}
              aria-expanded={showDeviceSettings}
              style={{ alignSelf: "flex-start" }}
            >
              Device settings
            </Button>

            {showDeviceSettings && (
              <div className="fm-device-settings">
                <div className="fm-mic-meter">
                  <span className="fm-mic-meter__label">
                    Microphone input
                  </span>
                  <div
                    className="fm-mic-meter__track"
                    role="meter"
                    aria-label="Microphone input level"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={micOn ? micLevel : 0}
                  >
                    <div
                      className="fm-mic-meter__fill"
                      style={{ width: `${micOn ? micLevel : 0}%` }}
                    />
                  </div>
                  {micError && (
                    <span className="fm-mic-meter__error" role="alert">
                      {micError}
                    </span>
                  )}
                  {!micOn && !micError && (
                    <span className="fm-mic-meter__hint">
                      Turn your microphone on to see input levels.
                    </span>
                  )}
                </div>

                {speakers.length > 0 ? (
                  <>
                    <DeviceSelect
                      label="Speaker"
                      options={speakers}
                      emptyLabel="Default Speaker"
                      value={selectedSpeakerId}
                      onChange={setSelectedSpeakerId}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<Volume2 size={15} />}
                      onClick={testSpeaker}
                      disabled={testingSpeaker}
                      style={{ alignSelf: "flex-start" }}
                    >
                      {testingSpeaker ? "Playing test sound…" : "Test speaker"}
                    </Button>
                    {speakerTestError && (
                      <span className="fm-form-error" role="alert">
                        {speakerTestError}
                      </span>
                    )}
                    {!supportsSinkId && (
                      <span className="fm-device-settings__hint">
                        This browser doesn't support choosing a specific
                        output device — the test sound will use your
                        system default speaker.
                      </span>
                    )}
                  </>
                ) : (
                  <span className="fm-device-settings__hint">
                    Speaker selection isn't available in this browser.
                  </span>
                )}

                {cameraError && (
                  <span className="fm-form-error" role="alert">
                    {cameraError}
                  </span>
                )}
              </div>
            )}

            {joinError && (
              <div className="fm-form-error" role="alert">
                {joinError}
              </div>
            )}

            {waitingForHost && !joinError && (
              <div className="fm-lobby__waiting" role="status" aria-live="polite">
                You're in the waiting room. The host will admit you shortly.
              </div>
            )}

            <div className="fm-lobby__join-bar">
              <Button
                variant="primary"
                fullWidth
                onClick={handleJoinClick}
                disabled={joinDisabled}
                style={{ marginTop: 8 }}
              >
                {joinLabel}
              </Button>

              {waitingForHost && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={handleCancelWaiting}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MeetingLobbyPage;