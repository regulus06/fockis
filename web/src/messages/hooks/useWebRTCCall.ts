import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  messageSocket,
  type WebRTCAnswerPayload,
  type WebRTCICECandidatePayload,
  type WebRTCOfferPayload,
} from "../services/messageSocket";

import type {
  Call,
  CallType,
} from "../store/callStore";

interface UseWebRTCCallOptions {
  call: Call | null;
  enabled?: boolean;
}

interface UseWebRTCCallResult {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  cleanup: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ],
};

function getCurrentUserId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const directKeys = [
    "userId",
    "user_id",
    "currentUserId",
    "current_user_id",
  ];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);

    if (value?.trim()) {
      return value.trim();
    }
  }

  const userKeys = [
    "user",
    "currentUser",
    "authUser",
    "current_user",
  ];

  for (const key of userKeys) {
    const value = localStorage.getItem(key);

    if (!value) {
      continue;
    }

    try {
      const parsed = JSON.parse(value);

      const id =
        parsed?.id ??
        parsed?._id ??
        parsed?.userId ??
        parsed?.user_id ??
        parsed?.sub;

      if (id) {
        return String(id);
      }
    } catch {
      // Ignore invalid JSON.
    }
  }

  return "";
}

function getTargetUserId(
  call: Call,
): string {
  const currentUserId =
    getCurrentUserId();

  if (
    currentUserId &&
    call.callerId === currentUserId
  ) {
    return call.receiverId || "";
  }

  if (
    currentUserId &&
    call.receiverId === currentUserId
  ) {
    return call.callerId || "";
  }

  return "";
}

export function useWebRTCCall({
  call,
  enabled = true,
}: UseWebRTCCallOptions): UseWebRTCCallResult {
  const [localStream, setLocalStream] =
    useState<MediaStream | null>(null);

  const [remoteStream, setRemoteStream] =
    useState<MediaStream | null>(null);

  const [isConnected, setIsConnected] =
    useState(false);

  const [isConnecting, setIsConnecting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [isMuted, setIsMuted] =
    useState(false);

  const [isCameraOff, setIsCameraOff] =
    useState(false);

  const peerConnectionRef =
    useRef<RTCPeerConnection | null>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const remoteStreamRef =
    useRef<MediaStream | null>(null);

  const pendingCandidatesRef =
    useRef<RTCIceCandidateInit[]>([]);

  const startedCallIdRef =
    useRef<string | null>(null);

  const mountedRef =
    useRef(false);

  const callRef =
    useRef<Call | null>(call);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  const stopStream = useCallback(
    (stream: MediaStream | null) => {
      if (!stream) {
        return;
      }

      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore already stopped tracks.
        }
      }
    },
    [],
  );

  const cleanup = useCallback(() => {
    console.log(
      "[WebRTC] Cleaning up call resources.",
    );

    const peerConnection =
      peerConnectionRef.current;

    if (peerConnection) {
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange =
        null;
      peerConnection.oniceconnectionstatechange =
        null;

      try {
        peerConnection.close();
      } catch {
        // Ignore already closed peer connections.
      }
    }

    peerConnectionRef.current = null;

    stopStream(
      localStreamRef.current,
    );

    stopStream(
      remoteStreamRef.current,
    );

    localStreamRef.current = null;
    remoteStreamRef.current = null;

    pendingCandidatesRef.current = [];
    startedCallIdRef.current = null;

    if (mountedRef.current) {
      setLocalStream(null);
      setRemoteStream(null);
      setIsConnected(false);
      setIsConnecting(false);
      setIsMuted(false);
      setIsCameraOff(false);
    }
  }, [stopStream]);

  const addPendingIceCandidates =
    useCallback(async () => {
      const peerConnection =
        peerConnectionRef.current;

      if (!peerConnection) {
        return;
      }

      if (
        !peerConnection.remoteDescription
      ) {
        return;
      }

      const pending =
        pendingCandidatesRef.current;

      if (pending.length === 0) {
        return;
      }

      pendingCandidatesRef.current = [];

      console.log(
        "[WebRTC] Applying queued ICE candidates:",
        pending.length,
      );

      for (const candidate of pending) {
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate),
          );
        } catch (candidateError) {
          console.warn(
            "[WebRTC] Failed to apply queued ICE candidate:",
            candidateError,
          );
        }
      }
    }, []);

  const createPeerConnection =
    useCallback(
      (
        currentCall: Call,
        stream: MediaStream,
      ): RTCPeerConnection => {
        console.log(
          "[WebRTC] Creating peer connection:",
          {
            callId: currentCall.id,
            type: currentCall.type,
          },
        );

        const peerConnection =
          new RTCPeerConnection(
            ICE_SERVERS,
          );

        peerConnectionRef.current =
          peerConnection;

        /*
         * Add local microphone/camera tracks.
         */
        for (const track of stream.getTracks()) {
          console.log(
            "[WebRTC] Adding local track:",
            track.kind,
          );

          peerConnection.addTrack(
            track,
            stream,
          );
        }

        /*
         * Send ICE candidates to the other participant.
         */
        peerConnection.onicecandidate =
          (event) => {
            if (!event.candidate) {
              return;
            }

            const activeCall =
              callRef.current;

            if (!activeCall?.id) {
              return;
            }

            const targetUserId =
              getTargetUserId(
                activeCall,
              );

            if (!targetUserId) {
              console.warn(
                "[WebRTC] Cannot send ICE candidate. Target user is missing.",
              );
              return;
            }

            console.log(
              "[WebRTC] Sending ICE candidate:",
              {
                callId:
                  activeCall.id,
                targetUserId,
              },
            );

            messageSocket.sendWebRTCICECandidate(
              activeCall.id,
              targetUserId,
              event.candidate.toJSON(),
            );
          };

        /*
         * Receive remote microphone/camera tracks.
         */
        peerConnection.ontrack =
          (event) => {
            console.log(
              "[WebRTC] Remote track received:",
              {
                kind: event.track.kind,
                id: event.track.id,
                streams:
                  event.streams.length,
              },
            );

            let stream =
              event.streams[0];

            if (!stream) {
              stream =
                remoteStreamRef.current ||
                new MediaStream();

              if (
                !stream
                  .getTracks()
                  .some(
                    (track) =>
                      track.id ===
                      event.track.id,
                  )
              ) {
                stream.addTrack(
                  event.track,
                );
              }
            }

            remoteStreamRef.current =
              stream;

            if (mountedRef.current) {
              setRemoteStream(stream);
            }

            /*
             * Make sure the browser knows the
             * remote track is expected to continue.
             */
            event.track.onended = () => {
              console.log(
                "[WebRTC] Remote track ended:",
                event.track.kind,
              );
            };

            event.track.onmute = () => {
              console.log(
                "[WebRTC] Remote track muted:",
                event.track.kind,
              );
            };

            event.track.onunmute = () => {
              console.log(
                "[WebRTC] Remote track unmuted:",
                event.track.kind,
              );
            };
          };

        peerConnection.onconnectionstatechange =
          () => {
            const state =
              peerConnection.connectionState;

            console.log(
              "[WebRTC] Connection state:",
              state,
            );

            if (!mountedRef.current) {
              return;
            }

            switch (state) {
              case "new":
                setIsConnecting(true);
                break;

              case "connecting":
                setIsConnecting(true);
                break;

              case "connected":
                setIsConnecting(false);
                setIsConnected(true);
                setError(null);

                console.log(
                  "[WebRTC] Peer connection established.",
                );
                break;

              case "disconnected":
                setIsConnecting(false);
                setIsConnected(false);

                console.warn(
                  "[WebRTC] Peer connection disconnected.",
                );
                break;

              case "failed":
                setIsConnecting(false);
                setIsConnected(false);

                setError(
                  "The call connection failed.",
                );

                console.error(
                  "[WebRTC] Peer connection failed.",
                );
                break;

              case "closed":
                setIsConnecting(false);
                setIsConnected(false);
                break;

              default:
                break;
            }
          };

        peerConnection.oniceconnectionstatechange =
          () => {
            console.log(
              "[WebRTC] ICE connection state:",
              peerConnection.iceConnectionState,
            );

            if (
              peerConnection.iceConnectionState ===
              "failed"
            ) {
              console.warn(
                "[WebRTC] ICE negotiation failed.",
              );
            }
          };

        return peerConnection;
      },
      [],
    );

  const getMedia =
    useCallback(
      async (
        type: CallType,
      ): Promise<MediaStream> => {
        if (
          typeof navigator ===
            "undefined" ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          throw new Error(
            "Your browser does not support microphone or camera access.",
          );
        }

        const constraints: MediaStreamConstraints =
          type === "video"
            ? {
                audio: true,
                video: {
                  width: {
                    ideal: 1280,
                  },
                  height: {
                    ideal: 720,
                  },
                  facingMode:
                    "user",
                },
              }
            : {
                audio: true,
                video: false,
              };

        console.log(
          "[WebRTC] Requesting media:",
          constraints,
        );

        try {
          const stream =
            await navigator.mediaDevices.getUserMedia(
              constraints,
            );

          console.log(
            "[WebRTC] Media access granted:",
            {
              audioTracks:
                stream.getAudioTracks()
                  .length,
              videoTracks:
                stream.getVideoTracks()
                  .length,
            },
          );

          return stream;
        } catch (mediaError: any) {
          console.error(
            "[WebRTC] getUserMedia failed:",
            mediaError,
          );

          switch (
            mediaError?.name
          ) {
            case "NotAllowedError":
              throw new Error(
                "Microphone/camera permission was denied. Please allow access in your browser.",
              );

            case "NotFoundError":
              throw new Error(
                "No microphone or camera was found on this device.",
              );

            case "NotReadableError":
              throw new Error(
                "Your microphone or camera is already being used by another application.",
              );

            case "OverconstrainedError":
              throw new Error(
                "The requested camera or microphone settings are not available.",
              );

            case "SecurityError":
              throw new Error(
                "The browser blocked microphone/camera access for security reasons.",
              );

            default:
              throw new Error(
                "Unable to access your microphone or camera.",
              );
          }
        }
      },
      [],
    );

  const createOffer =
    useCallback(
      async (
        currentCall: Call,
        peerConnection: RTCPeerConnection,
      ) => {
        const receiverId =
          currentCall.receiverId;

        if (!receiverId) {
          throw new Error(
            "The receiver for this call is missing.",
          );
        }

        console.log(
          "[WebRTC] Creating offer:",
          currentCall.id,
        );

        const offer =
          await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo:
              currentCall.type ===
              "video",
          });

        await peerConnection.setLocalDescription(
          offer,
        );

        console.log(
          "[WebRTC] Sending offer:",
          currentCall.id,
        );

        messageSocket.sendWebRTCOffer(
          currentCall.id,
          receiverId,
          offer,
        );
      },
      [],
    );

  const handleOffer =
    useCallback(
      async (
        payload: WebRTCOfferPayload,
      ) => {
        const currentCall =
          callRef.current;

        if (!currentCall) {
          console.warn(
            "[WebRTC] Ignoring offer. No active call.",
          );
          return;
        }

        if (
          payload.callId !==
          currentCall.id
        ) {
          return;
        }

        const peerConnection =
          peerConnectionRef.current;

        if (!peerConnection) {
          console.warn(
            "[WebRTC] Received offer but peer connection does not exist.",
          );
          return;
        }

        try {
          console.log(
            "[WebRTC] Received offer:",
            payload.callId,
          );

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              payload.offer,
            ),
          );

          await addPendingIceCandidates();

          const answer =
            await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(
            answer,
          );

          const callerId =
            currentCall.callerId;

          if (!callerId) {
            throw new Error(
              "Caller ID is missing from the active call.",
            );
          }

          console.log(
            "[WebRTC] Sending answer:",
            {
              callId:
                currentCall.id,
              callerId,
            },
          );

          messageSocket.sendWebRTCAnswer(
            currentCall.id,
            callerId,
            answer,
          );
        } catch (offerError) {
          console.error(
            "[WebRTC] Failed to process offer:",
            offerError,
          );

          if (mountedRef.current) {
            setError(
              "Unable to establish the call connection.",
            );
            setIsConnecting(false);
          }
        }
      },
      [addPendingIceCandidates],
    );

  const handleAnswer =
    useCallback(
      async (
        payload: WebRTCAnswerPayload,
      ) => {
        const currentCall =
          callRef.current;

        if (!currentCall) {
          return;
        }

        if (
          payload.callId !==
          currentCall.id
        ) {
          return;
        }

        const peerConnection =
          peerConnectionRef.current;

        if (!peerConnection) {
          console.warn(
            "[WebRTC] Received answer but peer connection does not exist.",
          );
          return;
        }

        try {
          console.log(
            "[WebRTC] Received answer:",
            payload.callId,
          );

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              payload.answer,
            ),
          );

          await addPendingIceCandidates();

          console.log(
            "[WebRTC] Remote answer applied.",
          );
        } catch (answerError) {
          console.error(
            "[WebRTC] Failed to process answer:",
            answerError,
          );

          if (mountedRef.current) {
            setError(
              "Unable to complete the call connection.",
            );
            setIsConnecting(false);
          }
        }
      },
      [addPendingIceCandidates],
    );

  const handleIceCandidate =
    useCallback(
      async (
        payload: WebRTCICECandidatePayload,
      ) => {
        const currentCall =
          callRef.current;

        if (!currentCall) {
          return;
        }

        if (
          payload.callId !==
          currentCall.id
        ) {
          return;
        }

        if (!payload.candidate) {
          return;
        }

        const peerConnection =
          peerConnectionRef.current;

        if (!peerConnection) {
          console.warn(
            "[WebRTC] Received ICE candidate before peer connection exists.",
          );

          return;
        }

        if (
          !peerConnection.remoteDescription
        ) {
          console.log(
            "[WebRTC] Queueing ICE candidate until remote description exists.",
          );

          pendingCandidatesRef.current.push(
            payload.candidate,
          );

          return;
        }

        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              payload.candidate,
            ),
          );

          console.log(
            "[WebRTC] ICE candidate applied.",
          );
        } catch (candidateError) {
          console.warn(
            "[WebRTC] Failed to add ICE candidate:",
            candidateError,
          );
        }
      },
      [],
    );

  const startWebRTC =
    useCallback(
      async (currentCall: Call) => {
        if (!currentCall.id) {
          return;
        }

        if (
          startedCallIdRef.current ===
          currentCall.id
        ) {
          console.log(
            "[WebRTC] Call already initialized:",
            currentCall.id,
          );

          return;
        }

        startedCallIdRef.current =
          currentCall.id;

        if (mountedRef.current) {
          setError(null);
          setIsConnecting(true);
          setIsConnected(false);
        }

        try {
          const currentUserId =
            getCurrentUserId();

          if (!currentUserId) {
            throw new Error(
              "Unable to determine the current user.",
            );
          }

          const isCaller =
            currentCall.callerId ===
            currentUserId;

          const isReceiver =
            currentCall.receiverId ===
            currentUserId;

          console.log(
            "[WebRTC] Starting WebRTC:",
            {
              callId:
                currentCall.id,
              type:
                currentCall.type,
              currentUserId,
              callerId:
                currentCall.callerId,
              receiverId:
                currentCall.receiverId,
              isCaller,
              isReceiver,
            },
          );

          if (
            !isCaller &&
            !isReceiver
          ) {
            throw new Error(
              "You are not a participant in this call.",
            );
          }

          const stream =
            await getMedia(
              currentCall.type,
            );

          localStreamRef.current =
            stream;

          if (mountedRef.current) {
            setLocalStream(stream);
          }

          const peerConnection =
            createPeerConnection(
              currentCall,
              stream,
            );

          /*
           * ONLY THE CALLER creates the offer.
           *
           * The receiver waits for the offer.
           */
          if (isCaller) {
            await createOffer(
              currentCall,
              peerConnection,
            );
          } else {
            console.log(
              "[WebRTC] Receiver waiting for caller offer:",
              currentCall.id,
            );
          }

          console.log(
            "[WebRTC] WebRTC initialized:",
            currentCall.id,
          );
        } catch (startError: any) {
          console.error(
            "[WebRTC] Failed to start:",
            startError,
          );

          startedCallIdRef.current =
            null;

          if (mountedRef.current) {
            setIsConnecting(false);
            setIsConnected(false);
            setError(
              startError?.message ||
                "Unable to start the call.",
            );
          }
        }
      },
      [
        createOffer,
        createPeerConnection,
        getMedia,
      ],
    );

  /*
   * Component lifecycle.
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * WebRTC signaling listeners.
   *
   * These listeners remain active while the
   * WebRTC hook is mounted.
   */
  useEffect(() => {
    const removeOfferListener =
      messageSocket.onRaw(
        "webrtc:offer",
        (
          payload: WebRTCOfferPayload,
        ) => {
          console.log(
            "[WebRTC] Socket offer received:",
            payload.callId,
          );

          void handleOffer(payload);
        },
      );

    const removeAnswerListener =
      messageSocket.onRaw(
        "webrtc:answer",
        (
          payload: WebRTCAnswerPayload,
        ) => {
          console.log(
            "[WebRTC] Socket answer received:",
            payload.callId,
          );

          void handleAnswer(payload);
        },
      );

    const removeIceListener =
      messageSocket.onRaw(
        "webrtc:ice-candidate",
        (
          payload: WebRTCICECandidatePayload,
        ) => {
          console.log(
            "[WebRTC] Socket ICE received:",
            payload.callId,
          );

          void handleIceCandidate(
            payload,
          );
        },
      );

    return () => {
      removeOfferListener?.();
      removeAnswerListener?.();
      removeIceListener?.();
    };
  }, [
    handleAnswer,
    handleIceCandidate,
    handleOffer,
  ]);

  /*
   * Start WebRTC only when:
   *
   * 1. The hook is enabled.
   * 2. A call exists.
   * 3. The call has been accepted.
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!call) {
      return;
    }

    if (
      call.status !== "active"
    ) {
      return;
    }

    void startWebRTC(call);
  }, [
    call,
    enabled,
    startWebRTC,
  ]);

  /*
   * Cleanup when the hook/component is destroyed.
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const toggleMute =
    useCallback(() => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      const tracks =
        stream.getAudioTracks();

      if (tracks.length === 0) {
        return;
      }

      const nextMuted =
        !isMuted;

      for (const track of tracks) {
        track.enabled =
          !nextMuted;
      }

      setIsMuted(nextMuted);

      console.log(
        "[WebRTC] Microphone:",
        nextMuted
          ? "muted"
          : "unmuted",
      );
    }, [isMuted]);

  const toggleCamera =
    useCallback(() => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      const tracks =
        stream.getVideoTracks();

      if (tracks.length === 0) {
        return;
      }

      const nextCameraOff =
        !isCameraOff;

      for (const track of tracks) {
        track.enabled =
          !nextCameraOff;
      }

      setIsCameraOff(
        nextCameraOff,
      );

      console.log(
        "[WebRTC] Camera:",
        nextCameraOff
          ? "off"
          : "on",
      );
    }, [isCameraOff]);

  return {
    localStream,
    remoteStream,
    isConnected,
    isConnecting,
    error,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    cleanup,
  };
}

export default useWebRTCCall;