/**
 * ============================================================================
 * FOCKIS MUSIC — CONTENT CATEGORY REGISTRY
 * ============================================================================
 *
 * SINGLE SOURCE OF TRUTH
 *
 * `value` is ALWAYS the canonical value sent to the backend.
 *
 * Frontend aliases such as:
 *
 *   movie
 *   film
 *   music-video
 *   live-performance
 *   behind-the-scenes
 *
 * are normalized before reaching the API.
 * ============================================================================
 */

export type MusicContentType =
  | 'song'
  | 'single'
  | 'album'
  | 'ep'
  | 'beat'
  | 'instrumental'
  | 'music'
  | 'audio'
  | 'track'
  | 'music_video'
  | 'video'
  | 'live_performance'
  | 'interview'
  | 'behind_the_scenes'
  | 'tutorial'
  | 'exclusive'
  | 'exclusive_video';

export type MusicMediaKind = 'audio' | 'video';

export interface MusicContentCategory {
  value: MusicContentType;
  label: string;
  mediaKind: MusicMediaKind;
  supportsPaid: boolean;
  supportsPreview: boolean;
  supportsDownload: boolean;
}

/**
 * ============================================================================
 * CANONICAL CATEGORIES
 * ============================================================================
 */
export const MUSIC_CONTENT_CATEGORIES: readonly MusicContentCategory[] = [
  // AUDIO
  {
    value: 'song',
    label: 'Song',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'single',
    label: 'Single',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'album',
    label: 'Album',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'ep',
    label: 'EP',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'beat',
    label: 'Beat',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'instrumental',
    label: 'Instrumental',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'music',
    label: 'Music',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'audio',
    label: 'Audio',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'track',
    label: 'Track',
    mediaKind: 'audio',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },

  // VIDEO
  {
    value: 'music_video',
    label: 'Music Video',
    mediaKind: 'video',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'video',
    label: 'Video',
    mediaKind: 'video',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'live_performance',
    label: 'Live Performance',
    mediaKind: 'video',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'interview',
    label: 'Interview',
    mediaKind: 'video',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'behind_the_scenes',
    label: 'Behind the Scenes',
    mediaKind: 'video',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'tutorial',
    label: 'Tutorial',
    mediaKind: 'video',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },

  // EXCLUSIVE
  {
    value: 'exclusive',
    label: 'Exclusive',
    mediaKind: 'video',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
  {
    value: 'exclusive_video',
    label: 'Exclusive Video',
    mediaKind: 'video',
    supportsPaid: true,
    supportsPreview: true,
    supportsDownload: true,
  },
] as const;

/**
 * ============================================================================
 * NORMALIZE ANY FRONTEND CATEGORY
 * ============================================================================
 *
 * This is the important part.
 *
 * Every page can safely call:
 *
 * normalizeMusicContentType(value)
 *
 * before sending data to the backend.
 */
export function normalizeMusicContentType(
  value: unknown,
): MusicContentType {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  switch (normalized) {
    // ------------------------------------------------------------------------
    // AUDIO
    // ------------------------------------------------------------------------

    case 'song':
    case 'songs':
      return 'song';

    case 'single':
    case 'singles':
      return 'single';

    case 'album':
    case 'albums':
      return 'album';

    case 'ep':
    case 'eps':
      return 'ep';

    case 'beat':
    case 'beats':
      return 'beat';

    case 'instrumental':
    case 'instrumentals':
      return 'instrumental';

    case 'music':
      return 'music';

    case 'audio':
    case 'audio_file':
      return 'audio';

    case 'track':
    case 'tracks':
      return 'track';

    // ------------------------------------------------------------------------
    // MUSIC VIDEO
    // ------------------------------------------------------------------------

    case 'music_video':
    case 'musicvideo':
    case 'music_videos':
    case 'mv':
      return 'music_video';

    // ------------------------------------------------------------------------
    // VIDEO
    // ------------------------------------------------------------------------

    case 'video':
    case 'videos':

    // Frontend aliases.
    case 'movie':
    case 'movies':
    case 'film':
    case 'films':
    case 'movie_video':
      return 'video';

    // ------------------------------------------------------------------------
    // LIVE PERFORMANCE
    // ------------------------------------------------------------------------

    case 'live_performance':
    case 'liveperformance':
    case 'live_show':
    case 'live_performances':
    case 'live':
      return 'live_performance';

    // ------------------------------------------------------------------------
    // INTERVIEW
    // ------------------------------------------------------------------------

    case 'interview':
    case 'interviews':
      return 'interview';

    // ------------------------------------------------------------------------
    // BEHIND THE SCENES
    // ------------------------------------------------------------------------

    case 'behind_the_scenes':
    case 'behindthescenes':
    case 'behind_scene':
    case 'behind_scenes':
    case 'bts':
      return 'behind_the_scenes';

    // ------------------------------------------------------------------------
    // TUTORIAL
    // ------------------------------------------------------------------------

    case 'tutorial':
    case 'tutorials':
    case 'how_to':
    case 'howto':
      return 'tutorial';

    // ------------------------------------------------------------------------
    // EXCLUSIVE
    // ------------------------------------------------------------------------

    case 'exclusive':
    case 'exclusives':
      return 'exclusive';

    // ------------------------------------------------------------------------
    // EXCLUSIVE VIDEO
    // ------------------------------------------------------------------------

    case 'exclusive_video':
    case 'exclusivevideo':
    case 'exclusive_videos':
      return 'exclusive_video';

    // ------------------------------------------------------------------------
    // INVALID
    // ------------------------------------------------------------------------

    default:
      throw new Error(
        `Unsupported music content type: "${String(value)}". ` +
          `Supported types: ${getMusicContentTypeValues().join(', ')}`,
      );
  }
}

/**
 * ============================================================================
 * GET CATEGORY
 * ============================================================================
 */
export function getMusicContentCategory(
  value: unknown,
): MusicContentCategory | undefined {
  try {
    const canonical = normalizeMusicContentType(value);

    return MUSIC_CONTENT_CATEGORIES.find(
      (category) => category.value === canonical,
    );
  } catch {
    return undefined;
  }
}

/**
 * ============================================================================
 * GET CANONICAL VALUES
 * ============================================================================
 */
export function getMusicContentTypeValues(): MusicContentType[] {
  return [
    'song',
    'single',
    'album',
    'ep',
    'beat',
    'instrumental',
    'music',
    'audio',
    'track',
    'music_video',
    'video',
    'live_performance',
    'interview',
    'behind_the_scenes',
    'tutorial',
    'exclusive',
    'exclusive_video',
  ];
}

/**
 * ============================================================================
 * MEDIA KIND
 * ============================================================================
 */
export function getMusicMediaKind(
  value: unknown,
): MusicMediaKind {
  const canonical = normalizeMusicContentType(value);

  const category = MUSIC_CONTENT_CATEGORIES.find(
    (item) => item.value === canonical,
  );

  return category?.mediaKind ?? 'audio';
}

/**
 * ============================================================================
 * AUDIO TYPE CHECK
 * ============================================================================
 */
export function isMusicAudioType(
  value: unknown,
): boolean {
  return getMusicMediaKind(value) === 'audio';
}

/**
 * ============================================================================
 * VIDEO TYPE CHECK
 * ============================================================================
 */
export function isMusicVideoType(
  value: unknown,
): boolean {
  return getMusicMediaKind(value) === 'video';
}