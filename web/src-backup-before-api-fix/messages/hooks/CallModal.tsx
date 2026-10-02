import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Phone,
  PhoneOff,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Loader2,
} from "lucide-react";

import { useCallStore } from "../store/callStore";
import {
  messageSocket,
} from "../services/messageSocket";

import useWebRTCCall from "./useWebRTCCall";

function formatDuration(
  totalSeconds: number,
) {
  const m = Math.floor(
    totalSeconds / 60,
  )
    .toString()
    .padStart(2, "0");

  const s = Math.floor(
    totalSeconds % 60,
  )
    .toString()
    .padStart(2, "0");

  return `${m}:${s}`;
}

export default function CallModal() {
  const outgoingCall =
    useCallStore(
      (s) => s.outgoingCall,
    );

  const incomingCall =
    useCallStore(
      (s) => s.incomingCall,
    );

  const activeCall =
    useCallStore(
      (s) => s.activeCall,
    );

  const acceptCall =
    useCallStore(
      (s) => s.acceptCall,
    );

  const rejectCall =
    useCallStore(
      (s) => s.rejectCall,
    );

  const endCall =
    useCallStore(
      (s) => s.endCall,
    );

  const [duration, setDuration] =
    useState(0);

  const [actionLoading, setActionLoading] =
    useState(false);

  const localVideoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const remoteVideoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  /*
   * The active call is the only state that
   * should initialize WebRTC.
   */
  const call =
    activeCall ||
    outgoingCall ||
    incomingCall;

  const {
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
  } = useWebRTCCall({
    call: activeCall,
    enabled: Boolean(
      activeCall,
    ),
  });

  /*
   * Attach local media to the local
   * video element.
   */
  useEffect(() => {
    const video =
      localVideoRef.current;

    if (!video) {
      return;
    }

    video.srcObject =
      localStream;

    if (localStream) {
      void video.play().catch(
        () => {
          /*
           * Browser autoplay policies can
           * reject play(). The user interaction
           * that accepted the call normally
           * allows playback.
           */
        },
      );
    }
  }, [localStream]);

  /*
   * Attach remote media to the remote
   * video element.
   */
  useEffect(() => {
    const video =
      remoteVideoRef.current;

    if (!video) {
      return;
    }

    video.srcObject =
      remoteStream;

    if (remoteStream) {
      void video.play().catch(
        () => {
          // Browser may require user interaction.
        },
      );
    }
  }, [remoteStream]);

  /*
   * Call duration starts when the
   * call becomes active.
   */
  useEffect(() => {
    if (!activeCall) {
      setDuration(0);
      return;
    }

    setDuration(0);

    const interval =
      window.setInterval(() => {
        setDuration(
          (current) =>
            current + 1,
        );
      }, 1000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, [activeCall?.id]);

  /*
   * Make sure media is cleaned up if
   * the modal disappears.
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /*
   * Reset action state when the call
   * changes.
   */
  useEffect(() => {
    setActionLoading(false);
  }, [call?.id]);

  if (!call) {
    return null;
  }

  const isVideo =
    call.type === "video";

  const name =
    call.participantName ||
    "Unknown";

  const avatar =
    call.participantAvatar;

  const isIncoming =
    Boolean(
      incomingCall &&
        !activeCall,
    );

  const isOutgoing =
    Boolean(
      outgoingCall &&
        !activeCall,
    );

  const isActive =
    Boolean(activeCall);

  /*
   * ACCEPT INCOMING CALL
   */
  async function handleAccept() {
    if (!incomingCall) {
      return;
    }

    if (actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      const callId =
        incomingCall.id;

      if (!callId) {
        throw new Error(
          "The incoming call ID is missing.",
        );
      }

      console.log(
        "[CALL MODAL] Accepting call:",
        callId,
      );

      /*
       * Tell the backend that the receiver
       * accepted the call.
       */
      messageSocket.acceptCall(
        callId,
        incomingCall.callerId ||
          undefined,
      );

      /*
       * Move the receiver into active
       * call state.
       *
       * useWebRTCCall will then obtain
       * microphone/camera and create the
       * peer connection.
       */
      acceptCall({
        ...incomingCall,
        status: "active",
      });
    } catch (acceptError) {
      console.error(
        "[CALL MODAL] Failed to accept call:",
        acceptError,
      );

      setActionLoading(false);
    }
  }

  /*
   * REJECT INCOMING CALL
   */
  function handleReject() {
    if (!incomingCall) {
      return;
    }

    if (actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      const callId =
        incomingCall.id;

      console.log(
        "[CALL MODAL] Rejecting call:",
        callId,
      );

      messageSocket.rejectCall(
        callId,
        incomingCall.callerId ||
          undefined,
      );

      rejectCall();
    } catch (rejectError) {
      console.error(
        "[CALL MODAL] Failed to reject call:",
        rejectError,
      );

      rejectCall();
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * CANCEL OUTGOING CALL
   */
  function handleCancel() {
    if (!outgoingCall) {
      return;
    }

    if (actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      const callId =
        outgoingCall.id;

      console.log(
        "[CALL MODAL] Cancelling call:",
        callId,
      );

      messageSocket.endCall(
        callId,
        outgoingCall.receiverId ||
          undefined,
      );

      endCall();
    } catch (cancelError) {
      console.error(
        "[CALL MODAL] Failed to cancel call:",
        cancelError,
      );

      endCall();
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * END ACTIVE CALL
   */
  function handleEndCall() {
    if (!activeCall) {
      return;
    }

    if (actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      const callId =
        activeCall.id;

      console.log(
        "[CALL MODAL] Ending call:",
        callId,
      );

      messageSocket.endCall(
        callId,
        activeCall.callerId ||
          activeCall.receiverId ||
          undefined,
      );

      cleanup();

      endCall();
    } catch (endError) {
      console.error(
        "[CALL MODAL] Failed to end call:",
        endError,
      );

      cleanup();
      endCall();
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * Determine the status text.
   */
  let statusText =
    `Calling${isVideo ? " (video)" : ""}...`;

  if (isIncoming) {
    statusText =
      `Incoming ${
        isVideo
          ? "video"
          : "voice"
      } call...`;
  }

  if (isActive) {
    if (error) {
      statusText = error;
    } else if (isConnected) {
      statusText =
        formatDuration(
          duration,
        );
    } else if (isConnecting) {
      statusText =
        "Connecting...";
    } else {
      statusText =
        "Starting call...";
    }
  }

  /*
   * VIDEO CALL
   *
   * Once active, show the remote stream
   * as the main video and the local stream
   * as a small preview.
   */
  if (isActive && isVideo) {
    return (
      <div className="call-modal call-modal--video">
        <div className="call-modal__backdrop" />

        <div className="call-modal__panel call-modal__panel--video">
          <div className="call-modal__video-stage">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                className="call-modal__remote-video"
                autoPlay
                playsInline
              />
            ) : (
              <div className="call-modal__video-placeholder">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="call-modal__avatar"
                  />
                ) : (
                  <div className="call-modal__avatar call-modal__avatar--placeholder">
                    {name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="call-modal__name">
                  {name}
                </div>

                <div className="call-modal__status">
                  {statusText}
                </div>

                {isConnecting && (
                  <Loader2
                    size={24}
                    className="call-modal__spinner"
                  />
                )}
              </div>
            )}

            {localStream && (
              <div className="call-modal__local-video-wrap">
                {isCameraOff ? (
                  <div className="call-modal__local-video-placeholder">
                    {name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    className="call-modal__local-video"
                    autoPlay
                    muted
                    playsInline
                  />
                )}
              </div>
            )}

            <div className="call-modal__video-info">
              <div className="call-modal__video-name">
                {name}
              </div>

              <div className="call-modal__video-status">
                {statusText}
              </div>
            </div>

            <div className="call-modal__actions call-modal__actions--video">
              <button
                type="button"
                className={`call-modal__btn call-modal__btn--secondary${
                  isMuted
                    ? " is-active"
                    : ""
                }`}
                onClick={toggleMute}
                aria-label={
                  isMuted
                    ? "Unmute"
                    : "Mute"
                }
              >
                {isMuted ? (
                  <MicOff size={20} />
                ) : (
                  <Mic size={20} />
                )}
              </button>

              <button
                type="button"
                className={`call-modal__btn call-modal__btn--secondary${
                  isCameraOff
                    ? " is-active"
                    : ""
                }`}
                onClick={
                  toggleCamera
                }
                aria-label={
                  isCameraOff
                    ? "Turn camera on"
                    : "Turn camera off"
                }
              >
                {isCameraOff ? (
                  <VideoOff
                    size={20}
                  />
                ) : (
                  <Video
                    size={20}
                  />
                )}
              </button>

              <button
                type="button"
                className="call-modal__btn call-modal__btn--reject"
                onClick={
                  handleEndCall
                }
                disabled={
                  actionLoading
                }
                aria-label="End call"
              >
                <PhoneOff
                  size={22}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * VOICE CALL / INCOMING / OUTGOING
   */
  return (
    <div className="call-modal">
      <div className="call-modal__backdrop" />

      <div className="call-modal__panel">
        <div className="call-modal__avatar-wrap">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="call-modal__avatar"
            />
          ) : (
            <div className="call-modal__avatar call-modal__avatar--placeholder">
              {name
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>

        <div className="call-modal__name">
          {name}
        </div>

        <div className="call-modal__status">
          {statusText}
        </div>

        {isActive &&
          remoteStream && (
            <audio
              ref={(element) => {
                if (element) {
                  element.srcObject =
                    remoteStream;

                  void element
                    .play()
                    .catch(
                      () => {
                        // Browser autoplay restriction.
                      },
                    );
                }
              }}
              autoPlay
              playsInline
            />
          )}

        {isActive &&
          isConnecting && (
            <Loader2
              size={22}
              className="call-modal__spinner"
            />
          )}

        {isActive && error && (
          <div className="call-modal__error">
            {error}
          </div>
        )}

        <div className="call-modal__actions">
          {isIncoming &&
            !activeCall && (
              <>
                <button
                  type="button"
                  className="call-modal__btn call-modal__btn--reject"
                  onClick={
                    handleReject
                  }
                  disabled={
                    actionLoading
                  }
                  aria-label="Decline call"
                >
                  <PhoneOff
                    size={22}
                  />
                </button>

                <button
                  type="button"
                  className="call-modal__btn call-modal__btn--accept"
                  onClick={
                    handleAccept
                  }
                  disabled={
                    actionLoading
                  }
                  aria-label="Accept call"
                >
                  {actionLoading ? (
                    <Loader2
                      size={22}
                      className="call-modal__spinner"
                    />
                  ) : (
                    <Phone
                      size={22}
                    />
                  )}
                </button>
              </>
            )}

          {isOutgoing &&
            !activeCall && (
              <button
                type="button"
                className="call-modal__btn call-modal__btn--reject"
                onClick={
                  handleCancel
                }
                disabled={
                  actionLoading
                }
                aria-label="Cancel call"
              >
                {actionLoading ? (
                  <Loader2
                    size={22}
                    className="call-modal__spinner"
                  />
                ) : (
                  <PhoneOff
                    size={22}
                  />
                )}
              </button>
            )}

          {isActive && (
            <>
              <button
                type="button"
                className={`call-modal__btn call-modal__btn--secondary${
                  isMuted
                    ? " is-active"
                    : ""
                }`}
                onClick={
                  toggleMute
                }
                aria-label={
                  isMuted
                    ? "Unmute"
                    : "Mute"
                }
              >
                {isMuted ? (
                  <MicOff
                    size={20}
                  />
                ) : (
                  <Mic size={20} />
                )}
              </button>

              <button
                type="button"
                className="call-modal__btn call-modal__btn--reject"
                onClick={
                  handleEndCall
                }
                disabled={
                  actionLoading
                }
                aria-label="End call"
              >
                <PhoneOff
                  size={22}
                />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
