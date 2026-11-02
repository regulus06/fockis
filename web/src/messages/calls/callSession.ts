import { create } from "zustand";
import type { LocalVideoTrack, RemoteTrack, Room } from "livekit-client";

import { messageSocket } from "../services/messageSocket";
import { callsService, currentUserId, type CallMedia, type CallParty, type CallView } from "../inbox/inboxApi";
import { callDeviceId, postToNative } from "./nativeBridge";
import { playEnded, playRingback, playRingtone, stopSounds, unlockAudio } from "./ringtone";

/* ============================================================================
   CALL SESSION
   One call at a time per tab. Signalling and state come from the server
   (REST + Socket.IO); audio/video flow through the existing LiveKit setup.
============================================================================ */

export type CallPhase = "idle" | "preparing" | "outgoing" | "incoming" | "connecting" | "active" | "ended";

interface CallSessionState {
  phase: CallPhase;
  call: CallView | null;
  peer: CallParty | null;
  type: CallMedia;
  muted: boolean;
  cameraOn: boolean;
  facing: "user" | "environment";
  remoteJoined: boolean;
  remoteVideo: boolean;
  remoteMuted: boolean;
  reconnecting: boolean;
  minimized: boolean;
  endedLabel: string;
  error: string;
  /** Bumped whenever tracks change so video elements re-attach. */
  trackVersion: number;
}

const initial: CallSessionState = {
  phase: "idle",
  call: null,
  peer: null,
  type: "voice",
  muted: false,
  cameraOn: false,
  facing: "user",
  remoteJoined: false,
  remoteVideo: false,
  remoteMuted: false,
  reconnecting: false,
  minimized: false,
  endedLabel: "",
  error: "",
  trackVersion: 0,
};

export const useCallSession = create<CallSessionState>(() => ({ ...initial }));

const get = () => useCallSession.getState();
const set = (patch: Partial<CallSessionState>) => useCallSession.setState(patch);

let room: Room | null = null;
let resetTimer: number | null = null;
let ringTimeout: number | null = null;
/** Calls this tab already finished, so late events don't reopen them. */
const finishedCallIds = new Set<string>();

/* ---------------------------------------------------------------------------
   HELPERS
--------------------------------------------------------------------------- */

const isCurrent = (callId?: string) => Boolean(callId && get().call?.callId === callId);

function describeEnd(call: Partial<CallView> & { reason?: string }, iEnded: boolean) {
  switch (call.status) {
    case "rejected":
      return iEnded ? "Call declined" : "Call declined";
    case "missed":
      return call.direction === "outgoing" || call.callerId === currentUserId() ? "No answer" : "Missed call";
    case "busy":
      return "On another call";
    case "canceled":
      return "Call canceled";
    case "failed":
      return "Call failed";
    default:
      return call.endReason === "connection_lost" ? "Connection lost" : "Call ended";
  }
}

function clearTimers() {
  if (ringTimeout !== null) window.clearTimeout(ringTimeout);
  ringTimeout = null;
}

async function teardownMedia() {
  const current = room;
  room = null;
  if (current) {
    try {
      await current.disconnect(true);
    } catch {
      /* already gone */
    }
  }
}

function finish(label: string, sound = true) {
  const callId = get().call?.callId;
  if (callId) finishedCallIds.add(callId);
  clearTimers();
  stopSounds();
  if (sound) playEnded();
  void teardownMedia();
  postToNative("fockis:call-state", { callId: callId ?? "", state: "ended" });
  set({ phase: "ended", endedLabel: label, reconnecting: false, minimized: false });
  if (resetTimer !== null) window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(() => {
    if (get().phase === "ended") useCallSession.setState({ ...initial });
  }, 2200);
}

async function requestDevices(type: CallMedia) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Calls need a browser with microphone access.");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
    stream.getTracks().forEach((t) => t.stop());
  } catch (error) {
    const name = (error as DOMException)?.name;
    if (name === "NotAllowedError" || name === "SecurityError") {
      throw new Error(type === "video" ? "Allow camera and microphone access to make video calls." : "Allow microphone access to make calls.");
    }
    if (name === "NotFoundError") throw new Error(type === "video" ? "No camera or microphone was found." : "No microphone was found.");
    throw new Error("Couldn't access your microphone.");
  }
}

/* ---------------------------------------------------------------------------
   MEDIA (LiveKit)
--------------------------------------------------------------------------- */

async function connectMedia(callId: string) {
  set({ phase: "connecting" });
  try {
    const [{ token, url }, lk] = await Promise.all([callsService.token(callId), import("livekit-client")]);
    if (!isCurrent(callId) || get().phase === "ended") return;

    const next = new lk.Room({ adaptiveStream: true, dynacast: true, disconnectOnPageLeave: true });
    room = next;
    const bump = () => set({ trackVersion: get().trackVersion + 1 });
    const refreshRemote = () => {
      const remote = [...next.remoteParticipants.values()][0];
      const video = remote ? [...remote.videoTrackPublications.values()].some((p) => p.isSubscribed && !p.isMuted) : false;
      const micMuted = remote ? [...remote.audioTrackPublications.values()].every((p) => p.isMuted) : false;
      set({ remoteJoined: Boolean(remote), remoteVideo: video, remoteMuted: Boolean(remote) && micMuted });
      if (remote && get().phase === "connecting") set({ phase: "active" });
      bump();
    };

    next
      .on(lk.RoomEvent.ParticipantConnected, refreshRemote)
      .on(lk.RoomEvent.ParticipantDisconnected, refreshRemote)
      .on(lk.RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === lk.Track.Kind.Audio) {
          const el = track.attach();
          el.dataset.fockisCall = "remote-audio";
          el.style.display = "none";
          document.body.appendChild(el);
        }
        refreshRemote();
      })
      .on(lk.RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
        refreshRemote();
      })
      .on(lk.RoomEvent.TrackMuted, refreshRemote)
      .on(lk.RoomEvent.TrackUnmuted, refreshRemote)
      .on(lk.RoomEvent.LocalTrackPublished, bump)
      .on(lk.RoomEvent.Reconnecting, () => set({ reconnecting: true }))
      .on(lk.RoomEvent.Reconnected, () => set({ reconnecting: false }))
      .on(lk.RoomEvent.AudioPlaybackStatusChanged, bump)
      .on(lk.RoomEvent.Disconnected, () => {
        if (room === next && isCurrent(callId) && (get().phase === "active" || get().phase === "connecting")) {
          void hangUp("Connection lost");
        }
      });

    await next.connect(url, token);
    await next.localParticipant.setMicrophoneEnabled(!get().muted);
    if (get().type === "video") {
      await next.localParticipant.setCameraEnabled(true, { facingMode: get().facing });
      set({ cameraOn: true });
    }
    refreshRemote();
    postToNative("fockis:call-state", { callId, state: "active" });
  } catch (error) {
    if (!isCurrent(callId)) return;
    const message = error instanceof Error ? error.message : "Couldn't connect the call.";
    set({ error: message });
    await callsService.end(callId).catch(() => undefined);
    finish(message.includes("LIVEKIT") || message.includes("configured") ? "Calling isn't available right now" : "Couldn't connect");
  }
}

/** Attach this side's camera preview. */
export function attachLocalVideo(el: HTMLVideoElement | null) {
  if (!el || !room) return;
  const pub = [...room.localParticipant.videoTrackPublications.values()][0];
  pub?.track?.attach(el);
}

/** Attach the other person's video. */
export function attachRemoteVideo(el: HTMLVideoElement | null) {
  if (!el || !room) return;
  const remote = [...room.remoteParticipants.values()][0];
  const pub = remote ? [...remote.videoTrackPublications.values()].find((p) => p.isSubscribed) : undefined;
  pub?.track?.attach(el);
}

/** Some browsers block audio until the user taps: call from a click. */
export function resumeAudio() {
  void room?.startAudio().catch(() => undefined);
  unlockAudio();
}

export const audioBlocked = () => Boolean(room && !room.canPlaybackAudio);

/* ---------------------------------------------------------------------------
   OUTGOING
--------------------------------------------------------------------------- */

export async function startCall(peer: CallParty, type: CallMedia) {
  unlockAudio();
  if (get().phase !== "idle" && get().phase !== "ended") {
    set({ minimized: false });
    return;
  }
  if (resetTimer !== null) window.clearTimeout(resetTimer);
  useCallSession.setState({ ...initial, phase: "preparing", peer, type, cameraOn: type === "video" });
  try {
    await requestDevices(type);
    const call = await callsService.start(peer.id, type, callDeviceId());
    if (get().phase !== "preparing") {
      // Hung up while we were starting: cancel straight away.
      await callsService.decline(call.callId).catch(() => undefined);
      return;
    }
    set({ call, peer: call.peer ?? peer });
    if (call.status === "busy") {
      finish(`${peer.name} is on another call`);
      return;
    }
    set({ phase: "outgoing" });
    playRingback();
    postToNative("fockis:call-state", { callId: call.callId, state: "outgoing" });
    ringTimeout = window.setTimeout(() => {
      if (isCurrent(call.callId) && get().phase === "outgoing") void hangUp("No answer");
    }, Math.max(5000, new Date(call.expiresAt).getTime() - Date.now() + 4000));
  } catch (error) {
    set({ error: error instanceof Error ? error.message : "Couldn't start the call." });
    finish(error instanceof Error ? error.message : "Couldn't start the call.", false);
  }
}

/* ---------------------------------------------------------------------------
   INCOMING
--------------------------------------------------------------------------- */

export function receiveIncoming(call: CallView) {
  if (!call?.callId || finishedCallIds.has(call.callId) || isCurrent(call.callId)) return;
  if (call.status !== "ringing" || new Date(call.expiresAt).getTime() < Date.now()) return;
  if (get().phase !== "idle" && get().phase !== "ended") return; // already busy here; the server tracks busy state
  if (resetTimer !== null) window.clearTimeout(resetTimer);
  useCallSession.setState({ ...initial, phase: "incoming", call, peer: call.peer ?? call.caller, type: call.type, cameraOn: call.type === "video" });
  playRingtone();
  postToNative("fockis:call-state", { callId: call.callId, state: "incoming" });
  ringTimeout = window.setTimeout(() => {
    if (isCurrent(call.callId) && get().phase === "incoming") finish("Missed call");
  }, Math.max(3000, new Date(call.expiresAt).getTime() - Date.now() + 3000));
}

export async function acceptCall() {
  const call = get().call;
  if (!call || get().phase !== "incoming") return;
  unlockAudio();
  stopSounds();
  clearTimers();
  set({ phase: "connecting" });
  try {
    await requestDevices(call.type);
  } catch (error) {
    set({ error: error instanceof Error ? error.message : "" });
    await callsService.decline(call.callId).catch(() => undefined);
    finish(error instanceof Error ? error.message : "Couldn't answer", false);
    return;
  }
  try {
    const accepted = await callsService.accept(call.callId, callDeviceId());
    set({ call: { ...call, ...accepted } });
  } catch (error) {
    finish(error instanceof Error ? error.message : "This call has already ended.", false);
    return;
  }
  await connectMedia(call.callId);
}

export async function declineCall() {
  const call = get().call;
  if (!call) return;
  finish("Call declined", false);
  await callsService.decline(call.callId).catch(() => undefined);
}

/* ---------------------------------------------------------------------------
   IN CALL
--------------------------------------------------------------------------- */

export async function hangUp(label = "Call ended") {
  const { call, phase } = get();
  if (phase === "preparing") {
    finish("Call canceled", false);
    return;
  }
  if (!call) {
    useCallSession.setState({ ...initial });
    return;
  }
  finish(phase === "outgoing" ? "Call canceled" : label);
  try {
    if (phase === "incoming") await callsService.decline(call.callId);
    else await callsService.end(call.callId);
  } catch {
    // The server may already have ended it; nothing else to do.
  }
}

export async function toggleMute() {
  const muted = !get().muted;
  set({ muted });
  try {
    await room?.localParticipant.setMicrophoneEnabled(!muted);
  } catch {
    set({ muted: !muted });
  }
}

export async function toggleCamera() {
  const on = !get().cameraOn;
  set({ cameraOn: on });
  try {
    await room?.localParticipant.setCameraEnabled(on, { facingMode: get().facing });
    set({ trackVersion: get().trackVersion + 1 });
  } catch {
    set({ cameraOn: !on, error: "Couldn't turn on the camera." });
  }
}

export async function switchCamera() {
  const facing = get().facing === "user" ? "environment" : "user";
  const pub = room ? [...room.localParticipant.videoTrackPublications.values()][0] : undefined;
  const track = pub?.track as LocalVideoTrack | undefined;
  if (!track) return;
  try {
    await track.restartTrack({ facingMode: facing });
    set({ facing, trackVersion: get().trackVersion + 1 });
  } catch {
    set({ error: "This device has only one camera." });
  }
}

/** Cycles audio outputs where the browser allows choosing one (desktop Chrome/Edge). */
export async function switchSpeaker(): Promise<string | null> {
  if (!room || !navigator.mediaDevices?.enumerateDevices) return null;
  const outputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audiooutput");
  if (outputs.length < 2) return null;
  const current = room.getActiveDevice("audiooutput") ?? "default";
  const index = outputs.findIndex((d) => d.deviceId === current);
  const next = outputs[(index + 1) % outputs.length];
  await room.switchActiveDevice("audiooutput", next.deviceId);
  return next.label || "Speaker";
}

export const setMinimized = (minimized: boolean) => set({ minimized });

/* ---------------------------------------------------------------------------
   SERVER EVENTS
--------------------------------------------------------------------------- */

export function bindCallEvents() {
  const offs = [
    messageSocket.listen("call:incoming", (payload: CallView) => receiveIncoming(payload)),

    messageSocket.listen("call:accepted", (payload: CallView) => {
      if (!isCurrent(payload?.callId) || get().phase !== "outgoing") return;
      stopSounds();
      clearTimers();
      set({ call: { ...get().call!, ...payload } });
      void connectMedia(payload.callId);
    }),

    messageSocket.listen("call:answered-elsewhere", (payload: CallView & { acceptedDeviceId?: string }) => {
      if (!isCurrent(payload?.callId)) return;
      if (payload.acceptedDeviceId && payload.acceptedDeviceId === callDeviceId()) return;
      if (get().phase === "incoming") finish("Answered on another device", false);
    }),

    messageSocket.listen("call:ended", (payload: CallView & { reason?: string; userId?: string | null }) => {
      if (!isCurrent(payload?.callId) || get().phase === "ended") {
        if (payload?.callId) finishedCallIds.add(payload.callId);
        return;
      }
      const me = currentUserId();
      const view = { ...payload, direction: payload.callerId === me ? "outgoing" : "incoming" } as CallView;
      finish(describeEnd(view, payload.userId === me));
    }),
  ];
  return () => offs.forEach((off) => off());
}

/** After a reload, or when opened from a push: pick up a call still ringing. */
export async function resumePendingCall(callId?: string, action?: "accept" | "decline") {
  try {
    const pending = callId ? [await callsService.get(callId)] : await callsService.pending();
    const call = pending.find((c) => c.status === "ringing" && c.direction === "incoming");
    if (!call) return;
    receiveIncoming(call);
    if (action === "accept" && isCurrent(call.callId)) await acceptCall();
    if (action === "decline" && isCurrent(call.callId)) await declineCall();
  } catch {
    /* nothing pending */
  }
}
