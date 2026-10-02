export type PresenceStatus =
  | "online"
  | "offline";

/**
 * Public/user-facing identity used throughout Fockis Messages.
 *
 * `id` remains the internal application/database user ID.
 * `fockisId` is the identifier users can share with other Fockis users.
 */
export interface Participant {
  /** Internal Fockis user/database ID */
  id: string;

  /** Public Fockis ID used to find/message/call this user */
  fockisId: string;

  /** Display name */
  name: string;

  /** Public username */
  username: string;

  /** Primary avatar URL */
  avatar: string;

  /** Optional profile picture URL */
  profilePicture?: string;

  /** Current presence */
  presence: PresenceStatus;

  /** Last time the user was seen */
  lastSeen: string;

  /** Optional public bio/about text */
  bio?: string;

  /** Optional verification state */
  verified?: boolean;
}

/**
 * User returned as the other participant in a conversation.
 *
 * The backend can continue using `id` internally while exposing
 * `fockisId` as the public identity.
 */
export interface ConversationOtherUser {
  /** Internal Fockis user/database ID */
  id: string;

  /** Optional MongoDB-style identifier */
  _id?: string;

  /** Public Fockis ID */
  fockisId: string;

  /** Display name */
  name: string;

  /** Public username */
  username: string;

  /** Primary avatar URL */
  avatar: string;

  /** Optional profile picture URL */
  profilePicture?: string;

  /** Current presence */
  presence?: PresenceStatus;

  /** Last time the user was seen */
  lastSeen?: string;

  /** Optional public bio/about text */
  bio?: string;

  /** Optional verification state */
  verified?: boolean;
}

export interface Conversation {
  /** Conversation ID */
  id: string;

  /** Internal user IDs participating in this conversation */
  participantIds: string[];

  /** Whether this is a group conversation */
  isGroup: boolean;

  /** Group display name */
  groupName?: string;

  /** Group avatar */
  groupAvatar?: string;

  /** Last message ID */
  lastMessageId?: string;

  /** Number of unread messages for the current user */
  unreadCount: number;

  /** Last conversation activity */
  updatedAt: string;

  /** Whether the conversation is pinned */
  pinned?: boolean;

  /** Whether notifications are muted */
  muted?: boolean;

  /** Other participant for a direct conversation */
  otherUser?: ConversationOtherUser;
}