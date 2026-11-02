/* ============================================================================
   FOCKIS NATIVE CALLS (Expo shell)

   Android  FCM high-priority data message → Notifee full-screen call
            notification on the "Fockis calls" channel with the Fockis
            ringtone, Accept / Decline actions, timeout, missed-call notice.
   iOS      APNs VoIP push (PushKit) → CallKit (reported natively in
            AppDelegate by plugins/withFockisCalls.js) → events here.

   The website inside the WebView owns the signed-in session and the call
   itself (LiveKit). This module only rings the phone, registers push tokens
   (handed to the website, which registers them with its own session), and
   passes Accept / Decline / End to the website or, when the app isn't open,
   to the API with the per-call token from the push.

   NOT YET TESTED ON REAL DEVICES.
============================================================================ */

import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";

type PushData = Record<string, string | undefined>;

export interface CallCommand {
  type: "fockis:call-action";
  action: "accept" | "decline" | "open" | "end";
  callId: string;
}

const KEY_API = "fockis.apiUrl";
const KEY_DEVICE = "fockis.deviceId";
const KEY_PENDING = "fockis.pendingCommand";
const KEY_CALL_PREFIX = "fockis.call.";
const CALL_CHANNEL = "fockis_calls_v1";
const MISSED_CHANNEL = "fockis_missed_v1";

const extra = (Constants.expoConfig?.extra ?? {}) as { fockisApiUrl?: string };
const DEFAULT_API = (extra.fockisApiUrl || "https://fockis.onrender.com").replace(/\/+$/, "");

/* ---------------------------------------------------------------------------
   SMALL HELPERS
--------------------------------------------------------------------------- */

const safeKey = (callId: string) => KEY_CALL_PREFIX + callId.replace(/[^A-Za-z0-9._-]/g, "");

async function get(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function put(key: string, value: string | null) {
  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    /* storage unavailable */
  }
}

export async function apiUrl() {
  return ((await get(KEY_API)) || DEFAULT_API).replace(/\/+$/, "");
}

export async function rememberApiUrl(url: string) {
  if (/^https?:\/\//.test(url)) await put(KEY_API, url.replace(/\/+$/, ""));
}

export async function deviceId(): Promise<string> {
  const existing = await get(KEY_DEVICE);
  if (existing) return existing;
  const random = Array.from({ length: 24 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
  const id = `${Platform.OS}-${random}`;
  await put(KEY_DEVICE, id);
  return id;
}

async function rememberCall(data: PushData) {
  if (!data.callId) return;
  await put(
    safeKey(data.callId),
    JSON.stringify({ actionToken: data.actionToken ?? "", callerName: data.callerName ?? "", type: data.type ?? "voice", expiresAt: data.expiresAt ?? "" }),
  );
}

async function recallCall(callId: string): Promise<{ actionToken: string; callerName: string; type: string; expiresAt: string } | null> {
  try {
    return JSON.parse((await get(safeKey(callId))) || "null");
  } catch {
    return null;
  }
}

async function forgetCall(callId: string) {
  await put(safeKey(callId), null);
}

/** Decline without the app's web session, using the token that came with the push. */
async function declineWithToken(callId: string) {
  const info = await recallCall(callId);
  if (!info?.actionToken) return;
  try {
    await fetch(`${await apiUrl()}/calls/${encodeURIComponent(callId)}/push-decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: info.actionToken }),
    });
  } catch {
    /* the call times out on the server anyway */
  }
  await forgetCall(callId);
}

async function callStatus(callId: string): Promise<string | null> {
  const info = await recallCall(callId);
  if (!info?.actionToken) return null;
  try {
    const res = await fetch(`${await apiUrl()}/calls/${encodeURIComponent(callId)}/push-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: info.actionToken }),
    });
    if (!res.ok) return res.status === 403 ? "expired" : null;
    return ((await res.json()) as { status?: string }).status ?? null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------------
   COMMANDS FOR THE WEBSITE
   If the WebView is ready the command is delivered at once; otherwise it is
   kept until the website has loaded (cold start from a notification).
--------------------------------------------------------------------------- */

let commandSink: ((command: CallCommand) => void) | null = null;

export function setCommandSink(sink: ((command: CallCommand) => void) | null) {
  commandSink = sink;
  if (sink) {
    void get(KEY_PENDING).then(async (raw) => {
      if (!raw) return;
      await put(KEY_PENDING, null);
      try {
        sink(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    });
  }
}

async function sendCommand(command: CallCommand) {
  if (commandSink) commandSink(command);
  else await put(KEY_PENDING, JSON.stringify(command));
}

/** The pending command (if any) for building the first URL the WebView loads. */
export async function takePendingCommand(): Promise<CallCommand | null> {
  const raw = await get(KEY_PENDING);
  if (!raw) return null;
  await put(KEY_PENDING, null);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ===========================================================================
   ANDROID — FCM + NOTIFEE
=========================================================================== */

async function notifee() {
  try {
    return await import("@notifee/react-native");
  } catch {
    return null;
  }
}

export async function ensureAndroidChannels() {
  if (Platform.OS !== "android") return;
  const n = await notifee();
  if (!n) return;
  const { default: api, AndroidImportance, AndroidVisibility } = n;
  await api.createChannel({
    id: CALL_CHANNEL,
    name: "Incoming calls",
    description: "Rings for Fockis voice and video calls",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: "fockis_ringtone",
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    lights: true,
    lightColor: "#7A4CF4",
  });
  await api.createChannel({
    id: MISSED_CHANNEL,
    name: "Missed calls",
    importance: AndroidImportance.DEFAULT,
    visibility: AndroidVisibility.PRIVATE,
  });
}

async function showIncomingAndroid(data: PushData) {
  const n = await notifee();
  if (!n || !data.callId) return;
  const { default: api, AndroidCategory, AndroidImportance, AndroidVisibility } = n;
  const expires = new Date(data.expiresAt ?? "").getTime();
  const remaining = Number.isFinite(expires) ? expires - Date.now() : 45_000;
  if (remaining <= 0) return; // already expired: no ring
  await ensureAndroidChannels();
  await rememberCall(data);
  const video = data.type === "video";
  await api.displayNotification({
    id: data.callId, // same ID → a duplicate push replaces, never doubles, the ring
    title: data.callerName || "Fockis",
    body: video ? "Incoming video call" : "Incoming voice call",
    data: { callId: data.callId, kind: "incoming_call" },
    android: {
      channelId: CALL_CHANNEL,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      color: "#7A4CF4",
      colorized: true,
      ongoing: true,
      autoCancel: false,
      loopSound: true,
      lightUpScreen: true,
      timeoutAfter: Math.max(1000, remaining),
      smallIcon: "ic_launcher",
      largeIcon: data.callerAvatar && /^https:\/\//.test(data.callerAvatar) ? data.callerAvatar : undefined,
      fullScreenAction: { id: "default", launchActivity: "default" },
      pressAction: { id: "open", launchActivity: "default" },
      actions: [
        { title: "Decline", pressAction: { id: "decline" } },
        { title: video ? "Accept video" : "Accept", pressAction: { id: "accept", launchActivity: "default" } },
      ],
    },
  });
}

async function stopAndroidRinging(callId: string) {
  const n = await notifee();
  if (!n) return;
  await n.default.cancelNotification(callId).catch(() => undefined);
}

async function showMissedAndroid(data: PushData) {
  const n = await notifee();
  if (!n || !data.callId) return;
  await stopAndroidRinging(data.callId);
  await ensureAndroidChannels();
  await n.default.displayNotification({
    id: `missed-${data.callId}`,
    title: data.type === "video" ? "Missed video call" : "Missed voice call",
    body: `${data.callerName || "Someone"} tried to call you on Fockis`,
    data: { callId: data.callId, kind: "missed_call" },
    android: { channelId: MISSED_CHANNEL, smallIcon: "ic_launcher", color: "#7A4CF4", pressAction: { id: "calls", launchActivity: "default" } },
  });
  await forgetCall(data.callId);
}

/** Handles an FCM data message, in the foreground or the background. */
export async function handleCallPush(data: PushData | undefined, foreground: boolean) {
  if (!data?.kind) return;
  if (data.kind === "incoming_call") {
    // With Fockis open, the website already rings (Socket.IO); avoid a double ring.
    if (foreground && AppState.currentState === "active") {
      await rememberCall(data);
      return;
    }
    await showIncomingAndroid(data);
  } else if (data.kind === "call_ended" && data.callId) {
    await stopAndroidRinging(data.callId);
    await forgetCall(data.callId);
  } else if (data.kind === "missed_call") {
    if (!(foreground && AppState.currentState === "active")) await showMissedAndroid(data);
  }
}

/** Accept / Decline / tap on the call notification. */
export async function handleNotifeeEvent(type: number, detail: { notification?: { id?: string; data?: Record<string, unknown> }; pressAction?: { id?: string } }) {
  const n = await notifee();
  if (!n) return;
  const { EventType } = n;
  const callId = String(detail.notification?.data?.callId ?? "");
  if (!callId) return;
  const action = detail.pressAction?.id;

  if (type === EventType.ACTION_PRESS && action === "decline") {
    await stopAndroidRinging(callId);
    if (commandSink) commandSink({ type: "fockis:call-action", action: "decline", callId });
    else await declineWithToken(callId);
    return;
  }
  if ((type === EventType.ACTION_PRESS || type === EventType.PRESS) && (action === "accept" || action === "open" || action === "default" || action === "calls")) {
    if (action !== "calls") await stopAndroidRinging(callId);
    await sendCommand({ type: "fockis:call-action", action: action === "accept" ? "accept" : "open", callId });
  }
}

/** Notification actions pressed while Fockis is open. */
export async function onAndroidForegroundEvents(): Promise<() => void> {
  if (Platform.OS !== "android") return () => undefined;
  const n = await notifee();
  if (!n) return () => undefined;
  return n.default.onForegroundEvent(({ type, detail }) => void handleNotifeeEvent(type, detail as never));
}

/** Cold start from a notification: what was pressed? */
export async function initialNotificationCommand(): Promise<void> {
  if (Platform.OS !== "android") return;
  const n = await notifee();
  const initial = await n?.default.getInitialNotification().catch(() => null);
  if (initial) await handleNotifeeEvent(n!.EventType.ACTION_PRESS, initial as never);
}

/* ===========================================================================
   iOS — PushKit + CallKit
=========================================================================== */

const iosPolls = new Map<string, ReturnType<typeof setInterval>>();
const iosAnswered = new Set<string>();

function stopIosPoll(callId: string) {
  const t = iosPolls.get(callId);
  if (t) clearInterval(t);
  iosPolls.delete(callId);
}

async function callkeep() {
  try {
    return (await import("react-native-callkeep")).default;
  } catch {
    return null;
  }
}

async function onIosVoipPush(payload: PushData) {
  const callId = String(payload.callId ?? "").toLowerCase();
  if (!callId) return;
  await rememberCall({ ...payload, callId });
  // CallKit is already ringing (reported natively). Stop it if the call is
  // answered elsewhere, canceled or missed.
  stopIosPoll(callId);
  iosPolls.set(
    callId,
    setInterval(async () => {
      if (iosAnswered.has(callId)) return stopIosPoll(callId);
      const status = await callStatus(callId);
      if (!status || status === "ringing") return;
      stopIosPoll(callId);
      const ck = await callkeep();
      // CXCallEndedReason: 2 remote ended, 3 unanswered, 4 answered elsewhere, 5 declined elsewhere
      const reason = status === "accepted" ? 4 : status === "missed" || status === "expired" ? 3 : status === "rejected" ? 5 : 2;
      ck?.reportEndCallWithUUID(callId.toUpperCase(), reason);
      await forgetCall(callId);
    }, 3000),
  );
}

export async function setupIos(onToken: (voipToken: string) => void) {
  if (Platform.OS !== "ios") return;
  const ck = await callkeep();
  let voip: typeof import("react-native-voip-push-notification").default | null = null;
  try {
    voip = (await import("react-native-voip-push-notification")).default;
  } catch {
    voip = null;
  }
  if (!ck || !voip) return;

  await ck.setup({
    ios: {
      appName: "Fockis",
      supportsVideo: true,
      maximumCallGroups: "1",
      maximumCallsPerCallGroup: "1",
      includesCallsInRecents: true,
      ringtoneSound: "fockis_ringtone.wav",
    },
    android: {
      alertTitle: "Permissions required",
      alertDescription: "Fockis needs access to your phone accounts",
      cancelButton: "Cancel",
      okButton: "OK",
      additionalPermissions: [],
    },
  });

  ck.addEventListener("answerCall", ({ callUUID }) => {
    const callId = callUUID.toLowerCase();
    iosAnswered.add(callId);
    stopIosPoll(callId);
    void sendCommand({ type: "fockis:call-action", action: "accept", callId });
  });

  ck.addEventListener("endCall", ({ callUUID }) => {
    const callId = callUUID.toLowerCase();
    stopIosPoll(callId);
    if (iosAnswered.has(callId)) {
      iosAnswered.delete(callId);
      void sendCommand({ type: "fockis:call-action", action: "end", callId });
    } else if (commandSink) {
      commandSink({ type: "fockis:call-action", action: "decline", callId });
      void forgetCall(callId);
    } else {
      void declineWithToken(callId);
    }
  });

  voip.addEventListener("register", (token: string) => onToken(token));
  voip.addEventListener("notification", (raw: object) => {
    const payload = raw as PushData;
    void onIosVoipPush(payload);
    if (payload.callId) voip?.onVoipNotificationCompleted(String(payload.callId));
  });
  voip.addEventListener("didLoadWithEvents", (events: Array<{ name: string; data: unknown }>) => {
    for (const e of events ?? []) {
      if (e.name === voip!.RNVoipPushRemoteNotificationsRegisteredEvent) onToken(String(e.data));
      if (e.name === voip!.RNVoipPushRemoteNotificationReceivedEvent) {
        const payload = e.data as PushData;
        void onIosVoipPush(payload);
        if (payload?.callId) voip!.onVoipNotificationCompleted(String(payload.callId));
      }
    }
  });
  voip.registerVoipToken();
}

/** The website reports call progress so CallKit stays in step. */
export async function onWebCallState(callId: string, state: string) {
  if (!callId) return;
  if (Platform.OS === "android") {
    if (state !== "incoming") await stopAndroidRinging(callId);
    return;
  }
  const ck = await callkeep();
  if (!ck) return;
  const uuid = callId.toUpperCase();
  if (state === "active" && iosAnswered.has(callId)) ck.setCurrentCallActive(uuid);
  if (state === "ended") {
    stopIosPoll(callId);
    if (iosAnswered.delete(callId) || iosPolls.has(callId)) ck.endCall(uuid);
    else ck.reportEndCallWithUUID(uuid, 2);
  }
}

/* ===========================================================================
   PUSH TOKENS
=========================================================================== */

export interface PushTokens {
  deviceId: string;
  platform: "android" | "ios";
  pushToken?: string;
  voipToken?: string;
  deviceName?: string;
  appVersion?: string;
}

/** Asks for notification permission and returns this phone's tokens. */
export async function collectAndroidToken(): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  const n = await notifee();
  await n?.default.requestPermission().catch(() => undefined);
  await ensureAndroidChannels();
  try {
    const { getApp } = await import("@react-native-firebase/app");
    const { getMessaging, getToken } = await import("@react-native-firebase/messaging");
    return await getToken(getMessaging(getApp()));
  } catch (error) {
    console.warn("[Fockis calls] Firebase isn't configured; Android calls won't ring in the background.", String(error));
    return null;
  }
}

export async function onAndroidTokenRefresh(callback: (token: string) => void) {
  if (Platform.OS !== "android") return () => undefined;
  try {
    const { getApp } = await import("@react-native-firebase/app");
    const { getMessaging, onTokenRefresh, onMessage } = await import("@react-native-firebase/messaging");
    const messaging = getMessaging(getApp());
    const offRefresh = onTokenRefresh(messaging, callback);
    const offMessage = onMessage(messaging, (message) => handleCallPush(message.data as PushData, true));
    return () => {
      offRefresh();
      offMessage();
    };
  } catch {
    return () => undefined;
  }
}

export async function describeDevice(): Promise<Pick<PushTokens, "deviceId" | "deviceName" | "appVersion">> {
  return {
    deviceId: await deviceId(),
    deviceName: (Device.deviceName || Device.modelName || (Platform.OS === "ios" ? "iPhone" : "Android phone")).slice(0, 120),
    appVersion: String(Constants.expoConfig?.version ?? "").slice(0, 40),
  };
}
