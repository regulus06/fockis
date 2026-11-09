/* ============================================================================
   FOCKIS CONVERSATION MAPPER

   Converts a MongoDB conversation into the object returned to the frontend.

   DIRECT CONVERSATIONS
   --------------------
   The frontend receives the OTHER user's public profile information.

   IMPORTANT
   ---------
   - `id` / `_id` remain the internal MongoDB user ID.
   - `fockisId` is the public Fockis identity.
   - Messages, conversations, and WebRTC signaling continue using internal
     MongoDB IDs behind the scenes.
============================================================================ */

export function mapConversation(
  conversation: any,
  userId: string,
) {
  /* --------------------------------------------------------------------------
     STORAGE HELPERS
  -------------------------------------------------------------------------- */

  const unreadCounts =
    conversation.unreadCounts instanceof Map
      ? conversation.unreadCounts
      : new Map(
          Object.entries(
            conversation.unreadCounts || {},
          ),
        );

  const pinnedBy =
    conversation.pinnedBy instanceof Map
      ? conversation.pinnedBy
      : new Map(
          Object.entries(
            conversation.pinnedBy || {},
          ),
        );

  const archivedBy =
    conversation.archivedBy instanceof Map
      ? conversation.archivedBy
      : new Map(
          Object.entries(
            conversation.archivedBy || {},
          ),
        );

  const markedUnreadBy =
    conversation.markedUnreadBy instanceof Map
      ? conversation.markedUnreadBy
      : new Map(
          Object.entries(
            conversation.markedUnreadBy || {},
          ),
        );

  const lastMessage =
    summarizeLastMessage(
      conversation.lastMessageId,
      userId,
    );

  const mutedBy =
    conversation.mutedBy instanceof Map
      ? conversation.mutedBy
      : new Map(
          Object.entries(
            conversation.mutedBy || {},
          ),
        );

  /* --------------------------------------------------------------------------
     PARTICIPANTS

     `participantIds` normally contains populated User documents because
     ConversationsService uses:

       .populate({
         path: "participantIds",
         select: userSelect,
       })

     It can also contain raw ObjectIds, so both formats are supported.
  -------------------------------------------------------------------------- */

  const participants = Array.isArray(
    conversation.participantIds,
  )
    ? conversation.participantIds
    : [];

  const participantIds =
    participants.map(
      (participant: any) =>
        String(
          participant?._id ||
            participant,
        ),
    );

  /* --------------------------------------------------------------------------
     FIND OTHER USER

     Only direct conversations expose `otherUser`.
  -------------------------------------------------------------------------- */

  let otherUser: any = null;

  if (
    !conversation.isGroup &&
    participants.length > 0
  ) {
    const currentUserId =
      String(userId);

    const otherParticipant =
      participants.find(
        (participant: any) =>
          String(
            participant?._id ||
              participant,
          ) !== currentUserId,
      );

    /* ------------------------------------------------------------------------
       ONLY BUILD PROFILE DATA WHEN USER IS POPULATED.

       A raw ObjectId does not contain public profile information.
    ------------------------------------------------------------------------ */

    if (
      otherParticipant &&
      typeof otherParticipant === "object" &&
      otherParticipant._id
    ) {
      /* ----------------------------------------------------------------------
         NAME
      ---------------------------------------------------------------------- */

      const firstName =
        String(
          otherParticipant.firstName ||
            "",
        ).trim();

      const lastName =
        String(
          otherParticipant.lastName ||
            "",
        ).trim();

      const fullName =
        [firstName, lastName]
          .filter(Boolean)
          .join(" ");

      const username =
        String(
          otherParticipant.username ||
            "",
        ).trim();

      /* ----------------------------------------------------------------------
         AVATAR
      ---------------------------------------------------------------------- */

      const avatar =
        String(
          otherParticipant.profilePicture ||
            "",
        ).trim();

      /* ----------------------------------------------------------------------
         PRESENCE
      ---------------------------------------------------------------------- */

      const presence =
        Boolean(
          otherParticipant.online,
        )
          ? "online"
          : "offline";

      /* ----------------------------------------------------------------------
         LAST SEEN
      ---------------------------------------------------------------------- */

      let lastSeen = "";

      if (
        otherParticipant.lastSeen
      ) {
        const parsedLastSeen =
          new Date(
            otherParticipant.lastSeen,
          );

        if (
          !Number.isNaN(
            parsedLastSeen.getTime(),
          )
        ) {
          lastSeen =
            parsedLastSeen.toISOString();
        }
      }

      /* ----------------------------------------------------------------------
         PUBLIC FOCKIS ID

         IMPORTANT:

         Never fall back to MongoDB `_id`.

         The MongoDB ID is an internal identifier.

         Fockis ID examples:

           FK3FUK3L
           FKECB2EV
      ---------------------------------------------------------------------- */

      const rawFockisId =
        String(
          otherParticipant.fockisId ||
            "",
        ).trim();

      const fockisId =
        rawFockisId
          ? rawFockisId.toUpperCase()
          : "";

      /* ----------------------------------------------------------------------
         BIO

         These fields may not be included by every User query, so safely
         default them when unavailable.
      ---------------------------------------------------------------------- */

      const bio =
        String(
          otherParticipant.bio ||
            "",
        ).trim();

      /* ----------------------------------------------------------------------
         VERIFIED
      ---------------------------------------------------------------------- */

      const verified =
        Boolean(
          otherParticipant.verified,
        );

      /* ----------------------------------------------------------------------
         FRONTEND PROFILE OBJECT
      ---------------------------------------------------------------------- */

      otherUser = {
        /*
         * INTERNAL DATABASE ID
         *
         * Used internally by the application for:
         *
         * - conversation APIs
         * - message APIs
         * - Socket.IO authorization
         * - WebRTC signaling
         *
         * It should not be presented as the user's public Fockis identity.
         */
        id: String(
          otherParticipant._id,
        ),

        _id: String(
          otherParticipant._id,
        ),

        /*
         * PUBLIC FOCKIS ID
         *
         * This is the identity users can share with each other.
         */
        fockisId,

        name:
          fullName ||
          username ||
          "User",

        username,

        avatar,

        profilePicture:
          avatar,

        presence,

        lastSeen,

        bio,

        verified,
      };
    }
  }

  /* --------------------------------------------------------------------------
     LAST MESSAGE
  -------------------------------------------------------------------------- */

  const lastMessageId =
    conversation.lastMessageId
      ? String(
          conversation.lastMessageId?._id ||
            conversation.lastMessageId,
        )
      : undefined;

  /* --------------------------------------------------------------------------
     UPDATED AT
  -------------------------------------------------------------------------- */

  const rawUpdatedAt =
    conversation.updatedAt ||
    conversation.createdAt ||
    Date.now();

  const parsedUpdatedAt =
    new Date(rawUpdatedAt);

  const updatedAt =
    Number.isNaN(
      parsedUpdatedAt.getTime(),
    )
      ? new Date().toISOString()
      : parsedUpdatedAt.toISOString();

  /* --------------------------------------------------------------------------
     RETURN NORMALIZED CONVERSATION
  -------------------------------------------------------------------------- */

  return {
    /*
     * Conversation ID is still the internal MongoDB conversation ID.
     */
    id: String(
      conversation._id,
    ),

    participantIds,

    isGroup:
      Boolean(
        conversation.isGroup,
      ),

    ...(conversation.groupName
      ? {
          groupName:
            conversation.groupName,
        }
      : {}),

    ...(conversation.groupAvatar
      ? {
          groupAvatar:
            conversation.groupAvatar,
        }
      : {}),

    ...(lastMessageId
      ? {
          lastMessageId,
        }
      : {}),

    /*
     * Group conversations list their members (public profile fields only)
     * so the client can show "Sender: preview" and member avatars.
     */
    ...(conversation.isGroup
      ? {
          members: participants
            .filter((p: any) => p && typeof p === "object" && p._id)
            .map((p: any) => ({
              id: String(p._id),
              name:
                [p.firstName, p.lastName].filter(Boolean).join(" ").trim() ||
                String(p.username || "User"),
              username: String(p.username || ""),
              avatar: String(p.profilePicture || ""),
              presence: p.online ? "online" : "offline",
            })),
        }
      : {}),

    /*
     * Direct conversations receive the OTHER user's profile.
     */
    ...(otherUser
      ? {
          otherUser,
        }
      : {}),

    /*
     * Unread count belongs to the authenticated user.
     */
    unreadCount:
      Number(
        unreadCounts.get(
          String(userId),
        ) || 0,
      ),

    updatedAt,

    /*
     * Pinned state belongs to the authenticated user.
     */
    pinned:
      Boolean(
        pinnedBy.get(
          String(userId),
        ),
      ),

    /*
     * Muted state belongs to the authenticated user.
     */
    muted:
      Boolean(
        mutedBy.get(
          String(userId),
        ),
      ),
    archived:
      Boolean(
        archivedBy.get(
          String(userId),
        ),
      ),
    markedUnread:
      Boolean(
        markedUnreadBy.get(
          String(userId),
        ),
      ),
    ...(lastMessage
      ? {
          lastMessage,
        }
      : {}),
  };
}

/* ============================================================================
   LAST MESSAGE SUMMARY (conversation list preview)
   Only present when lastMessageId was populated. Hidden when the current
   user deleted it for themselves.
============================================================================ */

function summarizeLastMessage(
  raw: any,
  userId: string,
) {
  if (!raw || typeof raw !== "object" || !raw._id) {
    return undefined;
  }

  const ids = (list: any[] | undefined) =>
    (list || []).map((id: any) => String(id?._id || id));

  if (ids(raw.deletedForMeBy).includes(String(userId))) {
    return undefined;
  }

  const senderId = String(raw.senderId?._id || raw.senderId || "");
  const attachments = Array.isArray(raw.attachments) ? raw.attachments : [];
  let status = raw.status || "sent";

  if (senderId === String(userId)) {
    if (ids(raw.readBy).some((id) => id !== senderId)) status = "read";
    else if (ids(raw.deliveredTo).some((id) => id !== senderId)) status = "delivered";
  }

  return {
    id: String(raw._id),
    senderId,
    type: String(raw.type || "text"),
    text: raw.deletedForEveryone ? "" : String(raw.text || "").slice(0, 160),
    attachmentKind: attachments[0]?.kind ? String(attachments[0].kind) : undefined,
    attachmentCount: attachments.length,
    deletedForEveryone: Boolean(raw.deletedForEveryone),
    systemLabel: raw.systemLabel ? String(raw.systemLabel) : undefined,
    status,
    createdAt: new Date(raw.createdAt || Date.now()).toISOString(),
  };
}