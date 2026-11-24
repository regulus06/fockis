/*
 * Firebase is only used on Android (call pushes through FCM). iPhones ring
 * through PushKit VoIP pushes + CallKit, so the Firebase native modules are
 * left out of the iOS build: their Swift packages break `pod install` with
 * React Native's static linking.
 */
module.exports = {
  dependencies: {
    "@react-native-firebase/app": { platforms: { ios: null } },
    "@react-native-firebase/messaging": { platforms: { ios: null } },
  },
};
