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
  type Participant,
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

function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function uniqueKeys(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

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
    };
    userId?: string;
    user_id?: string;
    identity?: string;
  };

  const values = [
    participant.id,
    item.userId,
    item.user_id,
    item.identity,
    item.user?.id,
    item.user?._id,
    item.user?.userId,
  ];

  return uniqueKeys(
    values.flatMap((value) => {
      const key = normalizeKey(value);
      if (!key) return [];
      const raw = key.replace(/^fockis-user-/i, "");
      return [key, raw, `fockis-user-${raw}`];
    }),
  );
}

function getLiveKitKeys(participant: { identity: string }): string[] {
  const identity = String(participant.identity ?? "").trim();
  const raw = identity.replace(/^fockis-user-/i, "");
  return uniqueKeys([identity, raw, raw ? `fockis-user-${raw}` : ""]);
}

function makeLiveKitParticipant(participant: Participant): RoomParticipant {
  const identity = String(participant.identity || "").trim();
  const displayName = String(participant.name || identity || "Fockis participant");
  const publications = Array.from(participant.videoTrackPublications.values());
  const videoPublished = publications.some(
    (publication) => !publication.isMuted,
  );

  return {
    id: identity,
    user: { id: identity, displayName },
    role: "participant",
    micOn: participant.isMicrophoneEnabled,
    cameraOn: participant.isCameraEnabled || videoPublished,
    handRaised: false,
    isSpeaking: false,
    screenSharing: false,
    connectionQuality: "good",
    joinedAt: new Date().toISOString(),
  } as RoomParticipant;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function getCameraErrorMessage(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";

  if (name === "NotReadableError") {
    return "Your camera is busy in another app or browser tab. Close other apps or meeting tabs using the camera, then try again.";
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
  const upsertParticipant = useRoomStore((state) => state.upsertParticipant);
  const removeParticipant = useRoomStore((state) => state.removeParticipant);

  const roomRef = useRef<Room | null>(null);
  const cameraOperationRef = useRef<Promise<void>>(Promise.resolve());
  const microphoneOperationRef = useRef<Promise<void>>(Promise.resolve());
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());

  const [connectedRoom, setConnectedRoom] = useState<Room | null>(null);
  const [videoTracks, setVideoTracks] = useState<VideoTrackMap>({});
  const [liveKitParticipants, setLiveKitParticipants] = useState<RoomParticipant[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeVideoTrack = useCallback((keys: string[], track: VideoTrack) => {
    const normalized = uniqueKeys(keys);
    if (!normalized.length) return;

    setVideoTracks((current) => {
      const next = { ...current };
      normalized.forEach((key) => {
        next[key] = track;
      });
      return next;
    });
  }, []);

  const removeVideoTrack = useCallback(
    (keys: string[], track?: VideoTrack | null) => {
      if (track) {
        try {
          track.detach();
        } catch {
          // The track may already have been detached by LiveKit or its tile.
        }
      }

      const normalized = uniqueKeys(keys);
      if (!normalized.length) return;

      setVideoTracks((current) => {
        const next = { ...current };
        normalized.forEach((key) => {
          if (!track || next[key] === track) delete next[key];
        });
        return next;
      });
    },
    [],
  );

  const syncRemoteParticipant = useCallback(
    (participant: Participant) => {
      const mapped = makeLiveKitParticipant(participant);
      const keys = getLiveKitKeys(participant);

      setLiveKitParticipants((current) => {
        const next = current.filter(
          (existing) =>
            !getParticipantKeys(existing).some((key) => keys.includes(key)),
        );
        return [...next, mapped];
      });

      // The shared store drives the Participants panel.
      upsertParticipant(mapped);
    },
    [upsertParticipant],
  );

  const removeRemoteParticipant = useCallback(
    (participant: Participant) => {
      const keys = getLiveKitKeys(participant);

      setLiveKitParticipants((current) =>
        current.filter(
          (existing) =>
            !getParticipantKeys(existing).some((key) => keys.includes(key)),
        ),
      );

      // Match identity aliases, since REST participant IDs may differ.
      const storeParticipants = useRoomStore.getState().participants;
      for (const candidate of storeParticipants) {
        if (
          getParticipantKeys(candidate).some((key) => keys.includes(key))
        ) {
          removeParticipant(candidate.id);
        }
      }

      setVideoTracks((current) => {
        const next = { ...current };
        keys.forEach((key) => delete next[key]);
        return next;
      });
    },
    [removeParticipant],
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
    setLiveKitParticipants([]);

    const removeAudioElements = () => {
      for (const element of audioElementsRef.current) {
        try {
          element.pause();
          element.srcObject = null;
          element.remove();
        } catch {
          // Continue cleaning up the remaining audio elements.
        }
      }
      audioElementsRef.current.clear();
    };

    const connect = async () => {
      try {
        const credentials = await getMediaToken();
        if (cancelled) return;

        room = new Room({ adaptiveStream: true, dynacast: true });
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
              syncRemoteParticipant(remoteParticipant);
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
                    // Some browsers require a user gesture to play audio.
                  });
                }
              } catch (error) {
                console.error("[Fockis Meeting] Unable to attach remote audio:", error);
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
                const detached = track.detach();
                for (const element of detached) {
                  if (element instanceof HTMLAudioElement) {
                    audioElementsRef.current.delete(element);
                    element.pause();
                    element.srcObject = null;
                    element.remove();
                  }
                }
              } catch {
                // Ignore detach errors during disconnect.
              }
            }
          },
        );

        activeRoom.on(RoomEvent.ParticipantConnected, (participant) => {
          syncRemoteParticipant(participant);
          console.info("[Fockis Meeting] Participant added to shared store", {
            identity: participant.identity,
            name: participant.name,
          });
        });

        activeRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
          removeRemoteParticipant(participant);
        });

        activeRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.kind !== Track.Kind.Video || !publication.track) return;
          storeVideoTrack(
            getLiveKitKeys(activeRoom.localParticipant),
            publication.track as LocalVideoTrack,
          );
          upsertParticipant(makeLiveKitParticipant(activeRoom.localParticipant));
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
            keys.forEach((key) => delete next[key]);
            return next;
          });
        });

        activeRoom.on(RoomEvent.Disconnected, () => {
          if (!hasConnected || cancelled || roomRef.current !== activeRoom) return;

          roomRef.current = null;
          setConnectedRoom(null);
          setVideoTracks({});
          setLiveKitParticipants([]);
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
        reconnectAttemptsRef.current = 0;

        console.info("[Fockis Meeting] LiveKit connected", {
          room: activeRoom.name,
          identity: activeRoom.localParticipant.identity,
          participantName: activeRoom.localParticipant.name,
          remoteParticipants: activeRoom.remoteParticipants.size,
          expectedGalleryTiles: 1 + activeRoom.remoteParticipants.size,
        });

        // Add the local user and all already-connected remote users to the store.
        upsertParticipant(makeLiveKitParticipant(activeRoom.localParticipant));

        const remoteSnapshot = Array.from(
          activeRoom.remoteParticipants.values(),
        );

        setLiveKitParticipants(
          remoteSnapshot.map((participant) =>
            makeLiveKitParticipant(participant),
          ),
        );

        for (const remoteParticipant of remoteSnapshot) {
          syncRemoteParticipant(remoteParticipant);
          const keys = getLiveKitKeys(remoteParticipant);
          for (const publication of remoteParticipant.videoTrackPublications.values()) {
            if (publication.track) {
              storeVideoTrack(keys, publication.track as RemoteVideoTrack);
            }
          }
        }

        setConnectedRoom(activeRoom);
      } catch (error) {
        if (cancelled) return;
        if (room && roomRef.current === room) roomRef.current = null;
        setConnectedRoom(null);
        setMediaError(getErrorMessage(error, "Unable to connect meeting video."));
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
  }, [
    id,
    getMediaToken,
    storeVideoTrack,
    removeVideoTrack,
    syncRemoteParticipant,
    removeRemoteParticipant,
    upsertParticipant,
    connectionAttempt,
  ]);

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
          if (!cancelled) {
            setMediaError((current) => {
              if (
                current?.startsWith("Your camera is busy") ||
                current?.startsWith("Camera access was blocked") ||
                current?.startsWith("No camera was found") ||
                current?.startsWith("Fockis could not start your camera")
              ) {
                return null;
              }
              return current;
            });
          }
          upsertParticipant(makeLiveKitParticipant(room.localParticipant));
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
  }, [connectedRoom, cameraOn, setCameraOn, upsertParticipant]);

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
          upsertParticipant(makeLiveKitParticipant(room.localParticipant));
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
  }, [connectedRoom, micOn, upsertParticipant]);

  const getTrackForParticipant = useCallback(
    (participant: RoomParticipant): VideoTrack | null => {
      const keys = getParticipantKeys(participant);
      for (const key of keys) {
        if (videoTracks[key]) return videoTracks[key];
      }
      for (const key of keys) {
        const raw = key.replace(/^fockis-user-/i, "");
        const track = videoTracks[raw] ?? videoTracks[`fockis-user-${raw}`];
        if (track) return track;
      }
      return null;
    },
    [videoTracks],
  );

  const displayParticipants = (() => {
    if (!connectedRoom) return participants;

    const local = makeLiveKitParticipant(connectedRoom.localParticipant);
    const live = [local, ...liveKitParticipants];
    const unique = new Map<string, RoomParticipant>();

    for (const person of live) {
      const identity = normalizeKey(person.id);
      if (!identity) continue;

      const keys = getParticipantKeys(person);
      const metadata = participants.find((candidate) =>
        getParticipantKeys(candidate).some((key) => keys.includes(key)),
      );
      const track = getTrackForParticipant(person);
      const isLocal =
        identity === normalizeKey(connectedRoom.localParticipant.identity);

      unique.set(identity, {
        ...(metadata ?? {}),
        ...person,
        id: person.id,
        user: {
          ...(metadata?.user ?? {}),
          ...person.user,
        },
        cameraOn: isLocal ? cameraOn : person.cameraOn || Boolean(track),
        micOn: isLocal ? micOn : person.micOn,
      } as RoomParticipant);
    }

    return Array.from(unique.values());
  })();

  const count = displayParticipants.length;
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
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoRows: "minmax(0, 1fr)",
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        position: "relative",
      }}
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

      {displayParticipants.map((participant) => (
        <ParticipantTile
          key={participant.id}
          participant={participant}
          videoTrack={getTrackForParticipant(participant)}
        />
      ))}
    </div>
  );
}

export default VideoGrid;
