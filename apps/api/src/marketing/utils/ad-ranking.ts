import {
  AdvertisementDocument,
} from "../schemas/advertisement.schema";

/* ============================================================
   AD RANKING
============================================================ */

export interface AdRankingContext {
  userRelevance?: number;
  expectedCtr?: number;
  qualityScore?: number;
  advertiserBid?: number;
}

export function calculateAdRankingScore(
  ad: AdvertisementDocument,
  context: AdRankingContext = {},
): number {
  const impressions =
    Math.max(
      ad.impressions,
      1,
    );

  const ctr =
    ad.clicks /
    impressions;

  const quality =
    context.qualityScore ??
    ad.qualityScore ??
    0;

  const relevance =
    context.userRelevance ??
    ad.relevanceScore ??
    0;

  const expectedCtr =
    context.expectedCtr ??
    ctr;

  const bid =
    context.advertiserBid ??
    1;

  const score =
    (
      expectedCtr *
      0.35
    ) +
    (
      quality *
      0.25
    ) +
    (
      relevance *
      0.25
    ) +
    (
      bid *
      0.15
    );

  return Number(
    score.toFixed(6),
  );
}

/* ============================================================
   UPDATE RANKING
============================================================ */

export function updateAdvertisementRanking(
  ad: AdvertisementDocument,
): number {
  const score =
    calculateAdRankingScore(
      ad,
    );

  ad.rankingScore =
    score;

  return score;
}