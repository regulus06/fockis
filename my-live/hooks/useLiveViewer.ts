import { FOCKIS_API_URL } from "../../config/fockisConfig";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
} from "livekit-client";

import { api } from "../api";

export interface LiveViewerStream {
  id: string;
  title: string;
  description?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  hostUsername?: string;
  hostName?: string;
  hostAvatar?: string;
  viewers: number;
  likes: number;
  status: "live" | "ended" | "scheduled";
  playbackUrl?: string;
  streamUrl?: string;
  roomName?: string;
  serverUrl?: string;
  token?: string;
}

export interface ViewerParticipant {
  identity: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isHost: boolean;
}

export interface ViewerChatMessage {
  id: string;
  username: string;
  displayName?: string;
  message: string;
  avatarUrl?: string;
  createdAt?: string;
}

interface UseLiveViewerOptions {
  streamId?: string;
}

function getParticipantName(
  participant: RemoteParticipant,
): string {
  if (participant.metadata) {
    try {
      const metadata = JSON.parse(
        participant.metadata,
      ) as {
        username?: string;
        displayName?: string;
        name?: string;
      };

      return (
        metadata.displayName ||
        metadata.username ||
        metadata.name ||
        participant.name ||
        participant.identity ||
        "Fockis User"
      );
    } catch {
      // Ignore invalid metadata.
    }
  }

  return (
    participant.name ||
    participant.identity ||
    "Fockis User"
  );
}

function getParticipantAvatar(
  participant: RemoteParticipant,
): string | undefined {
  if (participant.metadata) {
    try {
      const metadata = JSON.parse(
        participant.metadata,
      ) as {
        avatarUrl?: string;
        avatar?: string;
        profilePicture?: string;
      };

      return (
        metadata.avatarUrl ||
        metadata.avatar ||
        metadata.profilePicture
      );
    } catch {
      // Ignore invalid metadata.
    }
  }

  return undefined;
}

export function useLiveViewer({
  streamId,
}: UseLiveViewerOptions) {
  const [stream, setStream] =
    useState<LiveViewerStream | null>(null);

  const [messages, setMessages] =
    useState<ViewerChatMessage[]>([]);

  const [participants, setParticipants] =
    useState<ViewerParticipant[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [liked, setLiked] =
    useState(false);

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [isMuted, setIsMuted] =
    useState(true);

  const videoElementRef =
    useRef<HTMLVideoElement | null>(null);

  const roomRef =
    useRef<Room | null>(null);

  const currentVideoTrackRef =
    useRef<RemoteTrack | null>(null);

  const pendingVideoTrackRef =
    useRef<RemoteTrack | null>(null);

  const mountedRef =
    useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const attachRemoteVideo =
    useCallback(
      (track: RemoteTrack) => {
        if (
          track.kind !== Track.Kind.Video
        ) {
          return;
        }

        const video =
          videoElementRef.current;

        if (!video) {
          console.log(
            "[FOCKIS LIVE VIEWER] Video element not ready. Queueing track.",
          );

          pendingVideoTrackRef.current =
            track;

          return;
        }

        try {
          const previous =
            currentVideoTrackRef.current;

          if (
            previous &&
            previous !== track
          ) {
            try {
              previous.detach(video);
            } catch {
              // Ignore.
            }
          }

          currentVideoTrackRef.current =
            track;

          pendingVideoTrackRef.current =
            null;

          video.autoplay = true;
          video.playsInline = true;
          video.controls = false;
          video.muted = isMuted;

          track.attach(video);

          console.log(
            "[FOCKIS LIVE VIEWER] VIDEO ATTACHED",
            {
              kind: track.kind,
              videoWidth:
                video.videoWidth,
              videoHeight:
                video.videoHeight,
            },
          );

          void video
            .play()
            .then(() => {
              console.log(
                "[FOCKIS LIVE VIEWER] VIDEO PLAYING",
              );
            })
            .catch((playError) => {
              console.warn(
                "[FOCKIS LIVE VIEWER] video.play() blocked:",
                playError,
              );
            });
        } catch (attachError) {
          console.error(
            "[FOCKIS LIVE VIEWER] Failed to attach video:",
            attachError,
          );

          pendingVideoTrackRef.current =
            track;
        }
      },
      [isMuted],
    );

  const videoRef =
    useCallback(
      (element: HTMLVideoElement | null) => {
        videoElementRef.current =
          element;

        if (!element) {
          return;
        }

        element.autoplay = true;
        element.playsInline = true;
        element.controls = false;
        element.muted = isMuted;

        const pending =
          pendingVideoTrackRef.current;

        if (pending) {
          pendingVideoTrackRef.current =
            null;

          attachRemoteVideo(pending);

          return;
        }

        const current =
          currentVideoTrackRef.current;

        if (current) {
          try {
            current.attach(element);

            void element
              .play()
              .catch(() => {});
          } catch {
            pendingVideoTrackRef.current =
              current;
          }
        }
      },
      [attachRemoteVideo, isMuted],
    );

  const updateParticipants =
    useCallback((room: Room) => {
      const remoteParticipants =
        Array.from(
          room.remoteParticipants.values(),
        );

      const hostIdentity =
        remoteParticipants[0]?.identity;

      const next =
        remoteParticipants.map(
          (participant) => ({
            identity:
              participant.identity,

            username:
              participant.name ||
              participant.identity,

            displayName:
              getParticipantName(
                participant,
              ),

            avatarUrl:
              getParticipantAvatar(
                participant,
              ),

            isHost:
              participant.identity ===
              hostIdentity,
          }),
        );

      if (mountedRef.current) {
        setParticipants(next);
      }
    }, []);

  const attachExistingTracks =
    useCallback(
      (room: Room) => {
        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.trackPublications.values()) {
            if (
              publication.kind !==
              Track.Kind.Video
            ) {
              continue;
            }

            const track =
              publication.track;

            if (
              track &&
              publication.isSubscribed
            ) {
              console.log(
                "[FOCKIS LIVE VIEWER] Existing subscribed video:",
                publication.trackSid,
              );

              attachRemoteVideo(track);
            }
          }
        }
      },
      [attachRemoteVideo],
    );

  const disconnectRoom =
    useCallback(async () => {
      const room =
        roomRef.current;

      roomRef.current = null;

      const video =
        videoElementRef.current;

      const track =
        currentVideoTrackRef.current;

      currentVideoTrackRef.current =
        null;

      pendingVideoTrackRef.current =
        null;

      if (track) {
        try {
          if (video) {
            track.detach(video);
          } else {
            track.detach();
          }
        } catch {
          // Ignore.
        }
      }

      if (!room) {
        if (mountedRef.current) {
          setConnected(false);
          setParticipants([]);
        }

        return;
      }

      try {
        await room.disconnect();
      } catch {
        // Ignore.
      }

      if (mountedRef.current) {
        setConnected(false);
        setParticipants([]);
      }
    }, []);

  const connectToLiveKit =
    useCallback(
      async (sessionId: string) => {
        console.log(
          "[FOCKIS LIVE VIEWER] Joining session:",
          sessionId,
        );

        const join =
          await api.joinSession(
            sessionId,
          );

        console.log(
          "[FOCKIS LIVE VIEWER] Join response:",
          {
            hasToken:
              Boolean(join.token),
            serverUrl:
              join.serverUrl,
          },
        );

        if (!join.token) {
          throw new Error(
            "The live server did not return a viewer token.",
          );
        }

        if (!join.serverUrl) {
          throw new Error(
            "The live server did not return a LiveKit server URL.",
          );
        }

        await disconnectRoom();

        const room =
          new Room({
            adaptiveStream: true,
            dynacast: false,
          });

        roomRef.current =
          room;

        room.on(
          RoomEvent.TrackSubscribed,
          (
            track,
            publication,
            participant,
          ) => {
            console.log(
              "[FOCKIS LIVE VIEWER] TRACK SUBSCRIBED:",
              {
                participant:
                  participant.identity,
                kind: track.kind,
                trackSid:
                  publication.trackSid,
                trackName:
                  publication.trackName,
              },
            );

            if (
              track.kind ===
              Track.Kind.Video
            ) {
              attachRemoteVideo(track);
            }
          },
        );

        room.on(
          RoomEvent.TrackSubscriptionFailed,
          (
            trackSid,
            reason,
          ) => {
            console.error(
              "[FOCKIS LIVE VIEWER] VIDEO SUBSCRIPTION FAILED:",
              {
                trackSid,
                reason,
              },
            );
          },
        );

        room.on(
          RoomEvent.TrackUnsubscribed,
          (
            track,
          ) => {
            console.log(
              "[FOCKIS LIVE VIEWER] TRACK UNSUBSCRIBED:",
              track.kind,
            );

            if (
              track.kind !==
              Track.Kind.Video
            ) {
              return;
            }

            const video =
              videoElementRef.current;

            try {
              if (video) {
                track.detach(video);
              } else {
                track.detach();
              }
            } catch {
              // Ignore.
            }

            if (
              currentVideoTrackRef.current ===
              track
            ) {
              currentVideoTrackRef.current =
                null;
            }
          },
        );

        room.on(
          RoomEvent.ParticipantConnected,
          (participant) => {
            console.log(
              "[FOCKIS LIVE VIEWER] Participant connected:",
              participant.identity,
            );

            updateParticipants(room);
          },
        );

        room.on(
          RoomEvent.ParticipantDisconnected,
          (participant) => {
            console.log(
              "[FOCKIS LIVE VIEWER] Participant disconnected:",
              participant.identity,
            );

            updateParticipants(room);
          },
        );

        room.on(
          RoomEvent.Disconnected,
          () => {
            console.log(
              "[FOCKIS LIVE VIEWER] Disconnected from LiveKit",
            );

            if (
              roomRef.current ===
              room
            ) {
              roomRef.current =
                null;
            }

            if (mountedRef.current) {
              setConnected(false);
              setParticipants([]);
            }
          },
        );

        await room.connect(
          join.serverUrl,
          join.token,
          {
            autoSubscribe: true,
          },
        );

        console.log(
          "[FOCKIS LIVE VIEWER] CONNECTED:",
          {
            room: room.name,
            remoteParticipants:
              room.remoteParticipants.size,
          },
        );

        if (mountedRef.current) {
          setConnected(true);
        }

        updateParticipants(room);

        attachExistingTracks(room);

        for (const participant of room.remoteParticipants.values()) {
          console.log(
            "[FOCKIS LIVE VIEWER] Remote participant:",
            {
              identity:
                participant.identity,
              name:
                participant.name,
              tracks:
                participant.trackPublications.size,
            },
          );

          for (const publication of participant.trackPublications.values()) {
            console.log(
              "[FOCKIS LIVE VIEWER] Publication:",
              {
                kind:
                  publication.kind,
                trackSid:
                  publication.trackSid,
                subscribed:
                  publication.isSubscribed,
                hasTrack:
                  Boolean(
                    publication.track,
                  ),
              },
            );
          }
        }

        return join;
      },
      [
        attachExistingTracks,
        attachRemoteVideo,
        disconnectRoom,
        updateParticipants,
      ],
    );

  const loadStream =
    useCallback(async () => {
      if (!streamId) {
        setStream(null);
        setError(
          "No live stream was specified.",
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      await disconnectRoom();

      try {
        const data =
          await api.getSession(
            streamId,
          );

        // ====================================================================
        // DIAGNOSTIC LOG
        //
        // Shows exactly what the backend returned for every host-related
        // field, BEFORE any of the fallback logic below runs. If every one
        // of these prints as undefined, the API response itself is missing
        // the host data — that's a backend problem (the /live/:id endpoint
        // likely isn't populating the host relation), not something fixable
        // here in the frontend fallback chain.
        // ====================================================================

        console.log(
          "[FOCKIS LIVE VIEWER] RAW session data (host fields only):",
          {
            hostId: data.hostId,
            host: data.host,
            hostUsername: data.hostUsername,
            hostName: data.hostName,
            hostAvatar: data.hostAvatar,
          },
        );

        const hostUsername =
          typeof data.hostUsername ===
          "string"
            ? data.hostUsername.trim()
            : typeof data.host?.username ===
                "string"
              ? data.host.username.trim()
              : "";

        const hostName =
          typeof data.hostName ===
          "string"
            ? data.hostName.trim()
            : [
                data.host?.firstName,
                data.host?.lastName,
              ]
                .filter(
                  (value): value is string =>
                    typeof value ===
                    "string" &&
                    value.length > 0,
                )
                .join(" ")
                .trim();

        const username =
          hostUsername ||
          hostName ||
          "creator";

        const displayName =
          hostName ||
          hostUsername ||
          "Fockis Creator";

        const avatarUrl =
          typeof data.hostAvatar ===
          "string"
            ? data.hostAvatar
            : typeof data.host?.profilePicture ===
                "string"
              ? data.host.profilePicture
              : typeof data.host?.avatar ===
                  "string"
                ? data.host.avatar
                : undefined;

        const playbackUrl =
          typeof data.playbackUrl ===
          "string"
            ? data.playbackUrl
            : undefined;

        const streamUrl =
          typeof data.streamUrl ===
          "string"
            ? data.streamUrl
            : undefined;

        const normalized: LiveViewerStream =
          {
            id:
              typeof data.id ===
              "string"
                ? data.id
                : typeof data._id ===
                    "string"
                  ? data._id
                  : streamId,

            title:
              typeof data.title ===
              "string"
                ? data.title
                : "Live on Fockis",

            description:
              typeof data.description ===
              "string"
                ? data.description
                : "",

            username,

            displayName,

            avatarUrl,

            hostUsername:
              username,

            hostName:
              displayName,

            hostAvatar:
              avatarUrl,

            viewers:
              Number(
                data.viewerCount ??
                  data.currentViewers ??
                  0,
              ),

            likes:
              Number(
                data.likeCount ??
                  data.likes ??
                  0,
              ),

            status:
              data.status ===
              "ended"
                ? "ended"
                : data.status ===
                    "scheduled"
                  ? "scheduled"
                  : "live",

            roomName:
              typeof data.roomName ===
              "string"
                ? data.roomName
                : undefined,

            playbackUrl,

            streamUrl,

            serverUrl:
              typeof data.serverUrl ===
              "string"
                ? data.serverUrl
                : undefined,

            token:
              typeof data.token ===
              "string"
                ? data.token
                : undefined,
          };

        console.log(
          "[FOCKIS LIVE VIEWER] Stream:",
          normalized,
        );

        if (mountedRef.current) {
          setStream(normalized);
        }

        if (
          normalized.status !==
          "live"
        ) {
          setLoading(false);
          return;
        }

        await connectToLiveKit(
          normalized.id,
        );
      } catch (err) {
        console.error(
          "[FOCKIS LIVE VIEWER] Failed:",
          err,
        );

        await disconnectRoom();

        if (mountedRef.current) {
          setStream(null);
          setConnected(false);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to connect to the live stream.",
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, [
      streamId,
      connectToLiveKit,
      disconnectRoom,
    ]);

  const loadMessages =
    useCallback(async () => {
      if (!streamId) {
        return;
      }

      try {
        const response =
          await fetch(
            `${FOCKIS_API_URL}/live/public/${encodeURIComponent(
              streamId,
            )}/messages`,
            {
              headers: {
                Accept:
                  "application/json",
              },
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          Array.isArray(data)
        ) {
          if (mountedRef.current) {
            setMessages(data);
          }

          return;
        }

        if (
          Array.isArray(
            data?.messages,
          )
        ) {
          if (mountedRef.current) {
            setMessages(
              data.messages,
            );
          }
        }
      } catch {
        // Chat is optional.
      }
    }, [streamId]);

  useEffect(() => {
    void loadStream();
    void loadMessages();

    return () => {
      void disconnectRoom();
    };
  }, [
    loadStream,
    loadMessages,
    disconnectRoom,
  ]);

  useEffect(() => {
    if (!streamId) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void loadMessages();
        },
        10000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    streamId,
    loadMessages,
  ]);

  useEffect(() => {
    const video =
      videoElementRef.current;

    if (video) {
      video.muted = isMuted;

      if (
        currentVideoTrackRef.current
      ) {
        void video
          .play()
          .catch(() => {});
      }
    }
  }, [isMuted]);

  const toggleLike =
    useCallback(async () => {
      if (!stream) {
        return;
      }

      const nextLiked =
        !liked;

      setLiked(nextLiked);

      setStream((current) =>
        current
          ? {
              ...current,
              likes: Math.max(
                0,
                current.likes +
                  (nextLiked
                    ? 1
                    : -1),
              ),
            }
          : current,
      );

      try {
        await api.likeSession(
          stream.id,
        );
      } catch (error) {
        console.warn(
          "[FOCKIS LIVE VIEWER] Like failed:",
          error,
        );
      }
    }, [liked, stream]);

  const toggleFollow =
    useCallback(async () => {
      if (!stream) {
        return;
      }

      const nextFollowing =
        !isFollowing;

      setIsFollowing(
        nextFollowing,
      );

      try {
        const token =
          localStorage.getItem(
            "access_token",
          ) ??
          localStorage.getItem(
            "token",
          ) ??
          localStorage.getItem(
            "jwt",
          ) ??
          localStorage.getItem(
            "authToken",
          );

        await fetch(
          `${FOCKIS_API_URL}/live/${encodeURIComponent(
            stream.id,
          )}/follow`,
          {
            method:
              nextFollowing
                ? "POST"
                : "DELETE",
            headers: {
              Accept:
                "application/json",
              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),
            },
          },
        );
      } catch (error) {
        console.warn(
          "[FOCKIS LIVE VIEWER] Follow failed:",
          error,
        );
      }
    }, [isFollowing, stream]);

  const sendMessage =
    useCallback(
      async (message: string) => {
        const trimmed =
          message.trim();

        if (
          !trimmed ||
          !stream
        ) {
          return;
        }

        try {
          const token =
            localStorage.getItem(
              "access_token",
            ) ??
            localStorage.getItem(
              "token",
            ) ??
            localStorage.getItem(
              "jwt",
            ) ??
            localStorage.getItem(
              "authToken",
            );

          const response =
            await fetch(
              `${FOCKIS_API_URL}/live/public/${encodeURIComponent(
                stream.id,
              )}/messages`,
              {
                method:
                  "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Accept:
                    "application/json",
                  ...(token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {}),
                },
                body:
                  JSON.stringify({
                    message:
                      trimmed,
                  }),
              },
            );

          if (response.ok) {
            const data =
              await response.json();

            if (data) {
              const newMessage =
                data.message ??
                data;

              setMessages(
                (current) => [
                  ...current.slice(
                    -99,
                  ),
                  newMessage,
                ],
              );
            }

            return;
          }
        } catch {
          // Use local fallback.
        }

        setMessages(
          (current) => [
            ...current.slice(
              -99,
            ),
            {
              id:
                `local-${Date.now()}`,
              username:
                "you",
              displayName:
                "You",
              message:
                trimmed,
              createdAt:
                new Date().toISOString(),
            },
          ],
        );
      },
      [stream],
    );

  const shareStream =
    useCallback(async () => {
      if (!stream) {
        return;
      }

      const url =
        window.location.href;

      try {
        if (
          navigator.share
        ) {
          await navigator.share({
            title:
              stream.title,
            text:
              `Watch ${stream.displayName} live on Fockis`,
            url,
          });

          await api
            .shareSession(
              stream.id,
            )
            .catch(() => {});

          return;
        }

        if (
          navigator.clipboard
        ) {
          await navigator.clipboard.writeText(
            url,
          );
        }

        await api
          .shareSession(
            stream.id,
          )
          .catch(() => {});
      } catch {
        // User cancelled.
      }
    }, [stream]);

  return {
    stream,
    messages,
    participants,
    loading,
    error,
    connected,
    liked,
    isFollowing,
    isMuted,
    videoRef,
    setIsMuted,
    toggleLike,
    toggleFollow,
    sendMessage,
    shareStream,
    reload: loadStream,
  };
}