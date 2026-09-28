import {
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
  Platform,
} from "react-native";

import {
  useState,
} from "react";

import {
  WebView,
} from "react-native-webview";


const WEBSITE_URL =
  "http://192.168.1.112:5174";


export default function WebViewApp() {

  const [error, setError] =
    useState(false);


  if (error) {

    return (
      <View style={styles.error}>
        <Text>
          Unable to load Fockis.
        </Text>
      </View>
    );

  }


  // Browser version
  if (Platform.OS === "web") {

    return (
      <iframe
        src={WEBSITE_URL}
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

      javaScriptEnabled

      domStorageEnabled

      sharedCookiesEnabled

      thirdPartyCookiesEnabled

      allowsBackForwardNavigationGestures

      startInLoadingState

      onError={() => {
        setError(true);
      }}

      renderLoading={() => (

        <View style={styles.loading}>

          <ActivityIndicator
            size="large"
          />

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


  error: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

});