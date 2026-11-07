/* ============================================================================
   Expo config for the Fockis app.

   Firebase Cloud Messaging, PushKit and CallKit configuration.
   Firebase 27.x uses Swift Package Manager with dynamic iOS linkage.
============================================================================ */

const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const has = (file) => fs.existsSync(path.join(__dirname, file));

  const androidFirebase = has("google-services.json");
  const iosFirebase = has("GoogleService-Info.plist");

  const plugins = [...(config.plugins ?? [])];

  // iOS native build configuration.
  plugins.push([
    "expo-build-properties",
    {
      ios: {
        useFrameworks: "dynamic",
        buildReactNativeFromSource: true,
      },
    },
  ]);

  // Firebase native integration.
  // Configuration files are required for platform-specific Firebase setup.
  if (androidFirebase || iosFirebase) {
    plugins.push("@react-native-firebase/app");
    plugins.push("@react-native-firebase/messaging");
  }

  // Preserve Fockis native PushKit and CallKit functionality.
  plugins.push("./plugins/withFockisCalls");

  return {
    ...config,

    plugins,

    ios: {
      ...config.ios,

      ...(iosFirebase
        ? { googleServicesFile: "./GoogleService-Info.plist" }
        : {}),

      infoPlist: {
        ...config.ios?.infoPlist,

        NSCameraUsageDescription:
          "Fockis uses your camera for video calls and meetings.",

        NSMicrophoneUsageDescription:
          "Fockis uses your microphone for calls, voice messages and meetings.",

        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      ...config.android,

      ...(androidFirebase
        ? { googleServicesFile: "./google-services.json" }
        : {}),
    },

    extra: {
      ...config.extra,

      fockisWebUrl:
        process.env.EXPO_PUBLIC_WEB_URL ||
        "https://fockis.vercel.app",

      fockisApiUrl:
        process.env.EXPO_PUBLIC_API_URL ||
        "https://fockis.onrender.com",

      pushConfigured: {
        android: androidFirebase,
        ios: iosFirebase,
      },
    },
  };
};