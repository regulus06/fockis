import { useEffect, useRef } from "react";

import {
  Room,
  RoomEvent,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteVideoTrack,
  type RemoteParticipant,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from "livekit-client";

interface LiveKitPublisherProps {
  token: string | null;
  serverUrl: string | null;
  cameraStream: MediaStream | null;
  cameraEnabled: boolean;
  micEnabled: boolean;
  onRemoteVideoTrack?: (
    identity: string,
    track: RemoteVideoTrack,
    participant: RemoteParticipant,
  ) => void;
  onRemoteParticipantDisconnected?: (identity: string) => void;
}

export function LiveKitPublisher({
  token,
  serverUrl,
  cameraStream,
  cameraEnabled,
  micEnabled,
  onRemoteVideoTrack,
  onRemoteParticipantDisconnected,
}: LiveKitPublisherProps) {
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

  useEffect(() => {
    if (!token || !serverUrl) return;

    const liveKitToken = token;
    const liveKitServerUrl = serverUrl;
    let cancelled = false;

    async function connectPublisher() {
      try {
        console.log("[FOCKIS LIVEKIT] Connecting publisher...");

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind !== "video") return;

          console.log("[FOCKIS LIVEKIT] Remote video subscribed:", {
            identity: participant.identity,
            trackSid: publication.trackSid,
            trackName: publication.trackName,
          });

          onRemoteVideoTrack?.(
            participant.identity,
            track as RemoteVideoTrack,
            participant,
          );
        });

        room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
          if (track.kind !== "video") return;

          console.log("[FOCKIS LIVEKIT] Remote video unsubscribed:", {
            identity: participant.identity,
          });
        });

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log(
            "[FOCKIS LIVEKIT] Participant connected:",
            participant.identity,
          );

          for (const publication of participant.trackPublications.values()) {
            if (
              publication.kind === "video" &&
              publication.track
            ) {
              onRemoteVideoTrack?.(
                participant.identity,
                publication.track as RemoteVideoTrack,
                participant,
              );
            }
          }
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log(
            "[FOCKIS LIVEKIT] Participant disconnected:",
            participant.identity,
          );

          onRemoteParticipantDisconnected?.(
            participant.identity,
          );
        });

        room.on(RoomEvent.Disconnected, () => {
          console.log("[FOCKIS LIVEKIT] Publisher disconnected.");
        });

        await room.connect(liveKitServerUrl, liveKitToken, {
          autoSubscribe: true,
        });

        if (cancelled) {
          room.disconnect();
          roomRef.current = null;
          return;
        }

        console.log("[FOCKIS LIVEKIT] Publisher connected.", {
          room: room.name,
          localIdentity: room.localParticipant.identity,
          remoteParticipants: room.remoteParticipants.size,
        });

        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.trackPublications.values()) {
            if (
              publication.kind === "video" &&
              publication.track &&
              publication.isSubscribed
            ) {
              onRemoteVideoTrack?.(
                participant.identity,
                publication.track as RemoteVideoTrack,
                participant,
              );
            }
          }
        }

        if (cameraStream && cameraEnabled) {
          const videoSource = cameraStream.getVideoTracks()[0];

          if (videoSource) {
            const deviceId = videoSource.getSettings().deviceId;

            const localVideoTrack = deviceId
              ? await createLocalVideoTrack({
                  deviceId: { exact: deviceId },
                })
              : await createLocalVideoTrack();

            videoTrackRef.current = localVideoTrack;

            await room.localParticipant.publishTrack(
              localVideoTrack,
              { name: "camera" },
            );

            console.log("[FOCKIS LIVEKIT] Camera published.");
          }
        }

        if (cameraStream && micEnabled) {
          const audioSource = cameraStream.getAudioTracks()[0];

          if (audioSource) {
            const deviceId = audioSource.getSettings().deviceId;

            const localAudioTrack = deviceId
              ? await createLocalAudioTrack({
                  deviceId: { exact: deviceId },
                })
              : await createLocalAudioTrack();

            audioTrackRef.current = localAudioTrack;

            await room.localParticipant.publishTrack(
              localAudioTrack,
              { name: "microphone" },
            );

            console.log("[FOCKIS LIVEKIT] Microphone published.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "[FOCKIS LIVEKIT] Publisher connection failed:",
            error,
          );
        }
      }
    }

    void connectPublisher();

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
        console.log("[FOCKIS LIVEKIT] Disconnecting publisher...");
        room.disconnect();
        roomRef.current = null;
      }
    };
  }, [
    token,
    serverUrl,
    onRemoteParticipantDisconnected,
    onRemoteVideoTrack,
  ]);

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

export default LiveKitPublisher;
