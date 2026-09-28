import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { api } from "../api";

import {
  initialScenes,
  streamInfoSeed,
} from "../data";

import type {
  Analytics,
  ChatMessage,
  ConnectionQuality,
  DeviceState,
  Guest,
  GuestLayout,
  PanelId,
  Phase,
  Product,
  SentGift,
  StreamInfo,
  Scene,
  SourceType,
  StudioSourceState,
} from "../types";

interface LiveGuestInvitation {
  id: string;
  streamId: string;
  hostId?: string;
  guestUserId?: string;
  status: "invited" | "accepted" | "declined" | "connected" | "removed" | "left";
  message?: string;
  invitedAt?: string | null;
  respondedAt?: string | null;
  connectedAt?: string | null;
  [key: string]: unknown;
}

export function useStudio() {
  // ==========================================================================
  // CORE STATE
  // ==========================================================================

  const [phase, setPhase] =
    useState<Phase>("setup");

  const [activePanel, setActivePanel] =
    useState<PanelId>(null);

  const [scenes, setScenes] =
    useState<Scene[]>(initialScenes);

  const [activeScene, setActiveScene] =
    useState<Scene | null>(
      initialScenes[0] ?? null,
    );

  // ==========================================================================
  // CURRENT USER
  // ==========================================================================

  const [currentUsername, setCurrentUsername] =
    useState("");

  const [currentAvatarUrl, setCurrentAvatarUrl] =
    useState("");

  // Real followers available for guest invitations.
  const [availableFollowers, setAvailableFollowers] =
    useState<Guest[]>([]);

  // ==========================================================================
  // DEVICES
  // ==========================================================================

  const [devices, setDevices] =
    useState<DeviceState>({
      camera: "unavailable",
      microphone: "unavailable",
      cameraEnabled: false,
      micEnabled: false,
      screenShareEnabled: false,
    });

  const [connection] =
    useState<ConnectionQuality>("excellent");

  // ==========================================================================
  // MEDIA
  // ==========================================================================

  const [cameraStream, setCameraStream] =
    useState<MediaStream | null>(null);

  const [mediaError, setMediaError] =
    useState<string | null>(null);

  // ==========================================================================
  // STUDIO SOURCES
  // ==========================================================================

  const [sourceState, setSourceState] =
    useState<StudioSourceState>({
      imageUrl: null,
      videoUrl: null,
      text: "",
      browserUrl: null,
      activeSource: null,
    });

  const sourceObjectUrlsRef =
    useRef<string[]>([]);

  const rememberObjectUrl = useCallback(
    (url: string) => {
      sourceObjectUrlsRef.current.push(url);
      return url;
    },
    [],
  );

  const revokeSourceUrl = useCallback((url: string | null) => {
    if (!url) return;

    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore invalid/already-revoked object URLs.
    }

    sourceObjectUrlsRef.current =
      sourceObjectUrlsRef.current.filter(
        (item) => item !== url,
      );
  }, []);

  const clearStudioSource = useCallback(
    (type?: SourceType) => {
      setSourceState((current) => {
        const shouldClear =
          !type ||
          current.activeSource === type;

        if (!shouldClear) {
          return current;
        }

        return {
          ...current,
          activeSource: null,
        };
      });
    },
    [],
  );

  const addImageSource = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const url = rememberObjectUrl(
        URL.createObjectURL(file),
      );

      setSourceState((current) => {
        if (current.imageUrl) {
          revokeSourceUrl(current.imageUrl);
        }

        return {
          ...current,
          imageUrl: url,
          activeSource: "image",
        };
      });
    };

    input.click();
  }, [rememberObjectUrl, revokeSourceUrl]);

  const addVideoSource = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const url = rememberObjectUrl(
        URL.createObjectURL(file),
      );

      setSourceState((current) => {
        if (current.videoUrl) {
          revokeSourceUrl(current.videoUrl);
        }

        return {
          ...current,
          videoUrl: url,
          activeSource: "video",
        };
      });
    };

    input.click();
  }, [rememberObjectUrl, revokeSourceUrl]);

  const addTextSource = useCallback(() => {
    const currentText = sourceState.text.trim();

    const value = window.prompt(
      "Text to display on your LIVE preview:",
      currentText || "Welcome to Fockis Live!",
    );

    if (value === null) {
      return;
    }

    const text = value.trim();

    if (!text) {
      setSourceState((current) => ({
        ...current,
        text: "",
        activeSource: null,
      }));
      return;
    }

    setSourceState((current) => ({
      ...current,
      text,
      activeSource: "text",
    }));
  }, [sourceState.text]);

  const addBrowserSource = useCallback(() => {
    const value = window.prompt(
      "Enter the webpage URL to show in the LIVE preview:",
      sourceState.browserUrl || "https://www.fockis.com",
    );

    if (value === null) {
      return;
    }

    let url = value.trim();

    if (!url) {
      setSourceState((current) => ({
        ...current,
        browserUrl: null,
        activeSource: null,
      }));
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch {
      setMediaError(
        "That browser source URL is not valid.",
      );
      return;
    }

    setSourceState((current) => ({
      ...current,
      browserUrl: url,
      activeSource: "browser",
    }));
  }, [sourceState.browserUrl]);

  useEffect(() => {
    return () => {
      for (const url of sourceObjectUrlsRef.current) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore cleanup errors.
        }
      }

      sourceObjectUrlsRef.current = [];
    };
  }, []);

  /**
   * This ref owns the actual camera/microphone MediaStream.
   *
   * Only this hook should stop this stream.
   */
  const mediaStreamRef =
    useRef<MediaStream | null>(null);

  /**
   * Screen sharing has its own stream.
   */
  const screenStreamRef =
    useRef<MediaStream | null>(null);

  /**
   * Prevent two simultaneous getUserMedia() calls.
   */
  const cameraRequestRef =
    useRef<Promise<MediaStream | null> | null>(null);

  /**
   * Used to invalidate an old request if the user explicitly stops camera.
   */
  const cameraGenerationRef =
    useRef(0);

  /**
   * Prevent the automatic initialization effect from repeatedly fighting
   * with React Strict Mode.
   */
  const cameraInitializedRef =
    useRef(false);

  /**
   * Track whether the hook is mounted.
   */
  const mountedRef =
    useRef(true);

  // ==========================================================================
  // LIVE SESSION
  // ==========================================================================

  const [sessionId, setSessionId] =
    useState<string | null>(null);

  const [liveKitToken, setLiveKitToken] =
    useState<string | null>(null);

  const [liveKitServerUrl, setLiveKitServerUrl] =
    useState<string | null>(null);

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  // ==========================================================================
  // CHAT
  // ==========================================================================

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);

  const [chatTab, setChatTab] =
    useState<
      "chat" | "questions" | "activity"
    >("chat");

  // ==========================================================================
  // GUESTS
  // ==========================================================================

  const [guests, setGuests] =
    useState<Guest[]>([]);

  const [guestLayout, setGuestLayout] =
    useState<GuestLayout>("solo");

  // Guest invitations received by this account. These are separate from
  // the host's active guest list so a user can accept an invitation before
  // publishing into the host's LIVE session.
  const [guestInvitations, setGuestInvitations] =
    useState<LiveGuestInvitation[]>([]);

  // When this browser accepts an invitation, this identifies the host LIVE
  // session that the guest publisher should join.
  const [activeGuestSessionId, setActiveGuestSessionId] =
    useState<string | null>(null);

  // ==========================================================================
  // PRODUCTS / GIFTS
  // ==========================================================================

  const [featuredProduct, setFeaturedProduct] =
    useState<Product | null>(null);

  const [giftFeed, setGiftFeed] =
    useState<SentGift[]>([]);

  // ==========================================================================
  // STREAM INFORMATION
  // ==========================================================================

  const [streamInfo, setStreamInfo] =
    useState<StreamInfo>({
      ...streamInfoSeed,
    });

  // ==========================================================================
  // MODALS
  // ==========================================================================

  const [
    showGoLiveModal,
    setShowGoLiveModal,
  ] = useState(false);

  const [
    showEndLiveModal,
    setShowEndLiveModal,
  ] = useState(false);

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  const [analytics, setAnalytics] =
    useState<Analytics>({
      currentViewers: 0,
      peakViewers: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      newFollowers: 0,
      giftRevenue: 0,
      totalRevenue: 0,
    });

  // ==========================================================================
  // LIVE INTERACTIONS
  // ==========================================================================

  const [hasLikedLive, setHasLikedLive] =
    useState(false);

  const [shareCount, setShareCount] =
    useState(0);

  const [followedFromStudio, setFollowedFromStudio] =
    useState(false);

  const [mutedUsernames, setMutedUsernames] =
    useState<string[]>([]);

  const [blockedUsernames, setBlockedUsernames] =
    useState<string[]>([]);

  // ==========================================================================
  // POLLING REFS
  // ==========================================================================

  const tickRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

  const chatPollRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

  const analyticsPollRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

  // ==========================================================================
  // MOUNT / UNMOUNT
  // ==========================================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ==========================================================================
  // AUTH
  // ==========================================================================

  const clearInvalidAuthToken =
    useCallback(() => {
      const tokenKeys = [
        "access_token",
        "token",
        "jwt",
        "authToken",
        "accessToken",
      ];

      for (const key of tokenKeys) {
        localStorage.removeItem(key);
      }

      console.warn(
        "[FOCKIS LIVE] Authentication token was invalid or expired.",
      );
    }, []);

  // ==========================================================================
  // PROFILE
  // ==========================================================================

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const profile =
          await api.getMyProfile();

        if (
          cancelled ||
          !profile
        ) {
          return;
        }

        const resolvedUsername =
          (typeof profile.username ===
            "string" &&
            profile.username.trim()) ||
          [
            profile.firstName,
            profile.lastName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

        if (resolvedUsername) {
          setCurrentUsername(
            resolvedUsername,
          );
        }

        const avatar =
          typeof profile.profilePicture ===
          "string"
            ? profile.profilePicture.trim()
            : "";

        if (avatar) {
          setCurrentAvatarUrl(
            avatar,
          );
        }

        // The current /users/me/profile response exposes followers as part
        // of the user document. Depending on the backend version, follower
        // entries can be populated user objects or plain Mongo IDs.
        // Resolve IDs through the existing /users/:id endpoint so the Guests
        // panel can show real Fockis users without changing the backend.
        const rawFollowers =
          (profile as Record<string, unknown>)
            .followers;

        if (Array.isArray(rawFollowers)) {
          const resolved = await Promise.all(
            rawFollowers
              .map((item) => {
                if (item && typeof item === "object") {
                  return item as Record<string, unknown>;
                }

                if (typeof item === "string" && item.trim()) {
                  return api.getUserById(item.trim())
                    .then((user) => user as Record<string, unknown>)
                    .catch((error) => {
                      console.warn(
                        "[FOCKIS LIVE] Failed to load follower:",
                        item,
                        error,
                      );
                      return null;
                    });
                }

                return null;
              }),
          );

          if (cancelled) {
            return;
          }

          const normalizedFollowers = resolved
            .filter(
              (item): item is Record<string, unknown> =>
                !!item,
            )
            .map((user) => {
              const id =
                String(user._id ?? user.id ?? "").trim();

              const username =
                String(user.username ?? "").trim();

              const displayName =
                String(
                  user.displayName ??
                  user.name ??
                  [user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ") ??
                  username,
                ).trim();

              const name =
                displayName ||
                username ||
                "Fockis User";

              if (!id || id === String(profile._id ?? profile.id ?? "")) {
                return null;
              }

              return {
                id,
                name,
                avatarTone: "signal",
                status: "connected",
              } as Guest;
            })
            .filter(
              (item): item is Guest =>
                !!item,
            );

          const uniqueFollowers = Array.from(
            new Map(
              normalizedFollowers.map((user) => [user.id, user]),
            ).values(),
          );

          setAvailableFollowers(uniqueFollowers);
        } else {
          setAvailableFollowers([]);
        }
      } catch (error) {
        console.warn(
          "[FOCKIS LIVE] Profile unavailable. Studio will continue without profile data.",
          error,
        );

        if (
          error instanceof Error &&
          /invalid|expired|unauthorized|401/i.test(
            error.message,
          )
        ) {
          clearInvalidAuthToken();
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [clearInvalidAuthToken]);

  // ==========================================================================
  // STOP MEDIA STREAM
  // ==========================================================================

  const stopMediaStream =
    useCallback(() => {
      /**
       * Invalidate any request currently resolving.
       */
      cameraGenerationRef.current += 1;

      const stream =
        mediaStreamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch {
              // Already stopped.
            }
          });
      }

      mediaStreamRef.current = null;

      setCameraStream(null);

      setDevices((current) => ({
        ...current,
        cameraEnabled: false,
        micEnabled: false,
      }));
    }, []);

  // ==========================================================================
  // STOP SCREEN SHARE
  // ==========================================================================

  const stopScreenShare =
    useCallback(() => {
      const stream =
        screenStreamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch {
              // Already stopped.
            }
          });
      }

      screenStreamRef.current = null;

      setDevices((current) => ({
        ...current,
        screenShareEnabled: false,
      }));
    }, []);

  // ==========================================================================
  // START CAMERA
  // ==========================================================================

  const startCamera =
    useCallback(async () => {
      // ----------------------------------------------------------------------
      // Browser support
      // ----------------------------------------------------------------------

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setDevices((current) => ({
          ...current,
          camera: "unavailable",
          microphone: "unavailable",
          cameraEnabled: false,
          micEnabled: false,
        }));

        setMediaError(
          "Camera access is not supported by this browser.",
        );

        return null;
      }

      // ----------------------------------------------------------------------
      // Reuse existing live stream.
      // ----------------------------------------------------------------------

      const existing =
        mediaStreamRef.current;

      if (existing) {
        const videoTracks =
          existing
            .getVideoTracks()
            .filter(
              (track) =>
                track.readyState === "live",
            );

        const audioTracks =
          existing
            .getAudioTracks()
            .filter(
              (track) =>
                track.readyState === "live",
            );

        if (
          videoTracks.length ||
          audioTracks.length
        ) {
          setCameraStream(existing);

          setDevices((current) => ({
            ...current,

            camera:
              videoTracks.length
                ? "connected"
                : "unavailable",

            microphone:
              audioTracks.length
                ? "connected"
                : "unavailable",

            cameraEnabled:
              videoTracks.some(
                (track) =>
                  track.enabled,
              ),

            micEnabled:
              audioTracks.some(
                (track) =>
                  track.enabled,
              ),
          }));

          return existing;
        }

        /**
         * Existing stream is dead.
         */
        mediaStreamRef.current = null;
      }

      // ----------------------------------------------------------------------
      // Reuse request already in progress.
      // ----------------------------------------------------------------------

      if (cameraRequestRef.current) {
        console.log(
          "[FOCKIS LIVE] Camera request already in progress. Reusing it.",
        );

        return cameraRequestRef.current;
      }

      setMediaError(null);

      const generation =
        cameraGenerationRef.current;

      const request =
        (async (): Promise<
          MediaStream | null
        > => {
          try {
            console.log(
              "[FOCKIS LIVE] Requesting camera and microphone...",
            );

            /**
             * Use a normal HD constraint rather than overly aggressive
             * hardware constraints.
             */
            const stream =
              await navigator.mediaDevices.getUserMedia(
                {
                  video: {
                    width: {
                      ideal: 1280,
                    },
                    height: {
                      ideal: 720,
                    },
                    frameRate: {
                      ideal: 30,
                      max: 30,
                    },
                    facingMode: "user",
                  },

                  audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                  },
                },
              );

            // ----------------------------------------------------------------
            // Request became stale while awaiting browser permission/device.
            // ----------------------------------------------------------------

            if (
              generation !==
              cameraGenerationRef.current
            ) {
              console.warn(
                "[FOCKIS LIVE] Ignoring stale camera stream.",
              );

              stream
                .getTracks()
                .forEach((track) =>
                  track.stop(),
                );

              return null;
            }

            if (!mountedRef.current) {
              stream
                .getTracks()
                .forEach((track) =>
                  track.stop(),
                );

              return null;
            }

            mediaStreamRef.current =
              stream;

            setCameraStream(stream);

            const hasVideo =
              stream.getVideoTracks()
                .some(
                  (track) =>
                    track.readyState ===
                    "live",
                );

            const hasAudio =
              stream.getAudioTracks()
                .some(
                  (track) =>
                    track.readyState ===
                    "live",
                );

            setDevices((current) => ({
              ...current,

              camera:
                hasVideo
                  ? "connected"
                  : "unavailable",

              microphone:
                hasAudio
                  ? "connected"
                  : "unavailable",

              cameraEnabled:
                hasVideo,

              micEnabled:
                hasAudio,
            }));

            console.log(
              "[FOCKIS LIVE] Camera and microphone connected.",
            );

            return stream;
          } catch (error) {
            const errorName =
              error instanceof DOMException
                ? error.name
                : "";

            console.error(
              "[FOCKIS LIVE] Failed to access camera:",
              error,
            );

            // --------------------------------------------------------------
            // Permission denied
            // --------------------------------------------------------------

            if (
              errorName ===
              "NotAllowedError"
            ) {
              setDevices((current) => ({
                ...current,
                camera:
                  "permission-denied",
                microphone:
                  "permission-denied",
                cameraEnabled: false,
                micEnabled: false,
              }));

              setMediaError(
                "Camera and microphone permission was denied. Allow camera and microphone access in Chrome and try again.",
              );

              return null;
            }

            // --------------------------------------------------------------
            // No camera/microphone
            // --------------------------------------------------------------

            if (
              errorName ===
              "NotFoundError"
            ) {
              setDevices((current) => ({
                ...current,
                camera: "unavailable",
                microphone: "unavailable",
                cameraEnabled: false,
                micEnabled: false,
              }));

              setMediaError(
                "No camera or microphone was found.",
              );

              return null;
            }

            // --------------------------------------------------------------
            // Device already in use.
            // --------------------------------------------------------------

            if (
              errorName ===
              "NotReadableError"
            ) {
              setDevices((current) => ({
                ...current,
                camera: "unavailable",
                microphone: "unavailable",
                cameraEnabled: false,
                micEnabled: false,
              }));

              setMediaError(
                "Your camera is currently being used by another application or browser tab. Close another Fockis Live tab, Camera, Zoom, Teams, OBS, Discord, or another camera preview, then click Camera On again.",
              );

              return null;
            }

            // --------------------------------------------------------------
            // Hardware/device initialization interruption.
            // --------------------------------------------------------------

            if (
              errorName ===
              "AbortError"
            ) {
              setDevices((current) => ({
                ...current,
                camera: "unavailable",
                microphone: "unavailable",
                cameraEnabled: false,
                micEnabled: false,
              }));

              setMediaError(
                "Camera initialization was interrupted. Please try again.",
              );

              return null;
            }

            // --------------------------------------------------------------
            // Security/context error.
            // --------------------------------------------------------------

            if (
              errorName ===
              "SecurityError"
            ) {
              setDevices((current) => ({
                ...current,
                camera: "unavailable",
                microphone: "unavailable",
                cameraEnabled: false,
                micEnabled: false,
              }));

              setMediaError(
                "The browser blocked camera access. Make sure this page is running on localhost or HTTPS and that camera permissions are enabled.",
              );

              return null;
            }

            // --------------------------------------------------------------
            // Generic error.
            // --------------------------------------------------------------

            setDevices((current) => ({
              ...current,
              camera: "unavailable",
              microphone: "unavailable",
              cameraEnabled: false,
              micEnabled: false,
            }));

            setMediaError(
              "Unable to access your camera or microphone.",
            );

            return null;
          } finally {
            /**
             * Only clear the request if this is still the active request.
             */
            cameraRequestRef.current = null;
          }
        })();

      cameraRequestRef.current =
        request;

      return request;
    }, []);

  // ==========================================================================
  // STOP CAMERA
  // ==========================================================================

  const stopCamera =
    useCallback(() => {
      stopMediaStream();
    }, [stopMediaStream]);

  // ==========================================================================
  // CAMERA INITIALIZATION
  //
  // IMPORTANT:
  // Do NOT automatically stop the camera from this effect's cleanup.
  //
  // React Strict Mode intentionally runs:
  //
  // mount -> effect -> cleanup -> effect
  //
  // in development.
  //
  // Stopping getUserMedia() during that cleanup can cause the second camera
  // initialization to race with the first one and produce:
  //
  // NotReadableError: Device in use
  // ==========================================================================

  useEffect(() => {
    if (cameraInitializedRef.current) {
      return;
    }

    cameraInitializedRef.current = true;

    void startCamera();

    /**
     * Intentionally no camera cleanup here.
     *
     * The stream is controlled by stopCamera(), end-live cleanup, and the
     * component/page lifecycle rather than the Strict Mode effect probe.
     */
  }, [startCamera]);

  // ==========================================================================
  // CAMERA TOGGLE
  // ==========================================================================

  const toggleCamera =
    useCallback(() => {
      const stream =
        mediaStreamRef.current;

      if (!stream) {
        void startCamera();
        return;
      }

      const tracks =
        stream.getVideoTracks();

      if (!tracks.length) {
        void startCamera();
        return;
      }

      const enabled =
        tracks.some(
          (track) =>
            track.enabled,
        );

      tracks.forEach((track) => {
        track.enabled = !enabled;
      });

      setDevices((current) => ({
        ...current,
        cameraEnabled: !enabled,
      }));
    }, [startCamera]);

  // ==========================================================================
  // MIC TOGGLE
  // ==========================================================================

  const toggleMic =
    useCallback(() => {
      const stream =
        mediaStreamRef.current;

      if (!stream) {
        void startCamera();
        return;
      }

      const tracks =
        stream.getAudioTracks();

      if (!tracks.length) {
        void startCamera();
        return;
      }

      const enabled =
        tracks.some(
          (track) =>
            track.enabled,
        );

      tracks.forEach((track) => {
        track.enabled = !enabled;
      });

      setDevices((current) => ({
        ...current,
        micEnabled: !enabled,
      }));
    }, [startCamera]);

  // ==========================================================================
  // SCREEN SHARE
  // ==========================================================================

  const toggleScreenShare =
    useCallback(async () => {
      if (
        !navigator.mediaDevices
          ?.getDisplayMedia
      ) {
        setMediaError(
          "Screen sharing is not supported by this browser.",
        );

        return;
      }

      if (
        screenStreamRef.current
      ) {
        stopScreenShare();
        return;
      }

      try {
        const screenStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: {
                frameRate: {
                  ideal: 30,
                  max: 30,
                },
              },
              audio: false,
            },
          );

        if (!mountedRef.current) {
          screenStream
            .getTracks()
            .forEach((track) =>
              track.stop(),
            );

          return;
        }

        screenStreamRef.current =
          screenStream;

        const track =
          screenStream.getVideoTracks()[0];

        if (track) {
          track.onended = () => {
            if (
              screenStreamRef.current ===
              screenStream
            ) {
              screenStreamRef.current =
                null;
            }

            setDevices((current) => ({
              ...current,
              screenShareEnabled: false,
            }));
          };
        }

        setDevices((current) => ({
          ...current,
          screenShareEnabled: true,
        }));

        setMediaError(null);
      } catch (error) {
        console.warn(
          "[FOCKIS LIVE] Screen share cancelled/failed:",
          error,
        );
      }
    }, [stopScreenShare]);

  // ==========================================================================
  // SCENES
  // ==========================================================================

  const addScene =
    useCallback(() => {
      setScenes((current) => {
        const newScene: Scene = {
          id: `scene-${Date.now()}`,
          name: `New Scene ${
            current.length + 1
          }`,
          thumbnailTone: "camera",
        };

        setActiveScene(newScene);

        return [
          ...current,
          newScene,
        ];
      });
    }, []);

  /**
   * Select a real Studio scene.
   *
   * Screen Share is the only scene that needs to acquire a browser media
   * stream. Leaving Screen Share releases that stream again. The other
   * built-in scenes are presentation/layout states rendered by Stage.
   */
  const selectScene =
    useCallback(
      (scene: Scene) => {
        setActiveScene(scene);

        const normalizedName =
          scene.name.trim().toLowerCase();

        const isScreenShareScene =
          normalizedName.includes("screen share") ||
          normalizedName.includes("screen");

        if (isScreenShareScene) {
          if (!screenStreamRef.current) {
            void (async () => {
              await toggleScreenShare();
            })();
          }

          return;
        }

        if (screenStreamRef.current) {
          stopScreenShare();
        }
      },
      [stopScreenShare, toggleScreenShare],
    );

  // ==========================================================================
  // RESET ANALYTICS
  // ==========================================================================

  const resetAnalytics =
    useCallback(() => {
      setAnalytics({
        currentViewers: 0,
        peakViewers: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        newFollowers: 0,
        giftRevenue: 0,
        totalRevenue: 0,
      });
    }, []);

  // ==========================================================================
  // CHAT
  // ==========================================================================

  const loadChatMessages =
    useCallback(
      async (id: string) => {
        try {
          const messages =
            await api.getChatMessages(id);

          if (
            Array.isArray(messages)
          ) {
            setChatMessages(messages);
          }
        } catch (error) {
          console.warn(
            "[FOCKIS LIVE] Chat unavailable:",
            error,
          );
        }
      },
      [],
    );

  // ==========================================================================
  // TIMER
  // ==========================================================================

  useEffect(() => {
    if (phase !== "live") {
      if (tickRef.current) {
        clearInterval(
          tickRef.current,
        );

        tickRef.current = null;
      }

      return;
    }

    tickRef.current =
      setInterval(() => {
        setElapsedSeconds(
          (seconds) =>
            seconds + 1,
        );
      }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(
          tickRef.current,
        );

        tickRef.current = null;
      }
    };
  }, [phase]);

  // ==========================================================================
  // CHAT POLLING
  // ==========================================================================

  useEffect(() => {
    if (
      phase !== "live" ||
      !sessionId
    ) {
      if (chatPollRef.current) {
        clearInterval(
          chatPollRef.current,
        );

        chatPollRef.current = null;
      }

      return;
    }

    void loadChatMessages(sessionId);

    chatPollRef.current =
      setInterval(() => {
        void loadChatMessages(sessionId);
      }, 2500);

    return () => {
      if (chatPollRef.current) {
        clearInterval(
          chatPollRef.current,
        );

        chatPollRef.current = null;
      }
    };
  }, [
    phase,
    sessionId,
    loadChatMessages,
  ]);

  // ==========================================================================
  // REFRESH ANALYTICS
  // ==========================================================================

  const refreshSession =
    useCallback(
      async (id: string) => {
        try {
          const stream =
            await api.getSession(id);

          setAnalytics(
            (current) => ({
              currentViewers:
                Number(
                  stream.currentViewers ??
                    stream.viewerCount ??
                    0,
                ),

              peakViewers:
                Number(
                  stream.peakViewers ??
                    stream.peakViewerCount ??
                    current.peakViewers ??
                    0,
                ),

              likes:
                Number(
                  stream.likes ??
                    stream.likeCount ??
                    0,
                ),

              comments:
                Number(
                  stream.comments ??
                    stream.commentCount ??
                    current.comments ??
                    0,
                ),

              shares:
                Number(
                  stream.shares ??
                    stream.shareCount ??
                    0,
                ),

              newFollowers:
                Number(
                  stream.newFollowers ??
                    0,
                ),

              giftRevenue:
                current.giftRevenue ?? 0,

              totalRevenue:
                current.totalRevenue ?? 0,
            }),
          );
        } catch (error) {
          console.warn(
            "[FOCKIS LIVE] Analytics refresh unavailable:",
            error,
          );
        }
      },
      [],
    );

  // ==========================================================================
  // ANALYTICS POLLING
  // ==========================================================================

  useEffect(() => {
    if (
      phase !== "live" ||
      !sessionId
    ) {
      if (
        analyticsPollRef.current
      ) {
        clearInterval(
          analyticsPollRef.current,
        );

        analyticsPollRef.current =
          null;
      }

      return;
    }

    void refreshSession(sessionId);

    analyticsPollRef.current =
      setInterval(() => {
        void refreshSession(sessionId);
      }, 5000);

    return () => {
      if (
        analyticsPollRef.current
      ) {
        clearInterval(
          analyticsPollRef.current,
        );

        analyticsPollRef.current =
          null;
      }
    };
  }, [
    phase,
    sessionId,
    refreshSession,
  ]);

  // ==========================================================================
  // LIVE INTERACTIONS
  // ==========================================================================

  const likeLive = useCallback(async () => {
    if (!sessionId || phase !== "live" || hasLikedLive) {
      return;
    }

    setHasLikedLive(true);

    // Give the UI immediate feedback. The backend remains the source of truth
    // and analytics polling will reconcile the displayed total.
    setAnalytics((current) => ({
      ...current,
      likes: current.likes + 1,
    }));

    try {
      const result = await api.likeSession(sessionId, 1);

      if (typeof result?.likeCount === "number") {
        setAnalytics((current) => ({
          ...current,
          likes: result.likeCount,
        }));
      }
    } catch (error) {
      setHasLikedLive(false);
      setAnalytics((current) => ({
        ...current,
        likes: Math.max(0, current.likes - 1),
      }));

      console.warn(
        "[FOCKIS LIVE] Failed to like LIVE:",
        error,
      );
    }
  }, [
    hasLikedLive,
    phase,
    sessionId,
  ]);

  const shareLive = useCallback(async () => {
    if (!sessionId || phase !== "live") {
      return;
    }

    try {
      const result = await api.shareSession(sessionId);

      if (typeof result?.shareCount === "number") {
        setShareCount(result.shareCount);
        setAnalytics((current) => ({
          ...current,
          shares: result.shareCount,
        }));
      } else {
        setShareCount((current) => current + 1);
        setAnalytics((current) => ({
          ...current,
          shares: current.shares + 1,
        }));
      }

      const shareUrl =
        `${window.location.origin}/live/${sessionId}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title:
              streamInfo.title ||
              "Fockis Live",
            text:
              streamInfo.description ||
              `Watch ${currentUsername || "this creator"} live on Fockis.`,
            url: shareUrl,
          });
        } catch (shareError) {
          // Closing the native share sheet is not an error.
          if (
            shareError instanceof DOMException &&
            shareError.name === "AbortError"
          ) {
            return;
          }

          console.warn(
            "[FOCKIS LIVE] Native share failed:",
            shareError,
          );
        }
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.warn(
        "[FOCKIS LIVE] Failed to share LIVE:",
        error,
      );
    }
  }, [
    currentUsername,
    phase,
    sessionId,
    streamInfo.description,
    streamInfo.title,
  ]);

  const followCreator = useCallback(() => {
    // The studio preview represents the signed-in creator. Following yourself
    // is not a valid backend action, so keep the existing button functional
    // without sending an invalid request.
    setFollowedFromStudio(true);
  }, []);

  const muteUser = useCallback((username: string) => {
    const normalized = username.trim();

    if (!normalized) {
      return;
    }

    setMutedUsernames((current) =>
      current.includes(normalized)
        ? current
        : [...current, normalized],
    );
  }, []);

  const unmuteUser = useCallback((username: string) => {
    const normalized = username.trim();

    setMutedUsernames((current) =>
      current.filter((item) => item !== normalized),
    );
  }, []);

  const blockUser = useCallback((username: string) => {
    const normalized = username.trim();

    if (!normalized) {
      return;
    }

    setBlockedUsernames((current) =>
      current.includes(normalized)
        ? current
        : [...current, normalized],
    );

    setChatMessages((current) =>
      current.filter(
        (message) => message.username !== normalized,
      ),
    );
  }, []);

  const unblockUser = useCallback((username: string) => {
    const normalized = username.trim();

    setBlockedUsernames((current) =>
      current.filter((item) => item !== normalized),
    );
  }, []);

  // ==========================================================================
  // GO LIVE
  // ==========================================================================

  const openGoLiveModal =
    useCallback(() => {
      setShowGoLiveModal(true);
    }, []);

  const closeGoLiveModal =
    useCallback(() => {
      setShowGoLiveModal(false);
    }, []);

  const confirmGoLive =
    useCallback(async () => {
      const title =
        String(
          streamInfo.title ?? "",
        ).trim();

      if (!title) {
        setStreamInfo((current) => ({
          ...current,
          title:
            current.title?.trim() ||
            "My Fockis Live Stream",
        }));

        setShowGoLiveModal(true);

        return;
      }

      const payload: StreamInfo = {
        ...streamInfo,

        title,

        description:
          streamInfo.description?.trim() ||
          "",

        category:
          streamInfo.category?.trim() ||
          "",

        thumbnailUrl:
          streamInfo.thumbnailUrl?.trim() ||
          "",
      };

      setShowGoLiveModal(false);
      setPhase("starting");

      try {
        // ------------------------------------------------------------------
        // Make sure camera exists.
        // ------------------------------------------------------------------

        let stream =
          mediaStreamRef.current;

        if (!stream) {
          stream =
            await startCamera();
        }

        if (!stream) {
          throw new Error(
            "Camera and microphone access is required to start LIVE.",
          );
        }

        // ------------------------------------------------------------------
        // CREATE BACKEND LIVE STREAM
        // ------------------------------------------------------------------

        const session =
          await api.startSession(payload);

        const id =
          session._id ??
          session.id;

        if (!id) {
          throw new Error(
            "LIVE stream did not return an ID.",
          );
        }

        // ------------------------------------------------------------------
        // JOIN LIVEKIT
        // ------------------------------------------------------------------

        const join =
          await api.joinSession(id);

        if (
          !join.token ||
          !join.serverUrl
        ) {
          throw new Error(
            "LIVE backend did not return LiveKit credentials.",
          );
        }

        setSessionId(id);
        setActiveGuestSessionId(null);

        setLiveKitToken(
          join.token,
        );

        setLiveKitServerUrl(
          join.serverUrl,
        );

        setChatMessages([]);
        setGiftFeed([]);
        setGuests([]);
        setFeaturedProduct(null);
        setGuestLayout("solo");
        setElapsedSeconds(0);

        resetAnalytics();

        setPhase("live");

        window.dispatchEvent(
          new CustomEvent(
            "fockis:live-started",
            {
              detail: {
                sessionId: id,
              },
            },
          ),
        );

        window.dispatchEvent(
          new CustomEvent(
            "fockis:live-updated",
            {
              detail: {
                sessionId: id,
                status: "live",
              },
            },
          ),
        );
      } catch (error) {
        console.error(
          "[FOCKIS LIVE] Unable to start LIVE:",
          error,
        );

        setSessionId(null);
        setLiveKitToken(null);
        setLiveKitServerUrl(null);
        setActiveGuestSessionId(null);

        setPhase("setup");
      }
    }, [
      streamInfo,
      resetAnalytics,
      startCamera,
    ]);

  // ==========================================================================
  // END LIVE
  // ==========================================================================

  const openEndLiveModal =
    useCallback(() => {
      if (phase !== "live") {
        return;
      }

      setShowEndLiveModal(true);
    }, [phase]);

  const closeEndLiveModal =
    useCallback(() => {
      setShowEndLiveModal(false);
    }, []);

  const confirmEndLive =
    useCallback(async () => {
      setShowEndLiveModal(false);

      if (!sessionId) {
        stopMediaStream();
        stopScreenShare();

        setLiveKitToken(null);
        setLiveKitServerUrl(null);

        setPhase("setup");

        return;
      }

      const endedSessionId =
        sessionId;

      setPhase("ending");

      try {
        await api.endSession(
          endedSessionId,
        );

        console.log(
          "[FOCKIS LIVE] LIVE session ended successfully:",
          endedSessionId,
        );

        window.dispatchEvent(
          new CustomEvent(
            "fockis:live-ended",
            {
              detail: {
                sessionId:
                  endedSessionId,
                status: "ended",
              },
            },
          ),
        );

        window.dispatchEvent(
          new CustomEvent(
            "fockis:live-updated",
            {
              detail: {
                sessionId:
                  endedSessionId,
                status: "ended",
              },
            },
          ),
        );
      } catch (error) {
        console.error(
          "[FOCKIS LIVE] Failed to end LIVE:",
          error,
        );

        window.dispatchEvent(
          new CustomEvent(
            "fockis:live-ended",
            {
              detail: {
                sessionId:
                  endedSessionId,
                status: "ended",
              },
            },
          ),
        );
      } finally {
        stopMediaStream();
        stopScreenShare();

        setLiveKitToken(null);
        setLiveKitServerUrl(null);
        setActiveGuestSessionId(null);

        setAnalytics((current) => ({
          ...current,
          currentViewers: 0,
        }));

        window.setTimeout(() => {
          setPhase("ended");
        }, 900);
      }
    }, [
      sessionId,
      stopMediaStream,
      stopScreenShare,
    ]);

  // ==========================================================================
  // RESET AFTER ENDED
  // ==========================================================================

  const backToDashboardReset =
    useCallback(() => {
      stopMediaStream();
      stopScreenShare();

      setPhase("setup");

      setElapsedSeconds(0);

      setGiftFeed([]);

      setFeaturedProduct(null);

      setSourceState((current) => ({
        ...current,
        activeSource: null,
      }));

      setChatMessages([]);

      setSessionId(null);
      setActiveGuestSessionId(null);

      setLiveKitToken(null);

      setLiveKitServerUrl(null);

      setGuests([]);
      setGuestInvitations([]);

      setGuestLayout("solo");

      setActivePanel(null);

      setActiveScene(
        initialScenes[0] ?? null,
      );

      setDevices((current) => ({
        ...current,
        cameraEnabled: false,
        micEnabled: false,
        screenShareEnabled: false,
      }));

      resetAnalytics();

      window.dispatchEvent(
        new CustomEvent(
          "fockis:live-updated",
          {
            detail: {
              status: "setup",
            },
          },
        ),
      );
    }, [
      resetAnalytics,
      stopMediaStream,
      stopScreenShare,
    ]);

  // ==========================================================================
  // GUESTS
  // ==========================================================================

  const inviteGuest =
    useCallback((guest: Guest) => {
      setGuests((current) => {
        if (
          current.some(
            (item) =>
              item.id === guest.id,
          )
        ) {
          return current;
        }

        return [
          ...current,
          {
            ...guest,
            status: "connected",
          },
        ];
      });

      setGuestLayout((layout) =>
        layout === "solo"
          ? "side-by-side"
          : layout,
      );
    }, []);

  const removeGuest =
    useCallback((id: string) => {
      setGuests((current) => {
        const next =
          current.filter(
            (guest) =>
              guest.id !== id,
          );

        if (!next.length) {
          setGuestLayout("solo");
        }

        return next;
      });
    }, []);

  const toggleMuteGuest =
    useCallback((id: string) => {
      setGuests((current) =>
        current.map((guest) =>
          guest.id === id
            ? {
                ...guest,
                status:
                  guest.status ===
                  "muted"
                    ? "connected"
                    : "muted",
              }
            : guest,
        ),
      );
    }, []);

  // ==========================================================================
  // GUEST INVITATIONS
  // ==========================================================================

  const refreshGuestInvitations = useCallback(async () => {
    try {
      const invitations = await api.getGuestInvitations();

      if (!mountedRef.current || !Array.isArray(invitations)) {
        return;
      }

      setGuestInvitations(
        invitations.filter(
          (item: LiveGuestInvitation) =>
            item.status === "invited",
        ),
      );
    } catch (error) {
      // Invitations are optional studio data. Do not break the LIVE UI if
      // the endpoint is unavailable or the user is not authenticated yet.
      console.warn(
        "[FOCKIS LIVE] Failed to refresh guest invitations:",
        error,
      );
    }
  }, []);

  const acceptGuestInvitation = useCallback(
    async (invitation: LiveGuestInvitation) => {
      try {
        const accepted =
          await api.respondToGuestInvitation(
            invitation.id,
            "accepted",
          );

        setGuestInvitations((current) =>
          current.filter(
            (item) => item.id !== invitation.id,
          ),
        );

        const guestStreamId =
          String(invitation.streamId || "").trim();

        setActiveGuestSessionId(
          guestStreamId || null,
        );

        /*
         * An accepted invitation means this browser is joining an existing
         * LIVE as a guest. It must not create a second LIVE session.
         */
        if (guestStreamId) {
          setSessionId(guestStreamId);
          setPhase("live");
          setElapsedSeconds(0);
          setMediaError(null);
        }

        return accepted;
      } catch (error) {
        console.error(
          "[FOCKIS LIVE] Failed to accept guest invitation:",
          error,
        );
        throw error;
      }
    },
    [],
  );

  const declineGuestInvitation = useCallback(
    async (invitation: LiveGuestInvitation) => {
      try {
        const declined =
          await api.respondToGuestInvitation(
            invitation.id,
            "declined",
          );

        setGuestInvitations((current) =>
          current.filter(
            (item) => item.id !== invitation.id,
          ),
        );

        return declined;
      } catch (error) {
        console.error(
          "[FOCKIS LIVE] Failed to decline guest invitation:",
          error,
        );
        throw error;
      }
    },
    [],
  );

  useEffect(() => {
    void refreshGuestInvitations();

    const interval = window.setInterval(() => {
      void refreshGuestInvitations();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshGuestInvitations]);

  // ==========================================================================
  // GIFTS
  // ==========================================================================

  const sendGift =
    useCallback(
      (
        label: string,
        icon: string,
      ) => {
        const trimmedLabel = label.trim();

        if (!trimmedLabel) {
          return;
        }

        const gift: SentGift = {
          id:
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `gift-${Date.now()}`,
          username:
            currentUsername || "You",
          giftLabel: trimmedLabel,
          giftIcon: icon,
          timestamp: Date.now(),
        };

        setGiftFeed((current) => [
          ...current,
          gift,
        ].slice(-20));

        // Gift monetization is not exposed by the current live API, so this
        // intentionally updates the local studio feed only.
      },
      [currentUsername],
    );

  // ==========================================================================
  // CHAT SEND
  // ==========================================================================

  const sendChatMessage =
    useCallback(
      async (text: string) => {
        const trimmed =
          text.trim();

        if (
          !trimmed ||
          !sessionId ||
          phase !== "live"
        ) {
          return;
        }

        try {
          const message: ChatMessage =
            {
              id: crypto.randomUUID(),

              username:
                currentUsername ||
                "you",

              avatarTone:
                "signal",

              message:
                trimmed,

              timestamp:
                "now",

              isModerator:
                true,
            };

          const saved =
            await api.postChatMessage(
              sessionId,
              message,
            );

          setChatMessages(
            (current) => [
              ...current,
              saved,
            ],
          );
        } catch (error) {
          console.error(
            "[FOCKIS LIVE] Failed to send chat:",
            error,
          );
        }
      },
      [
        sessionId,
        currentUsername,
        phase,
      ],
    );

  // ==========================================================================
  // MODERATION
  // ==========================================================================

  const pinMessage =
    useCallback((id: string) => {
      setChatMessages(
        (current) =>
          current.map(
            (message) =>
              message.id === id
                ? {
                    ...message,
                    isPinned:
                      !message.isPinned,
                  }
                : message,
          ),
      );
    }, []);

  const deleteMessage =
    useCallback((id: string) => {
      setChatMessages(
        (current) =>
          current.filter(
            (message) =>
              message.id !== id,
          ),
      );
    }, []);

  // ==========================================================================
  // FOLLOWERS
  // ==========================================================================


  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    phase,
    setPhase,

    activePanel,
    setActivePanel,

    activeScene,
    setActiveScene,
    selectScene,

    scenes,
    setScenes,
    addScene,

    currentUsername,
    currentAvatarUrl,

    devices,
    cameraStream,
    screenStream: screenStreamRef.current,
    mediaError,

    sourceState,
    addImageSource,
    addVideoSource,
    addTextSource,
    addBrowserSource,
    clearStudioSource,

    startCamera,
    stopCamera,
    toggleMic,
    toggleCamera,
    toggleScreenShare,

    connection,

    elapsedSeconds,

    sessionId,

    liveKitToken,
    liveKitServerUrl,

    chatMessages,
    chatTab,
    setChatTab,

    sendChatMessage,
    pinMessage,
    deleteMessage,

    guests,
    guestLayout,
    setGuestLayout,
    inviteGuest,
    removeGuest,
    toggleMuteGuest,
    availableFollowers,
    guestInvitations,
    acceptGuestInvitation,
    declineGuestInvitation,
    activeGuestSessionId,

    featuredProduct,

    featureProduct:
      setFeaturedProduct,

    unfeatureProduct: () =>
      setFeaturedProduct(null),

    giftFeed,
    sendGift,

    streamInfo,
    setStreamInfo,

    showGoLiveModal,
    openGoLiveModal,
    closeGoLiveModal,
    confirmGoLive,

    showEndLiveModal,
    openEndLiveModal,
    closeEndLiveModal,
    confirmEndLive,

    analytics,

    backToDashboardReset,
  };
}

export type StudioState =
  ReturnType<typeof useStudio>;