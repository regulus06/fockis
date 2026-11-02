# Fockis calls on phones: setup, build and testing

Status: the code is written and the native projects generate cleanly with
`npx expo prebuild`. It has **not been tested on a real Android phone or iPhone
yet**. Background ringing only counts as working once the device tests below
pass.

## How it works

| | Android | iPhone |
|---|---|---|
| Wake-up | FCM high-priority **data** message | APNs **VoIP** push (PushKit) |
| Ringing UI | Notifee full-screen call notification on the "Incoming calls" channel, with the Fockis ringtone | CallKit (native lock-screen call UI, Fockis ringtone) |
| Accept | Opens Fockis at `/messages?call=<id>&callAction=accept`, and the website answers | CallKit "answer" → the website answers |
| Decline | Notification button → `POST /calls/:id/push-decline` with a per-call token | CallKit "decline" → same endpoint |
| Answered elsewhere / canceled / timed out | FCM `call_ended` push cancels the notification | App polls `POST /calls/:id/push-status` while CallKit rings |
| Missed | "Missed voice/video call" notification | Shown in Phone → Recents by CallKit |

The website in the WebView keeps the signed-in session. The app never receives
the login token: it gives its push tokens to the website, and the website
registers them (`POST /devices/register`). The per-call token in each push can
only decline or check that one call, and expires about 75 seconds later.

## 1. Server environment (apps/api)

```
# LiveKit (already used by Live and Meetings)
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# Android: Firebase Cloud Messaging (HTTP v1)
# Either the whole service-account JSON on one line:
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# or the three fields:
FIREBASE_PROJECT_ID=fockis-xxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@fockis-xxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# iPhone: APNs VoIP pushes (token-based auth, .p8 key)
APNS_KEY_ID=ABC123DEFG
APNS_TEAM_ID=XYZ987TEAM
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.fockis.mobile
APNS_PRODUCTION=false   # true for TestFlight / App Store builds
```

Without the Firebase or APNs variables the server logs one warning and skips
push delivery; calls still ring in any open Fockis tab or app.

## 2. Firebase (Android)

1. Firebase console → Add project (or use an existing one).
2. Add an **Android app** with package name `com.fockis.mobile`.
3. Download `google-services.json` into `mobile/Fockis-Mobile-Shell/`.
   `app.config.js` turns Firebase on automatically when the file exists.
4. Project settings → Service accounts → Generate new private key. Put its
   values in the server variables above. Never commit this key.
5. Cloud Messaging API (V1) must be enabled (it is by default for new projects).

## 3. APNs VoIP (iPhone)

1. Apple Developer → Certificates, IDs & Profiles → Identifiers →
   `com.fockis.mobile` → enable **Push Notifications**.
2. Keys → create a key with **Apple Push Notifications service (APNs)**.
   Download the `.p8` once; note the Key ID and your Team ID.
3. Put them in `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`.
4. Development builds use the sandbox (`APNS_PRODUCTION=false`); TestFlight and
   App Store builds use production (`APNS_PRODUCTION=true`) and must be built
   with `APS_ENVIRONMENT=production` (see below).

## 4. Build (Expo development or production build — not Expo Go)

Native calling needs native modules, so Expo Go can't run it.

```bash
cd mobile/Fockis-Mobile-Shell
npx expo install --fix          # align versions with your Expo SDK
npm run prebuild                # = expo prebuild --clean
```

**Important:** this project has a committed `android/` folder. EAS uses a
committed native folder as-is and skips config plugins. Either run
`npm run prebuild` and commit the regenerated `android/` (it replaces
hand edits; the current `MainActivity.kt` / `MainApplication.kt` are the
Expo defaults), or delete `android/` and let EAS generate it.

```bash
# Development builds (install on your phones)
eas build --profile development --platform android
APS_ENVIRONMENT=development eas build --profile development --platform ios

# Store builds
eas build --profile production --platform android
APS_ENVIRONMENT=production eas build --profile production --platform ios
```

For iOS, add `APS_ENVIRONMENT` to the build profile's `env` in `eas.json` so
EAS uses it.

### Google Play policy

Android 14+ only grants `USE_FULL_SCREEN_INTENT` to calling and alarm apps.
In Play Console → App content, declare Fockis as a calling app. Until then the
call appears as a heads-up notification instead of full screen.

## 5. Device testing checklist

Use two accounts, A (web or phone) and B (the phone under test).

Android (B):
1. Sign in to the Fockis app; allow notifications. Settings → Messages →
   Settings should list the phone under "Phones that ring for calls".
2. App open: A calls B → the website's full-screen call screen rings once (no
   duplicate notification).
3. App in background (home screen): A calls → heads-up/full-screen call with
   the Fockis ringtone; Accept opens Fockis and connects audio.
4. Screen locked: A calls → screen turns on with the call; Decline from the
   lock screen → A sees "Call declined" within a second or two.
5. App swiped away (terminated): A calls → rings; Accept connects.
6. A cancels while ringing → the notification disappears on B.
7. B also signed in on the web: answer on the web → the phone stops ringing.
8. Nobody answers for 45 s → "Missed voice call" notification on B, missed
   entry in Calls, missed-call log in the chat.
9. Battery saver / "Restricted" battery mode: repeat 3 and 5 (some
   manufacturers delay pushes for restricted apps).

iPhone (B): repeat 1–8, expecting the native CallKit screen. Also check that
B appears as "Fockis" in Phone → Recents, and that declining from CallKit
reaches A.

Server logs to watch: `[FOCKIS CALL] ringing call=… socket=… push=N` (N = phones
pushed) and any `FCM push failed` / `APNs VoIP push failed` warnings.

## Known limitations to verify on devices

- iOS: after answering from the lock screen, audio runs inside the WebView.
  If iOS keeps the microphone off until Fockis is unlocked and opened, unlock
  to continue the call. A native LiveKit client would remove this limit.
- Android: some manufacturers (Xiaomi, Huawei, Oppo) block background starts
  unless "Autostart" is allowed for Fockis.
- Speaker switching inside the WebView follows the device's audio controls.
