/**
 * musicCharts.ts
 * -----------------------------------------------------------------------------
 * Shared chart types, normalization, classification, ranking,
 * and formatting helpers for Fockis Music.
 *
 * Keeps MusicChartsPage and chart components small and focused.
 */

/* ============================================================================
 * TYPES
 * ========================================================================== */

export type ChartTab = "all" | "music" | "videos";

export interface ChartItem {
  id: string;
  title: string;
  creator: string;
  type: string;
  accessType: string;
  price: number | null;
  plays: number;
  thumbnailUrl: string | null;
  duration: string | null;
  rank: number;
}

export type UnknownRecord = Record<string, unknown>;

/* ============================================================================
 * BASIC TYPE HELPERS
 * ========================================================================== */

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function firstString(
  record: UnknownRecord,
  keys: string[],
): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function firstNumber(
  record: UnknownRecord,
  keys: string[],
): number {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

export function getNestedRecord(
  record: UnknownRecord,
  key: string,
): UnknownRecord | null {
  const value = record[key];

  return isRecord(value) ? value : null;
}

/* ============================================================================
 * ID NORMALIZATION
 * ========================================================================== */

function getIdValue(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (isRecord(value)) {
    const nestedId =
      value.$oid ??
      value.id ??
      value._id;

    if (
      typeof nestedId === "string" &&
      nestedId.trim()
    ) {
      return nestedId.trim();
    }
  }

  return "";
}

function firstId(
  record: UnknownRecord,
  keys: string[],
): string {
  for (const key of keys) {
    const id = getIdValue(record[key]);

    if (id) {
      return id;
    }
  }

  return "";
}

/* ============================================================================
 * API RESPONSE EXTRACTION
 * ========================================================================== */

/**
 * Supports multiple API response shapes.
 *
 * Examples:
 *
 *   [...]
 *
 *   { items: [...] }
 *
 *   { results: [...] }
 *
 *   { data: [...] }
 *
 *   { content: [...] }
 *
 *   { tracks: [...] }
 *
 *   { videos: [...] }
 *
 * Also supports nested response shapes such as:
 *
 *   { data: { items: [...] } }
 *
 *   { content: { results: [...] } }
 */
export function extractItems(
  response: unknown,
): UnknownRecord[] {
  if (Array.isArray(response)) {
    return response.filter(isRecord);
  }

  if (!isRecord(response)) {
    return [];
  }

  const possibleArrays: unknown[] = [
    response.items,
    response.results,
    response.data,
    response.content,
    response.music,
    response.tracks,
    response.videos,
  ];

  for (const candidate of possibleArrays) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }

    if (isRecord(candidate)) {
      const nestedArrays: unknown[] = [
        candidate.items,
        candidate.results,
        candidate.data,
        candidate.content,
        candidate.music,
        candidate.tracks,
        candidate.videos,
      ];

      for (const nested of nestedArrays) {
        if (Array.isArray(nested)) {
          return nested.filter(isRecord);
        }
      }
    }
  }

  return [];
}

/* ============================================================================
 * CHART ITEM NORMALIZATION
 * ========================================================================== */

export function normalizeChartItem(
  item: UnknownRecord,
  index: number,
): ChartItem {
  const creatorObject =
    getNestedRecord(item, "producer") ??
    getNestedRecord(item, "creator") ??
    getNestedRecord(item, "artist") ??
    getNestedRecord(item, "owner");

  const title =
    firstString(item, [
      "title",
      "name",
      "trackTitle",
      "contentTitle",
    ]) || "Untitled";

  const creator =
    firstString(item, [
      "producerName",
      "creatorName",
      "artistName",
      "authorName",
      "displayName",
    ]) ||
    (creatorObject
      ? firstString(creatorObject, [
          "displayName",
          "name",
          "username",
          "stageName",
        ])
      : "") ||
    "Fockis Creator";

  const rawType = firstString(item, [
    "type",
    "contentType",
    "mediaType",
    "mediaKind",
    "kind",
  ]).toLowerCase();

  const accessType = firstString(item, [
    "accessType",
    "access",
    "visibility",
  ]).toLowerCase();

  const priceValue = firstNumber(item, [
    "price",
    "priceCents",
    "amount",
    "amountCents",
    "priceUsd",
  ]);

  /*
   * Some APIs return price in cents while others return a display amount.
   * The chart only needs a useful positive indicator here, so we preserve
   * the numeric value rather than trying to silently convert currencies.
   */
  const hasPrice =
    priceValue > 0 ||
    accessType === "paid" ||
    accessType === "premium" ||
    accessType === "exclusive" ||
    accessType === "preview_paid";

  const plays = Math.max(
    0,
    firstNumber(item, [
      "plays",
      "playCount",
      "totalPlays",
      "viewCount",
      "views",
      "streamCount",
      "paidPlayCount",
      "paidListenCount",
    ]),
  );

  const thumbnailUrl =
    firstString(item, [
      "thumbnailUrl",
      "coverUrl",
      "artworkUrl",
      "imageUrl",
      "coverImage",
      "thumbnail",
    ]) || null;

  const duration =
    firstString(item, [
      "duration",
      "formattedDuration",
      "durationFormatted",
    ]) || null;

  const id =
    firstId(item, [
      "id",
      "_id",
      "contentId",
    ]) || `chart-${index}`;

  return {
    id,
    title,
    creator,
    type: rawType || "song",
    accessType: accessType || "free",
    price: hasPrice
      ? Math.max(0, priceValue)
      : null,
    plays,
    thumbnailUrl,
    duration,
    rank: index + 1,
  };
}

/* ============================================================================
 * MEDIA CLASSIFICATION
 * ========================================================================== */

export function isVideo(
  item: ChartItem,
): boolean {
  const type = item.type
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();

  return (
    type.includes("video") ||
    type.includes("performance") ||
    type.includes("interview") ||
    type.includes("tutorial") ||
    type.includes("behind") ||
    type.includes("documentary") ||
    type.includes("visual")
  );
}

export function isMusic(
  item: ChartItem,
): boolean {
  return !isVideo(item);
}

/* ============================================================================
 * PLAY COUNT FORMATTING
 * ========================================================================== */

export function formatPlays(
  value: number,
): string {
  const safeValue = Math.max(
    0,
    Number.isFinite(value) ? value : 0,
  );

  if (safeValue >= 1_000_000_000) {
    const formatted = (
      safeValue / 1_000_000_000
    )
      .toFixed(
        safeValue >= 10_000_000_000 ? 0 : 1,
      )
      .replace(/\.0$/, "");

    return `${formatted}B`;
  }

  if (safeValue >= 1_000_000) {
    const formatted = (
      safeValue / 1_000_000
    )
      .toFixed(
        safeValue >= 10_000_000 ? 0 : 1,
      )
      .replace(/\.0$/, "");

    return `${formatted}M`;
  }

  if (safeValue >= 1_000) {
    const formatted = (
      safeValue / 1_000
    )
      .toFixed(
        safeValue >= 10_000 ? 0 : 1,
      )
      .replace(/\.0$/, "");

    return `${formatted}K`;
  }

  return Math.floor(safeValue).toLocaleString();
}

/* ============================================================================
 * TYPE FORMATTING
 * ========================================================================== */

export function formatType(
  type: string,
): string {
  const normalized = type
    .replace(/[_-]/g, " ")
    .trim();

  if (!normalized) {
    return "Music";
  }

  return (
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1)
  );
}

/* ============================================================================
 * ICON / ACCENT HELPERS
 * ========================================================================== */

export function getMediaIcon(
  item: ChartItem,
): string {
  return isVideo(item)
    ? "🎬"
    : "🎵";
}

export function getAccentClass(
  rank: number,
): string {
  if (rank === 1) {
    return "music-chart-rank-gold";
  }

  if (rank === 2) {
    return "music-chart-rank-silver";
  }

  if (rank === 3) {
    return "music-chart-rank-bronze";
  }

  return "";
}

/* ============================================================================
 * RANKING
 * ========================================================================== */

export function rankItems(
  items: ChartItem[],
): ChartItem[] {
  return [...items]
    .sort((a, b) => {
      if (b.plays !== a.plays) {
        return b.plays - a.plays;
      }

      const titleComparison =
        a.title.localeCompare(
          b.title,
          undefined,
          {
            sensitivity: "base",
          },
        );

      if (titleComparison !== 0) {
        return titleComparison;
      }

      return a.id.localeCompare(b.id);
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

/* ============================================================================
 * FILTERING
 * ========================================================================== */

export function filterChartItems(
  items: ChartItem[],
  tab: ChartTab,
): ChartItem[] {
  if (tab === "music") {
    return rankItems(
      items.filter(isMusic),
    );
  }

  if (tab === "videos") {
    return rankItems(
      items.filter(isVideo),
    );
  }

  return rankItems(items);
}

/* ============================================================================
 * SECTION LABELS
 * ========================================================================== */

export function getChartSectionLabel(
  tab: ChartTab,
): string {
  switch (tab) {
    case "music":
      return "MUSIC";

    case "videos":
      return "VIDEOS";

    case "all":
    default:
      return "ALL CONTENT";
  }
}