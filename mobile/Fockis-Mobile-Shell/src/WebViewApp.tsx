import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import {
  collectAndroidToken,
  describeDevice,
  initialNotificationCommand,
  onAndroidForegroundEvents,
  onAndroidTokenRefresh,
  onWebCallState,
  rememberApiUrl,
  setCommandSink,
  setupIos,
  takePendingCommand,
  type CallCommand,
  type PushTokens,
} from "./calls/nativeCalls";

const WEBSITE_URL = "https://fockis.vercel.app";

export default function WebViewApp() {
  const [error, setError] = useState(false);
  const [boot, setBoot] = useState<{ url: string; native: string } | null>(null);
  const webRef = useRef<WebView>(null);
  const loaded = useRef(false);
  const tokens = useRef<Partial<PushTokens>>({});
  const signedIn = useRef(false);

  /* ---------- talk to the website ---------- */

  const sendToWeb = useCallback((message: object) => {
    const json = JSON.stringify(message);
    webRef.current?.injectJavaScript(
      `window.dispatchEvent(new CustomEvent("fockis-native", { detail: ${json} })); true;`,
    );
  }, []);

  const pushTokensToWeb = useCallback(async () => {
    if (!signedIn.current || !loaded.current) return;
    const t = tokens.current;
    if (!t.pushToken && !t.voipToken) return;
    const device = await describeDevice();
    sendToWeb({
      type: "fockis:push-token",
      platform: Platform.OS === "ios" ? "ios" : "android",
      ...device,
      ...(t.pushToken ? { pushToken: t.pushToken } : {}),
      ...(t.voipToken ? { voipToken: t.voipToken } : {}),
    });
  }, [sendToWeb]);

  /* ---------- start-up: where to open, native call setup ---------- */

  useEffect(() => {
    if (Platform.OS === "web") return;
    let off: (() => void) | undefined;
    (async () => {
      await initialNotificationCommand();
      const pending: CallCommand | null = await takePendingCommand();
      const device = await describeDevice();
      const url = pending
        ? `${WEBSITE_URL}/messages?call=${encodeURIComponent(pending.callId)}${pending.action === "accept" || pending.action === "decline" ? `&callAction=${pending.action}` : ""}`
        : WEBSITE_URL;
      const native = JSON.stringify({ platform: Platform.OS, deviceId: device.deviceId, appVersion: device.appVersion });
      setBoot({ url, native });

      await setupIos((voipToken) => {
        tokens.current.voipToken = voipToken;
        void pushTokensToWeb();
      });
      const offToken = await onAndroidTokenRefresh((pushToken) => {
        tokens.current.pushToken = pushToken;
        void pushTokensToWeb();
      });
      const offForeground = await onAndroidForegroundEvents();
      off = () => {
        offToken();
        offForeground();
      };
    })();
    return () => {
      off?.();
      setCommandSink(null);
    };
  }, [pushTokensToWeb]);

  /* ---------- messages from the website ---------- */

  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let message: { type?: string; [key: string]: unknown };
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (message.type === "fockis:auth") {
        signedIn.current = Boolean(message.signedIn);
        if (typeof message.apiUrl === "string") await rememberApiUrl(message.apiUrl);
        if (signedIn.current && Platform.OS === "android" && !tokens.current.pushToken) {
          tokens.current.pushToken = (await collectAndroidToken()) ?? undefined;
        }
        await pushTokensToWeb();
      } else if (message.type === "fockis:call-state") {
        await onWebCallState(String(message.callId ?? "").toLowerCase(), String(message.state ?? ""));
      }
    },
    [pushTokensToWeb],
  );

  if (Platform.OS === "web") {
    return (
      <iframe
        src={WEBSITE_URL}
        title="Fockis"
        allow="camera; microphone; autoplay; fullscreen; display-capture"
        style={{
          width: "100%",
          height: "100vh",
          border: 0,
        }}
      />
    );
  }

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>Unable to load Fockis</Text>
        <Text style={styles.errorText}>
          Check your internet connection and try again.
        </Text>
      </View>
    );
  }

  if (!boot) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading Fockis...</Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webRef}
      source={{ uri: boot.url }}
      style={styles.webview}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      allowsBackForwardNavigationGestures
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grant"
      originWhitelist={["https://*", "http://*"]}
      injectedJavaScriptBeforeContentLoaded={`window.__FOCKIS_NATIVE__ = ${boot.native}; true;`}
      onMessage={onMessage}
      onLoadEnd={() => {
        loaded.current = true;
        // Deliver Accept / Decline / End from notifications and CallKit.
        setCommandSink((command) => sendToWeb(command));
        void pushTokensToWeb();
      }}
      onError={() => setError(true)}
      onHttpError={(event) => {
        console.error(
          "[Fockis Mobile] HTTP error:",
          event.nativeEvent.statusCode,
          event.nativeEvent.description
        );
      }}
      onLoadStart={() => setError(false)}
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading Fockis...</Text>
        </View>
      )}
      startInLoadingState
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  error: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
});
