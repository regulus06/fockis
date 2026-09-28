/**
 * organization-type.enum.ts
 * -----------------------------------------------------------------------------
 * Organization Type — MUST match the web feature's church.types.ts exactly
 * (web/src/features/church/types/church.types.ts -> OrganizationType). Do not
 * rename these values; the frontend sends/expects these exact strings.
 * -----------------------------------------------------------------------------
 */

export enum OrganizationType {
  Church = 'church',
  ChristianMinistry = 'christian_ministry',
  ChristianFellowship = 'christian_fellowship',
  Mission = 'mission',
  PrayerOrganization = 'prayer_organization',
  ChristianNetwork = 'christian_network',
  ChristianNonprofit = 'christian_nonprofit',
  BibleStudyOrganization = 'bible_study_organization',
  Other = 'other',
}
