/**
 * ============================================================================
 * FOCKIS MESSAGES - REAL SOCKET.IO CLIENT
 * ============================================================================
 *
 * Responsibilities:
 *
 * - Authenticate Socket.IO using JWT
 * - Maintain the /messages namespace connection
 * - Join / leave conversation rooms
 * - Receive real-time messages
 * - Dispatch message:new to registered listeners
 * - Forward typing / presence / delivery / read events
 *
 * REAL CALL SIGNALING:
 *
 * - call:start
 * - call:incoming
 * - call:accept
 * - call:accepted
 * - call:reject
 * - call:rejected
 * - call:end
 * - call:ended
 *
 * WEBRTC SIGNALING:
 *
 * - webrtc:offer
 * - webrtc:answer
 * - webrtc:ice-candidate
 *
 * IMPORTANT:
 *
 * The backend does NOT carry audio/video.
 *
 * The backend only exchanges WebRTC signaling information.
 * The browser-to-browser media connection is handled by RTCPeerConnection.
 * ============================================================================
 */

import { io, type Socket } from "socket.io-client";

import type {
  SocketEventName,
  SocketEventPayloadMap,
  SocketListener,
} from "../types";

/* ============================================================================
   API BASE
============================================================================ */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

/* ============================================================================
   TYPES
============================================================================ */

export type CallType = "voice" | "video";

export interface StartCallResponse {
  success: boolean;
  callId?: string;
  message?: string;
}

export interface WebRTCOfferPayload {
  callId: string;
  receiverId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerPayload {
  callId: string;
  callerId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCICECandidatePayload {
  callId: string;
  targetUserId: string;
  candidate: RTCIceCandidateInit;
}

/* ============================================================================
   JWT
============================================================================ */

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken")
  );
}

/* ============================================================================
   MESSAGE SOCKET
============================================================================ */

class MessageSocket {
  private socket: Socket | null = null;

  private listeners: {
    [K in SocketEventName]?: Set<SocketListener<K>>;
  } = {};

  private rawListeners: Record<
    string,
    Set<(payload: any) => void>
  > = {};

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private manuallyDisconnected = false;

  /* ==========================================================================
     CONNECT
  ========================================================================== */

  connect(): void {
    this.manuallyDisconnected = false;

    /*
     * Already connected.
     */
    if (this.socket?.connected) {
      console.log(
        "[FOCKIS MESSAGES] Socket already connected:",
        this.socket.id,
      );

      return;
    }

    /*
     * Socket already exists and is connecting/reconnecting.
     */
    if (this.socket) {
      console.log(
        "[FOCKIS MESSAGES] Socket already exists; waiting for connection:",
        this.socket.id,
      );

      return;
    }

    const token = getToken();

    /*
     * Authentication may finish after React mounts.
     *
     * Retry instead of permanently giving up.
     */
    if (!token) {
      console.warn(
        "[FOCKIS MESSAGES] No JWT token yet. Retrying Socket.IO connection...",
      );

      this.scheduleRetry();

      return;
    }

    const socketUrl = `${API_BASE}/messages`;

    console.log(
      "[FOCKIS MESSAGES] Connecting Socket.IO:",
      socketUrl,
    );

    const socket = io(socketUrl, {
      transports: [
        "websocket",
        "polling",
      ],

      autoConnect: false,

      auth: {
        token,
      },

      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },

      reconnection: true,

      reconnectionAttempts: Infinity,

      reconnectionDelay: 1000,

      reconnectionDelayMax: 10000,

      timeout: 10000,
    });

    this.socket = socket;

    /* ========================================================================
       CONNECTED
    ======================================================================== */

    socket.on(
      "connect",
      () => {
        console.log(
          "[FOCKIS MESSAGES] Socket connected:",
          socket.id,
        );
      },
    );

    /* ========================================================================
       CONNECTION ERROR
    ======================================================================== */

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "[FOCKIS MESSAGES] Socket connection error:",
          error.message,
        );

        /*
         * If authentication is unavailable or the token is invalid,
         * completely replace the socket and retry.
         */
        if (
          !getToken() ||
          /jwt|token|auth|unauthorized/i.test(
            error.message || "",
          )
        ) {
          try {
            socket.removeAllListeners();
            socket.disconnect();
          } catch {
            // Ignore cleanup errors.
          }

          if (this.socket === socket) {
            this.socket = null;
          }

          this.scheduleRetry();
        }
      },
    );

    /* ========================================================================
       DISCONNECTED
    ======================================================================== */

    socket.on(
      "disconnect",
      (reason) => {
        console.warn(
          "[FOCKIS MESSAGES] Socket disconnected:",
          reason,
        );

        if (
          !this.manuallyDisconnected &&
          !socket.active
        ) {
          if (this.socket === socket) {
            this.socket = null;
          }

          this.scheduleRetry();
        }
      },
    );

    /* ========================================================================
       STANDARD MESSAGE / PRESENCE EVENTS
    ======================================================================== */

    const events: SocketEventName[] = [
      "message:new",
      "message:delivered",
      "message:read",
      "typing:start",
      "typing:stop",
      "presence:update",
    ];

    events.forEach((event) => {
      socket.on(
        event,
        (payload) => {
          console.log(
            `[FOCKIS MESSAGES] Socket event: ${event}`,
            payload,
          );

          this.dispatch(
            event,
            payload as SocketEventPayloadMap[
              typeof event
            ],
          );
        },
      );
    });

    /* ========================================================================
       CALL: INCOMING
    ======================================================================== */

    socket.on(
      "call:incoming",
      (payload) => {
        console.log(
          "[FOCKIS CALL] Incoming call:",
          payload,
        );

        this.dispatchRaw(
          "call:incoming",
          payload,
        );
      },
    );

    /* ========================================================================
       CALL: ACCEPTED
    ======================================================================== */

    socket.on(
      "call:accepted",
      (payload) => {
        console.log(
          "[FOCKIS CALL] Call accepted:",
          payload,
        );

        this.dispatchRaw(
          "call:accepted",
          payload,
        );
      },
    );

    /* ========================================================================
       CALL: REJECTED
    ======================================================================== */

    socket.on(
      "call:rejected",
      (payload) => {
        console.log(
          "[FOCKIS CALL] Call rejected:",
          payload,
        );

        this.dispatchRaw(
          "call:rejected",
          payload,
        );
      },
    );

    /* ========================================================================
       CALL: ENDED
    ======================================================================== */

    socket.on(
      "call:ended",
      (payload) => {
        console.log(
          "[FOCKIS CALL] Call ended:",
          payload,
        );

        this.dispatchRaw(
          "call:ended",
          payload,
        );
      },
    );

    /* ========================================================================
       WEBRTC: OFFER
    ======================================================================== */

    socket.on(
      "webrtc:offer",
      (payload) => {
        console.log(
          "[FOCKIS WEBRTC] Offer received:",
          {
            callId: payload?.callId,
            senderId: payload?.senderId,
          },
        );

        this.dispatchRaw(
          "webrtc:offer",
          payload,
        );
      },
    );

    /* ========================================================================
       WEBRTC: ANSWER
    ======================================================================== */

    socket.on(
      "webrtc:answer",
      (payload) => {
        console.log(
          "[FOCKIS WEBRTC] Answer received:",
          {
            callId: payload?.callId,
            senderId: payload?.senderId,
          },
        );

        this.dispatchRaw(
          "webrtc:answer",
          payload,
        );
      },
    );

    /* ========================================================================
       WEBRTC: ICE CANDIDATE
    ======================================================================== */

    socket.on(
      "webrtc:ice-candidate",
      (payload) => {
        console.log(
          "[FOCKIS WEBRTC] ICE candidate received:",
          {
            callId: payload?.callId,
            senderId: payload?.senderId,
          },
        );

        this.dispatchRaw(
          "webrtc:ice-candidate",
          payload,
        );
      },
    );

    /*
     * IMPORTANT:
     *
     * All application listeners are attached before connect().
     */
    socket.connect();
  }

  /* ==========================================================================
     RETRY CONNECTION
  ========================================================================== */

  private scheduleRetry(): void {
    if (this.manuallyDisconnected) {
      return;
    }

    if (this.retryTimer) {
      return;
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;

      if (this.manuallyDisconnected) {
        return;
      }

      if (this.socket?.connected) {
        return;
      }

      /*
       * Remove dead socket before retrying.
       */
      if (this.socket) {
        try {
          this.socket.removeAllListeners();
          this.socket.disconnect();
        } catch {
          // Ignore cleanup errors.
        }

        this.socket = null;
      }

      this.connect();
    }, 1500);
  }

  /* ==========================================================================
     DISCONNECT
  ========================================================================== */

  disconnect(): void {
    this.manuallyDisconnected = true;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (!this.socket) {
      return;
    }

    const socket = this.socket;

    this.socket = null;

    socket.removeAllListeners();

    socket.disconnect();

    console.log(
      "[FOCKIS MESSAGES] Socket disconnected manually",
    );
  }

  /* ==========================================================================
     CONNECTION STATE
  ========================================================================== */

  isConnected(): boolean {
    return this.socket?.connected === true;
  }

  /* ==========================================================================
     STANDARD EVENT LISTENERS
  ========================================================================== */

  on<E extends SocketEventName>(
    event: E,
    listener: SocketListener<E>,
  ): () => void {
    type AnyListener =
      SocketListener<SocketEventName>;

    const bucket =
      this.listeners as Record<
        SocketEventName,
        Set<AnyListener> | undefined
      >;

    if (!bucket[event]) {
      bucket[event] =
        new Set<AnyListener>();
    }

    bucket[event]!.add(
      listener as AnyListener,
    );

    return () => {
      this.off(
        event,
        listener,
      );
    };
  }

  /* ==========================================================================
     REMOVE STANDARD LISTENER
  ========================================================================== */

  off<E extends SocketEventName>(
    event: E,
    listener: SocketListener<E>,
  ): void {
    type AnyListener =
      SocketListener<SocketEventName>;

    const bucket =
      this.listeners as Record<
        SocketEventName,
        Set<AnyListener> | undefined
      >;

    bucket[event]?.delete(
      listener as AnyListener,
    );
  }

  /* ==========================================================================
     EMIT STANDARD EVENT
  ========================================================================== */

  emit<E extends SocketEventName>(
    event: E,
    payload: SocketEventPayloadMap[E],
  ): void {
    if (!this.socket?.connected) {
      console.warn(
        `[FOCKIS MESSAGES] Cannot emit ${event}: socket not connected`,
      );

      return;
    }

    this.socket.emit(
      event,
      payload,
    );
  }

  /* ==========================================================================
     EMIT RAW EVENT
  ========================================================================== */

  emitRaw(
    event: string,
    payload?: unknown,
  ): void {
    if (!this.socket?.connected) {
      console.warn(
        `[FOCKIS MESSAGES] Cannot emit ${event}: socket not connected`,
      );

      return;
    }

    this.socket.emit(
      event,
      payload,
    );
  }

  /* ==========================================================================
     CALL: START
  ========================================================================== */

  startCall(
    receiverId: string,
    type: CallType,
  ): Promise<StartCallResponse> {
    return new Promise((resolve) => {
      const cleanReceiverId =
        String(receiverId || "").trim();

      if (!cleanReceiverId) {
        resolve({
          success: false,
          message:
            "Receiver ID is required.",
        });

        return;
      }

      if (!this.socket?.connected) {
        console.warn(
          "[FOCKIS CALL] Cannot start call: socket not connected",
        );

        resolve({
          success: false,
          message:
            "Messages socket is not connected.",
        });

        return;
      }

      console.log(
        "[FOCKIS CALL] Starting call:",
        {
          receiverId: cleanReceiverId,
          type,
        },
      );

      /*
       * The backend gateway uses Socket.IO acknowledgement to return:
       *
       * {
       *   success: true,
       *   callId: "..."
       * }
       */
      this.socket.emit(
        "call:start",
        {
          receiverId: cleanReceiverId,
          type,
        },
        (
          response: StartCallResponse,
        ) => {
          console.log(
            "[FOCKIS CALL] call:start acknowledgement:",
            response,
          );

          resolve(
            response || {
              success: false,
              message:
                "No response from call server.",
            },
          );
        },
      );
    });
  }

  /* ==========================================================================
     CALL: ACCEPT
  ========================================================================== */

  acceptCall(
    callId: string,
    callerId?: string,
  ): void {
    const cleanCallId =
      String(callId || "").trim();

    if (!cleanCallId) {
      console.warn(
        "[FOCKIS CALL] Cannot accept call: missing callId",
      );

      return;
    }

    const payload: {
      callId: string;
      callerId?: string;
    } = {
      callId: cleanCallId,
    };

    if (
      callerId &&
      String(callerId).trim()
    ) {
      payload.callerId =
        String(callerId).trim();
    }

    console.log(
      "[FOCKIS CALL] Accepting call:",
      payload,
    );

    this.emitRaw(
      "call:accept",
      payload,
    );
  }

  /* ==========================================================================
     CALL: REJECT
  ========================================================================== */

  rejectCall(
    callId: string,
    callerId?: string,
  ): void {
    const cleanCallId =
      String(callId || "").trim();

    if (!cleanCallId) {
      console.warn(
        "[FOCKIS CALL] Cannot reject call: missing callId",
      );

      return;
    }

    const payload: {
      callId: string;
      callerId?: string;
    } = {
      callId: cleanCallId,
    };

    if (
      callerId &&
      String(callerId).trim()
    ) {
      payload.callerId =
        String(callerId).trim();
    }

    console.log(
      "[FOCKIS CALL] Rejecting call:",
      payload,
    );

    this.emitRaw(
      "call:reject",
      payload,
    );
  }

  /* ==========================================================================
     CALL: END
  ========================================================================== */

  endCall(
    callId: string,
    userId?: string,
  ): void {
    const cleanCallId =
      String(callId || "").trim();

    if (!cleanCallId) {
      console.warn(
        "[FOCKIS CALL] Cannot end call: missing callId",
      );

      return;
    }

    const payload: {
      callId: string;
      userId?: string;
    } = {
      callId: cleanCallId,
    };

    /*
     * userId is optional because the backend already knows the authenticated
     * user from client.data.userId.
     *
     * It is retained for compatibility with callers that already provide it.
     */
    if (
      userId &&
      String(userId).trim()
    ) {
      payload.userId =
        String(userId).trim();
    }

    console.log(
      "[FOCKIS CALL] Ending call:",
      payload,
    );

    this.emitRaw(
      "call:end",
      payload,
    );
  }

  /* ==========================================================================
     WEBRTC: SEND OFFER
  ========================================================================== */

  sendWebRTCOffer(
    callId: string,
    receiverId: string,
    offer: RTCSessionDescriptionInit,
  ): void {
    const cleanCallId =
      String(callId || "").trim();

    const cleanReceiverId =
      String(receiverId || "").trim();

    if (
      !cleanCallId ||
      !cleanReceiverId ||
      !offer
    ) {
      console.warn(
        "[FOCKIS WEBRTC] Cannot send offer: missing required data",
        {
          callId,
          receiverId,
          offer,
        },
      );

      return;
    }

    const payload: WebRTCOfferPayload = {
      callId: cleanCallId,
      receiverId: cleanReceiverId,
      offer,
    };

    console.log(
      "[FOCKIS WEBRTC] Sending offer:",
      {
        callId: cleanCallId,
        receiverId: cleanReceiverId,
      },
    );

    this.emitRaw(
      "webrtc:offer",
      payload,
    );
  }

  /* ==========================================================================
     WEBRTC: SEND ANSWER
  ========================================================================== */

  sendWebRTCAnswer(
    callId: string,
    callerId: string,
    answer: RTCSessionDescriptionInit,
  ): void {
    const cleanCallId =
      String(callId || "").trim();

    const cleanCallerId =
      String(callerId || "").trim();

    if (
      !cleanCallId ||
      !cleanCallerId ||
      !answer
    ) {
      console.warn(
        "[FOCKIS WEBRTC] Cannot send answer: missing required data",
        {
          callId,
          callerId,
          answer,
        },
      );

      return;
    }

    const payload: WebRTCAnswerPayload = {
      callId: cleanCallId,
      callerId: cleanCallerId,
      answer,
    };

    console.log(
      "[FOCKIS WEBRTC] Sending answer:",
      {
        callId: cleanCallId,
        callerId: cleanCallerId,
      },
    );

    this.emitRaw(
      "webrtc:answer",
      payload,
    );
  }

  /* ==========================================================================
     WEBRTC: SEND ICE CANDIDATE
  ========================================================================== */

  sendWebRTCICECandidate(
    callId: string,
    targetUserId: string,
    candidate: RTCIceCandidateInit,
  ): void {
    const cleanCallId =
      String(callId || "").trim();

    const cleanTargetUserId =
      String(targetUserId || "").trim();

    if (
      !cleanCallId ||
      !cleanTargetUserId ||
      !candidate
    ) {
      console.warn(
        "[FOCKIS WEBRTC] Cannot send ICE candidate: missing required data",
        {
          callId,
          targetUserId,
          candidate,
        },
      );

      return;
    }

    const payload: WebRTCICECandidatePayload = {
      callId: cleanCallId,
      targetUserId: cleanTargetUserId,
      candidate,
    };

    console.log(
      "[FOCKIS WEBRTC] Sending ICE candidate:",
      {
        callId: cleanCallId,
        targetUserId: cleanTargetUserId,
      },
    );

    this.emitRaw(
      "webrtc:ice-candidate",
      payload,
    );
  }

  /* ==========================================================================
     RAW LISTENERS
  ========================================================================== */

  onRaw(
    event: string,
    callback: (payload: any) => void,
  ): () => void {
    if (!this.rawListeners[event]) {
      this.rawListeners[event] =
        new Set();
    }

    this.rawListeners[event].add(
      callback,
    );

    return () => {
      this.rawListeners[event]?.delete(
        callback,
      );
    };
  }

  /* ==========================================================================
     RAW DISPATCH
  ========================================================================== */

  private dispatchRaw(
    event: string,
    payload: any,
  ): void {
    this.rawListeners[event]?.forEach(
      (listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error(
            `[FOCKIS MESSAGES] Raw listener error for ${event}:`,
            error,
          );
        }
      },
    );
  }

  /* ==========================================================================
     STANDARD DISPATCH
  ========================================================================== */

  private dispatch<E extends SocketEventName>(
    event: E,
    payload: SocketEventPayloadMap[E],
  ): void {
    type AnyListener =
      SocketListener<SocketEventName>;

    const bucket =
      this.listeners as Record<
        SocketEventName,
        Set<AnyListener> | undefined
      >;

    bucket[event]?.forEach(
      (listener) => {
        try {
          listener(
            payload as Parameters<
              AnyListener
            >[0],
          );
        } catch (error) {
          console.error(
            `[FOCKIS MESSAGES] Listener error for ${event}:`,
            error,
          );
        }
      },
    );
  }

  /* ==========================================================================
     JOIN CONVERSATION
  ========================================================================== */

  joinConversation(
    conversationId: string,
  ): void {
    if (!conversationId) {
      return;
    }

    if (!this.socket?.connected) {
      console.warn(
        "[FOCKIS MESSAGES] Cannot join conversation: socket not connected",
        conversationId,
      );

      return;
    }

    console.log(
      "[FOCKIS MESSAGES] Joining conversation:",
      conversationId,
    );

    this.socket.emit(
      "conversation:join",
      {
        conversationId,
      },
    );
  }

  /* ==========================================================================
     LEAVE CONVERSATION
  ========================================================================== */

  leaveConversation(
    conversationId: string,
  ): void {
    if (!conversationId) {
      return;
    }

    if (!this.socket?.connected) {
      return;
    }

    console.log(
      "[FOCKIS MESSAGES] Leaving conversation:",
      conversationId,
    );

    this.socket.emit(
      "conversation:leave",
      {
        conversationId,
      },
    );
  }

  /* ==========================================================================
     TYPING START
  ========================================================================== */

  startTyping(
    conversationId: string,
  ): void {
    if (
      !conversationId ||
      !this.socket?.connected
    ) {
      return;
    }

    this.socket.emit(
      "typing:start",
      {
        conversationId,
      },
    );
  }

  /* ==========================================================================
     TYPING STOP
  ========================================================================== */

  stopTyping(
    conversationId: string,
  ): void {
    if (
      !conversationId ||
      !this.socket?.connected
    ) {
      return;
    }

    this.socket.emit(
      "typing:stop",
      {
        conversationId,
      },
    );
  }
}

/* ============================================================================
   SINGLE SOCKET INSTANCE
============================================================================ */

export const messageSocket =
  new MessageSocket();