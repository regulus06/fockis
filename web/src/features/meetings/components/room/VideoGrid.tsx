import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Maximize2, Minimize2, UserPlus } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  Room,
  RoomEvent,
  Track,
  type LocalVideoTrack,
  type RemoteVideoTrack,
  type Participant,
  ConnectionQuality,
} from "livekit-client";
import type { RoomParticipant } from "../../types";
import { FOCKIS_API_URL } from "../../../../config/fockisConfig";
import { useRoomStore } from "../../store/roomStore";
import { ParticipantTile } from "./ParticipantTile";
import { ScreenShareView } from "./ScreenShareView";
import {
  getIdentityKeys,
  getParticipantKeys,
  normalizeKey,
  participantMatchesId,
  strongerRole,
  uniqueKeys,
} from "../../utils/participantIdentity";
import "../../styles/components/room.scss";
export type StageLayout = "speaker" | "gallery";

export type LocalConnectionQuality = RoomParticipant["connectionQuality"];

interface VideoGridProps {
  participants: RoomParticipant[];
  /** speaker = large stage + thumbnail rail, gallery = equal grid */
  layout?: StageLayout;
  /** When someone is presenting, the stage shows the presentation. */
  presenterName?: string | null;
  /** Adds the "Invite people" card to the end of the rail. */
  onInvite?: () => void;
  /** Reports this browser's LiveKit connection quality for the header. */
  onLocalQualityChange?: (quality: LocalConnectionQuality) => void;
  /** Fockis user id of this browser, used before LiveKit connects. */
  localUserId?: string;
}
type MediaTokenResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
  meetingId?: string;
};
type VideoTrack = LocalVideoTrack | RemoteVideoTrack;
type VideoTrackMap = Record<string, VideoTrack>;
function getLiveKitKeys(participant: { identity: string }): string[] {
  return getIdentityKeys(String(participant.identity ?? "").trim());
}

function mapConnectionQuality(
  quality: ConnectionQuality | undefined,
): RoomParticipant["connectionQuality"] {
  switch (quality) {
    case ConnectionQuality.Poor:
      return "weak";
    case ConnectionQuality.Lost:
      return "poor";
    default:
      // Excellent, Good and Unknown (not measured yet) all read as good.
      return "good";
  }
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
    connectionQuality: mapConnectionQuality(participant.connectionQuality),
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
export function VideoGrid({
  participants,
  layout = "speaker",
  presenterName = null,
  onInvite,
  onLocalQualityChange,
  localUserId,
}: VideoGridProps) {
  const { id } = useParams<{ id: string }>();
  const cameraOn = useRoomStore((state) => state.cameraOn);
  const micOn = useRoomStore((state) => state.micOn);
  const setCameraOn = useRoomStore((state) => state.setCameraOn);
  const storeUpsertParticipant = useRoomStore((state) => state.upsertParticipant);
  const audioInputId = useRoomStore((state) => state.audioInputId);
  const videoInputId = useRoomStore((state) => state.videoInputId);
  const audioOutputId = useRoomStore((state) => state.audioOutputId);
  // LiveKit only knows about media, not Fockis roles. Never let a LiveKit
  // update downgrade a host/co-host entry that the realtime socket created.
  const upsertParticipant = useCallback(
    (participant: RoomParticipant) => {
      const existing = useRoomStore
        .getState()
        .participants.find((candidate) => candidate.id === participant.id);
      storeUpsertParticipant(
        existing
          ? { ...participant, role: strongerRole(existing.role, participant.role) }
          : participant,
      );
    },
    [storeUpsertParticipant],
  );
  const removeParticipant = useRoomStore((state) => state.removeParticipant);
  const roomRef = useRef<Room | null>(null);
  const cameraOperationRef = useRef<Promise<void>>(Promise.resolve());
  const microphoneOperationRef = useRef<Promise<void>>(Promise.resolve());
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());
  const [connectedRoom, setConnectedRoom] = useState<Room | null>(null);
  const [videoTracks, setVideoTracks] = useState<VideoTrackMap>({});
  const [, setLiveKitParticipants] = useState<RoomParticipant[]>([]);
  // Normalized identities LiveKit currently reports as speaking.
  const [activeSpeakerKeys, setActiveSpeakerKeys] = useState<string[]>([]);
  // The most recent speaker stays on stage after they stop talking.
  const [lastSpeakerKey, setLastSpeakerKey] = useState<string | null>(null);
  // A tile the user clicked to keep on the main stage.
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  // Bumped on mute/unmute so tiles re-read LiveKit's live state.
  const [, setMediaRevision] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onLocalQualityChangeRef = useRef(onLocalQualityChange);
  onLocalQualityChangeRef.current = onLocalQualityChange;
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
    setActiveSpeakerKeys([]);
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
        activeRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const keys = speakers.map((speaker) => normalizeKey(speaker.identity));
          setActiveSpeakerKeys(keys);
          if (keys.length) {
            const localKey = normalizeKey(activeRoom.localParticipant.identity);
            // Prefer a remote speaker for the stage; fall back to the local user.
            setLastSpeakerKey(keys.find((key) => key !== localKey) ?? keys[0]);
          }
        });
        const syncMediaState = (participant: Participant) => {
          if (participant === activeRoom.localParticipant) {
            upsertParticipant(makeLiveKitParticipant(activeRoom.localParticipant));
          } else {
            syncRemoteParticipant(participant);
          }
          setMediaRevision((value) => value + 1);
        };
        activeRoom.on(RoomEvent.TrackMuted, (_publication, participant) => {
          syncMediaState(participant);
        });
        activeRoom.on(RoomEvent.TrackUnmuted, (_publication, participant) => {
          syncMediaState(participant);
        });
        activeRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          if (participant === activeRoom.localParticipant) {
            onLocalQualityChangeRef.current?.(mapConnectionQuality(quality));
          }
          syncMediaState(participant);
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

  // Apply devices chosen in the Settings tab to the live room.
  useEffect(() => {
    const room = connectedRoom;
    if (!room || roomRef.current !== room) return;
    const switches: Array<[MediaDeviceKind, string]> = [
      ["audioinput", audioInputId],
      ["videoinput", videoInputId],
      ["audiooutput", audioOutputId],
    ];
    for (const [kind, deviceId] of switches) {
      if (!deviceId) continue;
      void room.switchActiveDevice(kind, deviceId).catch((error: unknown) => {
        console.warn(`[Fockis Meeting] Unable to switch ${kind}:`, error);
        if (kind !== "audiooutput") {
          setMediaError(
            getErrorMessage(error, "Fockis could not switch to the selected device."),
          );
        }
      });
    }
  }, [connectedRoom, audioInputId, videoInputId, audioOutputId]);

  // Track fullscreen so the stage button shows the right icon.
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current && stageRef.current !== null);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (stage.requestFullscreen) {
      void stage.requestFullscreen().catch((error: unknown) => {
        console.warn("[Fockis Meeting] Fullscreen was blocked:", error);
      });
    }
  };
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
  // Build the gallery from the current LiveKit room snapshot on every render.
  // The state array is still useful for the Fockis participants panel, but it
  // must not decide which media tiles exist.
  const liveTracks = new Map<string, VideoTrack | null>();
  const localKey = connectedRoom
    ? normalizeKey(connectedRoom.localParticipant.identity)
    : "";

  const displayParticipants = (() => {
    if (!connectedRoom) return participants;
    const localParticipant = connectedRoom.localParticipant;
    const remoteSnapshot = Array.from(connectedRoom.remoteParticipants.values());
    const live = [
      makeLiveKitParticipant(localParticipant),
      ...remoteSnapshot.map(makeLiveKitParticipant),
    ];
    const unique = new Map<string, RoomParticipant>();
    for (const person of live) {
      const identity = normalizeKey(person.id);
      if (!identity || unique.has(identity)) continue;
      const keys = getParticipantKeys(person);
      // Several store entries can describe this person (socket + LiveKit).
      const matches = participants.filter((candidate) =>
        getParticipantKeys(candidate).some((key) => keys.includes(key)),
      );
      const metadata =
        matches.find((candidate) => candidate.role !== "participant") ??
        matches[0];
      const role = matches.reduce(
        (current, candidate) => strongerRole(current, candidate.role),
        person.role,
      );
      const isLocal = identity === localKey;
      // Prefer the publication currently owned by this exact LiveKit
      // participant. This avoids attaching another user's track by display
      // name or a stale alias in the track map.
      const liveParticipant = isLocal
        ? localParticipant
        : remoteSnapshot.find(
            (candidate) =>
              normalizeKey(candidate.identity) === identity,
          );
      // LocalParticipant and RemoteParticipant expose maps with different
      // publication types. Normalize the map's value type before iterating so
      // TypeScript does not infer a union of incompatible MapIterator types.
      const videoPublications = liveParticipant
        ? (liveParticipant.videoTrackPublications as unknown as Map<
            string,
            {
              isMuted: boolean;
              track?: { kind: Track.Kind } | null;
            }
          >)
        : null;
      const videoPublication = videoPublications
        ? Array.from(videoPublications.values()).find(
            (publication) =>
              !publication.isMuted &&
              publication.track?.kind === Track.Kind.Video,
          )
        : undefined;
      const track =
        (videoPublication?.track as VideoTrack | undefined) ??
        getTrackForParticipant(person);
      liveTracks.set(person.id, track ?? null);
      unique.set(identity, {
        ...(metadata ?? {}),
        ...person,
        id: person.id,
        role,
        user: {
          ...(metadata?.user ?? {}),
          ...person.user,
          // A real display name from Fockis beats a raw LiveKit identity.
          displayName:
            person.user.displayName && person.user.displayName !== person.id
              ? person.user.displayName
              : metadata?.user?.displayName || person.user.displayName,
        },
        cameraOn: isLocal
          ? cameraOn
          : Boolean(track) || person.cameraOn,
        micOn: isLocal ? micOn : person.micOn,
        isSpeaking: activeSpeakerKeys.includes(identity),
        handRaised: matches.some((candidate) => candidate.handRaised),
      } as RoomParticipant);
    }
    return Array.from(unique.values());
  })();

  const trackFor = (participant: RoomParticipant): VideoTrack | null =>
    liveTracks.has(participant.id)
      ? liveTracks.get(participant.id) ?? null
      : getTrackForParticipant(participant);

  const isLocalParticipant = (participant: RoomParticipant) =>
    localKey
      ? normalizeKey(participant.id) === localKey
      : participantMatchesId(participant, localUserId);

  const count = displayParticipants.length;

  // Stage priority: pinned tile, current speaker, last speaker, a remote
  // participant with video, the local user with video, then anyone.
  const keyOf = (participant: RoomParticipant) => normalizeKey(participant.id);
  const findByKey = (key: string | null) =>
    key ? displayParticipants.find((participant) => keyOf(participant) === key) : undefined;
  const currentSpeaker =
    displayParticipants.find(
      (participant) => participant.isSpeaking && !isLocalParticipant(participant),
    ) ?? displayParticipants.find((participant) => participant.isSpeaking);
  const featured =
    findByKey(pinnedKey) ??
    currentSpeaker ??
    findByKey(lastSpeakerKey) ??
    displayParticipants.find(
      (participant) => !isLocalParticipant(participant) && Boolean(trackFor(participant)),
    ) ??
    displayParticipants.find(
      (participant) => isLocalParticipant(participant) && Boolean(trackFor(participant)),
    ) ??
    displayParticipants.find((participant) => !isLocalParticipant(participant)) ??
    displayParticipants[0];
  const pinnedActive = Boolean(findByKey(pinnedKey));

  const togglePin = (participant: RoomParticipant) => {
    const key = keyOf(participant);
    setPinnedKey((current) => (current === key ? null : key));
  };

  const mediaErrorBanner = mediaError ? (
    <div className="fm-stage__alert" role="status">
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
        >
          Reconnect
        </button>
      )}
    </div>
  ) : null;

  if (count === 0) {
    return (
      <div className="fm-stage fm-stage--empty">
        {mediaErrorBanner}
        <div className="fm-stage__empty">
          <div className="fm-stage__empty-icon">
            <UserPlus size={26} />
          </div>
          <h2>Waiting for participants</h2>
          <p>Your meeting is ready. Participants will appear here when they join.</p>
          {onInvite && (
            <button type="button" className="fm-stage__empty-invite" onClick={onInvite}>
              <UserPlus size={16} />
              Invite people
            </button>
          )}
        </div>
      </div>
    );
  }

  const fullscreenButton = (
    <button
      type="button"
      className="fm-stage__fullscreen"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
      title={isFullscreen ? "Exit full screen" : "Full screen"}
    >
      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
  );

  if (layout === "gallery" && !presenterName) {
    const columns = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
    return (
      <div className="fm-stage fm-stage--gallery">
        <div
          ref={stageRef}
          className={`fm-stage__gallery fm-stage__gallery--count-${Math.min(count, 16)}`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {mediaErrorBanner}
          {displayParticipants.map((participant) => (
            <ParticipantTile
              key={participant.id}
              participant={participant}
              videoTrack={trackFor(participant)}
              variant="grid"
              isLocal={isLocalParticipant(participant)}
            />
          ))}
          {fullscreenButton}
        </div>
      </div>
    );
  }

  return (
    <div className="fm-stage">
      <div ref={stageRef} className="fm-stage__main">
        {mediaErrorBanner}
        {presenterName ? (
          <ScreenShareView presenterName={presenterName} />
        ) : featured ? (
          <ParticipantTile
            key={`stage-${featured.id}`}
            participant={featured}
            videoTrack={trackFor(featured)}
            variant="featured"
            isLocal={isLocalParticipant(featured)}
            pinned={pinnedActive}
          />
        ) : null}
        {fullscreenButton}
      </div>

      <div className="fm-stage__rail" role="list" aria-label="Participants in this meeting">
        {displayParticipants.map((participant) => (
          <div className="fm-stage__rail-item" role="listitem" key={participant.id}>
            <ParticipantTile
              participant={participant}
              videoTrack={trackFor(participant)}
              variant="thumb"
              isLocal={isLocalParticipant(participant)}
              selected={!presenterName && featured?.id === participant.id}
              pinned={pinnedKey === keyOf(participant)}
              onSelect={() => togglePin(participant)}
            />
          </div>
        ))}
        {onInvite && (
          <div className="fm-stage__rail-item" role="listitem">
            <button type="button" className="fm-stage__invite" onClick={onInvite}>
              <span className="fm-stage__invite-icon">
                <UserPlus size={20} />
              </span>
              <span>Invite people</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default VideoGrid;
