import type {
  ActivityItem,
  Analytics,
  ChatMessage,
  Effect,
  Gift,
  Guest,
  Product,
  Scene,
  Source,
  StreamInfo,
  Track,
} from "./types";

/**
 * ============================================================================
 * LIVE STUDIO DATA
 * ============================================================================
 *
 * UI defaults/configuration only.
 *
 * No fake users, chat, products, gifts, followers, or analytics.
 *
 * Real LIVE data comes from the backend and LiveKit.
 * ============================================================================
 */

/**
 * ============================================================================
 * CHAT
 * ============================================================================
 */

export const initialChatMessages: ChatMessage[] = [];

export const initialActivity: ActivityItem[] = [];

export const incomingChatPool: Omit<
  ChatMessage,
  "id" | "timestamp"
>[] = [];

/**
 * ============================================================================
 * SCENES
 * ============================================================================
 */

export const initialScenes: Scene[] = [
  {
    id: "main-camera",
    name: "Main Camera",
    thumbnailTone: "camera",
  },
  {
    id: "starting-soon",
    name: "Starting Soon",
    thumbnailTone: "intro",
  },
  {
    id: "screen-share",
    name: "Screen Share",
    thumbnailTone: "screen",
  },
  {
    id: "interview",
    name: "Interview",
    thumbnailTone: "interview",
  },
  {
    id: "ending",
    name: "Ending",
    thumbnailTone: "outro",
  },
];

/**
 * ============================================================================
 * SOURCES
 * ============================================================================
 */

export const sources: Source[] = [
  {
    id: "camera",
    type: "camera",
    label: "Camera",
  },
  {
    id: "screen",
    type: "screen",
    label: "Screen",
  },
  {
    id: "image",
    type: "image",
    label: "Image",
  },
  {
    id: "video",
    type: "video",
    label: "Video",
  },
  {
    id: "text",
    type: "text",
    label: "Text",
  },
  {
    id: "browser",
    type: "browser",
    label: "Browser",
  },
];

/**
 * ============================================================================
 * GUESTS
 * ============================================================================
 */

export const followerPool: Guest[] = [];

/**
 * ============================================================================
 * PRODUCTS
 * ============================================================================
 */

export const products: Product[] = [];

/**
 * ============================================================================
 * GIFTS
 * ============================================================================
 */

export const gifts: Gift[] = [];

/**
 * ============================================================================
 * MUSIC
 * ============================================================================
 */

export const tracks: Track[] = [];

/**
 * ============================================================================
 * ANALYTICS
 * ============================================================================
 */

export const analyticsSeed: Analytics = {
  currentViewers: 0,
  peakViewers: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  newFollowers: 0,
  giftRevenue: 0,
  totalRevenue: 0,
};

/**
 * ============================================================================
 * STREAM INFORMATION
 * ============================================================================
 *
 * IMPORTANT:
 *
 * title starts empty intentionally.
 *
 * The user must enter the LIVE title through the UI before going live.
 *
 * The title is NOT hard-coded here.
 * ============================================================================
 */

export const streamInfoSeed: StreamInfo = {
  title: "",
  description: "",
  category: "",
  visibility: "public",
  thumbnailUrl: null,
  saveReplay: true,
  allowComments: true,
  allowReactions: true,
  notifyFollowers: true,
};

/**
 * ============================================================================
 * EFFECTS
 * ============================================================================
 */

export const effects: Effect[] = [
  {
    id: "natural",
    category: "beauty",
    label: "Natural",
    swatchTone: "skin-1",
  },
  {
    id: "bright",
    category: "beauty",
    label: "Bright",
    swatchTone: "skin-2",
  },
  {
    id: "warm",
    category: "filters",
    label: "Warm",
    swatchTone: "warm",
  },
  {
    id: "cool",
    category: "filters",
    label: "Cool",
    swatchTone: "cool",
  },
  {
    id: "vintage",
    category: "filters",
    label: "Vintage",
    swatchTone: "vintage",
  },
  {
    id: "mono",
    category: "filters",
    label: "Black & White",
    swatchTone: "mono",
  },
  {
    id: "blur",
    category: "backgrounds",
    label: "Blur",
    swatchTone: "blur",
  },
  {
    id: "blur-strong",
    category: "backgrounds",
    label: "Background Blur",
    swatchTone: "blur-strong",
  },
];

/**
 * ============================================================================
 * ENDED ANALYTICS
 * ============================================================================
 */

export const endedAnalyticsSeed = {
  peakViewers: 0,
  totalViews: 0,
  watchTime: "0m",
  newFollowers: 0,
  likes: 0,
  shares: 0,
  revenue: 0,
};

/**
 * ============================================================================
 * STREAM CATEGORIES
 * ============================================================================
 */

export const streamCategories = [
  "Technology",
  "Gaming",
  "Music",
  "Art & Design",
  "Just Chatting",
  "Fitness",
];