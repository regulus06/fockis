import { useCallback, useEffect, useState } from "react";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

/**
 * Enumerates real available devices via the browser MediaDevices API.
 * Falls back to an empty list with an explanatory state rather than
 * fabricating device names when permission hasn't been granted yet.
 *
 * Also listens for `devicechange` events so a camera/mic/speaker being
 * plugged in or unplugged while the page is open is reflected without
 * requiring a reload.
 */
export function useMediaDevices() {
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceOption[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceOption[]>([]);
  const [permissionState, setPermissionState] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");

  const enumerate = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      setMicrophones(
        devices
          .filter((device) => device.kind === "audioinput")
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${index + 1}`,
          })),
      );

      setSpeakers(
        devices
          .filter((device) => device.kind === "audiooutput")
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Speaker ${index + 1}`,
          })),
      );

      setCameras(
        devices
          .filter((device) => device.kind === "videoinput")
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${index + 1}`,
          })),
      );

      setPermissionState(
        devices.some((device) => device.label) ? "granted" : "unknown",
      );
    } catch {
      setPermissionState("denied");
    }
  }, []);

  useEffect(() => {
    enumerate();

    const mediaDevices = navigator.mediaDevices;

    if (!mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      enumerate();
    };

    mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [enumerate]);

  return {
    microphones,
    speakers,
    cameras,
    permissionState,
    refresh: enumerate,
  };
}