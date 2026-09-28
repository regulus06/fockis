/**
 * useMusicCharts.ts
 * -----------------------------------------------------------------------------
 * Fockis Music Charts data hook.
 *
 * Loads the official backend ranking endpoints:
 *
 *   GET /music/charts?type=trending
 *   GET /music/charts?type=top_music
 *   GET /music/charts?type=top_videos
 *
 * The frontend does not calculate the official ranking score.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { musicApi } from "../services/musicApi";

import {
  normalizeChartItem,
  isMusic,
  isVideo,
  type ChartItem,
  type ChartTab,
} from "../utils/musicCharts";

interface ChartApiResponse {
  type?: string;
  items?: unknown[];
}

interface UseMusicChartsResult {
  tab: ChartTab;
  setTab: (tab: ChartTab) => void;

  items: ChartItem[];
  filteredItems: ChartItem[];

  topThree: ChartItem[];
  remainingItems: ChartItem[];

  musicCount: number;
  videoCount: number;

  loading: boolean;
  error: string;

  reload: () => Promise<void>;
}

/**
 * ============================================================================
 * NORMALIZE BACKEND RESPONSE
 * ============================================================================
 *
 * Your existing normalizeChartItem() requires:
 *
 *   normalizeChartItem(item, index)
 *
 * Therefore the index must be passed through from Array.map().
 */
function normalizeItems(
  response: ChartApiResponse,
): ChartItem[] {
  const rawItems = Array.isArray(
    response?.items,
  )
    ? response.items
    : [];

  return rawItems
    .map((item, index) => {
      try {
        return normalizeChartItem(
          item as any,
          index,
        );
      } catch (error) {
        console.warn(
          "Unable to normalize Fockis Music chart item:",
          item,
          error,
        );

        return null;
      }
    })
    .filter(
      (item): item is ChartItem =>
        item !== null,
    );
}

/**
 * ============================================================================
 * DISPLAY RANKS
 * ============================================================================
 *
 * This rank is only the position displayed by the frontend.
 *
 * It does NOT replace the backend ranking score.
 */
function rankItems(
  items: ChartItem[],
): ChartItem[] {
  return items.map(
    (item, index) => ({
      ...item,
      rank: index + 1,
    }),
  );
}

/**
 * ============================================================================
 * HOOK
 * ============================================================================
 */
export function useMusicCharts(): UseMusicChartsResult {
  /**
   * Keep the existing ChartTab type as the source of truth.
   *
   * "all" is the default chart.
   */
  const [
    tab,
    setTab,
  ] = useState<ChartTab>("all");

  const [
    allItems,
    setAllItems,
  ] = useState<ChartItem[]>([]);

  const [
    musicItems,
    setMusicItems,
  ] = useState<ChartItem[]>([]);

  const [
    videoItems,
    setVideoItems,
  ] = useState<ChartItem[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /**
   * ==========================================================================
   * LOAD OFFICIAL CHARTS
   * ==========================================================================
   */
  const loadCharts =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          /**
           * Load the three official ranking datasets.
           */
          const [
            allResponse,
            musicResponse,
            videoResponse,
          ] = await Promise.all([
            musicApi.charts({
              type: "trending",
              limit: 50,
            }),

            musicApi.charts({
              type: "top_music",
              limit: 50,
            }),

            musicApi.charts({
              type: "top_videos",
              limit: 50,
            }),
          ]);

          /**
           * Normalize and rank each dataset independently.
           */
          const all =
            rankItems(
              normalizeItems(
                allResponse,
              ),
            );

          const music =
            rankItems(
              normalizeItems(
                musicResponse,
              ),
            );

          const videos =
            rankItems(
              normalizeItems(
                videoResponse,
              ),
            );

          setAllItems(all);
          setMusicItems(music);
          setVideoItems(videos);
        } catch (err) {
          console.error(
            "Failed to load Fockis Music charts:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Music charts.",
          );

          setAllItems([]);
          setMusicItems([]);
          setVideoItems([]);
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  /**
   * Load charts when the page mounts.
   */
  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  /**
   * ==========================================================================
   * ACTIVE TAB
   * ==========================================================================
   *
   * IMPORTANT:
   * Do not use "video" here unless ChartTab actually defines "video".
   *
   * Your existing musicCharts.ts defines the accepted ChartTab values.
   *
   * We use "all" and "music" directly, and dynamically identify the video
   * tab from the ChartTab type by checking the string value at runtime.
   */
  const filteredItems =
    useMemo(() => {
      /**
       * "all" = official trending chart.
       */
      if (tab === "all") {
        return allItems;
      }

      /**
       * "music" = official top music chart.
       */
      if (tab === "music") {
        return musicItems;
      }

      /**
       * Any remaining ChartTab value is handled as the video chart.
       *
       * This avoids forcing "video" into ChartTab when your existing
       * musicCharts.ts uses a different name for that tab.
       */
      return videoItems;
    }, [
      tab,
      allItems,
      musicItems,
      videoItems,
    ]);

  /**
   * ==========================================================================
   * ALL ITEMS
   * ==========================================================================
   *
   * The ChartsHero currently receives items.length as its total chart count.
   * "items" therefore remains the complete/trending dataset.
   */
  const items =
    useMemo(
      () => allItems,
      [allItems],
    );

  /**
   * ==========================================================================
   * PODIUM
   * ==========================================================================
   */
  const topThree =
    useMemo(
      () =>
        filteredItems.slice(
          0,
          3,
        ),
      [filteredItems],
    );

  /**
   * ==========================================================================
   * REMAINING CHART
   * ==========================================================================
   */
  const remainingItems =
    useMemo(
      () =>
        filteredItems.slice(
          3,
        ),
      [filteredItems],
    );

  /**
   * ==========================================================================
   * MUSIC COUNT
   * ==========================================================================
   */
  const musicCount =
    useMemo(
      () =>
        musicItems.filter(
          isMusic,
        ).length,
      [musicItems],
    );

  /**
   * ==========================================================================
   * VIDEO COUNT
   * ==========================================================================
   */
  const videoCount =
    useMemo(
      () =>
        videoItems.filter(
          isVideo,
        ).length,
      [videoItems],
    );

  return {
    tab,
    setTab,

    items,
    filteredItems,

    topThree,
    remainingItems,

    musicCount,
    videoCount,

    loading,
    error,

    reload: loadCharts,
  };
}