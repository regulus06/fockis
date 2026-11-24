/* ============================================================================
   Background handlers. Imported from App.tsx before anything else, so they
   are registered when Android starts the app headless for a push, or when a
   notification action is pressed while Fockis is closed.
============================================================================ */

import { Platform } from "react-native";
import notifee from "@notifee/react-native";

import { handleCallPush, handleNotifeeEvent } from "./nativeCalls";

if (Platform.OS === "android") {
  try {
    // Loaded here, not at the top: Firebase is only in the Android build
    // (react-native.config.js), so iPhones must never load it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require("@react-native-firebase/app") as typeof import("@react-native-firebase/app");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMessaging, setBackgroundMessageHandler } = require("@react-native-firebase/messaging") as typeof import("@react-native-firebase/messaging");
    setBackgroundMessageHandler(getMessaging(getApp()), async (message) => {
      await handleCallPush(message.data as Record<string, string>, false);
    });
  } catch (error) {
    console.warn("[Fockis calls] Firebase isn't configured; background calls are off.", String(error));
  }

  try {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      await handleNotifeeEvent(type, detail as never);
    });
  } catch {
    /* Notifee unavailable in this build */
  }
}
