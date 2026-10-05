import {
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
  Platform,
} from "react-native";

import { useState } from "react";

import { WebView } from "react-native-webview";

// Production Fockis website
const WEBSITE_URL = "https://fockis.vercel.app";

export default function WebViewApp() {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>Unable to load Fockis</Text>

        <Text style={styles.errorText}>
          Please check your internet connection and try again.
        </Text>
      </View>
    );
  }

  // Browser version
  if (Platform.OS === "web") {
    return (
      <iframe
        src={WEBSITE_URL}
        title="Fockis"
        style={{
          width: "100%",
          height: "100vh",
          border: 0,
        }}
        onError={() => {
          setError(true);
        }}
      />
    );
  }

  // Android / iOS version
  return (
    <WebView
      source={{
        uri: WEBSITE_URL,
      }}
      style={styles.webview}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
      allowsBackForwardNavigationGestures={true}
      startInLoadingState={true}
      originWhitelist={["http://*", "https://*"]}

      /*
       * Allow the Fockis website to request camera and microphone
       * access through the native WebView.
       */
      mediaCapturePermissionGrantType="grant"

      /*
       * Required for modern camera/microphone web APIs.
       */
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}

      onError={() => {
        setError(true);
      }}

      onHttpError={(event) => {
        console.error(
          "Fockis WebView HTTP error:",
          event.nativeEvent.statusCode,
          event.nativeEvent.description
        );
      }}

      onLoadStart={() => {
        setError(false);
      }}

      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Loading Fockis...
          </Text>
        </View>
      )}
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
  },
});