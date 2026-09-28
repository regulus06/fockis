export const BUSINESS_RAIL_AFTER_POST = 2;
export const DEALS_RAIL_AFTER_POST = 5;
export const EVENTS_RAIL_AFTER_POST = 8;

const RAIL_SEQUENCE = [
  "requests",
  "suggestions",
  "friends",
] as const;

export type RailKind =
  (typeof RAIL_SEQUENCE)[number];

export function getRailAfterPost(
  postIndex: number,
): RailKind | null {
  const positionInFeed = postIndex + 1;

  if (positionInFeed < 4) {
    return null;
  }

  const offset = positionInFeed - 4;

  if (offset % 5 !== 0) {
    return null;
  }

  return RAIL_SEQUENCE[
    (offset / 5) % RAIL_SEQUENCE.length
  ];
}