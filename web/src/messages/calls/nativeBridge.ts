/* ============================================================================
   NATIVE BRIDGE (Fockis mobile app ⇄ website in the WebView)

   The Expo shell injects window.ReactNativeWebView. The web app tells the
   shell who is signed in (so it can register the phone for call pushes) and
   what the current call is doing (so it can stop the native ringing UI).
   The shell sends back commands such as "accept call X" after the user
   answered from the lock screen or the notification.
============================================================================ */

type NativeCommand =
  | { type: "fockis:call-action"; action: "accept" | "decline" | "open" | "end"; callId: string }
  | {
      type: "fockis:push-token";
      deviceId: string;
      platform: "android" | "ios";
      pushToken?: string;
      voipToken?: string;
      deviceName?: string;
      appVersion?: string;
    };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
    __FOCKIS_NATIVE__?: { platform: string; deviceId: string; appVersion?: string };
  }
}

export const isNativeShell = () => typeof window !== "undefined" && Boolean(window.ReactNativeWebView);

export function postToNative(type: string, payload: Record<string, unknown> = {}) {
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...payload }));
  } catch {
    /* not inside the app */
  }
}

/** Listens for commands from the native shell. Returns an unsubscribe function. */
export function onNativeCommand(handler: (command: NativeCommand) => void) {
  const listener = (event: Event) => {
    const data = (event as MessageEvent).data ?? (event as CustomEvent).detail;
    let parsed: unknown = data;
    if (typeof data === "string") {
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (parsed && typeof parsed === "object" && typeof (parsed as { type?: unknown }).type === "string") {
      const command = parsed as NativeCommand;
      if (command.type.startsWith("fockis:")) handler(command);
    }
  };
  window.addEventListener("message", listener);
  document.addEventListener("message", listener as EventListener);
  window.addEventListener("fockis-native", listener);
  return () => {
    window.removeEventListener("message", listener);
    document.removeEventListener("message", listener as EventListener);
    window.removeEventListener("fockis-native", listener);
  };
}

/** A stable ID for this browser tab or app install, used to tell devices apart in a call. */
export function callDeviceId(): string {
  if (window.__FOCKIS_NATIVE__?.deviceId) return window.__FOCKIS_NATIVE__.deviceId;
  try {
    let id = sessionStorage.getItem("fockis-call-device");
    if (!id) {
      id = `web-${crypto.getRandomValues(new Uint32Array(2)).join("")}`;
      sessionStorage.setItem("fockis-call-device", id);
    }
    return id;
  } catch {
    return "web-tab";
  }
}

/** On sign-out inside the Fockis app: remove this phone from the account's ringing devices. */
export async function unregisterThisPhone() {
  const deviceId = window.__FOCKIS_NATIVE__?.deviceId;
  if (!deviceId || !isNativeShell()) return;
  const { api } = await import("../inbox/inboxApi");
  await api(`/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE" }).catch(() => undefined);
}
