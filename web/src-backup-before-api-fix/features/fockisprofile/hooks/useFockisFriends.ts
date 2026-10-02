import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  fockisFriendsApi,
} from "../service/fockisFriendsApi";

export function useFockisFriends() {
  const [
    friends,
    setFriends,
  ] = useState<any[]>([]);

  const [
    incomingRequests,
    setIncomingRequests,
  ] = useState<any[]>([]);

  const [
    sentRequests,
    setSentRequests,
  ] = useState<any[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* ==========================================================================
     FRIENDS
  ========================================================================== */

  const loadFriends = useCallback(
    async () => {
      const response =
        await fockisFriendsApi.getMyFriends();

      console.log(
        "[FOCKIS FRIENDS] MY FRIENDS:",
        response,
      );

      return response;
    },
    [],
  );

  /* ==========================================================================
     INCOMING REQUESTS
  ========================================================================== */

  const loadIncomingRequests = useCallback(
    async () => {
      const response =
        await fockisFriendsApi.getIncomingRequests();

      console.log(
        "[FOCKIS FRIENDS] INCOMING REQUESTS:",
        response,
      );

      if (Array.isArray(response)) {
        console.log(
          "[FOCKIS FRIENDS] INCOMING REQUEST COUNT:",
          response.length,
        );

        response.forEach(
          (request, index) => {
            console.log(
              `[FOCKIS FRIENDS] INCOMING REQUEST ${index}:`,
              {
                id:
                  request?._id ??
                  request?.id ??
                  null,

                requester:
                  request?.requester ??
                  null,

                requesterId:
                  request?.requesterId ??
                  null,

                receiver:
                  request?.receiver ??
                  null,

                receiverId:
                  request?.receiverId ??
                  null,

                status:
                  request?.status ??
                  null,
              },
            );
          },
        );
      }

      return response;
    },
    [],
  );

  /* ==========================================================================
     SENT REQUESTS
  ========================================================================== */

  const loadSentRequests = useCallback(
    async () => {
      const response =
        await fockisFriendsApi.getOutgoingRequests();

      console.log(
        "[FOCKIS FRIENDS] SENT REQUESTS:",
        response,
      );

      if (Array.isArray(response)) {
        console.log(
          "[FOCKIS FRIENDS] SENT REQUEST COUNT:",
          response.length,
        );
      }

      return response;
    },
    [],
  );

  /* ==========================================================================
     REFRESH
  ========================================================================== */

  const refresh = useCallback(
    async () => {
      setLoading(true);

      try {
        const [
          friendsResult,
          incomingResult,
          sentResult,
        ] = await Promise.all([
          loadFriends(),
          loadIncomingRequests(),
          loadSentRequests(),
        ]);

        setFriends(
          Array.isArray(friendsResult)
            ? friendsResult
            : [],
        );

        setIncomingRequests(
          Array.isArray(incomingResult)
            ? incomingResult
            : [],
        );

        setSentRequests(
          Array.isArray(sentResult)
            ? sentResult
            : [],
        );

        console.log(
          "[FOCKIS FRIENDS] REFRESH COMPLETE:",
          {
            friends:
              Array.isArray(friendsResult)
                ? friendsResult.length
                : 0,

            incoming:
              Array.isArray(incomingResult)
                ? incomingResult.length
                : 0,

            sent:
              Array.isArray(sentResult)
                ? sentResult.length
                : 0,
          },
        );
      } finally {
        setLoading(false);
      }
    },
    [
      loadFriends,
      loadIncomingRequests,
      loadSentRequests,
    ],
  );

  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */

  useEffect(() => {
    void refresh().catch(
      (error) => {
        console.error(
          "[FOCKIS FRIENDS] Failed to load friends data:",
          error,
        );

        setFriends([]);
        setIncomingRequests([]);
        setSentRequests([]);
        setLoading(false);
      },
    );
  }, [refresh]);

  /* ==========================================================================
     SEND REQUEST
  ========================================================================== */

  const sendRequest = useCallback(
    async (
      userId: string,
    ) => {
      console.log(
        "[FOCKIS FRIENDS] SEND REQUEST:",
        {
          userId,
        },
      );

      const response =
        await fockisFriendsApi.sendRequest(
          userId,
        );

      console.log(
        "[FOCKIS FRIENDS] SEND REQUEST RESPONSE:",
        response,
      );

      await refresh();

      return response;
    },
    [refresh],
  );

  /* ==========================================================================
     ACCEPT REQUEST
  ========================================================================== */

  const acceptRequest = useCallback(
    async (
      requestId: string,
    ) => {
      console.log(
        "[FOCKIS FRIENDS] ACCEPT REQUEST:",
        {
          requestId,
        },
      );

      const response =
        await fockisFriendsApi.acceptRequest(
          requestId,
        );

      console.log(
        "[FOCKIS FRIENDS] ACCEPT RESPONSE:",
        response,
      );

      await refresh();

      return response;
    },
    [refresh],
  );

  /* ==========================================================================
     REJECT REQUEST
  ========================================================================== */

  const rejectRequest = useCallback(
    async (
      requestId: string,
    ) => {
      console.log(
        "[FOCKIS FRIENDS] REJECT REQUEST:",
        {
          requestId,
        },
      );

      const response =
        await fockisFriendsApi.rejectRequest(
          requestId,
        );

      console.log(
        "[FOCKIS FRIENDS] REJECT RESPONSE:",
        response,
      );

      await refresh();

      return response;
    },
    [refresh],
  );

  /* ==========================================================================
     REMOVE FRIEND
  ========================================================================== */

  const removeFriend = useCallback(
    async (
      userId: string,
    ) => {
      console.log(
        "[FOCKIS FRIENDS] REMOVE FRIEND:",
        {
          userId,
        },
      );

      const response =
        await fockisFriendsApi.removeFriend(
          userId,
        );

      console.log(
        "[FOCKIS FRIENDS] REMOVE FRIEND RESPONSE:",
        response,
      );

      await refresh();

      return response;
    },
    [refresh],
  );

  /* ==========================================================================
     GET STATUS
  ========================================================================== */

  const getStatus = useCallback(
    async (
      userId: string,
    ) => {
      const response =
        await fockisFriendsApi.getStatus(
          userId,
        );

      console.log(
        "[FOCKIS FRIENDS] STATUS:",
        {
          userId,
          response,
        },
      );

      return response;
    },
    [],
  );

  /* ==========================================================================
     GET ANOTHER USER'S FRIENDS
  ========================================================================== */

  const getFriends = useCallback(
    async (
      userId: string,
    ) => {
      const response =
        await fockisFriendsApi.getFriends(
          userId,
        );

      console.log(
        "[FOCKIS FRIENDS] USER FRIENDS:",
        {
          userId,
          response,
        },
      );

      return response;
    },
    [],
  );

  /* ==========================================================================
     RETURN
  ========================================================================== */

  return {
    loading,

    friends,

    incomingRequests,

    sentRequests,

    refresh,

    loadFriends,

    loadIncomingRequests,

    loadSentRequests,

    sendRequest,

    acceptRequest,

    rejectRequest,

    removeFriend,

    getStatus,

    getFriends,
  };
}