import { create } from "zustand";

import type {
  FockisFriend,
  FockisFriendRequest,
} from "../types/fockisprofiletypes";

interface FockisFriendsState {
  friends: FockisFriend[];

  requests: FockisFriendRequest[];

  sentRequests: FockisFriendRequest[];

  suggestions: FockisFriend[];

  setFriends: (
    data: FockisFriend[],
  ) => void;

  setRequests: (
    data: FockisFriendRequest[],
  ) => void;

  setSentRequests: (
    data: FockisFriendRequest[],
  ) => void;

  setSuggestions: (
    data: FockisFriend[],
  ) => void;

  addFriend: (
    friend: FockisFriend,
  ) => void;

  removeFriend: (
    id: string,
  ) => void;

  removeRequest: (
    id: string,
  ) => void;

  removeSentRequest: (
    id: string,
  ) => void;

  clearFriendRequest: (
    id: string,
  ) => void;
}

export const useFockisFriendsStore =
  create<FockisFriendsState>(
    (set) => ({
      friends: [],

      requests: [],

      sentRequests: [],

      suggestions: [],

      setFriends: (data) =>
        set({
          friends: data,
        }),

      setRequests: (data) =>
        set({
          requests: data,
        }),

      setSentRequests: (data) =>
        set({
          sentRequests: data,
        }),

      setSuggestions: (data) =>
        set({
          suggestions: data,
        }),

      addFriend: (friend) =>
        set((state) => {
          const exists =
            state.friends.some(
              (existingFriend) =>
                String(
                  existingFriend.id,
                ) ===
                String(friend.id),
            );

          if (exists) {
            return state;
          }

          return {
            friends: [
              ...state.friends,
              friend,
            ],
          };
        }),

      removeFriend: (id) =>
        set((state) => ({
          friends:
            state.friends.filter(
              (friend) =>
                String(friend.id) !==
                String(id),
            ),
        })),

      removeRequest: (id) =>
        set((state) => ({
          requests:
            state.requests.filter(
              (request) =>
                String(
                  request._id,
                ) !==
                String(id),
            ),
        })),

      removeSentRequest: (id) =>
        set((state) => ({
          sentRequests:
            state.sentRequests.filter(
              (request) =>
                String(
                  request._id,
                ) !==
                String(id),
            ),
        })),

      /*
       * Remove a request from EVERY local request collection.
       *
       * This is what should be used after cancel/reject.
       */
      clearFriendRequest: (id) =>
        set((state) => ({
          requests:
            state.requests.filter(
              (request) =>
                String(
                  request._id,
                ) !==
                String(id),
            ),

          sentRequests:
            state.sentRequests.filter(
              (request) =>
                String(
                  request._id,
                ) !==
                String(id),
            ),
        })),
    }),
  );