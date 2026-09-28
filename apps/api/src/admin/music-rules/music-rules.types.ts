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