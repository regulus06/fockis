/* ============================================================================
   Background handlers. Imported from App.tsx before anything else, so they
   are registered when Android starts the app headless for a push, or when a
   notification action is pressed while Fockis is closed.
============================================================================ */

import { Platform } from "react-native";
import notifee from "@notifee/react-native";
import { getApp } from "@react-native-firebase/app";
import { getMessaging, setBackgroundMessageHandler } from "@react-native-firebase/messaging";

import { handleCallPush, handleNotifeeEvent } from "./nativeCalls";

if (Platform.OS === "android") {
  try {
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
