/**
 * newsApi.ts — Fockis News & Media API client (existing axios instance, so
 * the Fockis session token is attached automatically).
 */

import { api } from "../../api/api";

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);
const e = encodeURIComponent;

export function newsError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const x = err as { response?: { data?: { message?: unknown } }; message?: string };
  const msg = x?.response?.data?.message ?? x?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

/* ============================================================================
 * Vocabularies
 * ========================================================================== */

export const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  business: "Business",
  economy: "Economy",
  society: "Society",
  education: "Education",
  sports: "Sports",
  technology: "Technology",
  culture: "Culture",
  entertainment: "Entertainment",
  international: "International",
  local: "Local",
  health: "Health",
  opinion: "Opinion",
  environment: "Environment",
};

export const MEDIA_TYPE_LABELS: Record<string, string> = {
  online_newspaper: "Online Newspaper",
  news_journalism: "News & Journalism",
  tv_channel: "Television & News Channel",
  radio_station: "Radio Station",
  digital_magazine: "Digital Magazine",
  media_entertainment: "Media & Entertainment",
  podcast_network: "Podcast Network",
  news_agency: "News Agency",
  independent_journalism: "Independent Journalism",
};

export const LANGUAGE_LABELS: Record<string, string> = { en: "English", fr: "French", ht: "Haitian Creole", es: "Spanish" };

export const FOLLOW_PREF_LABELS: [string, string][] = [
  ["breaking", "Breaking News"],
  ["articles", "New Articles"],
  ["videos", "Videos"],
  ["liveTv", "Live TV"],
  ["liveRadio", "Live Radio"],
  ["podcasts", "Podcasts"],
  ["announcements", "Important Announcements"],
  ["dailyDigest", "Daily Digest"],
];

export const REQUEST_TYPES: { id: string; label: string; hint: string }[] = [
  { id: "coverage", label: "Request News Coverage", hint: "Ask us to investigate or cover a story." },
  { id: "interview", label: "Request an Interview", hint: "Invite us to interview a person or organization." },
  { id: "news_tip", label: "Submit a News Tip", hint: "Share information about an important event." },
  { id: "story", label: "Submit a Story", hint: "Send an article or community story." },
  { id: "advertising", label: "Advertising Request", hint: "Ask about advertising and sponsored content." },
  { id: "partnership", label: "Partnership Request", hint: "Propose a media partnership or collaboration." },
  { id: "correction", label: "Correction Request", hint: "Report inaccurate or misleading information." },
  { id: "general", label: "General Inquiry", hint: "Send another question or message." },
];

export const ARTICLE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted for Review",
  under_review: "Under Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
  rejected: "Rejected",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  received: "Received",
  under_review: "Under Review",
  assigned: "Assigned to Journalist",
  in_progress: "In Progress",
  more_info: "More Info Needed",
  completed: "Completed",
  declined: "Declined",
};

/* ============================================================================
 * Types
 * ========================================================================== */

export interface OutletRef {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  verified: boolean;
}

export interface OutletCard extends OutletRef {
  mediaType: string;
  coverUrl: string;
  tagline: string;
  country: string;
  city: string;
  followerCount: number;
  articleCount: number;
  websiteUrl: string;
  isFollowing: boolean;
  live: { tv: boolean; radio: boolean };
}

export interface ArticleCard {
  id: string;
  slug: string;
  headline: string;
  subtitle: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  language: string;
  city: string;
  country: string;
  isBreaking: boolean;
  sponsored: boolean;
  authorName: string;
  publishedAt: string | null;
  readingMinutes: number;
  views: number;
  hasVideo: boolean;
  outlet: OutletRef | null;
}

export interface MediaItemCard {
  id: string;
  kind: "video" | "podcast" | "tv_program" | "radio_program";
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  showName: string;
  episodeNumber: number | null;
  durationSec: number | null;
  presenters: string[];
  schedule: { days: number[]; startTime: string; endTime: string } | null;
  publishedAt: string | null;
  plays: number;
  outlet: OutletRef | null;
}

export interface LiveEntry {
  outlet: OutletCard;
  kind: "tv" | "radio";
  title: string;
  streamUrl: string;
  startedAt: string | null;
}

export interface NewsHome {
  breaking: ArticleCard[];
  top: ArticleCard | null;
  headlines: ArticleCard[];
  latest: ArticleCard[];
  trending: ArticleCard[];
  featured: ArticleCard[];
  sections: Record<"politics" | "business" | "education" | "sports" | "technology" | "culture" | "international" | "local", ArticleCard[]>;
  videos: MediaItemCard[];
  podcasts: MediaItemCard[];
  live: LiveEntry[];
  topMedia: OutletCard[];
}

export interface NewsFilters {
  country?: string;
  city?: string;
  language?: string;
  category?: string;
  mediaType?: string;
  outlet?: string;
  from?: string;
  to?: string;
  q?: string;
}

export interface Paged<T> {
  page: number;
  total: number;
  pageSize: number;
  items: T[];
}

export type Prefs = Record<string, boolean>;

export interface Campaign {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  goal: number;
  currency: string;
  deadline: string;
  status: "draft" | "active" | "closed";
  raised: number;
  supporters: number;
  progress: number;
  updates: { at: string | null; text: string; byName: string }[];
}

export interface MediaProfile extends OutletCard {
  about: string;
  address: string;
  email: string;
  phone: string;
  primaryLanguage: string;
  languages: string[];
  socials: Record<string, string>;
  foundedYear: number | null;
  publishedArticles: number;
  supportMessage: string;
  donationsEnabled: boolean;
  requestsEnabled: boolean;
  currency: string;
  liveInfo: { tvLive: boolean; tvStreamUrl: string; tvTitle: string; radioLive: boolean; radioStreamUrl: string; radioTitle: string };
  campaigns: Campaign[];
  team: { name: string; title: string; role: string; avatarUrl: string; bio: string }[];
  viewer: { isFollowing: boolean; muted: boolean; prefs: Prefs; canManage: boolean; role: string | null };
}

export interface ArticleFull extends ArticleCard {
  body: string;
  featuredImage: { url: string; caption?: string; credit?: string } | null;
  gallery: { url: string; caption?: string; credit?: string }[];
  videoUrl: string;
  audioUrl: string;
  sources: { title: string; url?: string }[];
  tags: string[];
  seo: { title?: string; description?: string; canonicalUrl?: string; shareImage?: string };
  likes: number;
  commentCount: number;
  commentsEnabled: boolean;
  updatedAt: string | null;
  preview: boolean;
  status: string;
  outletFull: OutletCard;
  originalUrl: string;
  viewer: { liked: boolean; bookmarked: boolean; following: boolean; signedIn: boolean };
  related: ArticleCard[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string | null;
}

export interface SupportPage {
  outlet: OutletCard;
  enabled: boolean;
  message: string;
  currency: string;
  suggested: number[];
  campaigns: Campaign[];
  supporters: { name: string; message: string; at: string | null }[];
  signedIn: boolean;
  privacy: string[];
}

export interface DonationStart {
  donationId: string;
  clientSecret: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  frequency: "once" | "monthly" | "annual";
}

export interface DonationReceipt {
  id: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  frequency: string;
  status: string;
  paidAt: string | null;
  anonymous: boolean;
  message: string;
  outlet: { name: string; slug: string; logoUrl: string };
  note?: string;
}

export interface RequestReceipt {
  reference: string;
  trackingCode: string;
  status: string;
  message: string;
  notice: string;
}

export interface RequestTracking {
  reference: string;
  type: string;
  typeLabel: string;
  subject: string;
  status: string;
  statusLabel: string;
  submittedAt: string | null;
  updatedAt: string | null;
  outlet: { name: string; slug: string };
  messages: { at: string | null; from: "staff" | "submitter"; byName: string; text: string }[];
  canReply: boolean;
}

/* ---- newsroom ---- */

export interface MyOutlet {
  id: string;
  slug: string;
  name: string;
  mediaType: string;
  logoUrl: string;
  verified: boolean;
  status: string;
  role: string;
  roleLabel: string;
  followerCount: number;
}

export interface OutletAdmin {
  id: string;
  slug: string;
  name: string;
  mediaType: string;
  logoUrl: string;
  coverUrl: string;
  tagline: string;
  about: string;
  country: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  primaryLanguage: string;
  languages: string[];
  socials: Record<string, string>;
  websiteUrl: string;
  foundedYear: number | null;
  verified: boolean;
  status: string;
  followerCount: number;
  organizationId: string | null;
  websiteId: string | null;
  settings: { commentsEnabled: boolean; donationsEnabled: boolean; requestsEnabled: boolean; supportMessage: string; currency: string; seoTitle: string; seoDescription: string; allowIndexing: boolean };
  live: { tvStreamUrl: string; tvLive: boolean; tvTitle: string; radioStreamUrl: string; radioLive: boolean; radioTitle: string };
  viewer: { role: string | null; roleLabel: string; permissions: string[] };
}

export interface WebsiteInfo {
  id: string;
  slug: string;
  status: "draft" | "published" | "suspended";
  url: string;
  primaryDomain: string | null;
  publishedAt: string | null;
  templateName: string;
  hasUnpublishedChanges: boolean;
  canEdit: boolean;
  domains: { domain: string; verification: string; ssl: string; primary: boolean }[];
}

export interface Dashboard {
  outlet: OutletAdmin;
  stats: {
    totalArticles: number;
    published: number;
    drafts: number;
    pendingReview: number;
    scheduled: number;
    totalViews: number;
    uniqueVisitors30: number;
    followers: number;
    donations: { currency: string; total: number; count: number }[] | null;
    activeCampaigns: number;
    pendingRequests: number | null;
    videoViews: number;
    liveNow: boolean;
  };
  viewsByDay: { day: string; views: number }[];
  recent: { id: string; action: string; detail: string; actorName: string; at: string | null }[];
}

export interface ArticleRow {
  id: string;
  headline: string;
  subtitle: string;
  slug: string;
  category: string;
  language: string;
  status: string;
  isBreaking: boolean;
  featured: boolean;
  featureRequested: boolean;
  distribution: { website: boolean; fockisNews: boolean; fockisNewsAt: string | null };
  authorName: string;
  authorUserId: string;
  isMine: boolean;
  imageUrl: string;
  publishedAt: string | null;
  fockisPublishedAt: string | null;
  updatedAt: string | null;
  views: number;
  likes: number;
  commentCount: number;
  aiAssisted: boolean;
  sponsored: boolean;
  reviewNote: string;
}

export interface ArticleEditorData extends ArticleRow {
  body: string;
  excerpt: string;
  featuredImage: { url: string; caption?: string; credit?: string } | null;
  gallery: { url: string; caption?: string; credit?: string }[];
  videoUrl: string;
  audioUrl: string;
  sources: { title: string; url?: string }[];
  tags: string[];
  country: string;
  city: string;
  seo: { title?: string; description?: string; canonicalUrl?: string; shareImage?: string };
  commentsEnabled: boolean;
  revisions: { at: string | null; byName: string; action: string; note: string; headline: string }[];
  permissions: { edit: boolean; submit: boolean; review: boolean; publish: boolean; archive: boolean; restore: boolean; breaking: boolean; delete: boolean };
}

export interface AiResult {
  action: string;
  headline: string;
  subtitle: string;
  bodyHtml: string;
  headlines: string[];
  summary: string;
  seo: { title: string; description: string };
  category: string;
  tags: string[];
  captions: string[];
  notice: string;
}

export interface TeamView {
  canManage: boolean;
  canConfigure: boolean;
  roles: { id: string; label: string }[];
  permissions: string[];
  rolePermissions: Record<string, string[]>;
  defaults: Record<string, string[]>;
  items: { id: string; userId: string; displayName: string; avatarUrl: string; role: string; roleLabel: string; title: string; bio: string; showOnProfile: boolean; joinedAt: string | null }[];
}

export interface MediaItemAdmin {
  id: string;
  kind: MediaItemCard["kind"];
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
  showName: string;
  episodeNumber: number | null;
  durationSec: number | null;
  presenters: string[];
  schedule: { days: number[]; startTime: string; endTime: string } | null;
  status: "draft" | "published" | "scheduled";
  publishedAt: string | null;
  plays: number;
  updatedAt: string | null;
}

export interface DonationsAdmin {
  currency: string;
  canRefund: boolean;
  summary: { total: number; oneTime: number; recurring: number; count: number; activePledges: number };
  monthly: { month: number; total: number }[];
  page: number;
  total: number;
  items: { id: string; amount: number; currency: string; frequency: string; donor: string; anonymous: boolean; message: string; campaign: string; status: string; receiptNumber: string; paidAt: string | null; refundedAt: string | null }[];
}

export interface RequestRow {
  id: string;
  reference: string;
  type: string;
  subject: string;
  status: string;
  priority: string;
  confidential: boolean;
  anonymous: boolean;
  contactName: string;
  assigneeName: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RequestDetail {
  id: string;
  reference: string;
  type: string;
  typeLabel: string;
  subject: string;
  description: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  attachments: string[];
  confidential: boolean;
  anonymous: boolean;
  status: string;
  priority: string;
  assigneeUserId: string | null;
  assigneeName: string;
  internalNotes: { at: string | null; byName: string; text: string }[];
  messages: { at: string | null; from: string; byName: string; text: string }[];
  history: { at: string | null; byName: string; action: string }[];
  createdAt: string | null;
  canAssign: boolean;
}

export interface Analytics {
  from: string;
  to: string;
  totals: { views: number; uniqueReaders: number; newFollowers: number; followers: number };
  byDay: { day: string; views: number; readers: number }[];
  topArticles: { id: string; headline: string; slug: string; views: number; readingMinutes: number | null }[];
  sources: { source: string; views: number }[];
  languages: { language: string; views: number }[];
  donations: { currency: string; total: number; count: number }[] | null;
  requests: Record<string, number>;
  plays: Record<string, number>;
  notTracked: string[];
}

/* ============================================================================
 * Calls
 * ========================================================================== */

const P = "/news/public";
const N = "/news/newsroom";
const o = (id: string) => `${N}/outlets/${e(id)}`;

export const newsApi = {
  /** Uploads through the existing Fockis /uploads pipeline; returns a permanent URL. */
  uploadFile: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const up = await api.post(`/uploads`, form, { params: { context: "news" }, headers: { "Content-Type": "multipart/form-data" }, timeout: 180000 });
    const u = up.data as { storageKey?: string; media?: string; url?: string };
    const apiBase = String(api.defaults.baseURL ?? "").replace(/\/+$/, "");
    const url = u.storageKey ? `${apiBase}/uploads/media/${String(u.storageKey).replace(/^\/+/, "")}` : u.media ?? u.url ?? "";
    if (!url) throw new Error("Upload succeeded but no file URL was returned.");
    return url;
  },

  /* ---- readers ---- */
  home: (f: NewsFilters = {}) => data<NewsHome>(api.get(`${P}/home`, { params: f })),
  articles: (q: NewsFilters & { section?: string; page?: number }) => data<Paged<ArticleCard>>(api.get(`${P}/articles`, { params: q })),
  media: (kind: string, page = 1, outlet?: string) => data<Paged<MediaItemCard>>(api.get(`${P}/media/${e(kind)}`, { params: { page, outlet } })),
  live: () => data<LiveEntry[]>(api.get(`${P}/live`)),
  topMedia: () => data<OutletCard[]>(api.get(`${P}/top-media`)),
  directory: (q: { type?: string; q?: string; country?: string; city?: string; language?: string; verified?: string; sort?: string; page?: number }) =>
    data<Paged<OutletCard> & { counts: Record<string, number> }>(api.get(`${P}/outlets`, { params: q })),
  profile: (slug: string) => data<MediaProfile>(api.get(`${P}/outlets/${e(slug)}`)),
  outletArticles: (slug: string, q: { category?: string; page?: number } = {}) => data<Paged<ArticleCard>>(api.get(`${P}/outlets/${e(slug)}/articles`, { params: q })),
  read: (slug: string, articleSlug: string) => data<ArticleFull>(api.get(`${P}/read/${e(slug)}/${e(articleSlug)}`)),
  comments: (articleId: string) => data<{ items: Comment[] }>(api.get(`${P}/articles/${e(articleId)}/comments`)),
  supportPage: (slug: string) => data<SupportPage>(api.get(`${P}/outlets/${e(slug)}/support`)),
  submitRequest: (slug: string, input: Record<string, unknown>) => data<RequestReceipt>(api.post(`${P}/outlets/${e(slug)}/requests`, input)),
  track: (reference: string, code: string) => data<RequestTracking>(api.post(`${P}/requests/track`, { reference, code })),
  trackReply: (reference: string, code: string, text: string) => data<RequestTracking>(api.post(`${P}/requests/track/reply`, { reference, code, text })),

  like: (articleId: string, on: boolean) => data<{ on: boolean }>(api.post(`/news/articles/${e(articleId)}/like`, { on })),
  bookmark: (articleId: string, on: boolean) => data<{ on: boolean }>(api.post(`/news/articles/${e(articleId)}/bookmark`, { on })),
  bookmarks: (page = 1) => data<{ page: number; items: ArticleCard[] }>(api.get(`/news/me/bookmarks`, { params: { page } })),
  addComment: (articleId: string, body: string) => data<Comment>(api.post(`/news/articles/${e(articleId)}/comments`, { body })),
  deleteComment: (id: string) => data(api.delete(`/news/comments/${e(id)}`)),
  follow: (outletId: string) => data<{ isFollowing: boolean; muted: boolean; prefs: Prefs }>(api.post(`/news/outlets/${e(outletId)}/follow`)),
  unfollow: (outletId: string) => data<{ isFollowing: boolean; muted: boolean; prefs: Prefs }>(api.delete(`/news/outlets/${e(outletId)}/follow`)),
  setPrefs: (outletId: string, input: { prefs?: Prefs; muted?: boolean; all?: boolean }) => data<{ isFollowing: boolean; muted: boolean; prefs: Prefs }>(api.put(`/news/outlets/${e(outletId)}/follow`, input)),
  myFollows: () => data<{ items: { outlet: OutletCard; muted: boolean; prefs: Prefs }[] }>(api.get(`/news/me/follows`)),
  startDonation: (slug: string, input: { amount: number; frequency: string; campaignId?: string; anonymous?: boolean; showName?: boolean; message?: string; pledgeId?: string }) =>
    data<DonationStart>(api.post(`/news/outlets/${e(slug)}/donations`, input)),
  confirmDonation: (donationId: string, paymentIntentId: string) => data<DonationReceipt>(api.post(`/news/donations/${e(donationId)}/confirm`, { paymentIntentId })),
  myDonations: () =>
    data<{ items: DonationReceipt[]; pledges: { id: string; amount: number; currency: string; frequency: string; nextDueAt: string | null; due: boolean; outlet: { name: string; slug: string }; campaignId: string | null }[] }>(api.get(`/news/me/donations`)),
  cancelPledge: (id: string) => data(api.post(`/news/me/pledges/${e(id)}/cancel`)),

  /* ---- newsroom ---- */
  mine: () => data<{ items: MyOutlet[] }>(api.get(`${N}/mine`)),
  linkableOrgs: () => data<{ items: { id: string; name: string; type: string; logoUrl: string }[] }>(api.get(`${N}/organizations`)),
  slugAvailable: (slug: string) => data<{ slug: string; available: boolean; reason: string }>(api.get(`${N}/slug-available`, { params: { slug } })),
  createOutlet: (input: Record<string, unknown>) => data<{ id: string; slug: string; website: { id: string; url: string; status: string; slug: string } | null; websiteNote: string }>(api.post(`${N}/outlets`, input, { timeout: 60000 })),
  outlet: (id: string) => data<OutletAdmin>(api.get(o(id))),
  updateOutlet: (id: string, input: Record<string, unknown>) => data<OutletAdmin>(api.patch(o(id), input)),
  setLive: (id: string, input: Record<string, unknown>) => data<OutletAdmin>(api.put(`${o(id)}/live`, input)),
  createWebsite: (id: string, templateSlug?: string) => data<{ website: WebsiteInfo | null; note: string }>(api.post(`${o(id)}/website`, { templateSlug }, { timeout: 60000 })),
  website: (id: string) => data<{ website: WebsiteInfo | null }>(api.get(`${o(id)}/website`)),
  dashboard: (id: string) => data<Dashboard>(api.get(`${o(id)}/dashboard`)),
  analytics: (id: string, q: { from?: string; to?: string }) => data<Analytics>(api.get(`${o(id)}/analytics`, { params: q })),
  followers: (id: string, page = 1) =>
    data<{ total: number; muted: number; newLast30Days: number; prefs: Record<string, number>; page: number; pageSize: number; items: { name: string; avatarUrl: string; at: string | null; muted: boolean }[] }>(api.get(`${o(id)}/followers`, { params: { page } })),
  categoryCounts: (id: string) => data<{ items: { category: string; total: number; published: number; views: number }[] }>(api.get(`${o(id)}/categories`)),
  audit: (id: string) => data<{ items: { id: string; action: string; detail: string; actorName: string; at: string | null }[] }>(api.get(`${o(id)}/audit`)),

  team: (id: string) => data<TeamView>(api.get(`${o(id)}/team`)),
  addMember: (id: string, input: { identifier: string; role: string; title?: string }) => data<TeamView>(api.post(`${o(id)}/team`, input)),
  updateMember: (id: string, memberId: string, input: Record<string, unknown>) => data<TeamView>(api.patch(`${o(id)}/team/${e(memberId)}`, input)),
  removeMember: (id: string, memberId: string) => data(api.delete(`${o(id)}/team/${e(memberId)}`)),
  savePermissions: (id: string, map: Record<string, string[]>) => data<TeamView>(api.put(`${o(id)}/permissions`, map)),

  listArticles: (id: string, q: { status?: string; q?: string; mine?: string; category?: string; breaking?: string; page?: number }) =>
    data<Paged<ArticleRow> & { counts: Record<string, number> }>(api.get(`${o(id)}/articles`, { params: q })),
  createArticle: (id: string, input: Record<string, unknown>) => data<ArticleEditorData>(api.post(`${o(id)}/articles`, input)),
  getArticle: (id: string, aid: string) => data<ArticleEditorData>(api.get(`${o(id)}/articles/${e(aid)}`)),
  updateArticle: (id: string, aid: string, input: Record<string, unknown>) => data<ArticleEditorData>(api.patch(`${o(id)}/articles/${e(aid)}`, input)),
  articleAction: (id: string, aid: string, input: { action: string; note?: string; scheduledAt?: string; confirmAiReviewed?: boolean }) =>
    data<ArticleEditorData>(api.post(`${o(id)}/articles/${e(aid)}/action`, input)),
  deleteArticle: (id: string, aid: string) => data(api.delete(`${o(id)}/articles/${e(aid)}`)),
  ai: (id: string, input: Record<string, unknown>) => data<AiResult>(api.post(`${o(id)}/ai`, input, { timeout: 90000 })),

  items: (id: string, kind: string) => data<{ canManage: boolean; items: MediaItemAdmin[] }>(api.get(`${o(id)}/items`, { params: { kind } })),
  saveItem: (id: string, itemId: string | null, input: Record<string, unknown>) =>
    data<MediaItemAdmin>(itemId ? api.patch(`${o(id)}/items/${e(itemId)}`, input) : api.post(`${o(id)}/items`, input)),
  deleteItem: (id: string, itemId: string) => data(api.delete(`${o(id)}/items/${e(itemId)}`)),

  adminComments: (id: string, status = "visible") =>
    data<{ items: { id: string; body: string; userName: string; createdAt: string | null; status: string; article: { headline: string; slug: string } | null }[] }>(api.get(`${o(id)}/comments`, { params: { status } })),
  moderate: (id: string, cid: string, hide: boolean) => data(api.post(`${o(id)}/comments/${e(cid)}/moderate`, { hide })),

  donations: (id: string, q: { status?: string; campaignId?: string; frequency?: string; page?: number } = {}) => data<DonationsAdmin>(api.get(`${o(id)}/donations`, { params: q })),
  exportDonations: (id: string) => data<{ items: Record<string, unknown>[] }>(api.get(`${o(id)}/donations/export`)),
  refund: (id: string, did: string) => data(api.post(`${o(id)}/donations/${e(did)}/refund`)),
  campaigns: (id: string) => data<{ canManage: boolean; items: Campaign[] }>(api.get(`${o(id)}/campaigns`)),
  saveCampaign: (id: string, cid: string | null, input: Record<string, unknown>) => data<Campaign>(cid ? api.patch(`${o(id)}/campaigns/${e(cid)}`, input) : api.post(`${o(id)}/campaigns`, input)),

  requests: (id: string, q: { type?: string; status?: string; page?: number }) =>
    data<{ page: number; total: number; openByType: Record<string, number>; canAssign: boolean; items: RequestRow[] }>(api.get(`${o(id)}/requests`, { params: q })),
  request: (id: string, rid: string) => data<RequestDetail>(api.get(`${o(id)}/requests/${e(rid)}`)),
  updateRequest: (id: string, rid: string, input: Record<string, unknown>) => data<RequestDetail>(api.patch(`${o(id)}/requests/${e(rid)}`, input)),
};

/* ============================================================================
 * Formatting helpers
 * ========================================================================== */

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hour${Math.floor(s / 3600) === 1 ? "" : "s"} ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) === 1 ? "" : "s"} ago`;
  return fmtDate(iso);
}

export function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, withTime ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" });
}

export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function money(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export const articlePath = (a: { slug: string; outlet: { slug: string } | null }) => (a.outlet ? `/news/${a.outlet.slug}/${a.slug}` : "/news");
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
