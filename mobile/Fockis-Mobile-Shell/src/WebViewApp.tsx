import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const WEBSITE_URL = "https://fockis.vercel.app";

export default function WebViewApp() {
  const [error, setError] = useState(false);

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

  return (
    <WebView
      source={{ uri: WEBSITE_URL }}
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