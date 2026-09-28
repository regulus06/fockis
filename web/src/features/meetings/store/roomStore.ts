import { create } from "zustand";

import type {
  RoomParticipant,
  ChatMessage,
  WaitingRoomEntry,
  SecretaryStatus,
} from "../types";

import type { RightPanelTab } from "../constants";

interface RoomState {
  participants: RoomParticipant[];
  waitingRoom: WaitingRoomEntry[];
  chatMessages: ChatMessage[];

  activePanel: RightPanelTab | null;

  micOn: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  screenSharing: boolean;

  secretaryStatus: SecretaryStatus;

  recording: boolean;

  connectionState:
    | "connected"
    | "reconnecting"
    | "disconnected";

  setParticipants: (
    participants: RoomParticipant[],
  ) => void;

  setChatMessages: (
    messages: ChatMessage[],
  ) => void;

  setWaitingRoom: (
    entries: WaitingRoomEntry[],
  ) => void;

  upsertParticipant: (
    participant: RoomParticipant,
  ) => void;

  removeParticipant: (
    participantId: string,
  ) => void;

  addChatMessage: (
    message: ChatMessage,
  ) => void;

  setConnectionState: (
    state:
      | "connected"
      | "reconnecting"
      | "disconnected",
  ) => void;

  setActivePanel: (
    panel: RightPanelTab | null,
  ) => void;

  toggleMic: () => void;
  toggleCamera: () => void;
  toggleHandRaised: () => void;
  toggleScreenShare: () => void;

  setMicOn: (value: boolean) => void;
  setCameraOn: (value: boolean) => void;
  setHandRaised: (value: boolean) => void;
  setScreenSharing: (value: boolean) => void;

  sendChatMessage: (
    message: ChatMessage,
  ) => void;

  admitFromWaitingRoom: (
    entryId: string,
  ) => void;

  removeFromWaitingRoom: (
    entryId: string,
  ) => void;

  setSecretaryStatus: (
    status: SecretaryStatus,
  ) => void;
}

export const useRoomStore =
  create<RoomState>((set) => ({
    participants: [],
    waitingRoom: [],
    chatMessages: [],

    activePanel: "participants",

    micOn: true,
    cameraOn: true,
    handRaised: false,
    screenSharing: false,

    secretaryStatus: "off",

    recording: false,

    connectionState:
      "disconnected",

    setParticipants: (
      participants,
    ) =>
      set({
        participants,
      }),

    setChatMessages: (
      chatMessages,
    ) =>
      set({
        chatMessages,
      }),

    setWaitingRoom: (
      waitingRoom,
    ) =>
      set({
        waitingRoom,
      }),

    upsertParticipant: (
      participant,
    ) =>
      set((state) => {
        const exists =
          state.participants.some(
            (p) =>
              p.id === participant.id,
          );

        if (!exists) {
          return {
            participants: [
              ...state.participants,
              participant,
            ],
          };
        }

        return {
          participants:
            state.participants.map(
              (p) =>
                p.id === participant.id
                  ? {
                      ...p,
                      ...participant,
                      user: {
                        ...p.user,
                        ...participant.user,
                      },
                    }
                  : p,
            ),
        };
      }),

    removeParticipant: (
      participantId,
    ) =>
      set((state) => ({
        participants:
          state.participants.filter(
            (p) =>
              p.id !== participantId,
          ),
      })),

    addChatMessage: (
      message,
    ) =>
      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          message,
        ],
      })),

    setConnectionState: (
      connectionState,
    ) =>
      set({
        connectionState,
      }),

    setActivePanel: (
      panel,
    ) =>
      set((state) => ({
        activePanel:
          state.activePanel === panel
            ? null
            : panel,
      })),

    toggleMic: () =>
      set((state) => ({
        micOn: !state.micOn,
      })),

    toggleCamera: () =>
      set((state) => ({
        cameraOn: !state.cameraOn,
      })),

    toggleHandRaised: () =>
      set((state) => ({
        handRaised:
          !state.handRaised,
      })),

    toggleScreenShare: () =>
      set((state) => ({
        screenSharing:
          !state.screenSharing,
      })),

    setMicOn: (value) =>
      set({
        micOn: value,
      }),

    setCameraOn: (value) =>
      set({
        cameraOn: value,
      }),

    setHandRaised: (value) =>
      set({
        handRaised: value,
      }),

    setScreenSharing: (value) =>
      set({
        screenSharing: value,
      }),

    sendChatMessage: (
      message,
    ) =>
      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          message,
        ],
      })),

    admitFromWaitingRoom: (
      entryId,
    ) =>
      set((state) => ({
        waitingRoom:
          state.waitingRoom.filter(
            (entry) =>
              entry.id !== entryId,
          ),
      })),

    removeFromWaitingRoom: (
      entryId,
    ) =>
      set((state) => ({
        waitingRoom:
          state.waitingRoom.filter(
            (entry) =>
              entry.id !== entryId,
          ),
      })),

    setSecretaryStatus: (
      secretaryStatus,
    ) =>
      set({
        secretaryStatus,
      }),
  }));