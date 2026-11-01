import { useEffect, useRef } from "react";

import {
  LocalAudioTrack,
  LocalVideoTrack,
  Room,
} from "livekit-client";

import { api } from "../api";

interface LiveKitGuestPublisherProps {
  sessionId: string;
  cameraStream: MediaStream | null;
  cameraEnabled: boolean;
  micEnabled: boolean;
}

export function LiveKitGuestPublisher({
  sessionId,
  cameraStream,
  cameraEnabled,
  micEnabled,
}: LiveKitGuestPublisherProps) {
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

  useEffect(() => {
    if (!sessionId || !cameraStream) return;

    let cancelled = false;
    const stream = cameraStream;

    async function connectGuest() {
      try {
        console.log("[FOCKIS LIVEKIT] Guest joining:", sessionId);

        const join = await api.joinSession(sessionId);

        if (cancelled) return;

        if (join.role !== "guest" || !join.token || !join.serverUrl) {
          throw new Error(
            "This account is not authorized to publish as a LIVE guest.",
          );
        }

        await api.connectGuest(sessionId);

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        await room.connect(
          join.serverUrl,
          join.token,
          { autoSubscribe: false },
        );

        if (cancelled) {
          room.disconnect();
          return;
        }

        const videoSource = stream.getVideoTracks()[0];

        if (videoSource && cameraEnabled) {
          const localVideoTrack =
            new LocalVideoTrack(videoSource);

          videoTrackRef.current = localVideoTrack;

          await room.localParticipant.publishTrack(
            localVideoTrack,
            { name: "guest-camera" },
          );
        }

        const audioSource = stream.getAudioTracks()[0];

        if (audioSource && micEnabled) {
          const localAudioTrack =
            new LocalAudioTrack(audioSource);

          audioTrackRef.current = localAudioTrack;

          await room.localParticipant.publishTrack(
            localAudioTrack,
            { name: "guest-microphone" },
          );
        }

        console.log("[FOCKIS LIVEKIT] Guest connected and publishing.", {
          room: room.name,
          identity: room.localParticipant.identity,
        });
      } catch (error) {
        if (!cancelled) {
          console.error(
            "[FOCKIS LIVEKIT] Guest connection failed:",
            error,
          );
        }
      }
    }

    void connectGuest();

    return () => {
      cancelled = true;

      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current = null;
      }

      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }

      const room = roomRef.current;

      if (room) {
        room.disconnect();
        roomRef.current = null;
      }

      void api.leaveGuest(sessionId).catch(() => {});
    };
  }, [sessionId]);

  useEffect(() => {
    const track = videoTrackRef.current;
    if (!track) return;

    if (cameraEnabled) track.unmute();
    else track.mute();
  }, [cameraEnabled]);

  useEffect(() => {
    const track = audioTrackRef.current;
    if (!track) return;

    if (micEnabled) track.unmute();
    else track.mute();
  }, [micEnabled]);

  return null;
}

export default LiveKitGuestPublisher;
