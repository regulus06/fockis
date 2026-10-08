import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  Room,
  RoomEvent,
  Track,
  type LocalVideoTrack,
  type RemoteVideoTrack,
} from "livekit-client";

import type { RoomParticipant } from "../../types";

import {
  FOCKIS_API_URL,
} from "../../../../config/fockisConfig";

import {
  useRoomStore,
} from "../../store/roomStore";

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

type VideoTrack =
  | LocalVideoTrack
  | RemoteVideoTrack;

type VideoTrackMap = Record<
  string,
  VideoTrack
>;

/*
 * --------------------------------------------------------------------------
 * PARTICIPANT IDENTITY HELPERS
 * --------------------------------------------------------------------------
 *
 * LiveKit identifies participants using:
 *
 *   - identity
 *   - name
 *
 * Fockis participants may use:
 *
 *   - participant.id
 *   - user.id
 *   - user._id
 *   - user.userId
 *   - user.displayName
 *   - user.name
 *
 * We store the same LiveKit track under every useful key.
 * This prevents the UI from depending on displayName matching
 * LiveKit's name exactly.
 */

function normalizeKey(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function uniqueKeys(
  values: unknown[],
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized =
      normalizeKey(value);

    if (
      !normalized ||
      seen.has(normalized)
    ) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function getParticipantKeys(
  participant: RoomParticipant,
): string[] {
  const item =
    participant as RoomParticipant & {
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

function getLiveKitKeys(
  participant: {
    identity?: string;
    name?: string;
  },
): string[] {
  return uniqueKeys([
    participant.identity,
    participant.name,
  ]);
}

export function VideoGrid({
  participants,
}: VideoGridProps) {
  const { id } =
    useParams<{ id: string }>();

  const cameraOn =
    useRoomStore(
      (state) => state.cameraOn,
    );

  const micOn =
    useRoomStore(
      (state) => state.micOn,
    );

  const setCameraOn =
    useRoomStore(
      (state) => state.setCameraOn,
    );

  const roomRef =
    useRef<Room | null>(null);

  const mountedRef =
    useRef(true);

  const audioElementsRef =
    useRef<Set<HTMLAudioElement>>(
      new Set(),
    );

  const [
    videoTracks,
    setVideoTracks,
  ] = useState<VideoTrackMap>({});

  const [
    mediaError,
    setMediaError,
  ] = useState<string | null>(null);

  /*
   * --------------------------------------------------------------------------
   * STORE VIDEO TRACK
   * --------------------------------------------------------------------------
   */

  const storeVideoTrack =
    useCallback(
      (
        keys: string[],
        track: VideoTrack,
      ) => {
        const normalizedKeys =
          uniqueKeys(keys);

        if (
          normalizedKeys.length === 0
        ) {
          return;
        }

        setVideoTracks(
          (current) => {
            const next = {
              ...current,
            };

            for (
              const key of normalizedKeys
            ) {
              next[key] = track;
            }

            return next;
          },
        );
      },
      [],
    );

  /*
   * --------------------------------------------------------------------------
   * REMOVE VIDEO TRACK
   * --------------------------------------------------------------------------
   */

  const removeVideoTrack =
    useCallback(
      (
        keys: string[],
        track?: VideoTrack | null,
      ) => {
        if (track) {
          try {
            track.detach();
          } catch {
            // Track may already be detached.
          }
        }

        const normalizedKeys =
          uniqueKeys(keys);

        if (
          normalizedKeys.length === 0
        ) {
          return;
        }

        setVideoTracks(
          (current) => {
            const next = {
              ...current,
            };

            for (
              const key of normalizedKeys
            ) {
              if (
                !track ||
                next[key] === track
              ) {
                delete next[key];
              }
            }

            return next;
          },
        );
      },
      [],
    );

  /*
   * --------------------------------------------------------------------------
   * GET AUTHENTICATED MEETING MEDIA TOKEN
   * --------------------------------------------------------------------------
   */

  const getMediaToken =
    useCallback(async () => {
      if (!id) {
        throw new Error(
          "Meeting ID is missing.",
        );
      }

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem(
          "accessToken",
        );

      if (!token) {
        throw new Error(
          "Authentication token is missing.",
        );
      }

      const baseUrl =
        (
          import.meta.env.VITE_API_URL ||
          import.meta.env.VITE_API_BASE_URL ||
          FOCKIS_API_URL
        )
          .trim()
          .replace(/\/+$/, "");

      const response =
        await fetch(
          `${baseUrl}/meetings/${encodeURIComponent(
            id,
          )}/media-token`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            credentials: "include",
          },
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to obtain the meeting video token.",
        );
      }

      if (
        !data?.token ||
        !data?.serverUrl ||
        !data?.roomName
      ) {
        throw new Error(
          "Meeting media credentials are incomplete.",
        );
      }

      return data as MediaTokenResponse;
    }, [id]);

  /*
   * --------------------------------------------------------------------------
   * LIVEKIT CONNECTION
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    mountedRef.current = true;

    if (
      !id ||
      participants.length === 0
    ) {
      return;
    }

    let cancelled = false;

    const connect = async () => {
      try {
        setMediaError(null);

        const credentials =
          await getMediaToken();

        if (
          cancelled ||
          !mountedRef.current
        ) {
          return;
        }

        /*
         * Close any previous room.
         */

        if (roomRef.current) {
          try {
            await roomRef.current.disconnect();
          } catch {
            // Ignore.
          }

          roomRef.current = null;
        }

        const room =
          new Room({
            adaptiveStream: true,
            dynacast: true,
          });

        roomRef.current = room;

        /*
         * --------------------------------------------------------------------
         * REMOTE VIDEO / AUDIO SUBSCRIBED
         * --------------------------------------------------------------------
         */

        room.on(
          RoomEvent.TrackSubscribed,
          (
            track,
            publication,
            remoteParticipant,
          ) => {
            /*
             * VIDEO
             */

            if (
              track.kind ===
              Track.Kind.Video
            ) {
              const videoTrack =
                track as RemoteVideoTrack;

              const keys =
                getLiveKitKeys(
                  remoteParticipant,
                );

              storeVideoTrack(
                keys,
                videoTrack,
              );

              console.log(
                "[Fockis Meeting] Remote video subscribed:",
                {
                  participant:
                    remoteParticipant.name ||
                    remoteParticipant.identity,
                  identity:
                    remoteParticipant.identity,
                  name:
                    remoteParticipant.name,
                  trackSid:
                    publication.trackSid,
                },
              );

              return;
            }

            /*
             * AUDIO
             */

            if (
              track.kind ===
              Track.Kind.Audio
            ) {
              try {
                /*
                 * LiveKit's attach() returns a media element
                 * in the installed SDK version.
                 */
                const element =
                  track.attach();

                if (
                  element instanceof
                  HTMLAudioElement
                ) {
                  element.autoplay = true;

                  element.setAttribute(
                    "playsinline",
                    "true",
                  );

                  element.style.display =
                    "none";

                  document.body.appendChild(
                    element,
                  );

                  audioElementsRef.current.add(
                    element,
                  );

                  void element
                    .play()
                    .catch(() => {
                      /*
                       * Browser autoplay policy may require
                       * user interaction.
                       */
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

        /*
         * --------------------------------------------------------------------
         * REMOTE VIDEO / AUDIO UNSUBSCRIBED
         * --------------------------------------------------------------------
         */

        room.on(
          RoomEvent.TrackUnsubscribed,
          (
            track,
            _publication,
            remoteParticipant,
          ) => {
            const keys =
              getLiveKitKeys(
                remoteParticipant,
              );

            /*
             * VIDEO
             */

            if (
              track.kind ===
              Track.Kind.Video
            ) {
              removeVideoTrack(
                keys,
                track as RemoteVideoTrack,
              );

              return;
            }

            /*
             * AUDIO
             */

            if (
              track.kind ===
              Track.Kind.Audio
            ) {
              try {
                /*
                 * LiveKit's detach() returns the
                 * attached media element in this SDK.
                 */
                const element =
                  track.detach();

                if (
                  element instanceof
                  HTMLAudioElement
                ) {
                  audioElementsRef.current.delete(
                    element,
                  );

                  element.remove();
                }
              } catch {
                // Ignore detach errors.
              }
            }
          },
        );

        /*
         * --------------------------------------------------------------------
         * PARTICIPANT CONNECTED
         * --------------------------------------------------------------------
         */

        room.on(
          RoomEvent.ParticipantConnected,
          (remoteParticipant) => {
            console.log(
              "[Fockis Meeting] Participant connected to LiveKit:",
              {
                identity:
                  remoteParticipant.identity,
                name:
                  remoteParticipant.name,
              },
            );
          },
        );

        /*
         * --------------------------------------------------------------------
         * PARTICIPANT DISCONNECTED
         * --------------------------------------------------------------------
         */

        room.on(
          RoomEvent.ParticipantDisconnected,
          (remoteParticipant) => {
            const keys =
              getLiveKitKeys(
                remoteParticipant,
              );

            setVideoTracks(
              (current) => {
                const next = {
                  ...current,
                };

                for (
                  const key of keys
                ) {
                  delete next[key];
                }

                return next;
              },
            );
          },
        );

        /*
         * --------------------------------------------------------------------
         * LOCAL VIDEO PUBLISHED
         * --------------------------------------------------------------------
         */

        room.on(
          RoomEvent.LocalTrackPublished,
          (publication) => {
            if (
              publication.kind !==
              Track.Kind.Video
            ) {
              return;
            }

            const track =
              publication.track;

            if (!track) {
              return;
            }

            const localParticipant =
              room.localParticipant;

            const keys =
              getLiveKitKeys(
                localParticipant,
              );

            storeVideoTrack(
              keys,
              track as LocalVideoTrack,
            );

            console.log(
              "[Fockis Meeting] Local video published:",
              {
                identity:
                  localParticipant.identity,
                name:
                  localParticipant.name,
                trackSid:
                  publication.trackSid,
              },
            );
          },
        );

        /*
         * --------------------------------------------------------------------
         * LOCAL VIDEO UNPUBLISHED
         * --------------------------------------------------------------------
         */

        room.on(
          RoomEvent.LocalTrackUnpublished,
          (publication) => {
            if (
              publication.kind !==
              Track.Kind.Video
            ) {
              return;
            }

            const localParticipant =
              room.localParticipant;

            const keys =
              getLiveKitKeys(
                localParticipant,
              );

            setVideoTracks(
              (current) => {
                const next = {
                  ...current,
                };

                for (
                  const key of keys
                ) {
                  delete next[key];
                }

                return next;
              },
            );
          },
        );

        /*
         * --------------------------------------------------------------------
         * CONNECT
         * --------------------------------------------------------------------
         */

        await room.connect(
          credentials.serverUrl,
          credentials.token,
          {
            autoSubscribe: true,
          },
        );

        if (
          cancelled ||
          !mountedRef.current
        ) {
          await room.disconnect();
          return;
        }

        console.log(
          "[Fockis Meeting] LiveKit connected:",
          {
            room: room.name,
            participant:
              room.localParticipant
                .identity,
            participantName:
              room.localParticipant
                .name,
            remoteParticipants:
              room.remoteParticipants
                .size,
          },
        );

        /*
         * --------------------------------------------------------------------
         * INITIAL CAMERA
         * --------------------------------------------------------------------
         */

        try {
          await room.localParticipant
            .setCameraEnabled(
              cameraOn,
            );
        } catch (error) {
          console.error(
            "[Fockis Meeting] Camera permission/publish failed:",
            error,
          );

          if (
            mountedRef.current
          ) {
            setCameraOn(false);

            setMediaError(
              "Fockis could not access your camera. Please allow camera permission in the browser.",
            );
          }
        }

        /*
         * --------------------------------------------------------------------
         * INITIAL MICROPHONE
         * --------------------------------------------------------------------
         */

        try {
          await room.localParticipant
            .setMicrophoneEnabled(
              micOn,
            );
        } catch (error) {
          console.error(
            "[Fockis Meeting] Microphone publish failed:",
            error,
          );
        }

        /*
         * --------------------------------------------------------------------
         * EXISTING REMOTE VIDEO TRACKS
         * --------------------------------------------------------------------
         */

        for (
          const remoteParticipant
          of room.remoteParticipants.values()
        ) {
          const keys =
            getLiveKitKeys(
              remoteParticipant,
            );

          for (
            const publication
            of remoteParticipant
              .videoTrackPublications
              .values()
          ) {
            if (
              publication.track
            ) {
              storeVideoTrack(
                keys,
                publication.track as RemoteVideoTrack,
              );
            }
          }
        }

        /*
         * --------------------------------------------------------------------
         * EXISTING LOCAL VIDEO TRACK
         * --------------------------------------------------------------------
         */

        const localParticipant =
          room.localParticipant;

        const localKeys =
          getLiveKitKeys(
            localParticipant,
          );

        for (
          const publication
          of localParticipant
            .videoTrackPublications
            .values()
        ) {
          if (
            publication.track
          ) {
            storeVideoTrack(
              localKeys,
              publication.track as LocalVideoTrack,
            );
          }
        }
      } catch (error) {
        console.error(
          "[Fockis Meeting] LiveKit connection failed:",
          error,
        );

        if (
          !cancelled &&
          mountedRef.current
        ) {
          setMediaError(
            error instanceof Error
              ? error.message
              : "Unable to connect meeting video.",
          );
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      const room =
        roomRef.current;

      roomRef.current = null;

      if (room) {
        void room.disconnect();
      }

      setVideoTracks({});

      audioElementsRef.current.forEach(
        (element) => {
          try {
            element.remove();
          } catch {
            // Ignore.
          }
        },
      );

      audioElementsRef.current.clear();
    };
  }, [
    id,
    getMediaToken,
    participants.length,
    storeVideoTrack,
    removeVideoTrack,
    cameraOn,
    micOn,
    setCameraOn,
  ]);

  /*
   * --------------------------------------------------------------------------
   * CAMERA TOGGLE
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    const room =
      roomRef.current;

    if (!room) {
      return;
    }

    const updateCamera =
      async () => {
        try {
          await room.localParticipant
            .setCameraEnabled(
              cameraOn,
            );

          if (!cameraOn) {
            const keys =
              getLiveKitKeys(
                room.localParticipant,
              );

            setVideoTracks(
              (current) => {
                const next = {
                  ...current,
                };

                for (
                  const key of keys
                ) {
                  delete next[key];
                }

                return next;
              },
            );
          }
        } catch (error) {
          console.error(
            "[Fockis Meeting] Camera toggle failed:",
            error,
          );

          if (cameraOn) {
            setCameraOn(false);
          }
        }
      };

    void updateCamera();
  }, [
    cameraOn,
    setCameraOn,
  ]);

  /*
   * --------------------------------------------------------------------------
   * MICROPHONE TOGGLE
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    const room =
      roomRef.current;

    if (!room) {
      return;
    }

    const updateMicrophone =
      async () => {
        try {
          await room.localParticipant
            .setMicrophoneEnabled(
              micOn,
            );
        } catch (error) {
          console.error(
            "[Fockis Meeting] Microphone toggle failed:",
            error,
          );
        }
      };

    void updateMicrophone();
  }, [micOn]);

  /*
   * --------------------------------------------------------------------------
   * FIND TRACK FOR FOCKIS PARTICIPANT
   * --------------------------------------------------------------------------
   */

  const getTrackForParticipant =
    useCallback(
      (
        participant: RoomParticipant,
      ): VideoTrack | null => {
        const keys =
          getParticipantKeys(
            participant,
          );

        for (
          const key of keys
        ) {
          const track =
            videoTracks[key];

          if (track) {
            return track;
          }
        }

        return null;
      },
      [videoTracks],
    );

  /*
   * --------------------------------------------------------------------------
   * GRID
   * --------------------------------------------------------------------------
   */

  const count =
    participants.length;

  const columns =
    count <= 1
      ? 1
      : count <= 4
        ? 2
        : count <= 9
          ? 3
          : 4;

  if (count === 0) {
    return (
      <div className="fm-video-grid fm-video-grid--empty">
        <div className="fm-video-grid__empty">
          <div className="fm-video-grid__empty-icon">
            F
          </div>

          <h2>
            Waiting for participants
          </h2>

          <p>
            Your meeting is ready.
            Participants will appear
            here when they join.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fm-video-grid fm-video-grid--count-${count}`}
      style={{
        gridTemplateColumns:
          `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {mediaError && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 20,
            padding: "8px 12px",
            borderRadius: 10,
            background:
              "rgba(120, 30, 30, 0.82)",
            color: "#fff",
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          {mediaError}
        </div>
      )}

      {participants.map(
        (participant) => (
          <ParticipantTile
            key={participant.id}
            participant={
              participant
            }
            videoTrack={
              getTrackForParticipant(
                participant,
              )
            }
          />
        ),
      )}
    </div>
  );
}