import { io, Socket } from "socket.io-client";

import type {
  ChatMessage,
  RoomParticipant,
  WaitingRoomEntry,
  LateNotice,
} from "../types";

export interface MeetingsSocketEvents {
  onParticipantJoined: (p: RoomParticipant) => void;
  onParticipantLeft: (participantId: string) => void;
  onParticipantUpdated: (p: RoomParticipant) => void;
  onChatMessage: (m: ChatMessage) => void;
  onWaitingRoomUpdated: (entries: WaitingRoomEntry[]) => void;
  onLateNotice: (notice: LateNotice) => void;
  onMeetingEnded: () => void;
  onMeetingAdmitted: (result: unknown) => void;
  onMeetingRejected: (result: unknown) => void;
  onConnectionStateChanged: (
    state: "connected" | "reconnecting" | "disconnected",
  ) => void;
}

type JoinAck = {
  admitted?: boolean;
  meetingId?: string;
  message?: string;
  [key: string]: unknown;
};

class MeetingsSocket {
  private socket: Socket | null = null;
  private connected = false;
  private currentMeetingId = "";

  async connect(
    meetingId: string,
    handlers: Partial<MeetingsSocketEvents>,
    passcode?: string,
  ): Promise<{ ok: boolean; error?: string; result?: JoinAck }> {
    this.disconnect();

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (!token) {
      handlers.onConnectionStateChanged?.("disconnected");
      return {
        ok: false,
        error: "Authentication token is missing.",
      };
    }

    const cleanMeetingId = String(meetingId ?? "").trim();

    if (!cleanMeetingId) {
      handlers.onConnectionStateChanged?.("disconnected");
      return {
        ok: false,
        error: "Meeting ID is missing.",
      };
    }

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:3000";

    return new Promise((resolve) => {
      let settled = false;

      const socket = io(`${baseUrl}/meetings`, {
        transports: ["websocket", "polling"],
        auth: { token },
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      this.socket = socket;
      this.currentMeetingId = cleanMeetingId;

      socket.on("connect", () => {
        this.connected = true;

        handlers.onConnectionStateChanged?.("connected");

        socket.emit(
          "meeting:join",
          {
            meetingId: cleanMeetingId,
            passcode:
              typeof passcode === "string" && passcode.trim()
                ? passcode.trim()
                : undefined,
          },
          (result: JoinAck) => {
            const joinResult = result ?? {
              admitted: false,
              message: "No join response received.",
            };

            if (!settled) {
              settled = true;

              if (joinResult.admitted === false) {
                resolve({
                  ok: false,
                  error:
                    joinResult.message ||
                    "You are waiting for the host to admit you.",
                  result: joinResult,
                });
                return;
              }

              resolve({
                ok: true,
                result: joinResult,
              });
            }
          },
        );
      });

      socket.on("connect_error", (error) => {
        this.connected = false;
        handlers.onConnectionStateChanged?.("disconnected");

        if (!settled) {
          settled = true;
          resolve({
            ok: false,
            error:
              error.message ||
              "Unable to connect to meeting realtime channel.",
          });
        }
      });

      socket.on("disconnect", () => {
        this.connected = false;
        handlers.onConnectionStateChanged?.("disconnected");
      });

      socket.io.on("reconnect_attempt", () => {
        handlers.onConnectionStateChanged?.("reconnecting");
      });

      socket.io.on("reconnect", () => {
        this.connected = true;
        handlers.onConnectionStateChanged?.("connected");

        // Rejoin after a temporary network disconnect.
        socket.emit(
          "meeting:join",
          {
            meetingId: this.currentMeetingId,
            passcode:
              typeof passcode === "string" && passcode.trim()
                ? passcode.trim()
                : undefined,
          },
        );
      });

      socket.on("participant:joined", (participant) => {
        handlers.onParticipantJoined?.(participant);
      });

      socket.on("participant:left", (data) => {
        if (data?.userId) {
          handlers.onParticipantLeft?.(String(data.userId));
        }
      });

      socket.on("participant:media", (data) => {
        if (!data?.userId) return;

        handlers.onParticipantUpdated?.({
          id: String(data.userId),
          user: {
            id: String(data.userId),
            displayName:
              data.displayName || "Fockis User",
          },
          role: "participant",
          micOn: data.micOn ?? true,
          cameraOn: data.cameraOn ?? true,
          handRaised: false,
          isSpeaking: false,
          screenSharing: data.screenSharing ?? false,
          connectionQuality: "good",
          joinedAt: new Date().toISOString(),
        });
      });

      socket.on("participant:hand", (data) => {
        if (!data?.userId) return;

        handlers.onParticipantUpdated?.({
          id: String(data.userId),
          user: {
            id: String(data.userId),
            displayName:
              data.displayName || "Fockis User",
          },
          role: "participant",
          micOn: true,
          cameraOn: true,
          handRaised: data.raised ?? false,
          isSpeaking: false,
          screenSharing: false,
          connectionQuality: "good",
          joinedAt: new Date().toISOString(),
        });
      });

      socket.on("participant:speaking", (data) => {
        if (!data?.userId) return;

        handlers.onParticipantUpdated?.({
          id: String(data.userId),
          user: {
            id: String(data.userId),
            displayName:
              data.displayName || "Fockis User",
          },
          role: "participant",
          micOn: true,
          cameraOn: true,
          handRaised: false,
          isSpeaking: data.speaking ?? false,
          screenSharing: false,
          connectionQuality: "good",
          joinedAt: new Date().toISOString(),
        });
      });

      socket.on("chat:message", (message) => {
        handlers.onChatMessage?.(message);
      });

      socket.on("meeting:waiting", (entry) => {
        console.log("Meeting waiting:", entry);
      });

      socket.on("meeting:admitted", (result) => {
        handlers.onMeetingAdmitted?.(result);
      });

      socket.on("meeting:rejected", (result) => {
        handlers.onMeetingRejected?.(result);
      });

      socket.on("meeting:error", (error) => {
        console.error("Meeting socket error:", error);

        if (!settled) {
          settled = true;
          resolve({
            ok: false,
            error:
              error?.message ||
              "Meeting realtime authentication failed.",
          });
        }
      });

      socket.on("meeting:ended", () => {
        handlers.onMeetingEnded?.();
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    this.currentMeetingId = "";
  }

  isConnected(): boolean {
    return this.connected;
  }

  sendChatMessage(
    meetingId: string,
    body: string,
  ): void {
    if (!this.socket || !this.connected) {
      throw new Error(
        "Not connected to meeting realtime channel.",
      );
    }

    this.socket.emit("meeting:chat", {
      meetingId,
      body,
    });
  }

  raiseHand(
    meetingId: string,
    raised: boolean,
  ): void {
    if (!this.socket || !this.connected) {
      throw new Error(
        "Not connected to meeting realtime channel.",
      );
    }

    this.socket.emit("participant:hand", {
      meetingId,
      raised,
    });
  }

  updateMedia(
    meetingId: string,
    media: {
      micOn?: boolean;
      cameraOn?: boolean;
      screenSharing?: boolean;
    },
  ): void {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit("participant:media", {
      meetingId,
      ...media,
    });
  }

  speaking(
    meetingId: string,
    speaking: boolean,
  ): void {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit("participant:speaking", {
      meetingId,
      speaking,
    });
  }

  leaveMeeting(meetingId: string): void {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit("meeting:leave", {
      meetingId,
    });
  }
}

export const meetingsSocket = new MeetingsSocket();
