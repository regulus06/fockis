import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import {
  Room,
  RoomEvent,
  Track,
  type LocalVideoTrack,
  type RemoteVideoTrack,
} from "livekit-client";

import type { RoomParticipant } from "../../types";
import { FOCKIS_API_URL } from "../../../../config/fockisConfig";
import { useRoomStore } from "../../store/roomStore";
import { ParticipantTile } from "./ParticipantTile";
import "../../styles/components/room.scss";

interface VideoGridProps {
  participants: RoomParticipant[];
}

type MediaTokenResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
  meetingId?: string;
};

type VideoTrack = LocalVideoTrack | RemoteVideoTrack;
type VideoTrackMap = Record<string, VideoTrack>;

type ParticipantIdentity = {
  identity?: string;
  name?: string;
};

function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function uniqueKeys(values: unknown[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  return result;
}

function getParticipantKeys(participant: RoomParticipant): string[] {
  const item = participant as RoomParticipant & {
    user?: {
      id?: string;
      _id?: string;
      userId?: string;
      displayName?: string;
      name?: string;
    };
  };
  const user = item.user;

  return uniqueKeys([
    participant.id,
    user?.id,
    user?._id,
    user?.userId,
    user?.displayName,
    user?.name,
  ]);
}

function getLiveKitKeys(participant: ParticipantIdentity): string[] {
  const identity = String(participant.identity ?? "").trim();
  const withoutFockisPrefix = identity.replace(/^fockis-user-/i, "");

  return uniqueKeys([
    identity,
    withoutFockisPrefix,
    participant.name,
  ]);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function getCameraErrorMessage(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";

  if (name === "NotReadableError") {
    return "Your camera is busy in another app or browser tab. Close other apps or meeting tabs using the camera, then turn your camera on again.";
  }

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access was blocked. Allow camera access for Fockis in your browser's site settings, then try again.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found. Connect a camera and try again.";
  }

  return getErrorMessage(
    error,
    "Fockis could not start your camera. Check your camera and browser permissions, then try again.",
  );
}

export function VideoGrid({ participants }: VideoGridProps) {
  const { id } = useParams<{ id: string }>();

  const cameraOn = useRoomStore((state) => state.cameraOn);
  const micOn = useRoomStore((state) => state.micOn);
  const setCameraOn = useRoomStore((state) => state.setCameraOn);

  const roomRef = useRef<Room | null>(null);
  const cameraOperationRef = useRef<Promise<void>>(Promise.resolve());
  const microphoneOperationRef = useRef<Promise<void>>(Promise.resolve());
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());

  const [connectedRoom, setConnectedRoom] = useState<Room | null>(null);
  const [videoTracks, setVideoTracks] = useState<VideoTrackMap>({});
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeVideoTrack = useCallback(
    (keys: string[], track: VideoTrack) => {
      const normalizedKeys = uniqueKeys(keys);
      if (normalizedKeys.length === 0) return;

      setVideoTracks((current) => {
        const next = { ...current };
        for (const key of normalizedKeys) next[key] = track;
        return next;
      });
    },
    [],
  );

  const removeVideoTrack = useCallback(
    (keys: string[], track?: VideoTrack | null) => {
      if (track) {
        try {
          track.detach();
        } catch {
          // A track can already be detached by its tile or LiveKit.
        }
      }

      const normalizedKeys = uniqueKeys(keys);
      if (normalizedKeys.length === 0) return;

      setVideoTracks((current) => {
        const next = { ...current };
        for (const key of normalizedKeys) {
          if (!track || next[key] === track) delete next[key];
        }
        return next;
      });
    },
    [],
  );

  const getMediaToken = useCallback(async (): Promise<MediaTokenResponse> => {
    if (!id) throw new Error("Meeting ID is missing.");

    const authToken =
      localStorage.getItem("token") ??
      localStorage.getItem("accessToken");

    if (!authToken) {
      throw new Error("Your Fockis login has expired. Sign in again and rejoin the meeting.");
    }

    const baseUrl = (
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      FOCKIS_API_URL
    )
      .trim()
      .replace(/\/+$/, "");

    const response = await fetch(
      `${baseUrl}/meetings/${encodeURIComponent(id)}/media-token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : "Unable to obtain the meeting video token.";
      throw new Error(`${message} (HTTP ${response.status})`);
    }

    if (!data?.token || !data?.serverUrl || !data?.roomName) {
      throw new Error("Meeting media credentials are incomplete.");
    }

    return data as MediaTokenResponse;
  }, [id]);

  /*
   * Create one LiveKit room per meeting ID.
   * IMPORTANT: camera/microphone state and participant count are deliberately
   * not dependencies of this effect. Toggling a device or polling participants
   * must never disconnect and recreate the entire room.
   */
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let room: Room | null = null;
    let hasConnected = false;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setConnectedRoom(null);
    setMediaError(null);
    setVideoTracks({});

    const removeAudioElements = () => {
      for (const element of audioElementsRef.current) {
        try {
          element.pause();
          element.srcObject = null;
          element.remove();
        } catch {
          // Continue cleaning up other audio elements.
        }
      }
      audioElementsRef.current.clear();
    };

    const connect = async () => {
      try {
        const credentials = await getMediaToken();
        if (cancelled) return;

        room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        const activeRoom = room;
        roomRef.current = activeRoom;

        activeRoom.on(
          RoomEvent.TrackSubscribed,
          (track, publication, remoteParticipant) => {
            if (track.kind === Track.Kind.Video) {
              storeVideoTrack(
                getLiveKitKeys(remoteParticipant),
                track as RemoteVideoTrack,
              );

              console.info("[Fockis Meeting] Remote video subscribed", {
                identity: remoteParticipant.identity,
                name: remoteParticipant.name,
                trackSid: publication.trackSid,
              });
              return;
            }

            if (track.kind === Track.Kind.Audio) {
              try {
                const element = track.attach();
                if (element instanceof HTMLAudioElement) {
                  element.autoplay = true;
                  element.setAttribute("playsinline", "true");
                  element.style.display = "none";
                  document.body.appendChild(element);
                  audioElementsRef.current.add(element);
                  void element.play().catch(() => {
                    // The browser may require a user gesture for audio playback.
                  });
                }
              } catch (error) {
                console.error(
                  "[Fockis Meeting] Unable to attach remote audio:",
                  error,
                );
              }
            }
          },
        );

        activeRoom.on(
          RoomEvent.TrackUnsubscribed,
          (track, _publication, remoteParticipant) => {
            if (track.kind === Track.Kind.Video) {
              removeVideoTrack(
                getLiveKitKeys(remoteParticipant),
                track as RemoteVideoTrack,
              );
              return;
            }

            if (track.kind === Track.Kind.Audio) {
              try {
                const element = track.detach();
                if (element instanceof HTMLAudioElement) {
                  audioElementsRef.current.delete(element);
                  element.pause();
                  element.srcObject = null;
                  element.remove();
                }
              } catch {
                // Ignore audio detach errors during a disconnect.
              }
            }
          },
        );

        activeRoom.on(RoomEvent.ParticipantConnected, (remoteParticipant) => {
          console.info("[Fockis Meeting] Participant connected to LiveKit", {
            identity: remoteParticipant.identity,
            name: remoteParticipant.name,
          });
        });

        activeRoom.on(RoomEvent.ParticipantDisconnected, (remoteParticipant) => {
          const keys = getLiveKitKeys(remoteParticipant);
          setVideoTracks((current) => {
            const next = { ...current };
            for (const key of keys) delete next[key];
            return next;
          });
        });

        activeRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.kind !== Track.Kind.Video || !publication.track) return;
          storeVideoTrack(
            getLiveKitKeys(activeRoom.localParticipant),
            publication.track as LocalVideoTrack,
          );
          console.info("[Fockis Meeting] Local video published", {
            trackSid: publication.trackSid,
            identity: activeRoom.localParticipant.identity,
          });
        });

        activeRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.kind !== Track.Kind.Video) return;
          const keys = getLiveKitKeys(activeRoom.localParticipant);
          setVideoTracks((current) => {
            const next = { ...current };
            for (const key of keys) delete next[key];
            return next;
          });
        });

        activeRoom.on(RoomEvent.Disconnected, () => {
          // Ignore intentional cleanup disconnects and events before a successful join.
          if (!hasConnected || cancelled || roomRef.current !== activeRoom) return;

          roomRef.current = null;
          setConnectedRoom(null);
          setVideoTracks({});
          removeAudioElements();

          const attempt = reconnectAttemptsRef.current + 1;
          reconnectAttemptsRef.current = attempt;

          if (attempt <= 5) {
            const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
            setMediaError(
              `The meeting's video connection was lost. Reconnecting (${attempt}/5)…`,
            );

            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;
              if (!cancelled) setConnectionAttempt((value) => value + 1);
            }, delayMs);
          } else {
            setMediaError(
              "The meeting video connection could not recover after several attempts. Select Reconnect to try again.",
            );
          }
        });

        await activeRoom.connect(credentials.serverUrl, credentials.token, {
          autoSubscribe: true,
        });

        if (cancelled || roomRef.current !== activeRoom) {
          await activeRoom.disconnect();
          return;
        }

        hasConnected = true;
        console.info("[Fockis Meeting] LiveKit connected", {
          room: activeRoom.name,
          identity: activeRoom.localParticipant.identity,
          participantName: activeRoom.localParticipant.name,
          remoteParticipants: activeRoom.remoteParticipants.size,
        });

        // Bring any already-published remote video tracks into the tile map.
        for (const remoteParticipant of activeRoom.remoteParticipants.values()) {
          const keys = getLiveKitKeys(remoteParticipant);
          for (const publication of remoteParticipant.videoTrackPublications.values()) {
            if (publication.track) {
              storeVideoTrack(keys, publication.track as RemoteVideoTrack);
            }
          }
        }

        // Effects below publish camera/microphone once the room is connected.
        // Keeping them separate prevents device toggles from reconnecting rooms.
        setConnectedRoom(activeRoom);
      } catch (error) {
        if (cancelled) return;
        if (room && roomRef.current === room) roomRef.current = null;
        setConnectedRoom(null);
        setMediaError(
          getErrorMessage(error, "Unable to connect meeting video."),
        );
        console.error("[Fockis Meeting] LiveKit connection failed:", error);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const activeRoom = room;

      if (roomRef.current === activeRoom) roomRef.current = null;
      if (activeRoom) {
        void activeRoom.disconnect().catch((error: unknown) => {
          console.warn("[Fockis Meeting] Room cleanup failed:", error);
        });
      }

      removeAudioElements();
      setVideoTracks({});
    };
  }, [id, getMediaToken, storeVideoTrack, removeVideoTrack, connectionAttempt]);

  /*
   * Publish/unpublish camera without reconnecting the meeting room.
   * A small promise queue prevents rapid toggles from creating overlapping
   * camera capture requests.
   */
  useEffect(() => {
    const room = connectedRoom;
    if (!room || roomRef.current !== room) return;

    let cancelled = false;
    cameraOperationRef.current = cameraOperationRef.current
      .catch(() => undefined)
      .then(async () => {
        if (cancelled || roomRef.current !== room) return;
        try {
          await room.localParticipant.setCameraEnabled(cameraOn);
          if (!cancelled) setMediaError((current) => {
            if (current?.startsWith("Your camera is busy") ||
                current?.startsWith("Camera access was blocked") ||
                current?.startsWith("No camera was found") ||
                current?.startsWith("Fockis could not start your camera")) {
              return null;
            }
            return current;
          });
        } catch (error) {
          if (cancelled || roomRef.current !== room) return;
          console.error("[Fockis Meeting] Camera toggle failed:", error);
          setMediaError(getCameraErrorMessage(error));
          if (cameraOn) setCameraOn(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connectedRoom, cameraOn, setCameraOn]);

  /* Publish/unpublish microphone independently from the room connection. */
  useEffect(() => {
    const room = connectedRoom;
    if (!room || roomRef.current !== room) return;

    let cancelled = false;
    microphoneOperationRef.current = microphoneOperationRef.current
      .catch(() => undefined)
      .then(async () => {
        if (cancelled || roomRef.current !== room) return;
        try {
          await room.localParticipant.setMicrophoneEnabled(micOn);
        } catch (error) {
          if (cancelled || roomRef.current !== room) return;
          console.error("[Fockis Meeting] Microphone toggle failed:", error);
          const name =
            error && typeof error === "object" && "name" in error
              ? String((error as { name?: unknown }).name ?? "")
              : "";
          setMediaError(
            name === "NotReadableError"
              ? "Your microphone is busy in another app or browser tab. Close the other app and try again."
              : getErrorMessage(error, "Fockis could not start your microphone."),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connectedRoom, micOn]);

  const getTrackForParticipant = useCallback(
    (participant: RoomParticipant): VideoTrack | null => {
      for (const key of getParticipantKeys(participant)) {
        const track = videoTracks[key];
        if (track) return track;
      }
      return null;
    },
    [videoTracks],
  );

  const count = participants.length;
  const columns = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;

  if (count === 0) {
    return (
      <div className="fm-video-grid fm-video-grid--empty">
        <div className="fm-video-grid__empty">
          <div className="fm-video-grid__empty-icon">F</div>
          <h2>Waiting for participants</h2>
          <p>Your meeting is ready. Participants will appear here when they join.</p>
          {mediaError && <p role="alert">{mediaError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fm-video-grid fm-video-grid--count-${count}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {mediaError && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(120, 30, 30, 0.9)",
            color: "#fff",
            fontSize: 12,
          }}
        >
          <span>{mediaError}</span>
          {mediaError.toLowerCase().includes("reconnect") && (
            <button
              type="button"
              onClick={() => {
                if (reconnectTimerRef.current) {
                  clearTimeout(reconnectTimerRef.current);
                  reconnectTimerRef.current = null;
                }
                reconnectAttemptsRef.current = 0;
                setMediaError(null);
                setConnectionAttempt((value) => value + 1);
              }}
              style={{
                flex: "0 0 auto",
                border: "1px solid rgba(255,255,255,0.7)",
                borderRadius: 6,
                padding: "6px 10px",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              Reconnect
            </button>
          )}
        </div>
      )}

      {participants.map((participant) => (
        <ParticipantTile
          key={participant.id}
          participant={participant}
          videoTrack={getTrackForParticipant(participant)}
        />
      ))}
    </div>
  );
}
