import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { musicApi } from '../services/musicApi';

import {
  CONTENT_TYPES,
  COUNTRIES,
  INITIAL_FORM,
  MAX_SERIES_EPISODES,
} from '../constants/musicCreateRelease.constants';

import {
  addDays,
  formatCurrency,
  getCountryCurrency,
  getMinimumDateTime as getMinimumDateTimeHelper,
  getMinorUnitAmount,
  parseApiError,
  slugify,
} from '../helpers/musicCreateRelease.helpers';

import type {
  MusicContent,
  MusicContentType,
} from '../types/music.types';

import {
  getMusicContentCategory,
  getMusicMediaKind,
  normalizeMusicContentType,
} from '../types/musicContentCategories';

import type {
  CreationMode,
  FormState,
  PublishMode,
  SeriesEpisode,
  SeriesFrequency,
  SeriesReleaseMode,
} from '../types/musicCreateRelease.types';

import type {
  CreateMusicSeriesEpisodePayload,
} from '../services/musicApi';

// ============================================================================
// TYPES
// ============================================================================

type MusicCreateStatus =
  | 'draft'
  | 'published'
  | 'scheduled';

type SeriesEpisodeMediaKind =
  | 'audio'
  | 'video';

interface MusicCreateReleaseContextValue {
  // --------------------------------------------------------------------------
  // FORM
  // --------------------------------------------------------------------------

  form: FormState;

  creationMode: CreationMode;

  seriesEpisodes: SeriesEpisode[];

  seriesReleaseMode: SeriesReleaseMode;

  episodesPerRelease: number;

  seriesFrequency: SeriesFrequency;

  seriesInterval: number;

  firstSeriesRelease: string;

  publishMode: PublishMode;

  // --------------------------------------------------------------------------
  // EDIT MODE
  // --------------------------------------------------------------------------

  editContentId: string | null;

  isEditMode: boolean;

  loadingExistingContent: boolean;

  existingContent: MusicContent | null;

  existingMediaStorageKey: string;

  existingCoverStorageKey: string;

  // --------------------------------------------------------------------------
  // UI STATE
  // --------------------------------------------------------------------------

  saving: boolean;

  progress: number;

  error: string | null;

  coverPreviewError: boolean;

  // --------------------------------------------------------------------------
  // DERIVED
  // --------------------------------------------------------------------------

  selectedCountry: ReturnType<
    typeof getCountryCurrency
  >;

  selectedContentType:
    | (typeof CONTENT_TYPES)[number]
    | undefined;

  requiresPrice: boolean;

  showPreviewDuration: boolean;

  isVideoContent: boolean;

  contentLabel: string;

  formattedPrice: string;

  // --------------------------------------------------------------------------
  // FILES
  // --------------------------------------------------------------------------

  mediaFile: File | null;

  episodeFiles: Record<
    string,
    File | null
  >;

  // --------------------------------------------------------------------------
  // FORM ACTIONS
  // --------------------------------------------------------------------------

  updateField: <
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K],
  ) => void;

  setMediaFile: (
    file: File | null,
  ) => void;

  setEpisodeFile: (
    id: string,
    file: File | null,
  ) => void;

  setCreationMode: (
    mode: CreationMode,
  ) => void;

  selectContentType: (
    type: MusicContentType,
  ) => void;

  setSeriesReleaseMode: (
    mode: SeriesReleaseMode,
  ) => void;

  setEpisodesPerRelease: (
    value: number,
  ) => void;

  setSeriesFrequency: (
    value: SeriesFrequency,
  ) => void;

  setSeriesInterval: (
    value: number,
  ) => void;

  setFirstSeriesRelease: (
    value: string,
  ) => void;

  setPublishMode: (
    mode: PublishMode,
  ) => void;

  setCoverPreviewError: (
    value: boolean,
  ) => void;

  // --------------------------------------------------------------------------
  // SERIES
  // --------------------------------------------------------------------------

  addEpisode: () => void;

  removeEpisode: (
    id: string,
  ) => void;

  updateEpisode: (
    id: string,
    field: keyof SeriesEpisode,
    value: string,
  ) => void;

  setEpisodeMediaKind: (
    id: string,
    mediaKind: SeriesEpisodeMediaKind,
  ) => void;

  moveEpisode: (
    index: number,
    direction: 'up' | 'down',
  ) => void;

  calculateSeriesReleaseDate: (
    index: number,
  ) => string | undefined;

  // --------------------------------------------------------------------------
  // SUBMIT
  // --------------------------------------------------------------------------

  submit: (
    event: FormEvent,
    mode: PublishMode,
  ) => Promise<void>;

  reset: () => void;

  getMinimumDateTime: () => string;
}

// ============================================================================
// PROFESSIONAL FOCKIS MEDIA LIMITS
// ============================================================================

const MB = 1024 * 1024;

const GB =
  1024 *
  1024 *
  1024;

interface MediaUploadLimit {
  maxDurationSeconds: number;
  maxFileSizeBytes: number;
  label: string;
}

// ============================================================================
// CONTENT-SPECIFIC LIMITS
// ============================================================================

const MEDIA_UPLOAD_LIMITS: Record<
  string,
  MediaUploadLimit
> = {
  song: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
    label: 'Songs / Singles',
  },

  single: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
    label: 'Songs / Singles',
  },

  beat: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
    label: 'Songs / Singles',
  },

  instrumental: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
    label: 'Songs / Singles',
  },

  album: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
    label: 'Albums / Long Audio',
  },

  ep: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
    label: 'Albums / Long Audio',
  },

  music: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
    label: 'Long Audio',
  },

  audio: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
    label: 'Long Audio',
  },

  track: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
    label: 'Long Audio',
  },

  music_video: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      4 * GB,
    label: 'Music Videos',
  },

  video: {
    maxDurationSeconds:
      8 * 60 * 60,
    maxFileSizeBytes:
      20 * GB,
    label: 'Long-form Video',
  },

  live_performance: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      30 * GB,
    label: 'Recorded Live Streams',
  },

  interview: {
    maxDurationSeconds:
      8 * 60 * 60,
    maxFileSizeBytes:
      20 * GB,
    label: 'Long-form Video',
  },

  behind_the_scenes: {
    maxDurationSeconds:
      8 * 60 * 60,
    maxFileSizeBytes:
      20 * GB,
    label: 'Long-form Video',
  },

  tutorial: {
    maxDurationSeconds:
      8 * 60 * 60,
    maxFileSizeBytes:
      20 * GB,
    label: 'Long-form Video',
  },

  exclusive_video: {
    maxDurationSeconds:
      8 * 60 * 60,
    maxFileSizeBytes:
      20 * GB,
    label: 'Long-form Video',
  },

  exclusive: {
    maxDurationSeconds:
      8 * 60 * 60,
    maxFileSizeBytes:
      20 * GB,
    label: 'Long-form Video',
  },
};

// ============================================================================
// DEFAULT LIMITS
// ============================================================================

const DEFAULT_AUDIO_LIMIT: MediaUploadLimit = {
  maxDurationSeconds:
    12 * 60 * 60,
  maxFileSizeBytes:
    2 * GB,
  label: 'Audio',
};

const DEFAULT_VIDEO_LIMIT: MediaUploadLimit = {
  maxDurationSeconds:
    8 * 60 * 60,
  maxFileSizeBytes:
    20 * GB,
  label: 'Video',
};

// ============================================================================
// LIMIT HELPERS
// ============================================================================

function getMediaUploadLimit(
  contentType: string,
  mediaKind:
    | 'audio'
    | 'video',
): MediaUploadLimit {
  const normalized =
    contentType
      .trim()
      .toLowerCase();

  const configured =
    MEDIA_UPLOAD_LIMITS[
      normalized
    ];

  if (configured) {
    return configured;
  }

  return mediaKind === 'video'
    ? DEFAULT_VIDEO_LIMIT
    : DEFAULT_AUDIO_LIMIT;
}

function formatBytes(
  bytes: number,
): string {
  if (bytes >= GB) {
    return `${Number(
      (bytes / GB).toFixed(2),
    )} GB`;
  }

  return `${Number(
    (bytes / MB).toFixed(0),
  )} MB`;
}

function formatDuration(
  seconds: number,
): string {
  const totalSeconds =
    Math.max(
      0,
      Math.floor(seconds),
    );

  const hours =
    Math.floor(
      totalSeconds / 3600,
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) /
        60,
    );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}

function validateMediaFileSize(
  file: File,
  limit: MediaUploadLimit,
): string | null {
  if (
    file.size >
    limit.maxFileSizeBytes
  ) {
    return (
      `The selected file is too large. ` +
      `${limit.label} support files up to ` +
      `${formatBytes(
        limit.maxFileSizeBytes,
      )}. ` +
      `Your file is ${formatBytes(
        file.size,
      )}.`
    );
  }

  return null;
}

// ============================================================================
// MEDIA DURATION
// ============================================================================

async function getMediaDuration(
  file: File,
): Promise<number | null> {
  return new Promise(
    (resolve) => {
      const objectUrl =
        URL.createObjectURL(
          file,
        );

      const cleanup = () => {
        URL.revokeObjectURL(
          objectUrl,
        );
      };

      if (
        file.type
          .toLowerCase()
          .startsWith('audio/')
      ) {
        const audio =
          document.createElement(
            'audio',
          );

        audio.preload =
          'metadata';

        audio.onloadedmetadata =
          () => {
            const duration =
              Number(
                audio.duration,
              );

            cleanup();

            resolve(
              Number.isFinite(
                duration,
              )
                ? duration
                : null,
            );
          };

        audio.onerror = () => {
          cleanup();
          resolve(null);
        };

        audio.src =
          objectUrl;

        return;
      }

      if (
        file.type
          .toLowerCase()
          .startsWith('video/')
      ) {
        const video =
          document.createElement(
            'video',
          );

        video.preload =
          'metadata';

        video.onloadedmetadata =
          () => {
            const duration =
              Number(
                video.duration,
              );

            cleanup();

            resolve(
              Number.isFinite(
                duration,
              )
                ? duration
                : null,
            );
          };

        video.onerror = () => {
          cleanup();
          resolve(null);
        };

        video.src =
          objectUrl;

        return;
      }

      cleanup();

      resolve(null);
    },
  );
}

async function validateMediaFile(
  file: File,
  contentType: string,
  mediaKind:
    | 'audio'
    | 'video',
): Promise<string | null> {
  const limit =
    getMediaUploadLimit(
      contentType,
      mediaKind,
    );

  const sizeError =
    validateMediaFileSize(
      file,
      limit,
    );

  if (sizeError) {
    return sizeError;
  }

  const actualType =
    file.type.toLowerCase();

  if (
    mediaKind === 'audio' &&
    !actualType.startsWith(
      'audio/',
    )
  ) {
    return 'The selected file must be an audio file.';
  }

  if (
    mediaKind === 'video' &&
    !actualType.startsWith(
      'video/',
    )
  ) {
    return 'The selected file must be a video file.';
  }

  const duration =
    await getMediaDuration(
      file,
    );

  if (
    duration !== null &&
    duration >
      limit.maxDurationSeconds
  ) {
    return (
      `The selected media is too long. ` +
      `${limit.label} support media up to ` +
      `${formatDuration(
        limit.maxDurationSeconds,
      )}. ` +
      `Your file is approximately ` +
      `${formatDuration(
        duration,
      )}.`
    );
  }

  return null;
}

// ============================================================================
// CONTEXT
// ============================================================================

const MusicCreateReleaseContext =
  createContext<
    MusicCreateReleaseContextValue | null
  >(null);

// ============================================================================
// EPISODE FACTORY
// ============================================================================

function createSeriesEpisode(
  number: number,
): SeriesEpisode {
  return {
    id: `episode-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,

    title:
      `Episode ${number}`,

    description: '',

    mediaKind:
      'video',

    mediaUrl: '',

    coverImageUrl: '',

    releaseDate: '',
  };
}

// ============================================================================
// URL HELPERS
// ============================================================================

function isHttpUrl(
  value: string,
): boolean {
  return /^https?:\/\/.+/i.test(
    value.trim(),
  );
}

// ============================================================================
// STORAGE KEY NORMALIZATION
// ============================================================================

function normalizeUploadStorageKey(
  value: string,
): string {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return '';
  }

  if (isHttpUrl(trimmed)) {
    return trimmed;
  }

  const normalizedSeparators =
    trimmed.replace(
      /\\/g,
      '/',
    );

  const withoutLeadingSlash =
    normalizedSeparators.replace(
      /^\/+/,
      '',
    );

  return withoutLeadingSlash.replace(
    /^uploads\/?/i,
    '',
  );
}

// ============================================================================
// URL -> STORAGE KEY
// ============================================================================

function urlToStorageKeyFromValue(
  value: string,
): string | undefined {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed =
      new URL(trimmed);

    let pathname =
      parsed.pathname
        .replace(
          /\\/g,
          '/',
        )
        .replace(
          /^\/+/,
          '',
        );

    pathname =
      pathname.replace(
        /^uploads\/?/i,
        '',
      );

    return (
      pathname ||
      undefined
    );
  } catch {
    return normalizeUploadStorageKey(
      trimmed,
    );
  }
}

// ============================================================================
// PRICE HELPERS
// ============================================================================

function minorAmountToFormPrice(
  value:
    | number
    | undefined
    | null,
): string {
  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(value)
  ) {
    return '';
  }

  return (
    value / 100
  ).toFixed(2);
}

// ============================================================================
// PROVIDER
// ============================================================================

export function MusicCreateReleaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const navigate =
    useNavigate();

  const params =
    useParams<{
      contentId?: string;
      id?: string;
    }>();

  /*
   * Support either:
   *
   * /music/studio/create/:contentId
   *
   * or:
   *
   * /music/studio/edit/:id
   *
   * This makes the context tolerant of either route naming convention.
   */
  const editContentId =
    (
      params.contentId ??
      params.id ??
      ''
    ).trim() || null;

  const isEditMode =
    Boolean(editContentId);

  // ==========================================================================
  // FORM
  // ==========================================================================

  const [form, setForm] =
    useState<FormState>(
      INITIAL_FORM,
    );

  // ==========================================================================
  // CREATION MODE
  // ==========================================================================

  const [
    creationMode,
    setCreationModeState,
  ] =
    useState<CreationMode>(
      'single',
    );

  // ==========================================================================
  // SERIES
  // ==========================================================================

  const [
    seriesEpisodes,
    setSeriesEpisodes,
  ] =
    useState<SeriesEpisode[]>([
      createSeriesEpisode(1),
    ]);

  const [
    seriesReleaseMode,
    setSeriesReleaseMode,
  ] =
    useState<SeriesReleaseMode>(
      'all_now',
    );

  const [
    episodesPerRelease,
    setEpisodesPerRelease,
  ] =
    useState<number>(1);

  const [
    seriesFrequency,
    setSeriesFrequency,
  ] =
    useState<SeriesFrequency>(
      'weekly',
    );

  const [
    seriesInterval,
    setSeriesInterval,
  ] =
    useState<number>(1);

  const [
    firstSeriesRelease,
    setFirstSeriesRelease,
  ] =
    useState<string>('');

  // ==========================================================================
  // PUBLISHING
  // ==========================================================================

  const [
    publishMode,
    setPublishModeState,
  ] =
    useState<PublishMode>(
      'draft',
    );

  // ==========================================================================
  // UI STATE
  // ==========================================================================

  const [saving, setSaving] =
    useState(false);

  const [
    progress,
    setProgress,
  ] =
    useState(0);

  const [error, setError] =
    useState<
      string | null
    >(null);

  const [
    coverPreviewError,
    setCoverPreviewError,
  ] =
    useState(false);

  // ==========================================================================
  // EDIT STATE
  // ==========================================================================

  const [
    loadingExistingContent,
    setLoadingExistingContent,
  ] =
    useState(false);

  const [
    existingContent,
    setExistingContent,
  ] =
    useState<MusicContent | null>(
      null,
    );

  const [
    existingMediaStorageKey,
    setExistingMediaStorageKey,
  ] =
    useState('');

  const [
    existingCoverStorageKey,
    setExistingCoverStorageKey,
  ] =
    useState('');

  const loadedContentIdRef =
    useRef<string | null>(
      null,
    );

  // ==========================================================================
  // FILE STATE
  // ==========================================================================

  const [
    mediaFile,
    setMediaFileState,
  ] =
    useState<File | null>(
      null,
    );

  const [
    episodeFiles,
    setEpisodeFiles,
  ] =
    useState<
      Record<
        string,
        File | null
      >
    >({});

  // ==========================================================================
  // DERIVED VALUES
  // ==========================================================================

  const selectedCountry =
    useMemo(
      () =>
        getCountryCurrency(
          form.countryCode,
          COUNTRIES,
        ),
      [form.countryCode],
    );

  const selectedContentType =
    useMemo(() => {
      try {
        const canonical =
          normalizeMusicContentType(
            form.contentType,
          );

        return CONTENT_TYPES.find(
          (item) =>
            item.value ===
            canonical,
        );
      } catch {
        return undefined;
      }
    }, [form.contentType]);

  const requiresPrice =
    form.accessType ===
      'paid' ||
    form.accessType ===
      'preview_paid';

  const showPreviewDuration =
    form.accessType ===
    'preview_paid';

  const isVideoContent =
    getMusicMediaKind(
      form.contentType,
    ) === 'video';

  const contentLabel =
    selectedContentType?.label ??
    getMusicContentCategory(
      form.contentType,
    )?.label ??
    'Content';

  const formattedPrice =
    formatCurrency(
      Number(
        form.price || 0,
      ),
      selectedCountry,
    );

  // ==========================================================================
  // LOAD EXISTING CONTENT
  // ==========================================================================

  useEffect(() => {
    let cancelled = false;

    async function loadExistingContent() {
      if (!editContentId) {
        setExistingContent(
          null,
        );

        setExistingMediaStorageKey(
          '',
        );

        setExistingCoverStorageKey(
          '',
        );

        loadedContentIdRef.current =
          null;

        setLoadingExistingContent(
          false,
        );

        return;
      }

      if (
        loadedContentIdRef.current ===
        editContentId
      ) {
        return;
      }

      loadedContentIdRef.current =
        editContentId;

      setLoadingExistingContent(
        true,
      );

      setError(null);

      setProgress(0);

      try {
        const response =
          await musicApi.getById(
            editContentId,
          );

        if (cancelled) {
          return;
        }

        const content =
          response?.content;

        if (!content) {
          throw new Error(
            'The requested music content was not found.',
          );
        }

        setExistingContent(
          content,
        );

        // --------------------------------------------------------------------
        // CONTENT TYPE
        // --------------------------------------------------------------------

        const contentType =
          normalizeMusicContentType(
            content.type,
          );

        const mediaKind =
          getMusicMediaKind(
            contentType,
          );

        // --------------------------------------------------------------------
        // EXISTING MEDIA
        // --------------------------------------------------------------------

        /*
         * The backend intentionally removes media.storageKey from serialized
         * responses. Therefore prefer the returned media URL and convert it
         * back into the storage key when possible.
         */
        const mediaStorageKey =
          content.media?.storageKey?.trim() ||
          (
            content.media?.url
              ? urlToStorageKeyFromValue(
                  content.media.url,
                )
              : ''
          ) ||
          '';

        setExistingMediaStorageKey(
          mediaStorageKey,
        );

        // --------------------------------------------------------------------
        // EXISTING COVER
        // --------------------------------------------------------------------

        const coverStorageKey =
          content.coverImageUrl
            ? urlToStorageKeyFromValue(
                content.coverImageUrl,
              ) || ''
            : '';

        setExistingCoverStorageKey(
          coverStorageKey,
        );

        // --------------------------------------------------------------------
        // EXISTING MEDIA URL
        // --------------------------------------------------------------------

        const existingMediaUrl =
          content.media?.url?.trim() ||
          '';

        // --------------------------------------------------------------------
        // PRICE
        // --------------------------------------------------------------------

        const priceValue =
          Number(
            content.priceMinor ??
              content.priceCents ??
              0,
          );

        // --------------------------------------------------------------------
        // COUNTRY
        // --------------------------------------------------------------------

        const initialCountry =
          content.country ||
          INITIAL_FORM.countryCode;

        // --------------------------------------------------------------------
        // FORM
        // --------------------------------------------------------------------

        const loadedForm =
          {
            ...INITIAL_FORM,

            contentType:
              contentType as FormState['contentType'],

            mediaKind:
              mediaKind ??
              INITIAL_FORM.mediaKind,

            title:
              content.title ||
              '',

            description:
              content.description ||
              '',

            genre:
              content.genre ||
              INITIAL_FORM.genre,

            tags:
              Array.isArray(
                content.tags,
              )
                ? content.tags.join(
                    ', ',
                  )
                : '',

            mediaUrl:
              existingMediaUrl,

            coverImageUrl:
              content.coverImageUrl ||
              '',

            accessType:
              content.accessType,

            price:
              minorAmountToFormPrice(
                priceValue,
              ),

            countryCode:
              initialCountry,

            previewDurationSeconds:
              String(
                content.previewDurationSeconds ??
                  INITIAL_FORM.previewDurationSeconds,
              ),

            releaseDate:
              content.releaseDate
                ? new Date(
                    content.releaseDate,
                  )
                    .toISOString()
                    .slice(
                      0,
                      16,
                    )
                : '',

            isFeatured:
              Boolean(
                content.isFeatured,
              ),

            isExclusive:
              Boolean(
                content.isExclusive,
              ),
          } satisfies FormState;

        setForm(
          loadedForm,
        );

        // --------------------------------------------------------------------
        // EXISTING CONTENT IS EDITED AS ONE RECORD
        // --------------------------------------------------------------------

        setCreationModeState(
          'single',
        );

        // --------------------------------------------------------------------
        // PUBLISH MODE
        // --------------------------------------------------------------------

        if (
          content.status ===
          'scheduled'
        ) {
          setPublishModeState(
            'schedule',
          );
        } else if (
          content.status ===
          'published'
        ) {
          setPublishModeState(
            'publish',
          );
        } else {
          setPublishModeState(
            'draft',
          );
        }

        // --------------------------------------------------------------------
        // RESET TEMPORARY FILES
        // --------------------------------------------------------------------

        setMediaFileState(
          null,
        );

        setEpisodeFiles({});

        setCoverPreviewError(
          false,
        );

        setProgress(100);
      } catch (
        loadError: unknown
      ) {
        if (cancelled) {
          return;
        }

        loadedContentIdRef.current =
          null;

        setExistingContent(
          null,
        );

        setExistingMediaStorageKey(
          '',
        );

        setExistingCoverStorageKey(
          '',
        );

        setError(
          parseApiError(
            loadError,
            'Could not load the music content for editing.',
          ),
        );

        setProgress(0);
      } finally {
        if (!cancelled) {
          setLoadingExistingContent(
            false,
          );
        }
      }
    }

    void loadExistingContent();

    return () => {
      cancelled = true;
    };
  }, [editContentId]);

  // ==========================================================================
  // FORM UPDATE
  // ==========================================================================

  const updateField =
    useCallback(
      <
        K extends keyof FormState
      >(
        field: K,
        value: FormState[K],
      ) => {
        setForm(
          (current) => ({
            ...current,
            [field]: value,
          }),
        );

        setError(null);
      },
      [],
    );

  // ==========================================================================
  // MEDIA FILE
  // ==========================================================================

  const setMediaFile =
    useCallback(
      (
        file: File | null,
      ) => {
        /*
         * The current backend PATCH endpoint intentionally does not support
         * replacing media on an existing MusicContent record.
         *
         * We therefore prevent a misleading upload from being selected while
         * editing. Existing media remains attached to the content.
         */
        if (
          isEditMode &&
          file
        ) {
          setError(
            'Media replacement is not available while editing an existing release. You can update the title, description, artwork, pricing, access, and publishing settings without re-uploading the media.',
          );

          setMediaFileState(
            null,
          );

          return;
        }

        setMediaFileState(
          file,
        );

        setError(null);

        if (file) {
          setForm(
            (current) => ({
              ...current,
              mediaUrl: '',
            }),
          );
        }
      },
      [isEditMode],
    );

  // ==========================================================================
  // EPISODE FILE
  // ==========================================================================

  const setEpisodeFile =
    useCallback(
      (
        id: string,
        file: File | null,
      ) => {
        setEpisodeFiles(
          (current) => ({
            ...current,
            [id]: file,
          }),
        );

        if (file) {
          setSeriesEpisodes(
            (current) =>
              current.map(
                (
                  episode,
                ) =>
                  episode.id ===
                  id
                    ? {
                        ...episode,
                        mediaUrl:
                          '',
                      }
                    : episode,
              ),
          );
        }
      },
      [],
    );

  // ==========================================================================
  // CONTENT TYPE
  // ==========================================================================

  const selectContentType =
    useCallback(
      (
        type: MusicContentType,
      ) => {
        const normalizedType =
          normalizeMusicContentType(
            type,
          ) as MusicContentType;

        const mediaKind =
          getMusicMediaKind(
            normalizedType,
          );

        setForm(
          (current) => ({
            ...current,
            contentType:
              normalizedType,
            mediaKind:
              mediaKind ??
              current.mediaKind,
          }),
        );

        /*
         * In create mode, changing type clears a selected replacement file.
         *
         * In edit mode, the existing backend media remains untouched.
         */
        setMediaFileState(
          null,
        );

        setError(null);
      },
      [],
    );

  // ==========================================================================
  // CREATION MODE
  // ==========================================================================

  const setCreationMode =
    useCallback(
      (
        mode: CreationMode,
      ) => {
        if (
          isEditMode &&
          mode === 'series'
        ) {
          setError(
            'Existing releases are edited individually. Series creation is available when creating a new release.',
          );

          return;
        }

        setCreationModeState(
          mode,
        );

        setError(null);
      },
      [isEditMode],
    );

  // ==========================================================================
  // EPISODE MEDIA KIND
  // ==========================================================================

  const setEpisodeMediaKind =
    useCallback(
      (
        id: string,
        mediaKind:
          SeriesEpisodeMediaKind,
      ) => {
        setSeriesEpisodes(
          (current) =>
            current.map(
              (
                episode,
              ) =>
                episode.id ===
                id
                  ? {
                      ...episode,
                      mediaKind,
                      mediaUrl:
                        '',
                    }
                  : episode,
            ),
        );

        setEpisodeFiles(
          (current) => ({
            ...current,
            [id]: null,
          }),
        );
      },
      [],
    );

  // ==========================================================================
  // ADD EPISODE
  // ==========================================================================

  const addEpisode =
    useCallback(() => {
      setSeriesEpisodes(
        (current) => {
          if (
            current.length >=
            MAX_SERIES_EPISODES
          ) {
            return current;
          }

          return [
            ...current,
            createSeriesEpisode(
              current.length +
                1,
            ),
          ];
        },
      );
    }, []);

  // ==========================================================================
  // REMOVE EPISODE
  // ==========================================================================

  const removeEpisode =
    useCallback(
      (
        id: string,
      ) => {
        setSeriesEpisodes(
          (current) => {
            if (
              current.length <=
              1
            ) {
              return current;
            }

            return current
              .filter(
                (
                  episode,
                ) =>
                  episode.id !==
                  id,
              )
              .map(
                (
                  episode,
                  index,
                ) => ({
                  ...episode,

                  title:
                    /^Episode \d+$/.test(
                      episode.title.trim(),
                    )
                      ? `Episode ${
                          index + 1
                        }`
                      : episode.title,
                }),
              );
          },
        );

        setEpisodeFiles(
          (current) => {
            const next = {
              ...current,
            };

            delete next[id];

            return next;
          },
        );
      },
      [],
    );

  // ==========================================================================
  // UPDATE EPISODE
  // ==========================================================================

  const updateEpisode =
    useCallback(
      (
        id: string,
        field: keyof SeriesEpisode,
        value: string,
      ) => {
        setSeriesEpisodes(
          (current) =>
            current.map(
              (
                episode,
              ) =>
                episode.id ===
                id
                  ? {
                      ...episode,
                      [field]:
                        value,
                    }
                  : episode,
            ),
        );
      },
      [],
    );

  // ==========================================================================
  // MOVE EPISODE
  // ==========================================================================

  const moveEpisode =
    useCallback(
      (
        index: number,
        direction:
          | 'up'
          | 'down',
      ) => {
        setSeriesEpisodes(
          (current) => {
            const next = [
              ...current,
            ];

            const target =
              direction ===
              'up'
                ? index - 1
                : index + 1;

            if (
              target < 0 ||
              target >=
                next.length
            ) {
              return current;
            }

            [
              next[index],
              next[target],
            ] = [
              next[target],
              next[index],
            ];

            return next;
          },
        );
      },
      [],
    );

  // ==========================================================================
  // SERIES RELEASE DATE
  // ==========================================================================

  const calculateSeriesReleaseDate =
    useCallback(
      (
        episodeIndex: number,
      ): string | undefined => {
        if (
          seriesReleaseMode ===
          'all_now'
        ) {
          return new Date().toISOString();
        }

        if (
          seriesReleaseMode ===
          'custom'
        ) {
          const value =
            seriesEpisodes[
              episodeIndex
            ]?.releaseDate;

          return value
            ? new Date(
                value,
              ).toISOString()
            : undefined;
        }

        if (
          !firstSeriesRelease
        ) {
          return undefined;
        }

        const groupIndex =
          Math.floor(
            episodeIndex /
              Math.max(
                1,
                episodesPerRelease,
              ),
          );

        const intervalDays =
          seriesFrequency ===
          'daily'
            ? seriesInterval
            : seriesInterval *
              7;

        const baseDate =
          new Date(
            firstSeriesRelease,
          );

        if (
          Number.isNaN(
            baseDate.getTime(),
          )
        ) {
          return undefined;
        }

        return addDays(
          baseDate,
          groupIndex *
            intervalDays,
        ).toISOString();
      },
      [
        episodesPerRelease,
        firstSeriesRelease,
        seriesEpisodes,
        seriesFrequency,
        seriesInterval,
        seriesReleaseMode,
      ],
    );

  // ==========================================================================
  // SINGLE VALIDATION
  // ==========================================================================

  const validateSingle =
    useCallback(
      async (
        requestedMode:
          PublishMode = publishMode,
      ) => {
        const title =
          form.title.trim();

        if (!title) {
          return 'Please enter a title.';
        }

        if (
          title.length < 2
        ) {
          return 'Title must be at least 2 characters.';
        }

        /*
         * CREATE:
         *   file OR URL
         *
         * EDIT:
         *   existing backend media OR URL OR file
         *
         * However, media replacement is blocked by setMediaFile()
         * because PATCH does not currently support it.
         */
        const hasExistingMedia =
          Boolean(
            isEditMode &&
              existingMediaStorageKey,
          );

        const hasSelectedMediaFile =
          Boolean(mediaFile);

        const hasMediaUrl =
          Boolean(
            form.mediaUrl.trim(),
          );

        if (
          !hasSelectedMediaFile &&
          !hasMediaUrl &&
          !hasExistingMedia
        ) {
          return `Please upload the ${
            isVideoContent
              ? 'video'
              : 'audio'
          } file or add a media URL.`;
        }

        if (
          !hasSelectedMediaFile &&
          hasMediaUrl &&
          !isHttpUrl(
            form.mediaUrl,
          )
        ) {
          return 'Media URL must start with http:// or https://.';
        }

        if (
          form.coverImageUrl.trim() &&
          !isHttpUrl(
            form.coverImageUrl,
          )
        ) {
          return 'Cover image URL must start with http:// or https://.';
        }

        if (mediaFile) {
          const expectedType =
            isVideoContent
              ? 'video'
              : 'audio';

          const actualType =
            mediaFile.type.toLowerCase();

          if (
            expectedType ===
              'audio' &&
            !actualType.startsWith(
              'audio/',
            )
          ) {
            return 'The selected file must be an audio file.';
          }

          if (
            expectedType ===
              'video' &&
            !actualType.startsWith(
              'video/',
            )
          ) {
            return 'The selected file must be a video file.';
          }

          const mediaValidation =
            await validateMediaFile(
              mediaFile,
              form.contentType,
              expectedType,
            );

          if (
            mediaValidation
          ) {
            return mediaValidation;
          }
        }

        if (requiresPrice) {
          const price =
            Number(
              form.price,
            );

          if (
            !Number.isFinite(
              price,
            ) ||
            price <= 0
          ) {
            return 'Please enter a valid price greater than 0.';
          }
        }

        if (
          showPreviewDuration
        ) {
          const preview =
            Number(
              form.previewDurationSeconds,
            );

          if (
            !Number.isFinite(
              preview,
            ) ||
            preview < 5 ||
            preview > 120
          ) {
            return 'Preview duration must be between 5 and 120 seconds.';
          }
        }

        if (
          requestedMode ===
          'schedule'
        ) {
          if (
            !form.releaseDate
          ) {
            return 'Choose a date and time for scheduled publishing.';
          }

          const date =
            new Date(
              form.releaseDate,
            );

          if (
            Number.isNaN(
              date.getTime(),
            )
          ) {
            return 'The scheduled date is invalid.';
          }

          if (
            date.getTime() <=
            Date.now()
          ) {
            return 'Scheduled publishing must be in the future.';
          }
        }

        return null;
      },
      [
        existingMediaStorageKey,
        form,
        isEditMode,
        isVideoContent,
        mediaFile,
        publishMode,
        requiresPrice,
        showPreviewDuration,
      ],
    );

  // ==========================================================================
  // SERIES VALIDATION
  // ==========================================================================

  const validateSeries =
    useCallback(
      async (
        requestedMode:
          PublishMode = publishMode,
      ) => {
        const seriesTitle =
          form.title.trim();

        if (!seriesTitle) {
          return 'Please enter a series title.';
        }

        if (
          seriesTitle.length < 2
        ) {
          return 'Series title must be at least 2 characters.';
        }

        if (
          seriesEpisodes.length <
          1
        ) {
          return 'Add at least one episode.';
        }

        if (
          seriesEpisodes.length >
          MAX_SERIES_EPISODES
        ) {
          return `A series can contain up to ${MAX_SERIES_EPISODES} episodes.`;
        }

        for (
          let index = 0;
          index <
          seriesEpisodes.length;
          index += 1
        ) {
          const episode =
            seriesEpisodes[
              index
            ];

          if (
            !episode.title.trim()
          ) {
            return `Episode ${
              index + 1
            } needs a title.`;
          }

          const selectedFile =
            episodeFiles[
              episode.id
            ];

          const hasFile =
            Boolean(
              selectedFile,
            );

          const hasUrl =
            Boolean(
              episode.mediaUrl.trim(),
            );

          if (
            !hasFile &&
            !hasUrl
          ) {
            return `Episode ${
              index + 1
            } needs an ${
              episode.mediaKind ===
              'audio'
                ? 'audio'
                : 'video'
            } file or media URL.`;
          }

          if (selectedFile) {
            const fileType =
              selectedFile.type
                .toLowerCase();

            const fileIsAudio =
              fileType.startsWith(
                'audio/',
              );

            const fileIsVideo =
              fileType.startsWith(
                'video/',
              );

            if (
              episode.mediaKind ===
                'audio' &&
              !fileIsAudio
            ) {
              return `Episode ${
                index + 1
              } requires an audio file.`;
            }

            if (
              episode.mediaKind ===
                'video' &&
              !fileIsVideo
            ) {
              return `Episode ${
                index + 1
              } requires a video file.`;
            }

            const episodeLimit =
              getMediaUploadLimit(
                form.contentType,
                episode.mediaKind,
              );

            const sizeError =
              validateMediaFileSize(
                selectedFile,
                episodeLimit,
              );

            if (sizeError) {
              return `Episode ${
                index + 1
              }: ${sizeError}`;
            }

            const duration =
              await getMediaDuration(
                selectedFile,
              );

            if (
              duration !== null &&
              duration >
                episodeLimit.maxDurationSeconds
            ) {
              return (
                `Episode ${
                  index + 1
                } is too long. ` +
                `${episodeLimit.label} support media up to ` +
                `${formatDuration(
                  episodeLimit.maxDurationSeconds,
                )}. ` +
                `This episode is approximately ` +
                `${formatDuration(
                  duration,
                )}.`
              );
            }
          }

          if (
            !hasFile &&
            hasUrl &&
            !isHttpUrl(
              episode.mediaUrl,
            )
          ) {
            return `Episode ${
              index + 1
            } media URL must start with http:// or https://.`;
          }

          if (
            episode.coverImageUrl.trim() &&
            !isHttpUrl(
              episode.coverImageUrl,
            )
          ) {
            return `Episode ${
              index + 1
            } cover URL must start with http:// or https://.`;
          }

          if (
            seriesReleaseMode ===
              'custom' &&
            !episode.releaseDate
          ) {
            return `Choose a release date for Episode ${
              index + 1
            }.`;
          }

          if (
            seriesReleaseMode ===
              'custom' &&
            episode.releaseDate
          ) {
            const date =
              new Date(
                episode.releaseDate,
              );

            if (
              Number.isNaN(
                date.getTime(),
              )
            ) {
              return `Episode ${
                index + 1
              } has an invalid release date.`;
            }

            if (
              date.getTime() <=
              Date.now()
            ) {
              return `Episode ${
                index + 1
              } must be scheduled in the future.`;
            }
          }
        }

        if (requiresPrice) {
          const price =
            Number(
              form.price,
            );

          if (
            !Number.isFinite(
              price,
            ) ||
            price <= 0
          ) {
            return 'Please enter a valid price greater than 0.';
          }
        }

        if (
          showPreviewDuration
        ) {
          const preview =
            Number(
              form.previewDurationSeconds,
            );

          if (
            !Number.isFinite(
              preview,
            ) ||
            preview < 5 ||
            preview > 120
          ) {
            return 'Preview duration must be between 5 and 120 seconds.';
          }
        }

        if (
          seriesReleaseMode ===
          'drip'
        ) {
          if (
            !firstSeriesRelease
          ) {
            return 'Choose the first release date and time.';
          }

          const firstDate =
            new Date(
              firstSeriesRelease,
            );

          if (
            Number.isNaN(
              firstDate.getTime(),
            )
          ) {
            return 'The first series release date is invalid.';
          }

          if (
            firstDate.getTime() <=
            Date.now()
          ) {
            return 'The first series release must be in the future.';
          }

          if (
            episodesPerRelease < 1 ||
            episodesPerRelease >
              seriesEpisodes.length
          ) {
            return 'Choose a valid number of episodes per release.';
          }

          if (
            seriesInterval < 1
          ) {
            return 'Release interval must be at least 1.';
          }
        }

        if (
          requestedMode ===
          'schedule'
        ) {
          // Release dates are handled through the series release settings.
        }

        return null;
      },
      [
        episodeFiles,
        episodesPerRelease,
        firstSeriesRelease,
        form,
        publishMode,
        requiresPrice,
        seriesEpisodes,
        seriesInterval,
        seriesReleaseMode,
        showPreviewDuration,
      ],
    );

  // ==========================================================================
  // UPLOAD
  // ==========================================================================

  const uploadStudioFile =
    useCallback(
      async (
        file: File,
        context:
          | 'music'
          | 'series',
      ): Promise<string> => {
        const response =
          await musicApi.uploadStudioFile(
            file,
            context,
          );

        const storageKey =
          response?.storageKey?.trim();

        if (storageKey) {
          const normalized =
            normalizeUploadStorageKey(
              storageKey,
            );

          if (normalized) {
            return normalized;
          }
        }

        const possiblePath =
          response?.path ||
          response?.url;

        if (possiblePath) {
          const normalized =
            normalizeUploadStorageKey(
              possiblePath,
            );

          if (
            normalized &&
            !isHttpUrl(
              normalized,
            )
          ) {
            return normalized;
          }

          if (
            isHttpUrl(
              possiblePath,
            )
          ) {
            const converted =
              urlToStorageKeyFromValue(
                possiblePath,
              );

            if (converted) {
              return converted;
            }
          }
        }

        throw new Error(
          'The upload completed, but the server did not return a storage key.',
        );
      },
      [],
    );

  // ==========================================================================
  // URL -> STORAGE KEY
  // ==========================================================================

  const urlToStorageKey =
    useCallback(
      (
        value: string,
      ): string | undefined => {
        const trimmed =
          value.trim();

        if (!trimmed) {
          return undefined;
        }

        if (
          isHttpUrl(
            trimmed,
          )
        ) {
          return urlToStorageKeyFromValue(
            trimmed,
          );
        }

        return normalizeUploadStorageKey(
          trimmed,
        );
      },
      [],
    );

  // ==========================================================================
  // SINGLE CREATE PAYLOAD
  // ==========================================================================

  const buildSinglePayload =
    useCallback(
      (
        mode: PublishMode,
        mediaStorageKey: string,
      ): Record<
        string,
        unknown
      > => {
        const price =
          requiresPrice &&
          form.price
            ? getMinorUnitAmount(
                Number(
                  form.price,
                ),
                selectedCountry,
              )
            : 0;

        const tags =
          form.tags
            .split(',')
            .map(
              (tag) =>
                tag.trim(),
            )
            .filter(Boolean)
            .slice(0, 20);

        const status:
          MusicCreateStatus =
          mode === 'draft'
            ? 'draft'
            : mode === 'schedule'
              ? 'scheduled'
              : 'published';

        const coverStorageKey =
          urlToStorageKey(
            form.coverImageUrl,
          );

        const contentType =
          normalizeMusicContentType(
            form.contentType,
          );

        return {
          type:
            contentType,

          mediaKind:
            getMusicMediaKind(
              contentType,
            ),

          title:
            form.title.trim(),

          slug:
            slugify(
              form.title,
            ),

          description:
            form.description.trim() ||
            undefined,

          genre:
            form.genre ||
            undefined,

          tags,

          mediaStorageKey,

          coverStorageKey,

          previewMediaStorageKey:
            undefined,

          accessType:
            form.accessType,

          priceCents:
            price,

          currency:
            selectedCountry.currency,

          country:
            selectedCountry.code,

          currencyName:
            selectedCountry.currencyName,

          previewDurationSeconds:
            showPreviewDuration
              ? Math.max(
                  5,
                  Math.min(
                    120,
                    Number(
                      form.previewDurationSeconds,
                    ),
                  ),
                )
              : undefined,

          allowComments:
            true,

          allowSharing:
            true,

          allowDownloads:
            false,

          status,

          releaseDate:
            mode === 'schedule' &&
            form.releaseDate
              ? new Date(
                  form.releaseDate,
                ).toISOString()
              : mode === 'publish'
                ? new Date().toISOString()
                : undefined,

          isFeatured:
            form.isFeatured,

          isExclusive:
            form.isExclusive ||
            form.accessType ===
              'exclusive',
        };
      },
      [
        form,
        requiresPrice,
        selectedCountry,
        showPreviewDuration,
        urlToStorageKey,
      ],
    );

  // ==========================================================================
  // SERIES PAYLOAD
  // ==========================================================================

  const buildSeriesPayload =
    useCallback(
      (
        mode: PublishMode,
        episode: SeriesEpisode,
        index: number,
        mediaStorageKey: string,
      ): CreateMusicSeriesEpisodePayload => {
        const price =
          requiresPrice &&
          form.price
            ? getMinorUnitAmount(
                Number(
                  form.price,
                ),
                selectedCountry,
              )
            : 0;

        const tags =
          form.tags
            .split(',')
            .map(
              (tag) =>
                tag.trim(),
            )
            .filter(Boolean)
            .slice(0, 20);

        const status:
          MusicCreateStatus =
          mode === 'draft'
            ? 'draft'
            : mode === 'publish'
              ? 'published'
              : 'scheduled';

        const releaseDate =
          mode === 'draft'
            ? undefined
            : mode === 'publish'
              ? new Date().toISOString()
              : calculateSeriesReleaseDate(
                  index,
                );

        const episodeTitle =
          episode.title.trim();

        const coverStorageKey =
          urlToStorageKey(
            episode.coverImageUrl ||
              form.coverImageUrl,
          );

        const contentType =
          normalizeMusicContentType(
            form.contentType,
          );

        return {
          type:
            contentType,

          mediaKind:
            episode.mediaKind,

          title:
            episodeTitle,

          slug:
            slugify(
              `${form.title}-${episodeTitle}-${index + 1}`,
            ),

          description:
            episode.description.trim() ||
            form.description.trim() ||
            undefined,

          genre:
            form.genre ||
            undefined,

          tags,

          mediaStorageKey,

          coverStorageKey,

          previewMediaStorageKey:
            undefined,

          accessType:
            form.accessType,

          priceCents:
            price,

          currency:
            selectedCountry.currency,

          country:
            selectedCountry.code,

          currencyName:
            selectedCountry.currencyName,

          previewDurationSeconds:
            showPreviewDuration
              ? Math.max(
                  5,
                  Math.min(
                    120,
                    Number(
                      form.previewDurationSeconds,
                    ),
                  ),
                )
              : undefined,

          allowComments:
            true,

          allowSharing:
            true,

          allowDownloads:
            false,

          status,

          releaseDate,

          isFeatured:
            form.isFeatured,

          isExclusive:
            form.isExclusive ||
            form.accessType ===
              'exclusive',

          seriesTitle:
            form.title.trim(),

          episodeNumber:
            index + 1,

          seriesTotalEpisodes:
            seriesEpisodes.length,
        };
      },
      [
        calculateSeriesReleaseDate,
        form,
        requiresPrice,
        selectedCountry,
        seriesEpisodes.length,
        showPreviewDuration,
        urlToStorageKey,
      ],
    );

  // ==========================================================================
  // EDIT PAYLOAD
  // ==========================================================================

  const buildEditPayload =
    useCallback(
      (
        mode: PublishMode,
      ): Record<
        string,
        unknown
      > => {
        const price =
          requiresPrice &&
          form.price
            ? getMinorUnitAmount(
                Number(
                  form.price,
                ),
                selectedCountry,
              )
            : 0;

        const tags =
          form.tags
            .split(',')
            .map(
              (tag) =>
                tag.trim(),
            )
            .filter(Boolean)
            .slice(0, 20);

        const status:
          MusicCreateStatus =
          mode === 'draft'
            ? 'draft'
            : mode === 'schedule'
              ? 'scheduled'
              : 'published';

        const contentType =
          normalizeMusicContentType(
            form.contentType,
          );

        const coverStorageKey =
          urlToStorageKey(
            form.coverImageUrl,
          );

        /*
         * IMPORTANT:
         *
         * Do NOT send mediaStorageKey here.
         *
         * MusicService.update() currently intentionally does not support
         * media replacement. The backend retains the existing media record.
         *
         * Sending mediaStorageKey could also cause DTO validation failures
         * if UpdateMusicDto uses whitelist/forbidNonWhitelisted.
         */
        return {
          type:
            contentType,

          mediaKind:
            getMusicMediaKind(
              contentType,
            ),

          title:
            form.title.trim(),

          slug:
            slugify(
              form.title,
            ),

          description:
            form.description.trim() ||
            undefined,

          coverStorageKey,

          previewMediaStorageKey:
            undefined,

          genre:
            form.genre ||
            undefined,

          tags,

          accessType:
            form.accessType,

          priceCents:
            price,

          currency:
            selectedCountry.currency,

          country:
            selectedCountry.code,

          currencyName:
            selectedCountry.currencyName,

          previewDurationSeconds:
            showPreviewDuration
              ? Math.max(
                  5,
                  Math.min(
                    120,
                    Number(
                      form.previewDurationSeconds,
                    ),
                  ),
                )
              : undefined,

          allowComments:
            true,

          allowSharing:
            true,

          allowDownloads:
            false,

          status,

          releaseDate:
            mode === 'schedule' &&
            form.releaseDate
              ? new Date(
                  form.releaseDate,
                ).toISOString()
              : mode === 'publish'
                ? new Date().toISOString()
                : undefined,

          isFeatured:
            form.isFeatured,

          isExclusive:
            form.isExclusive ||
            form.accessType ===
              'exclusive',

          /*
           * Preserve series metadata when this individual content record
           * belongs to an existing series.
           */
          ...(existingContent?.seriesId
            ? {
                seriesId:
                  existingContent.seriesId,

                seriesTitle:
                  existingContent.seriesTitle,

                episodeNumber:
                  existingContent.episodeNumber,

                seriesTotalEpisodes:
                  existingContent.seriesTotalEpisodes,
              }
            : {}),
        };
      },
      [
        existingContent,
        form,
        requiresPrice,
        selectedCountry,
        showPreviewDuration,
        urlToStorageKey,
      ],
    );

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  const submit =
    useCallback(
      async (
        event: FormEvent,
        mode: PublishMode,
      ) => {
        event.preventDefault();

        setError(null);

        setPublishModeState(
          mode,
        );

        setProgress(0);

        // --------------------------------------------------------------------
        // EDIT LOADING GUARD
        // --------------------------------------------------------------------

        if (
          isEditMode &&
          loadingExistingContent
        ) {
          setError(
            'Please wait for the existing release to finish loading.',
          );

          return;
        }

        // --------------------------------------------------------------------
        // EDIT CONTENT GUARD
        // --------------------------------------------------------------------

        if (
          isEditMode &&
          !existingContent
        ) {
          setError(
            'The existing music release could not be loaded. Please return to My Content and try again.',
          );

          return;
        }

        // --------------------------------------------------------------------
        // NORMALIZE CONTENT TYPE
        // --------------------------------------------------------------------

        let normalizedContentType:
          | MusicContentType
          | undefined;

        try {
          normalizedContentType =
            normalizeMusicContentType(
              form.contentType,
            );
        } catch (
          contentTypeError: unknown
        ) {
          setError(
            contentTypeError instanceof
              Error
              ? contentTypeError.message
              : 'Unsupported music content type.',
          );

          return;
        }

        if (
          form.contentType !==
          normalizedContentType
        ) {
          setForm(
            (current) => ({
              ...current,
              contentType:
                normalizedContentType!,
            }),
          );
        }

        // --------------------------------------------------------------------
        // VALIDATION
        // --------------------------------------------------------------------

        const validationError =
          creationMode ===
          'series'
            ? await validateSeries(
                mode,
              )
            : await validateSingle(
                mode,
              );

        if (validationError) {
          setError(
            validationError,
          );

          return;
        }

        // --------------------------------------------------------------------
        // SAVE
        // --------------------------------------------------------------------

        setSaving(true);

        try {
          // ==================================================================
          // SINGLE CONTENT
          // ==================================================================

          if (
            creationMode ===
            'single'
          ) {
            /*
             * EDIT MODE
             *
             * Existing media is intentionally preserved.
             */
            if (
              isEditMode
            ) {
              /*
               * The current backend does not support media replacement.
               * setMediaFile() already prevents selection, but this is an
               * additional safety check before PATCH.
               */
              if (
                mediaFile
              ) {
                throw new Error(
                  'Media replacement is not available while editing an existing release.',
                );
              }

              if (
                !existingMediaStorageKey &&
                !form.mediaUrl.trim()
              ) {
                throw new Error(
                  'The existing media could not be located. Please return to My Content and try again.',
                );
              }

              if (
                import.meta.env
                  .DEV
              ) {
                console.debug(
                  '[MusicCreateRelease] Updating content:',
                  {
                    id:
                      editContentId,

                    type:
                      normalizedContentType,

                    mediaKind:
                      getMusicMediaKind(
                        normalizedContentType!,
                      ),

                    title:
                      form.title,

                    accessType:
                      form.accessType,

                    status:
                      mode,

                    preservingExistingMedia:
                      true,

                    existingMediaStorageKey:
                      existingMediaStorageKey ||
                      null,
                  },
                );
              }

              setProgress(25);

              const payload =
                buildEditPayload(
                  mode,
                );

              setProgress(50);

              await musicApi.update(
                editContentId!,
                payload,
              );

              setProgress(100);

              navigate(
                '/music/studio',
              );

              return;
            }

            // =================================================================
            // CREATE MODE
            // =================================================================

            let mediaStorageKey:
              | string
              | undefined;

            // -----------------------------------------------------------------
            // URL
            // -----------------------------------------------------------------

            if (
              form.mediaUrl.trim()
            ) {
              mediaStorageKey =
                urlToStorageKey(
                  form.mediaUrl,
                );
            }

            // -----------------------------------------------------------------
            // UPLOAD
            // -----------------------------------------------------------------

            if (mediaFile) {
              setProgress(5);

              mediaStorageKey =
                await uploadStudioFile(
                  mediaFile,
                  'music',
                );

              setProgress(60);
            }

            if (
              !mediaStorageKey
            ) {
              throw new Error(
                'No media storage key was returned.',
              );
            }

            if (
              import.meta.env
                .DEV
            ) {
              console.debug(
                '[MusicCreateRelease] Creating content:',
                {
                  type:
                    normalizedContentType,

                  mediaKind:
                    getMusicMediaKind(
                      normalizedContentType!,
                    ),

                  title:
                    form.title,

                  accessType:
                    form.accessType,

                  status:
                    mode,

                  professionalUploadLimit:
                    getMediaUploadLimit(
                      String(
                        normalizedContentType,
                      ),
                      isVideoContent
                        ? 'video'
                        : 'audio',
                    ),
                },
              );
            }

            const payload =
              buildSinglePayload(
                mode,
                mediaStorageKey,
              );

            await musicApi.create(
              payload,
            );

            setProgress(100);

            navigate(
              '/music/studio',
            );

            return;
          }

          // ==================================================================
          // SERIES
          // ==================================================================

          /*
           * Existing series episodes are edited individually.
           *
           * This prevents accidentally duplicating or recreating an entire
           * series when the user intended to edit one episode.
           */
          if (
            isEditMode
          ) {
            throw new Error(
              'Existing series episodes must be edited individually.',
            );
          }

          const total =
            seriesEpisodes.length;

          const createdPayloads:
            CreateMusicSeriesEpisodePayload[] =
            [];

          // -------------------------------------------------------------------
          // UPLOAD SERIES MEDIA
          // -------------------------------------------------------------------

          for (
            let index = 0;
            index < total;
            index += 1
          ) {
            const episode =
              seriesEpisodes[
                index
              ];

            let mediaStorageKey =
              urlToStorageKey(
                episode.mediaUrl,
              );

            const selectedFile =
              episodeFiles[
                episode.id
              ];

            if (
              selectedFile
            ) {
              mediaStorageKey =
                await uploadStudioFile(
                  selectedFile,
                  'series',
                );
            }

            if (
              !mediaStorageKey
            ) {
              throw new Error(
                `Episode ${
                  index + 1
                } did not produce a media storage key.`,
              );
            }

            createdPayloads.push(
              buildSeriesPayload(
                mode,
                episode,
                index,
                mediaStorageKey,
              ),
            );

            setProgress(
              Math.round(
                ((index + 1) /
                  total) *
                  50,
              ),
            );
          }

          // -------------------------------------------------------------------
          // CREATE SERIES EPISODES
          // -------------------------------------------------------------------

          await musicApi.createSeriesEpisodes(
            createdPayloads,
            (
              completed,
              createTotal,
            ) => {
              const createProgress =
                createTotal > 0
                  ? Math.round(
                      (completed /
                        createTotal) *
                        50,
                    )
                  : 0;

              setProgress(
                50 +
                  createProgress,
              );
            },
          );

          setProgress(100);

          navigate(
            '/music/studio',
          );
        } catch (
          submitError: unknown
        ) {
          setError(
            parseApiError(
              submitError,
              isEditMode
                ? `Could not update ${contentLabel.toLowerCase()}. Please try again.`
                : `Could not create ${
                    creationMode ===
                    'series'
                      ? 'series'
                      : contentLabel.toLowerCase()
                  }. Please try again.`,
            ),
          );
        } finally {
          setSaving(false);
        }
      },
      [
        buildEditPayload,
        buildSeriesPayload,
        buildSinglePayload,
        contentLabel,
        creationMode,
        editContentId,
        episodeFiles,
        existingContent,
        existingMediaStorageKey,
        form,
        isEditMode,
        isVideoContent,
        loadingExistingContent,
        mediaFile,
        navigate,
        requiresPrice,
        seriesEpisodes,
        uploadStudioFile,
        urlToStorageKey,
        validateSeries,
        validateSingle,
      ],
    );

  // ==========================================================================
  // RESET
  // ==========================================================================

  const reset =
    useCallback(() => {
      setForm(
        INITIAL_FORM,
      );

      setCreationModeState(
        'single',
      );

      setSeriesEpisodes([
        createSeriesEpisode(1),
      ]);

      setSeriesReleaseMode(
        'all_now',
      );

      setEpisodesPerRelease(
        1,
      );

      setSeriesFrequency(
        'weekly',
      );

      setSeriesInterval(
        1,
      );

      setFirstSeriesRelease(
        '',
      );

      setPublishModeState(
        'draft',
      );

      setSaving(false);

      setError(null);

      setProgress(0);

      setCoverPreviewError(
        false,
      );

      setMediaFileState(
        null,
      );

      setEpisodeFiles({});

      setExistingContent(
        null,
      );

      setExistingMediaStorageKey(
        '',
      );

      setExistingCoverStorageKey(
        '',
      );

      setLoadingExistingContent(
        false,
      );

      loadedContentIdRef.current =
        null;
    }, []);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const value =
    useMemo<MusicCreateReleaseContextValue>(
      () => ({
        // FORM
        form,
        creationMode,
        seriesEpisodes,
        seriesReleaseMode,
        episodesPerRelease,
        seriesFrequency,
        seriesInterval,
        firstSeriesRelease,
        publishMode,

        // EDIT
        editContentId,
        isEditMode,
        loadingExistingContent,
        existingContent,
        existingMediaStorageKey,
        existingCoverStorageKey,

        // UI
        saving,
        progress,
        error,
        coverPreviewError,

        // DERIVED
        selectedCountry,
        selectedContentType,
        requiresPrice,
        showPreviewDuration,
        isVideoContent,
        contentLabel,
        formattedPrice,

        // FILES
        mediaFile,
        episodeFiles,

        // ACTIONS
        updateField,
        setMediaFile,
        setEpisodeFile,
        setCreationMode,
        selectContentType,
        setSeriesReleaseMode,
        setEpisodesPerRelease,
        setSeriesFrequency,
        setSeriesInterval,
        setFirstSeriesRelease,

        setPublishMode:
          setPublishModeState,

        setCoverPreviewError,

        // SERIES
        addEpisode,
        removeEpisode,
        updateEpisode,
        setEpisodeMediaKind,
        moveEpisode,
        calculateSeriesReleaseDate,

        // SUBMIT
        submit,

        // RESET
        reset,

        getMinimumDateTime:
          getMinimumDateTimeHelper,
      }),
      [
        addEpisode,
        calculateSeriesReleaseDate,
        contentLabel,
        coverPreviewError,
        creationMode,
        editContentId,
        episodeFiles,
        episodesPerRelease,
        error,
        existingContent,
        existingCoverStorageKey,
        existingMediaStorageKey,
        firstSeriesRelease,
        form,
        formattedPrice,
        isEditMode,
        isVideoContent,
        loadingExistingContent,
        mediaFile,
        moveEpisode,
        progress,
        publishMode,
        removeEpisode,
        reset,
        saving,
        selectedContentType,
        selectedCountry,
        selectContentType,
        seriesEpisodes,
        seriesFrequency,
        seriesInterval,
        seriesReleaseMode,
        setCreationMode,
        setEpisodeFile,
        setEpisodeMediaKind,
        setMediaFile,
        submit,
        requiresPrice,
        showPreviewDuration,
        updateEpisode,
        updateField,
      ],
    );

  return (
    <MusicCreateReleaseContext.Provider
      value={value}
    >
      {children}
    </MusicCreateReleaseContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useMusicCreateRelease() {
  const context =
    useContext(
      MusicCreateReleaseContext,
    );

  if (!context) {
    throw new Error(
      'useMusicCreateRelease must be used inside MusicCreateReleaseProvider',
    );
  }

  return context;
}