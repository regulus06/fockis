import type { SVGProps } from 'react';

/**
 * Small, dependency-free icon set. The project may already have an icon
 * library elsewhere — if so, swap these call sites for it. Kept local here
 * so this feature has zero new dependencies.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" /></svg>
);
export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" /></svg>
);
export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 21s-7.5-4.9-10-9.3C.4 8.4 2 4.5 5.9 4a5 5 0 0 1 6.1 3 5 5 0 0 1 6.1-3c3.9.5 5.5 4.4 3.9 7.7C19.5 16.1 12 21 12 21z" />
  </svg>
);
export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
  </svg>
);
export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.6" y2="16.6" /></svg>
);
export const GridIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);
export const ListIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}><polyline points="20 6 9 17 4 12" /></svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const SkipBackIcon = (p: IconProps) => (
  <svg {...base(p)}><polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
);
export const SkipForwardIcon = (p: IconProps) => (
  <svg {...base(p)}><polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
);
export const ShuffleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
  </svg>
);
export const RepeatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
export const VolumeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
  </svg>
);
export const FullscreenIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);
export const PipIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="2" /><rect x="12" y="12" width="8" height="6" fill="currentColor" stroke="none" /></svg>
);
export const VerifiedIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2l2.4 2.1 3.1-.4 1 3 2.8 1.5-.6 3.1 1.7 2.7-2.1 2.4.4 3.1-3 1-1.5 2.8-3.1-.6-2.7 1.7-2.4-2.1-3.1.4-1-3-2.8-1.5.6-3.1L2.5 12l2.1-2.4-.4-3.1 3-1 1.5-2.8 3.1.6L12 2z" />
    <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const MusicNoteIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
);
export const VideoIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="2" y="6" width="14" height="12" rx="2" /><polygon points="22 8 16 12 22 16 22 8" /></svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const XIcon = (p: IconProps) => (
  <svg {...base(p)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
);
export const InboxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.5 5h13l3 7v7a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2v-7l3-7z" />
  </svg>
);
export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
export const TrendingIcon = (p: IconProps) => (
  <svg {...base(p)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
);