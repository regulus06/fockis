/* ============================================================================
   FOCKIS CALLS — Expo config plugin

   Applied by `npx expo prebuild` (and EAS Build for projects without a
   committed native folder). It:

   Android
   - adds the permissions a calling app needs (full-screen intent,
     notifications, foreground service for phone calls, wake lock, vibrate);
   - lets MainActivity appear over the lock screen and turn the screen on,
     so the full-screen incoming-call notification can show Fockis;
   - copies the Fockis ringtone to res/raw (used by the call channel).

   iOS
   - enables the voip / audio / remote-notification background modes;
   - adds the Push Notifications entitlement (needed for VoIP pushes);
   - copies the ringtone into the app bundle (used by CallKit);
   - wires PushKit into AppDelegate.swift so every VoIP push is reported
     to CallKit immediately — iOS terminates apps that receive a VoIP push
     without reporting a call.

   NOT TESTED ON DEVICES YET. Build a development client and follow the
   testing steps in MOBILE_CALLS.md.
============================================================================ */

const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
  IOSConfig,
} = require("expo/config-plugins");

const RINGTONE = "fockis_ringtone.wav";

const ANDROID_PERMISSIONS = [
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
  "android.permission.WAKE_LOCK",
  "android.permission.VIBRATE",
  "android.permission.MODIFY_AUDIO_SETTINGS",
];

function withAndroidCalls(config) {
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    for (const permission of ANDROID_PERMISSIONS) {
      AndroidConfig.Permissions.ensurePermission(manifest, permission);
    }
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
    activity.$["android:showWhenLocked"] = "true";
    activity.$["android:turnScreenOn"] = "true";
    activity.$["android:launchMode"] = "singleTask";
    return cfg;
  });

  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const raw = path.join(cfg.modRequest.platformProjectRoot, "app/src/main/res/raw");
      fs.mkdirSync(raw, { recursive: true });
      fs.copyFileSync(path.join(cfg.modRequest.projectRoot, "assets/sounds", RINGTONE), path.join(raw, RINGTONE));
      return cfg;
    },
  ]);
}

const SWIFT_MARKER = "// FOCKIS-PUSHKIT";

const SWIFT_EXTENSION = `
${SWIFT_MARKER}
import PushKit

extension AppDelegate: PKPushRegistryDelegate {
  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    RNVoipPushNotificationManager.didUpdate(pushCredentials, forType: type.rawValue)
  }

  public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {}

  public func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    let data = payload.dictionaryPayload
    let callId = (data["callId"] as? String) ?? UUID().uuidString
    let callerName = (data["callerName"] as? String) ?? "Fockis"
    let hasVideo = ((data["type"] as? String) ?? "voice") == "video"

    RNVoipPushNotificationManager.addCompletionHandler(callId, completionHandler: completion)
    RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)

    // iOS requires the call to be reported to CallKit before this returns.
    // \`completion\` is called from JS (onVoipNotificationCompleted) once handled.
    RNCallKeep.reportNewIncomingCall(
      callId,
      handle: callerName,
      handleType: "generic",
      hasVideo: hasVideo,
      localizedCallerName: callerName,
      supportsHolding: false,
      supportsDTMF: false,
      supportsGrouping: false,
      supportsUngrouping: false,
      fromPushKit: true,
      payload: data,
      withCompletionHandler: nil
    )
  }
}
`;

function withIosCalls(config) {
  config = withInfoPlist(config, (cfg) => {
    const modes = new Set(cfg.modResults.UIBackgroundModes ?? []);
    ["voip", "audio", "remote-notification"].forEach((m) => modes.add(m));
    cfg.modResults.UIBackgroundModes = [...modes];
    return cfg;
  });

  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults["aps-environment"] = process.env.APS_ENVIRONMENT || cfg.modResults["aps-environment"] || "development";
    return cfg;
  });

  // Ringtone in the app bundle, for CallKit.
  config = withXcodeProject(config, (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const projectName = cfg.modRequest.projectName;
    const target = path.join(cfg.modRequest.platformProjectRoot, projectName, RINGTONE);
    fs.copyFileSync(path.join(projectRoot, "assets/sounds", RINGTONE), target);
    if (!cfg.modResults.hasFile(`${projectName}/${RINGTONE}`)) {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: `${projectName}/${RINGTONE}`,
        groupName: projectName,
        project: cfg.modResults,
        isBuildFile: true,
      });
    }
    return cfg;
  });

  // PushKit → CallKit in native code.
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const root = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName);
      const appDelegate = path.join(root, "AppDelegate.swift");
      if (!fs.existsSync(appDelegate)) {
        throw new Error("[withFockisCalls] AppDelegate.swift not found; update the plugin for this Expo SDK.");
      }
      let swift = fs.readFileSync(appDelegate, "utf8");
      if (!swift.includes(SWIFT_MARKER)) {
        // Create the PushKit registry at launch so pushes that start the app are delivered.
        swift = swift.replace(
          /(return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\))/,
          "RNVoipPushNotificationManager.voipRegistration()\n    $1",
        );
        if (!swift.includes("RNVoipPushNotificationManager.voipRegistration()")) {
          throw new Error("[withFockisCalls] Couldn't find didFinishLaunching in AppDelegate.swift.");
        }
        swift += SWIFT_EXTENSION;
        fs.writeFileSync(appDelegate, swift);
      }

      const headers = fs.readdirSync(root).filter((f) => f.endsWith("-Bridging-Header.h"));
      if (!headers.length) throw new Error("[withFockisCalls] Bridging header not found.");
      const header = path.join(root, headers[0]);
      let h = fs.readFileSync(header, "utf8");
      if (!h.includes("RNVoipPushNotificationManager.h")) {
        h += '\n#import "RNVoipPushNotificationManager.h"\n#import "RNCallKeep.h"\n';
        fs.writeFileSync(header, h);
      }
      return cfg;
    },
  ]);
}

module.exports = function withFockisCalls(config) {
  return withIosCalls(withAndroidCalls(config));
};
