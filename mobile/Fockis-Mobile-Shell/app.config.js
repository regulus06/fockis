/* ============================================================================
   Expo config for the Fockis app.

   app.json stays the base config. This file adds the native calling setup
   (Firebase Cloud Messaging on Android, PushKit + CallKit on iOS).

   Firebase is only enabled when its config files are present, so builds keep
   working before Firebase is set up:
     ./google-services.json        (Android, from the Firebase console)
     ./GoogleService-Info.plist    (iOS, from the Firebase console — optional,
                                    iOS calls use APNs VoIP pushes directly)
============================================================================ */

const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const has = (file) => fs.existsSync(path.join(__dirname, file));
  const androidFirebase = has("google-services.json");
  const iosFirebase = has("GoogleService-Info.plist");

  const plugins = [...(config.plugins ?? [])];
  plugins.push(["expo-build-properties", { ios: { useFrameworks: "static" } }]);
  if (androidFirebase || iosFirebase) {
    plugins.push("@react-native-firebase/app");
    plugins.push("@react-native-firebase/messaging");
  }
  plugins.push("./plugins/withFockisCalls");

  return {
    ...config,
    plugins,
    ios: {
      ...config.ios,
      ...(iosFirebase ? { googleServicesFile: "./GoogleService-Info.plist" } : {}),
      infoPlist: {
        ...config.ios?.infoPlist,
        NSCameraUsageDescription: "Fockis uses your camera for video calls and meetings.",
        NSMicrophoneUsageDescription: "Fockis uses your microphone for calls, voice messages and meetings.",
      },
    },
    android: {
      ...config.android,
      ...(androidFirebase ? { googleServicesFile: "./google-services.json" } : {}),
    },
    extra: {
      ...config.extra,
      fockisWebUrl: process.env.EXPO_PUBLIC_WEB_URL || "https://fockis.vercel.app",
      fockisApiUrl: process.env.EXPO_PUBLIC_API_URL || "https://fockis.onrender.com",
      pushConfigured: { android: androidFirebase, ios: true },
    },
  };
};
