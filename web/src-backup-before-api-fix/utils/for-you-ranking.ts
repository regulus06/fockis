export type FeedItem = {
  _id: string;
  createdAt: string;
  likes?: number;
  shares?: number;
  views?: number;
  comments?: any[];
  score?: number;
  type: string;
  user?: string;
};

export function calculateForYouScore(
  item: FeedItem,
  userProfile?: {
    likedCreators?: string[];
    interactedTypes?: string[];
  },
) {
  const now = Date.now();
  const created = new Date(item.createdAt).getTime();

  const ageHours = (now - created) / (1000 * 60 * 60);

  // =========================
  // BASE ENGAGEMENT SIGNALS
  // =========================
  const likeWeight = 3;
  const commentWeight = 5;
  const shareWeight = 8;
  const viewWeight = 1;

  const engagementScore =
    (item.likes || 0) * likeWeight +
    (item.comments?.length || 0) * commentWeight +
    (item.shares || 0) * shareWeight +
    (item.views || 0) * viewWeight;

  // =========================
  // FRESHNESS BOOST
  // =========================
  const freshnessBoost = Math.max(0, 50 - ageHours * 2);

  // =========================
  // PERSONALIZATION BOOST
  // =========================
  let personalBoost = 0;

  if (userProfile?.interactedTypes?.includes(item.type)) {
    personalBoost += 15;
  }

  if (userProfile?.likedCreators?.includes(item.user || '')) {
    personalBoost += 25;
  }

  // =========================
  // FINAL SCORE
  // =========================
  return engagementScore + freshnessBoost + personalBoost;
}