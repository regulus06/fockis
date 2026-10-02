/* ============================================================================
   FOCKIS AD FREQUENCY CONFIG

   Controls where delivered advertisements are inserted into the organic feed.

   The backend still decides whether an advertisement is eligible.
   This file only controls the frontend insertion frequency.
============================================================================ */

export const AD_CONFIG = {
  /*
   * Insert an ad after every N organic posts.
   *
   * TESTING:
   * 2 means:
   *
   *   Post 1
   *   Post 2
   *   AD
   *
   *   Post 3
   *   Post 4
   *   AD
   */
  feedFrequency: 2,

  /*
   * Minimum conceptual spacing between ad slots.
   *
   * Kept here for future frequency controls.
   */
  minimumPostGap: 2,

  /*
   * Maximum number of ads requested for one feed session.
   */
  maxAdsPerSession: 8,
};

/* ============================================================================
   SHOULD SHOW AD AT INDEX
============================================================================ */

export function shouldShowAdAtIndex(
  postIndex: number,
  adSlotsUsedSoFar: number,
): boolean {
  if (
    adSlotsUsedSoFar >=
    AD_CONFIG.maxAdsPerSession
  ) {
    return false;
  }

  const safeIndex = Math.max(
    0,
    Math.floor(Number(postIndex) || 0),
  );

  const position = safeIndex + 1;

  /*
   * Do not show an advertisement until the configured number
   * of organic posts has appeared.
   */
  if (
    position <
    AD_CONFIG.feedFrequency
  ) {
    return false;
  }

  return (
    (position -
      AD_CONFIG.feedFrequency) %
      AD_CONFIG.feedFrequency ===
    0
  );
}

/* ============================================================================
   COUNT AD SLOTS BEFORE INDEX
============================================================================ */

export function countAdSlotsBeforeIndex(
  postIndex: number,
): number {
  let count = 0;

  const safePostIndex = Math.max(
    0,
    Math.floor(Number(postIndex) || 0),
  );

  for (
    let i = 0;
    i < safePostIndex;
    i += 1
  ) {
    if (
      shouldShowAdAtIndex(
        i,
        count,
      )
    ) {
      count += 1;
    }
  }

  return count;
}