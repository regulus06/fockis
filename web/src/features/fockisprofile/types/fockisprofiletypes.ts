export type ProfileTab =
  | "posts"
  | "friends"
  | "about"
  | "photos"
  | "marketplace";


/* ============================================================================
   USER
============================================================================ */

export interface FockisUser {
  id: string;

  _id?: string;

  name?: string;

  fullName?: string;

  username?: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  avatar?: string;

  profileImage?: string;

  profilePicture?: string;

  avatarUrl?: string;

  coverImage?: string;

  coverImageUrl?: string;

  banner?: string;

  bannerUrl?: string;

  bio?: string;

  location?: string;

  website?: string;

  verified?: boolean;

  isVerified?: boolean;

  online?: boolean;

  isOnline?: boolean;

  joinedDate?: string;

  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================================
   PROFILE STATS
============================================================================ */

export interface FockisProfileStats {
  posts: number;

  friends: number;

  followers: number;

  following: number;
}


/* ============================================================================
   POST
============================================================================ */

export interface FockisPost {
  id: string;

  _id?: string;

  content?: string;

  text?: string;

  images?: string[];

  image?: string;

  mediaUrl?: string;

  createdAt?: string;

  updatedAt?: string;

  author?: FockisUser;

  user?: FockisUser;

  likesCount?: number;

  commentsCount?: number;

  sharesCount?: number;

  /*
   * Kept because the Fockis profile post UI
   * displays these directly.
   */
  likes?: number;

  comments?: number;

  shares?: number;
}


/*
 * Alias used by FockisProfilePosts.
 */
export type FockisProfilePost = FockisPost;


/* ============================================================================
   FRIEND
============================================================================ */

export interface FockisFriend {
  id: string;

  _id?: string;

  fullName: string;

  username?: string;

  avatar?: string;

  profileImage?: string;

  mutualFriends?: number;

  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================================
   FRIEND RELATIONSHIP
============================================================================ */

export interface FockisFriendRelationship {
  friendshipId: string;

  friend: FockisFriend;

  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================================
   FRIEND REQUEST
============================================================================ */

export interface FockisFriendRequest {
  _id: string;

  requesterId?: FockisUser | string;

  recipientId?: FockisUser | string;

  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "cancelled";

  respondedAt?: string | null;

  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================================
   FOLLOW
============================================================================ */

export interface FollowStatus {
  isFollowing: boolean;

  isFollowedBy: boolean;
}


/* ============================================================================
   FRIENDSHIP STATUS
============================================================================ */

export type FockisFriendshipStatus =
  | "self"
  | "none"
  | "friends"
  | "request_sent"
  | "request_received"
  | "blocked";


export interface FriendshipStatus {
  friendshipStatus: FockisFriendshipStatus;

  requestId: string | null;

  isFriend: boolean;
}


/* ============================================================================
   PROFILE
============================================================================ */

export interface FockisProfile {
  user: FockisUser;

  stats: FockisProfileStats;

  posts: FockisPost[];

  friends: FockisFriend[];

  followers?: FockisFriend[];

  following?: FockisFriend[];
}


/* ============================================================================
   PROFILE CARD PROPS
============================================================================ */

/*
 * The profile page currently renders:
 *
 * <FockisProfileCard
 *   profile={profile}
 *   canEdit={canEdit}
 *   onEditProfile={onEditProfile}
 *   onAddFriend={onAddFriend}
 * />
 *
 * These types are kept separate from FockisProfile so the card can
 * evolve without changing the backend profile response.
 */

export interface FockisProfileCardProps {
  profile: FockisProfile;

  canEdit?: boolean;

  onEditProfile?: () => void;

  onAddFriend?: () => Promise<void> | void;
}


/* ============================================================================
   UPDATE PROFILE
============================================================================ */

export interface UpdateProfilePayload {
  name?: string;

  fullName?: string;

  firstName?: string;

  lastName?: string;

  username?: string;

  bio?: string;

  location?: string;

  website?: string;

  avatar?: File;

  profileImage?: File;

  coverImage?: File;
}


/* ============================================================================
   PAGINATION
============================================================================ */

export interface PaginatedResponse<T> {
  items: T[];

  pagination: {
    page: number;

    limit: number;

    total: number;

    pages: number;
  };
}