import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  Link2,
  Mic,
  MicOff,
  Monitor,
  ShieldCheck,
  Sparkles,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { MEETING_ROUTES } from "../constants";

import "../styles/global.scss";
import "../styles/pages.scss";

type DeviceStatus = "checking" | "ready" | "blocked";

const MEETINGS_API_BASE_URL = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    FOCKIS_API_URL,
).replace(/\/+$/, "");

type JoinTokenResolution = {
  success: boolean;
  meetingId: string;
  meetingCode?: string;
  topic?: string;
  description?: string;
  hostName?: string;
  status?: string;
};

function getMeetingAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

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
      const value = window.localStorage.getItem(key);

      if (!value) {
        continue;
      }

      if (/^Bearer\s+/i.test(value)) {
        return value.replace(/^Bearer\s+/i, "").trim();
      }

      if (
        value.split(".").length === 3 &&
        value.trim().length > 20
      ) {
        return value.trim();
      }

      try {
        const parsed = JSON.parse(value) as unknown;

        if (
          parsed &&
          typeof parsed === "object"
        ) {
          const record =
            parsed as Record<string, unknown>;

          const candidates = [
            record.accessToken,
            record.access_token,
            record.token,
            record.jwt,
            record.idToken,
            record.id_token,
          ];

          for (const candidate of candidates) {
            if (typeof candidate !== "string") {
              continue;
            }

            const clean = candidate
              .replace(/^Bearer\s+/i, "")
              .trim();

            if (clean) {
              return clean;
            }
          }
        }
      } catch {
        // Not JSON.
      }
    } catch {
      // Ignore inaccessible localStorage entries.
    }
  }

  return null;
}

async function resolveMeetingJoinToken(
  joinToken: string,
): Promise<{
  ok: boolean;
  data?: JoinTokenResolution;
  error?: string;
}> {
  const token = joinToken.trim();

  if (!token) {
    return {
      ok: false,
      error: "Meeting join token is required.",
    };
  }

  try {
    const authToken = getMeetingAuthToken();

    const headers: HeadersInit = {
      Accept: "application/json",
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${MEETINGS_API_BASE_URL}/meetings/join-link/${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers,
        credentials: "include",
      },
    );

    const contentType =
      response.headers.get("content-type") || "";

    let payload: unknown;

    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      let message =
        `Unable to resolve meeting link (${response.status}).`;

      if (
        payload &&
        typeof payload === "object" &&
        "message" in payload
      ) {
        const serverMessage =
          (payload as { message?: unknown }).message;

        if (Array.isArray(serverMessage)) {
          message =
            serverMessage
              .filter(
                (item): item is string =>
                  typeof item === "string",
              )
              .join("\n") || message;
        } else if (
          typeof serverMessage === "string"
        ) {
          message = serverMessage;
        }
      } else if (
        typeof payload === "string" &&
        payload.trim()
      ) {
        message = payload;
      }

      return {
        ok: false,
        error: message,
      };
    }

    const data =
      payload &&
      typeof payload === "object" &&
      "data" in payload
        ? (payload as {
            data?: JoinTokenResolution;
          }).data
        : (payload as JoinTokenResolution);

    if (!data?.meetingId) {
      return {
        ok: false,
        error:
          "The meeting link was found, but no meeting ID was returned.",
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to connect to the Fockis Meetings server.",
    };
  }
}

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
      username?: unknown;
    };

    if (typeof parsed.displayName === "string") {
      return parsed.displayName;
    }

    if (typeof parsed.name === "string") {
      return parsed.name;
    }

    if (typeof parsed.username === "string") {
      return parsed.username;
    }

    return "";
  } catch {
    return "";
  }
}

/**
 * Extract a meeting ID or secure join token from:
 *
 * 123456789
 * 809 465 187
 * 809-465-187
 * abc-def-123
 * https://fockis.com/meetings/abc123
 * https://fockis.com/meetings/abc123/lobby
 * http://localhost:5173/meetings/abc123/lobby
 * http://localhost:5173/meet/abc123
 *
 * Numeric meeting IDs may contain spaces or hyphens.
 * They are normalized before being returned.
 *
 * Secure /meet/<token> links keep the token unchanged.
 */
function extractMeetingId(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);

    const parts = url.pathname
      .split("/")
      .filter(Boolean);

    const meetIndex = parts.findIndex(
      (part) => part.toLowerCase() === "meet",
    );

    if (meetIndex >= 0) {
      return parts[meetIndex + 1] ?? "";
    }

    const meetingsIndex = parts.findIndex(
      (part) => part.toLowerCase() === "meetings",
    );

    if (meetingsIndex >= 0) {
      const valueFromPath =
        parts[meetingsIndex + 1] ?? "";

      if (/^\d[\d\s-]*$/.test(valueFromPath)) {
        return valueFromPath.replace(/\D/g, "");
      }

      return valueFromPath;
    }
  } catch {
    // Not a URL. Treat the value as a meeting ID or join token.
  }

  if (/^\d[\d\s-]*$/.test(trimmed)) {
    return trimmed.replace(/\D/g, "");
  }

  return trimmed;
}

export default function MeetingJoinPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const {
    joinToken: routeJoinToken,
  } = useParams<{
    joinToken?: string;
  }>();

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const initialMeetingValue =
    routeJoinToken?.trim() ||
    searchParams.get("meetingId")?.trim() ||
    searchParams.get("link")?.trim() ||
    "";

  const [meetingId, setMeetingId] = useState(
    initialMeetingValue,
  );

  const [passcode, setPasscode] = useState(
    searchParams.get("passcode") ?? "",
  );

  const [name, setName] = useState(
    getStoredDisplayName(),
  );

  const [cameraOn, setCameraOn] = useState(true);

  const [micOn, setMicOn] = useState(true);

  const [cameraPermission, setCameraPermission] =
    useState<DeviceStatus>("checking");

  const [micPermission, setMicPermission] =
    useState<DeviceStatus>("checking");

  const [error, setError] = useState("");

  const [joining, setJoining] = useState(false);

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined"
      ? navigator.onLine
      : true,
  );

  const [showOptions, setShowOptions] =
    useState(false);

  const [linkCopied, setLinkCopied] =
    useState(false);

  useEffect(() => {
    const routeValue = routeJoinToken?.trim();

    if (routeValue && !meetingId.trim()) {
      setMeetingId(routeValue);
    }
  }, [routeJoinToken, meetingId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const startMedia = async () => {
      if (!cameraOn && !micOn) {
        setCameraPermission("ready");
        setMicPermission("ready");
        return;
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraPermission("blocked");
        setMicPermission("blocked");

        setError(
          "Your browser does not provide access to camera and microphone devices.",
        );

        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

        if (!mounted) {
          stream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        streamRef.current = stream;

        const videoTrack =
          stream.getVideoTracks()[0];

        const audioTrack =
          stream.getAudioTracks()[0];

        if (videoTrack) {
          videoTrack.enabled = cameraOn;
          setCameraPermission("ready");
        } else {
          setCameraPermission("blocked");
        }

        if (audioTrack) {
          audioTrack.enabled = micOn;
          setMicPermission("ready");
        } else {
          setMicPermission("blocked");
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setError("");
      } catch (mediaError) {
        if (!mounted) {
          return;
        }

        const domError =
          mediaError as DOMException;

        if (
          domError?.name === "NotAllowedError"
        ) {
          setCameraPermission("blocked");
          setMicPermission("blocked");

          setError(
            "Camera or microphone access was denied. You can still join with your devices turned off.",
          );
        } else if (
          domError?.name === "NotFoundError"
        ) {
          setCameraPermission("blocked");
          setMicPermission("blocked");

          setError(
            "No camera or microphone was found. You can continue with your devices turned off.",
          );
        } else {
          setCameraPermission("blocked");
          setMicPermission("blocked");

          setError(
            "We could not access your camera or microphone.",
          );
        }
      }
    };

    void startMedia();

    return () => {
      mounted = false;

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }
    };
  }, [cameraOn, micOn]);

  const toggleMic = () => {
    const next = !micOn;

    setMicOn(next);

    const stream = streamRef.current;

    if (stream) {
      stream
        .getAudioTracks()
        .forEach((track) => {
          track.enabled = next;
        });
    }
  };

  const toggleCamera = () => {
    const next = !cameraOn;

    setCameraOn(next);

    const stream = streamRef.current;

    if (stream) {
      stream
        .getVideoTracks()
        .forEach((track) => {
          track.enabled = next;
        });
    }
  };

  const copyMeetingLink = async () => {
    const cleanId =
      extractMeetingId(meetingId);

    if (!cleanId) {
      setError(
        "Enter a meeting ID before copying the link.",
      );

      return;
    }

    try {
      const isNumericMeetingId =
        /^\d{6,}$/.test(cleanId);

      const link = isNumericMeetingId
        ? `${window.location.origin}/meetings/join?meetingId=${encodeURIComponent(cleanId)}`
        : `${window.location.origin}/meet/${encodeURIComponent(cleanId)}`;

      await navigator.clipboard.writeText(link);

      setLinkCopied(true);

      window.setTimeout(() => {
        setLinkCopied(false);
      }, 1800);
    } catch {
      setError(
        "The meeting link could not be copied.",
      );
    }
  };

  const handleJoin = async () => {
    setError("");

    const cleanMeetingId =
      extractMeetingId(meetingId);

    const cleanName = name.trim();

    if (!isOnline) {
      setError(
        "You appear to be offline. Check your internet connection before joining.",
      );

      return;
    }

    if (!cleanMeetingId) {
      setError(
        "Enter a meeting ID or paste a Fockis meeting link.",
      );

      return;
    }

    if (!cleanName) {
      setError("Enter your name before joining.");

      return;
    }

    if (cleanName.length > 80) {
      setError(
        "Your name must be 80 characters or fewer.",
      );

      return;
    }

    try {
      window.localStorage.setItem(
        "fockis_meeting_display_name",
        cleanName,
      );
    } catch {
      // Storage is optional.
    }

    setJoining(true);

    try {
      /*
       * Numeric values are real meeting IDs.
       *
       * Secure /meet/<token> links must first be
       * resolved by the backend before opening
       * the lobby.
       */
      let resolvedMeetingId = cleanMeetingId;

      const isNumericMeetingId =
        /^\d{6,}$/.test(cleanMeetingId);

      if (!isNumericMeetingId) {
        const resolved =
          await resolveMeetingJoinToken(
            cleanMeetingId,
          );

        if (
          !resolved.ok ||
          !resolved.data?.meetingId
        ) {
          setError(
            resolved.error ||
              "This meeting link is invalid or no longer available.",
          );

          return;
        }

        resolvedMeetingId =
          resolved.data.meetingId;
      }

      navigate(
        MEETING_ROUTES.lobby(
          resolvedMeetingId,
        ),
        {
          state: {
            displayName: cleanName,
            passcode: passcode.trim(),
            micOn,
            cameraOn,
            joinToken: isNumericMeetingId
              ? undefined
              : cleanMeetingId,
          },
        },
      );
    } catch (joinError) {
      console.error(
        "Unable to resolve meeting link:",
        joinError,
      );

      setError(
        joinError instanceof Error
          ? joinError.message
          : "We could not open this meeting. Please check the meeting link and try again.",
      );
    } finally {
      setJoining(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent,
  ) => {
    if (event.key === "Enter") {
      void handleJoin();
    }
  };

  useEffect(() => {
    if (!name.trim()) {
      return;
    }

    try {
      window.localStorage.setItem(
        "fockis_meeting_display_name",
        name.trim(),
      );
    } catch {
      // Optional storage.
    }
  }, [name]);

  const mediaReady =
    cameraPermission === "ready" ||
    micPermission === "ready";

  const mediaBlocked =
    cameraPermission === "blocked" &&
    micPermission === "blocked";

  return (
    <div className="fm-join-page">
      <header className="fm-join-page__topbar">
        <Link
          to={MEETING_ROUTES.root}
          className="fm-join-page__back"
        >
          <ArrowLeft size={18} />
          <span>Meetings</span>
        </Link>

        <div className="fm-join-page__brand">
          <div className="fm-join-page__brand-mark">
            F
          </div>

          <span>Fockis</span>
        </div>

        <div
          className={
            isOnline
              ? "fm-join-page__secure"
              : "fm-join-page__secure is-offline"
          }
        >
          {isOnline ? (
            <>
              <ShieldCheck size={14} />
              Secure meeting
            </>
          ) : (
            <>
              <WifiOff size={14} />
              Offline
            </>
          )}
        </div>
      </header>

      <main className="fm-join-page__main">
        <section className="fm-join-page__card">
          <div className="fm-join-preview">
            {cameraOn &&
            cameraPermission === "ready" ? (
              <video
                ref={videoRef}
                className="fm-join-preview__video"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="fm-join-preview__off">
                <div className="fm-join-preview__avatar">
                  {name.trim()
                    ? name
                        .trim()
                        .charAt(0)
                        .toUpperCase()
                    : "F"}
                </div>

                <span>
                  {cameraOn
                    ? "Camera unavailable"
                    : "Camera is off"}
                </span>
              </div>
            )}

            <div className="fm-join-preview__gradient" />

            <div className="fm-join-preview__label">
              {name.trim() || "You"}
            </div>

            <div className="fm-join-preview__status">
              {cameraOn &&
              cameraPermission === "ready" ? (
                <>
                  <span className="fm-status-dot is-ready" />
                  Camera ready
                </>
              ) : (
                <>
                  <span className="fm-status-dot is-off" />
                  Camera off
                </>
              )}
            </div>

            <div className="fm-join-preview__controls">
              <button
                type="button"
                className={
                  micOn
                    ? "fm-preview-control"
                    : "fm-preview-control is-off"
                }
                onClick={toggleMic}
                aria-label={
                  micOn
                    ? "Turn microphone off"
                    : "Turn microphone on"
                }
              >
                {micOn ? (
                  <Mic size={19} />
                ) : (
                  <MicOff size={19} />
                )}
              </button>

              <button
                type="button"
                className={
                  cameraOn
                    ? "fm-preview-control"
                    : "fm-preview-control is-off"
                }
                onClick={toggleCamera}
                aria-label={
                  cameraOn
                    ? "Turn camera off"
                    : "Turn camera on"
                }
              >
                {cameraOn ? (
                  <Camera size={19} />
                ) : (
                  <CameraOff size={19} />
                )}
              </button>
            </div>
          </div>

          <div className="fm-join-form">
            <div className="fm-join-form__heading">
              <span className="fm-join-form__eyebrow">
                Fockis Meetings
              </span>

              <h1>Ready to join?</h1>

              <p>
                Enter your meeting information,
                check your devices, and continue
                to the meeting lobby.
              </p>
            </div>

            <div className="fm-join-section">
              <div className="fm-join-section__header">
                <div>
                  <strong>
                    Meeting information
                  </strong>

                  <span>
                    Enter your meeting ID or paste
                    a Fockis meeting link.
                  </span>
                </div>

                <Link2 size={18} />
              </div>

              <label className="fm-join-field">
                <span>Meeting ID or link</span>

                <input
                  type="text"
                  value={meetingId}
                  onChange={(event) =>
                    setMeetingId(
                      event.target.value,
                    )
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Meeting ID or Fockis meeting link"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <label className="fm-join-field">
                <span>
                  Passcode
                  <small>Optional</small>
                </span>

                <input
                  type="password"
                  value={passcode}
                  onChange={(event) =>
                    setPasscode(
                      event.target.value,
                    )
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Enter passcode"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="fm-join-section">
              <div className="fm-join-section__header">
                <div>
                  <strong>Your identity</strong>

                  <span>
                    This is how you'll appear to
                    other participants.
                  </span>
                </div>
              </div>

              <label className="fm-join-field">
                <span>Your name</span>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your name"
                  autoComplete="name"
                  maxLength={80}
                />
              </label>
            </div>

            <div className="fm-join-device-status">
              <div className="fm-join-device-status__icon">
                {mediaBlocked ? (
                  <WifiOff size={18} />
                ) : (
                  <Monitor size={18} />
                )}
              </div>

              <div className="fm-join-device-status__content">
                <strong>
                  {mediaBlocked
                    ? "Device access unavailable"
                    : "Devices ready"}
                </strong>

                <span>
                  {mediaBlocked
                    ? "You can still join with your camera and microphone off."
                    : "Your camera and microphone can be changed in the lobby."}
                </span>
              </div>

              <span
                className={
                  mediaBlocked
                    ? "fm-device-status-badge is-warning"
                    : "fm-device-status-badge is-ready"
                }
              >
                {mediaBlocked
                  ? "Check"
                  : mediaReady
                    ? "Ready"
                    : "Checking"}
              </span>
            </div>

            <button
              type="button"
              className="fm-join-options-toggle"
              onClick={() =>
                setShowOptions(
                  (value) => !value,
                )
              }
              aria-expanded={showOptions}
            >
              <span>Meeting options</span>

              <ChevronDown
                size={17}
                className={
                  showOptions ? "is-open" : ""
                }
              />
            </button>

            {showOptions && (
              <div className="fm-join-options">
                <div className="fm-join-option">
                  <div>
                    <Mic size={17} />
                  </div>

                  <span>
                    Join with microphone
                  </span>

                  <button
                    type="button"
                    className={
                      micOn
                        ? "fm-option-toggle is-on"
                        : "fm-option-toggle"
                    }
                    onClick={toggleMic}
                    aria-label={
                      micOn
                        ? "Disable microphone"
                        : "Enable microphone"
                    }
                  >
                    <span />
                  </button>
                </div>

                <div className="fm-join-option">
                  <div>
                    <Camera size={17} />
                  </div>

                  <span>
                    Join with camera
                  </span>

                  <button
                    type="button"
                    className={
                      cameraOn
                        ? "fm-option-toggle is-on"
                        : "fm-option-toggle"
                    }
                    onClick={toggleCamera}
                    aria-label={
                      cameraOn
                        ? "Disable camera"
                        : "Enable camera"
                    }
                  >
                    <span />
                  </button>
                </div>

                <button
                  type="button"
                  className="fm-copy-link-button"
                  onClick={copyMeetingLink}
                >
                  <Link2 size={16} />

                  {linkCopied
                    ? "Meeting link copied"
                    : "Copy meeting link"}
                </button>
              </div>
            )}

            {error && (
              <div
                className="fm-join-error"
                role="alert"
              >
                <span className="fm-join-error__icon">
                  !
                </span>

                <span>{error}</span>
              </div>
            )}

            <div
              className={
                isOnline
                  ? "fm-join-connection"
                  : "fm-join-connection is-offline"
              }
            >
              {isOnline ? (
                <>
                  <Wifi size={15} />

                  <span>
                    Internet connection available
                  </span>
                </>
              ) : (
                <>
                  <WifiOff size={15} />

                  <span>
                    No internet connection
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              className="fm-join-button"
              onClick={() => void handleJoin()}
              disabled={joining || !isOnline}
            >
              {joining ? (
                <>
                  <span className="fm-join-spinner" />
                  Opening lobby...
                </>
              ) : (
                <>
                  <Video size={18} />
                  Join Meeting
                </>
              )}
            </button>

            <div className="fm-join-note">
              <Check size={16} />

              <span>
                You will enter the meeting lobby
                first. If the meeting has a waiting
                room, the host must admit you before
                you can enter.
              </span>
            </div>

            <div className="fm-join-ai-note">
              <Sparkles size={17} />

              <div>
                <strong>
                  Fockis meeting tools
                </strong>

                <span>
                  Transcripts, AI summaries,
                  attendance, chat, reactions,
                  screen sharing, and host
                  controls are available inside
                  supported meetings.
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="fm-join-page__footer">
        <span>Fockis Meetings</span>

        <span>•</span>

        <span>
          Your meeting starts in the lobby
        </span>
      </footer>
    </div>
  );
}