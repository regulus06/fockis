import type { AccessLevel, MusicAccessType } from '../types/music.types';

// Purely presentational helpers. The actual access DECISION always comes
// from the backend (`ResolvedAccess` / `PlaybackUrlResponse`) — nothing
// here should be used to gate playback client-side.

export function accessBadgeLabel(accessType: MusicAccessType, level?: AccessLevel): string {
  if (level === 'full' && accessType !== 'free') return 'Purchased';
  switch (accessType) {
    case 'free':
      return 'Free';
    case 'preview_paid':
      return 'Preview';
    case 'paid':
      return 'Paid';
    case 'premium':
      return 'Premium';
    case 'exclusive':
      return 'Exclusive';
    default:
      return '';
  }
}

export function isLocked(level?: AccessLevel): boolean {
  return level !== 'full';
}
