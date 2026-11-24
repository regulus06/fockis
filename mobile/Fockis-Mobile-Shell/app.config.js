/* ============================================================================
   Expo config for the Fockis app.

   Calls: Android rings through Firebase Cloud Messaging (google-services.json
   in this folder); iPhone rings through PushKit VoIP pushes + CallKit.
============================================================================ */

const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const has = (file) => fs.existsSync(path.join(__dirname, file));

  const androidFirebase = has("google-services.json");

  const plugins = [...(config.plugins ?? [])];

  // Expo packages that ship config plugins (added by `npx expo install --fix`).
  for (const name of ["expo-build-properties", "expo-status-bar"]) {
    if (!plugins.some((p) => (Array.isArray(p) ? p[0] : p) === name)) plugins.push(name);
  }

  // Firebase is used on ANDROID only (call pushes through FCM). iPhones ring
  // through Apple's VoIP push (PushKit + CallKit) and never load Firebase:
  // react-native.config.js keeps the Firebase pods out of the iOS build.
  // (Firebase's iOS Swift packages are what broke `pod install` before.)
  if (androidFirebase) {
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
        "https://www.fockis.com",

      fockisApiUrl:
        process.env.EXPO_PUBLIC_API_URL ||
        "https://fockis.onrender.com",

      pushConfigured: {
        android: androidFirebase,
        // iPhone: VoIP push (APNs), no Firebase file needed.
        ios: true,
      },
    },
  };
};