import type { AccessLevel, MusicAccessType } from '../types/music.types';
import { accessBadgeLabel } from '../utils/musicAccess';

interface MusicAccessBadgeProps {
  accessType: MusicAccessType;
  level?: AccessLevel;
}

export function MusicAccessBadge({ accessType, level }: MusicAccessBadgeProps) {
  const label = accessBadgeLabel(accessType, level);
  const purchased = level === 'full' && accessType !== 'free';
  const variant = purchased ? 'purchased' : accessType;

  return (
    <span className={`music-access-badge music-access-badge--${variant}`} data-testid="music-access-badge">
      {purchased && <CheckIcon />}
      {label}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
