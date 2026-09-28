export type AvatarTone =
  | "coral"
  | "violet"
  | "amber"
  | "teal"
  | "blue"
  | "ready"
  | "signal";

export type Phase =
  | "setup"
  | "starting"
  | "live"
  | "ending"
  | "ended";

export type ConnectionQuality =
  | "excellent"
  | "good"
  | "poor"
  | "reconnecting"
  | "offline";

export type PanelId =
  | "settings"
  | "guests"
  | "effects"
  | "music"
  | "products"
  | "gifts"
  | "analytics"
  | "polls"
  | "qna"
  | null;

export interface ChatMessage {
  id: string;
  username: string;
  avatarTone?: AvatarTone;
  message: string;
  timestamp: string;
  isQuestion?: boolean;
  isModerator?: boolean;
  isPinned?: boolean;
}

export interface ActivityItem {
  id: string;
  username: string;
  action: string;
  timestamp: string;
  avatarTone?: AvatarTone;
}

export interface Scene {
  id: string;
  name: string;
  thumbnailTone:
    | "camera"
    | "intro"
    | "screen"
    | "interview"
    | "outro";
}

export type SourceType =
  | "camera"
  | "screen"
  | "image"
  | "video"
  | "text"
  | "browser";

export interface Source {
  id: string;
  type: SourceType;
  label: string;
}

export interface StudioSourceState {
  imageUrl: string | null;
  videoUrl: string | null;
  text: string;
  browserUrl: string | null;
  activeSource: SourceType | null;
}

export type GuestStatus =
  | "invited"
  | "accepted"
  | "connected"
  | "muted"
  | "declined"
  | "removed"
  | "left";

export interface Guest {
  id: string;
  name: string;
  avatarTone: AvatarTone;
  status: GuestStatus;

  isFollower?: boolean;
  username?: string;
  avatarUrl?: string;

  streamId?: string;
  hostId?: string;
  invitationId?: string;
  message?: string;
}

export interface UserByIdDTO {
  _id?: string;
  id?: string;

  username?: string;

  firstName?: string;
  lastName?: string;

  displayName?: string;
  name?: string;

  profilePicture?: string;
  avatar?: string;

  [key: string]: unknown;
}

export interface LiveGuestDTO {
  id: string;
  streamId: string;

  /*
   * These can be missing on an invitation before
   * the API response has been fully normalized.
   */
  hostId?: string;
  guestUserId?: string;

  status:
    | "invited"
    | "accepted"
    | "declined"
    | "connected"
    | "removed"
    | "left";

  message?: string;

  invitedAt?: string | null;
  respondedAt?: string | null;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  removedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;

  host?: UserByIdDTO;
  guest?: UserByIdDTO;

  [key: string]: unknown;
}

export interface LiveGuestInvitationDTO
  extends LiveGuestDTO {
  invitationId?: string;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  rating: number;

  imageTone:
    | "coral"
    | "blue"
    | "amber"
    | "violet";

  inStock: boolean;
}

export interface Gift {
  id: string;
  label: string;
  icon: string;
  coinCost: number;
}

export interface SentGift {
  id: string;
  username: string;
  giftLabel: string;
  giftIcon: string;
  timestamp: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
}

export interface Analytics {
  currentViewers: number;
  peakViewers: number;
  likes: number;
  comments: number;
  shares: number;
  newFollowers: number;
  giftRevenue: number;
  totalRevenue: number;
}

export type Visibility =
  | "public"
  | "followers"
  | "private";

export interface StreamInfo {
  title: string;
  description: string;
  category: string;
  visibility: Visibility;

  thumbnailUrl: string | null;

  saveReplay: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  notifyFollowers: boolean;
}

export type EffectCategory =
  | "beauty"
  | "filters"
  | "backgrounds";

export interface Effect {
  id: string;
  category: EffectCategory;
  label: string;
  swatchTone: string;
}

export type DeviceStatus =
  | "connected"
  | "disconnected"
  | "permission-denied"
  | "unavailable";

export interface DeviceState {
  camera: DeviceStatus;
  microphone: DeviceStatus;

  cameraEnabled: boolean;
  micEnabled: boolean;
  screenShareEnabled: boolean;
}

export type GuestLayout =
  | "solo"
  | "side-by-side"
  | "guest-full"
  | "grid-2"
  | "grid-4";