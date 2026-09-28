export type MusicReleaseRuleType =
  | 'single'
  | 'ep'
  | 'album'
  | 'series'
  | 'video';

export interface MusicReleaseRule {
  id: string;
  type: MusicReleaseRuleType;
  label: string;
  description: string;

  minItems: number;
  maxItems: number;

  enabled: boolean;
}

export interface MusicPreviewRules {
  enabled: boolean;
  minSeconds: number;
  maxSeconds: number;
  defaultSeconds: number;
}

export interface MusicPricingRules {
  enabled: boolean;
  minimumPrice: number;
  maximumPrice: number;
  defaultPrice: number;
  allowFree: boolean;
  allowPaid: boolean;
  allowPreviewPaid: boolean;
  allowPremium: boolean;
  allowExclusive: boolean;
}

export interface MusicPublishingRules {
  allowDrafts: boolean;
  allowScheduledReleases: boolean;
  requireArtwork: boolean;
  requireDescription: boolean;
  requireGenre: boolean;
  requireTags: boolean;
  requireCreatorProfile: boolean;
  requireCreatorApproval: boolean;
}

export interface MusicVideoRules {
  enabled: boolean;
  maxVideosPerRelease: number;
  maxDurationMinutes: number;
}

export interface MusicRulesConfig {
  id: string;
  version: number;

  releaseRules: MusicReleaseRule[];

  preview: MusicPreviewRules;

  pricing: MusicPricingRules;

  publishing: MusicPublishingRules;

  video: MusicVideoRules;

  updatedAt: string;
  updatedBy?: string;
}

export interface UpdateMusicRulesPayload {
  releaseRules: MusicReleaseRule[];
  preview: MusicPreviewRules;
  pricing: MusicPricingRules;
  publishing: MusicPublishingRules;
  video: MusicVideoRules;
}

export const DEFAULT_MUSIC_RULES: MusicRulesConfig = {
  id: 'music-platform-rules',
  version: 1,

  releaseRules: [
    {
      id: 'single',
      type: 'single',
      label: 'Single',
      description: 'A single release containing one or more tracks.',
      minItems: 1,
      maxItems: 2,
      enabled: true,
    },
    {
      id: 'ep',
      type: 'ep',
      label: 'EP',
      description: 'An extended play release containing multiple tracks.',
      minItems: 3,
      maxItems: 6,
      enabled: true,
    },
    {
      id: 'album',
      type: 'album',
      label: 'Album',
      description: 'A full-length album containing multiple tracks.',
      minItems: 7,
      maxItems: 25,
      enabled: true,
    },
    {
      id: 'series',
      type: 'series',
      label: 'Video / Content Series',
      description: 'A multi-episode creator series.',
      minItems: 2,
      maxItems: 25,
      enabled: true,
    },
    {
      id: 'video',
      type: 'video',
      label: 'Video Release',
      description: 'A video-based release.',
      minItems: 1,
      maxItems: 1,
      enabled: true,
    },
  ],

  preview: {
    enabled: true,
    minSeconds: 10,
    maxSeconds: 120,
    defaultSeconds: 30,
  },

  pricing: {
    enabled: true,
    minimumPrice: 0,
    maximumPrice: 999.99,
    defaultPrice: 0,
    allowFree: true,
    allowPaid: true,
    allowPreviewPaid: true,
    allowPremium: true,
    allowExclusive: true,
  },

  publishing: {
    allowDrafts: true,
    allowScheduledReleases: true,
    requireArtwork: false,
    requireDescription: false,
    requireGenre: false,
    requireTags: false,
    requireCreatorProfile: true,
    requireCreatorApproval: false,
  },

  video: {
    enabled: true,
    maxVideosPerRelease: 1,
    maxDurationMinutes: 180,
  },

  updatedAt: new Date().toISOString(),
};