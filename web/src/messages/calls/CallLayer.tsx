import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Maximize2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  RefreshCw,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";

import { messageSocket } from "../services/messageSocket";
import { API_BASE, api, authToken } from "../inbox/inboxApi";
import {
  acceptCall,
  attachLocalVideo,
  attachRemoteVideo,
  audioBlocked,
  bindCallEvents,
  declineCall,
  hangUp,
  resumeAudio,
  resumePendingCall,
  setMinimized,
  switchCamera,
  switchSpeaker,
  toggleCamera,
  toggleMute,
  useCallSession,
} from "./callSession";
import { isNativeShell, onNativeCommand, postToNative } from "./nativeBridge";
import { useHideBottomNav } from "../../components/fockis/FockisBottomNav";
import "./calls.scss";

/* ============================================================================
   GLOBAL CALL LAYER
   Mounted once in App, so calls ring on every page of Fockis, not only in
   Messages. Renders the incoming, outgoing and in-call screens.
============================================================================ */

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "F";
}

function Avatar({ name, src, size }: { name: string; src?: string; size: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="fkc-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : initials(name)}
    </span>
  );
}

async function registerDevice(command: { deviceId: string; platform: string; pushToken?: string; voipToken?: string; deviceName?: string; appVersion?: string }) {
  try {
    await api("/devices/register", {
      method: "POST",
      json: {
        deviceId: command.deviceId,
        platform: command.platform,
        ...(command.pushToken ? { pushToken: command.pushToken } : {}),
        ...(command.voipToken ? { voipToken: command.voipToken } : {}),
        ...(command.deviceName ? { deviceName: command.deviceName.slice(0, 120) } : {}),
        ...(command.appVersion ? { appVersion: command.appVersion.slice(0, 40) } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}

function useDuration(since: string | null | undefined, running: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  if (!since || !running) return "";
  const total = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export default function CallLayer() {
  const [signedIn, setSignedIn] = useState(() => Boolean(authToken()));

  // Follow sign-in / sign-out without a reload.
  useEffect(() => {
    const check = () => setSignedIn(Boolean(authToken()));
    window.addEventListener("storage", check);
    const timer = window.setInterval(check, 4000);
    return () => {
      window.removeEventListener("storage", check);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    messageSocket.connect();
    const unbind = bindCallEvents();

    // Opened from a call notification: /anything?call=<id>&callAction=accept
    const params = new URLSearchParams(window.location.search);
    const linkedCall = params.get("call") ?? undefined;
    const linkedAction = params.get("callAction");
    void resumePendingCall(linkedCall, linkedAction === "accept" || linkedAction === "decline" ? linkedAction : undefined);
    if (linkedCall) {
      params.delete("call");
      params.delete("callAction");
      const qs = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    }

    const offConnection = messageSocket.onConnectionChange((connected) => {
      if (connected) void resumePendingCall();
    });

    const offNative = onNativeCommand((command) => {
      if (command.type === "fockis:call-action") {
        const current = useCallSession.getState();
        if (command.action === "end" || (command.action === "decline" && current.call?.callId === command.callId && current.phase !== "incoming")) {
          if (current.call?.callId === command.callId) void hangUp();
          return;
        }
        if (command.action === "accept" && current.call?.callId === command.callId && current.phase === "incoming") {
          void acceptCall();
          return;
        }
        if (command.action === "decline" && current.call?.callId === command.callId && current.phase === "incoming") {
          void declineCall();
          return;
        }
        void resumePendingCall(command.callId, command.action === "open" ? undefined : command.action);
      } else if (command.type === "fockis:push-token") {
        // The app hands over its push tokens; the website registers them with
        // its own session, so the app never needs the user's login token.
        void registerDevice(command).then(
          (ok) => postToNative("fockis:push-registered", { ok }),
        );
      }
    });

    // Ask the app (if any) for its push tokens now that someone is signed in.
    if (isNativeShell()) postToNative("fockis:auth", { signedIn: true, apiUrl: API_BASE });

    return () => {
      unbind();
      offConnection();
      offNative();
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn && isNativeShell()) postToNative("fockis:auth", { signedIn: false });
  }, [signedIn]);

  const phase = useCallSession((s) => s.phase);
  const minimized = useCallSession((s) => s.minimized);
  // A full-screen call (not the minimised pill) hides the bottom navigation.
  useHideBottomNav(phase !== "idle" && !minimized);
  if (phase === "idle") return null;
  return <CallScreen />;
}

function CallScreen() {
  const s = useCallSession();
  const peerName = s.peer?.name ?? "Fockis user";
  const running = s.phase === "active";
  const duration = useDuration(s.call?.acceptedAt, running);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);
  const [notice, setNotice] = useState("");
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    attachRemoteVideo(remoteRef.current);
    attachLocalVideo(localRef.current);
    setNeedsTap(audioBlocked());
  }, [s.trackVersion, s.cameraOn, s.remoteVideo, s.minimized]);

  useEffect(() => {
    if (!s.error) return;
    setNotice(s.error);
    const t = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(t);
  }, [s.error]);

  // Esc minimises an active call; answering uses buttons only.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (s.phase === "active" || s.phase === "connecting")) setMinimized(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.phase]);

  const kind = s.type === "video" ? "video" : "voice";

  if (s.minimized && (s.phase === "active" || s.phase === "connecting")) {
    return (
      <div className="fkc-pill" role="status">
        <button type="button" className="fkc-pill__main" onClick={() => setMinimized(false)} aria-label="Return to call">
          <Avatar name={peerName} src={s.peer?.avatar} size={34} />
          <span>
            <strong>{peerName}</strong>
            <small>{s.phase === "active" ? duration || "Connected" : "Connecting…"}</small>
          </span>
          <Maximize2 size={16} />
        </button>
        <button type="button" className={`fkc-round fkc-round--sm ${s.muted ? "is-on" : ""}`} onClick={() => void toggleMute()} aria-label={s.muted ? "Unmute" : "Mute"}>
          {s.muted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button type="button" className="fkc-round fkc-round--sm fkc-round--end" onClick={() => void hangUp()} aria-label="End call">
          <PhoneOff size={16} />
        </button>
      </div>
    );
  }

  const status =
    s.phase === "preparing"
      ? "Starting call…"
      : s.phase === "outgoing"
        ? s.call?.delivered && !s.call.delivered.socket && !s.call.delivered.push
          ? "Calling…"
          : "Ringing…"
        : s.phase === "incoming"
          ? `Incoming ${kind} call`
          : s.phase === "connecting"
            ? "Connecting…"
            : s.phase === "ended"
              ? s.endedLabel
              : s.reconnecting
                ? "Reconnecting…"
                : !s.remoteJoined
                  ? "Waiting for the other person…"
                  : duration;

  const showVideo = s.type === "video" && (s.phase === "active" || s.phase === "connecting");

  return (
    <div className={`fkc-screen fkc-screen--${s.phase} ${showVideo && s.remoteVideo ? "has-video" : ""}`} role="dialog" aria-modal="true" aria-label={`${kind} call with ${peerName}`}>
      <div className="fkc-screen__bg" aria-hidden="true" />

      {showVideo && (
        <>
          <video ref={remoteRef} className={`fkc-remote ${s.remoteVideo ? "" : "is-hidden"}`} autoPlay playsInline />
          <video ref={localRef} className={`fkc-local ${s.cameraOn ? "" : "is-hidden"} ${s.facing === "user" ? "is-mirrored" : ""}`} autoPlay playsInline muted />
        </>
      )}

      <header className="fkc-top">
        {(s.phase === "active" || s.phase === "connecting") && (
          <button type="button" className="fkc-ghost" onClick={() => setMinimized(true)} aria-label="Minimize call">
            <ChevronDown size={22} />
          </button>
        )}
        <span className="fkc-top__brand">Fockis {kind} call</span>
      </header>

      <div className={`fkc-identity ${showVideo && s.remoteVideo ? "is-compact" : ""}`}>
        <div className={`fkc-pulse ${s.phase === "incoming" || s.phase === "outgoing" ? "is-ringing" : ""}`}>
          <span />
          <span />
          <span />
          <Avatar name={peerName} src={s.peer?.avatar} size={s.phase === "incoming" ? 132 : 112} />
        </div>
        <h2>{peerName}</h2>
        <p className="fkc-status" aria-live="polite">
          {s.phase === "incoming" && (s.type === "video" ? <Video size={16} /> : <Phone size={16} />)}
          {status}
          {s.phase === "active" && s.remoteMuted && <span className="fkc-chip">Muted</span>}
        </p>
        {s.phase === "incoming" && (
          <div className="fkc-wave" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <i key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }} />
            ))}
          </div>
        )}
      </div>

      {needsTap && (
        <button type="button" className="fkc-tap" onClick={() => { resumeAudio(); setNeedsTap(false); }}>
          <Volume2 size={16} /> Tap to turn on sound
        </button>
      )}
      {notice && <div className="fkc-notice">{notice}</div>}

      {s.phase === "incoming" ? (
        <footer className="fkc-actions fkc-actions--incoming">
          <div className="fkc-action">
            <button type="button" className="fkc-round fkc-round--xl fkc-round--end" onClick={() => void declineCall()} aria-label="Decline">
              <PhoneOff size={30} />
            </button>
            <span>Decline</span>
          </div>
          <div className="fkc-action">
            <button type="button" className="fkc-round fkc-round--xl fkc-round--accept" onClick={() => void acceptCall()} aria-label="Accept" autoFocus>
              {s.type === "video" ? <Video size={30} /> : <Phone size={30} />}
            </button>
            <span>Accept</span>
          </div>
        </footer>
      ) : s.phase === "ended" ? (
        <footer className="fkc-actions">
          <div className="fkc-action">
            <button type="button" className="fkc-round fkc-round--lg" onClick={() => useCallSession.setState({ phase: "idle", call: null })} aria-label="Close">
              <ChevronDown size={24} />
            </button>
            <span>Close</span>
          </div>
        </footer>
      ) : (
        <footer className="fkc-actions">
          <div className="fkc-action">
            <button type="button" className={`fkc-round fkc-round--lg ${s.muted ? "is-on" : ""}`} onClick={() => void toggleMute()} aria-pressed={s.muted} disabled={s.phase === "preparing"}>
              {s.muted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <span>{s.muted ? "Unmute" : "Mute"}</span>
          </div>
          {s.type === "video" && (
            <div className="fkc-action">
              <button type="button" className={`fkc-round fkc-round--lg ${!s.cameraOn ? "is-on" : ""}`} onClick={() => void toggleCamera()} aria-pressed={!s.cameraOn} disabled={s.phase !== "active" && s.phase !== "connecting"}>
                {s.cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
              <span>{s.cameraOn ? "Camera off" : "Camera on"}</span>
            </div>
          )}
          {s.type === "video" && (
            <div className="fkc-action">
              <button type="button" className="fkc-round fkc-round--lg" onClick={() => void switchCamera()} disabled={!s.cameraOn || s.phase !== "active"}>
                <RefreshCw size={24} />
              </button>
              <span>Flip</span>
            </div>
          )}
          <div className="fkc-action">
            <button
              type="button"
              className="fkc-round fkc-round--lg"
              disabled={s.phase !== "active"}
              onClick={async () => {
                const label = await switchSpeaker().catch(() => null);
                setNotice(label ? `Audio: ${label}` : "Use your device's volume or audio controls to change the speaker.");
                window.setTimeout(() => setNotice(""), 3000);
              }}
            >
              <Volume2 size={24} />
            </button>
            <span>Speaker</span>
          </div>
          <div className="fkc-action">
            <button type="button" className="fkc-round fkc-round--lg fkc-round--end" onClick={() => void hangUp()} aria-label="End call">
              <PhoneOff size={26} />
            </button>
            <span>End</span>
          </div>
        </footer>
      )}
    </div>
  );
}
