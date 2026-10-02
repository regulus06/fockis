import { create } from "zustand";

export type CallType = "voice" | "video";

export type CallStatus =
  | "incoming"
  | "outgoing"
  | "connecting"
  | "active"
  | "ended"
  | "rejected";

export interface Call {
  /**
   * This is the backend-generated callId.
   *
   * It must remain stable for the entire lifetime of the call.
   */
  id: string;

  callerId: string;

  receiverId?: string;

  type: CallType;

  createdAt: string;

  acceptedAt?: string;

  status?: CallStatus;

  participantName?: string;

  participantAvatar?: string;
}

interface CallState {
  /**
   * Someone is calling the current user.
   */
  incomingCall: Call | null;

  /**
   * The current user's outgoing call that has not yet been accepted.
   */
  outgoingCall: Call | null;

  /**
   * The currently accepted/active call.
   */
  activeCall: Call | null;

  /**
   * Put an incoming call on screen.
   */
  setIncomingCall: (call: Call | null) => void;

  /**
   * Put an outgoing call on screen.
   */
  startOutgoingCall: (call: Call) => void;

  /**
   * Mark a call as accepted and move it into activeCall.
   */
  acceptCall: (call: Call) => void;

  /**
   * Reject the current incoming/outgoing call.
   */
  rejectCall: () => void;

  /**
   * End the current call completely.
   */
  endCall: () => void;

  /**
   * Clear only the outgoing call.
   */
  clearOutgoingCall: () => void;

  /**
   * Clear only the incoming call.
   */
  clearIncomingCall: () => void;

  /**
   * Update the active call without replacing unrelated state.
   */
  updateActiveCall: (patch: Partial<Call>) => void;
}

export const useCallStore = create<CallState>((set) => ({
  incomingCall: null,

  outgoingCall: null,

  activeCall: null,

  setIncomingCall: (call) => {
    set({
      incomingCall: call
        ? {
            ...call,
            status: "incoming",
          }
        : null,
    });
  },

  startOutgoingCall: (call) => {
    set({
      outgoingCall: {
        ...call,
        status: "outgoing",
      },

      /*
       * A new outgoing call should not leave an old incoming call
       * displayed at the same time.
       */
      incomingCall: null,

      /*
       * A new outgoing call is not active yet.
       */
      activeCall: null,
    });
  },

  acceptCall: (call) => {
    set({
      incomingCall: null,

      outgoingCall: null,

      activeCall: {
        ...call,
        status: "active",
      },
    });
  },

  rejectCall: () => {
    set({
      incomingCall: null,
      outgoingCall: null,
    });
  },

  endCall: () => {
    set({
      incomingCall: null,
      outgoingCall: null,
      activeCall: null,
    });
  },

  clearOutgoingCall: () => {
    set({
      outgoingCall: null,
    });
  },

  clearIncomingCall: () => {
    set({
      incomingCall: null,
    });
  },

  updateActiveCall: (patch) => {
    set((state) => {
      if (!state.activeCall) {
        return state;
      }

      return {
        activeCall: {
          ...state.activeCall,
          ...patch,
        },
      };
    });
  },
}));