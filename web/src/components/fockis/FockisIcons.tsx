import React from "react";

/**
 * Fockis Icon System
 * ───────────────────
 * A single family of custom line marks: 1.75px stroke, rounded caps/joins,
 * 24×24 viewBox, no fills except where noted. Deliberately avoids the
 * silhouettes people associate with other platforms (no heart, no
 * speech-bubble-with-tail, no paper-airplane, no house-shaped home icon).
 */

export interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  title?: string;
}

const base = (strokeWidth = 1.75) => ({
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

function Svg({
  size = 24,
  className,
  title,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

// ── Navigation ──────────────────────────────────────────────────────────

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
  </Svg>
);

export const IconDiscover = (p: IconProps) => (
  <Svg {...p}>
    <circle {...base(p.strokeWidth)} cx="12" cy="12" r="8.25" />
    <path {...base(p.strokeWidth)} d="m14.6 9.4-1.9 4.4-4.4 1.9 1.9-4.4z" />
  </Svg>
);

export const IconFriends = (p: IconProps) => (
  <Svg {...p}>
    <circle {...base(p.strokeWidth)} cx="8.5" cy="9" r="2.75" />
    <circle {...base(p.strokeWidth)} cx="16" cy="10.5" r="2.15" />
    <path {...base(p.strokeWidth)} d="M3.5 19c.6-3 2.4-4.6 5-4.6s4.4 1.6 5 4.6" />
    <path {...base(p.strokeWidth)} d="M14.6 14.9c2.1.2 3.5 1.6 4 4.1" />
  </Svg>
);

export const IconWaves = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M3 15c1.6 0 1.6-2 3.2-2s1.6 2 3.2 2 1.6-2 3.2-2 1.6 2 3.2 2 1.6-2 3.2-2" />
    <path {...base(p.strokeWidth)} d="M3 10c1.6 0 1.6-2 3.2-2s1.6 2 3.2 2 1.6-2 3.2-2 1.6 2 3.2 2 1.6-2 3.2-2" opacity=".5" />
  </Svg>
);

export const IconMessages = (p: IconProps) => (
  <Svg {...p}>
    <rect {...base(p.strokeWidth)} x="3.5" y="5.5" width="17" height="11.5" rx="3" />
    <path {...base(p.strokeWidth)} d="M8 20.5 9.8 17h1.9z" fill="currentColor" stroke="none" />
    <path {...base(p.strokeWidth)} d="M7.5 9.5h9M7.5 12.5h5.5" />
  </Svg>
);

export const IconNotifications = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M6 10.5a6 6 0 0 1 12 0c0 3.2.9 5 2 6H4c1.1-1 2-2.8 2-6Z" />
    <path {...base(p.strokeWidth)} d="M9.5 19a2.6 2.6 0 0 0 5 0" />
  </Svg>
);

export const IconMarketplace = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4.5 9 6 4.5h12L19.5 9" />
    <rect {...base(p.strokeWidth)} x="4.5" y="9" width="15" height="10.5" rx="1.5" />
    <path {...base(p.strokeWidth)} d="M9 12.5a3 3 0 0 0 6 0" />
  </Svg>
);

export const IconGroups = (p: IconProps) => (
  <Svg {...p}>
    <rect {...base(p.strokeWidth)} x="3.5" y="4.5" width="8" height="8" rx="2" />
    <rect {...base(p.strokeWidth)} x="12.5" y="4.5" width="8" height="8" rx="2" />
    <rect {...base(p.strokeWidth)} x="3.5" y="13.5" width="8" height="6" rx="2" />
    <rect {...base(p.strokeWidth)} x="12.5" y="13.5" width="8" height="6" rx="2" />
  </Svg>
);

export const IconSaved = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-3.6L5.5 20V5.5a1 1 0 0 1 1-1Z" />
  </Svg>
);

export const IconProfile = (p: IconProps) => (
  <Svg {...p}>
    <circle {...base(p.strokeWidth)} cx="12" cy="8.3" r="3.3" />
    <path {...base(p.strokeWidth)} d="M4.8 19.5c1-3.6 3.4-5.4 7.2-5.4s6.2 1.8 7.2 5.4" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle {...base(p.strokeWidth)} cx="12" cy="12" r="2.6" />
    <path
      {...base(p.strokeWidth)}
      d="M12 4.5v2M12 17.5v2M19.5 12h-2M6.5 12h-2M17.4 6.6l-1.4 1.4M8 16l-1.4 1.4M17.4 17.4 16 16M8 8 6.6 6.6"
    />
  </Svg>
);

export const IconHelp = (p: IconProps) => (
  <Svg {...p}>
    <circle {...base(p.strokeWidth)} cx="12" cy="12" r="8.25" />
    <path {...base(p.strokeWidth)} d="M9.6 9.3a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1 .8-1 1.7" />
    <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle {...base(p.strokeWidth)} cx="10.8" cy="10.8" r="6.3" />
    <path {...base(p.strokeWidth)} d="m19.5 19.5-4-4" />
  </Svg>
);

// ── Post actions (the original Fockis interaction language) ──────────────

/** "Spark" — Fockis's original reaction mark, not a heart. */
export const IconSpark = (p: IconProps) => (
  <Svg {...p}>
    <path
      {...base(p.strokeWidth)}
      d="M12 3.5c.6 3 1.9 4.6 4.7 5.3-2.8.7-4.1 2.3-4.7 5.3-.6-3-1.9-4.6-4.7-5.3 2.8-.7 4.1-2.3 4.7-5.3Z"
    />
    <path {...base(p.strokeWidth)} d="M18.3 15c.3 1.5 1 2.2 2.4 2.6-1.4.4-2.1 1.1-2.4 2.6-.3-1.5-1-2.2-2.4-2.6 1.4-.4 2.1-1.1 2.4-2.6Z" />
  </Svg>
);

export const IconSparkFilled = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M12 3.5c.6 3 1.9 4.6 4.7 5.3-2.8.7-4.1 2.3-4.7 5.3-.6-3-1.9-4.6-4.7-5.3 2.8-.7 4.1-2.3 4.7-5.3Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={p.strokeWidth ?? 1.75}
      strokeLinejoin="round"
    />
    <path
      d="M18.3 15c.3 1.5 1 2.2 2.4 2.6-1.4.4-2.1 1.1-2.4 2.6-.3-1.5-1-2.2-2.4-2.6 1.4-.4 2.1-1.1 2.4-2.6Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={p.strokeWidth ?? 1.75}
      strokeLinejoin="round"
    />
  </Svg>
);

/** "Dot-thread" — comment mark: three linked dots instead of a bubble. */
export const IconComment = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4.5 8.5c0 3.9 3.4 7 7.5 7 .8 0 1.6-.1 2.3-.3l3.7 1.3-.9-3.1c1.2-1.2 1.9-2.7 1.9-4.4 0-3.9-3.4-7-7.5-7s-7.5 3.1-7.5 6.5Z" />
  </Svg>
);

/** "Loop" — repost mark: a continuous loop, not the familiar refresh arrows. */
export const IconRepost = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M7 8h8a3 3 0 0 1 3 3v1" />
    <path {...base(p.strokeWidth)} d="m6 6-2 2 2 2" />
    <path {...base(p.strokeWidth)} d="M17 16H9a3 3 0 0 1-3-3v-1" />
    <path {...base(p.strokeWidth)} d="m18 18 2-2-2-2" />
  </Svg>
);

/** "Out-post" — share mark: an arrow lifting out of a bracket. */
export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M12 14.5V4.5" />
    <path {...base(p.strokeWidth)} d="M8.2 8.3 12 4.5l3.8 3.8" />
    <path {...base(p.strokeWidth)} d="M5.5 12.5v6a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-6" />
  </Svg>
);

/** "Arch" — save mark, echoing the Fockis story-card arch shape. */
export const IconSave = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-3.6L5.5 20V5.5a1 1 0 0 1 1-1Z" />
  </Svg>
);
export const IconSaveFilled = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-3.6L5.5 20V5.5a1 1 0 0 1 1-1Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={p.strokeWidth ?? 1.75}
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconFollow = (p: IconProps) => (
  <Svg {...p}>
    <circle {...base(p.strokeWidth)} cx="10" cy="8.5" r="3" />
    <path {...base(p.strokeWidth)} d="M4 19c.7-3.3 2.8-5 6-5s5.3 1.7 6 5" />
    <path {...base(p.strokeWidth)} d="M18 8.5v4M16 10.5h4" />
  </Svg>
);

export const IconShop = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4.5 9 6 4.5h12L19.5 9" />
    <rect {...base(p.strokeWidth)} x="4.5" y="9" width="15" height="10.5" rx="1.5" />
    <path {...base(p.strokeWidth)} d="M9 12.5a3 3 0 0 0 6 0" />
  </Svg>
);

// ── Media / composer ───────────────────────────────────────────────────

export const IconPhoto = (p: IconProps) => (
  <Svg {...p}>
    <rect {...base(p.strokeWidth)} x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle {...base(p.strokeWidth)} cx="9" cy="10" r="1.6" />
    <path {...base(p.strokeWidth)} d="m5 17 4.5-4.5L13 16l2.5-2.5L20.5 18" />
  </Svg>
);

export const IconMultiPhoto = (p: IconProps) => (
  <Svg {...p}>
    <rect {...base(p.strokeWidth)} x="6.5" y="6.5" width="14" height="13" rx="2" />
    <path {...base(p.strokeWidth)} d="M3.5 15.5v-9a2 2 0 0 1 2-2h9" />
  </Svg>
);

export const IconVideo = (p: IconProps) => (
  <Svg {...p}>
    <rect {...base(p.strokeWidth)} x="3.5" y="6" width="12" height="12" rx="2" />
    <path {...base(p.strokeWidth)} d="m15.5 10.2 5-2.7v9l-5-2.7" />
  </Svg>
);

export const IconPoll = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M6 18V10M12 18V6M18 18v-5" />
    <path {...base(p.strokeWidth)} d="M4 20.5h16" />
  </Svg>
);

export const IconProduct = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M12.5 3.5h4a1 1 0 0 1 1 1v4l-9 9-5-5Z" />
    <circle cx="15" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconProperty = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4 11 12 5l8 6" />
    <path {...base(p.strokeWidth)} d="M6 10v8.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
    <path {...base(p.strokeWidth)} d="M10 19.5v-5h4v5" />
  </Svg>
);

// ── Wave / video controls ──────────────────────────────────────────────

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5.5v13l10-6.5Z" fill="currentColor" stroke="currentColor" strokeWidth={p.strokeWidth ?? 1.75} strokeLinejoin="round" />
  </Svg>
);

export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.6" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconMute = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4 10v4h3.5L12 17.5v-11L7.5 10Z" />
    <path {...base(p.strokeWidth)} d="m15.5 9.5 4 4M19.5 9.5l-4 4" />
  </Svg>
);

export const IconUnmute = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4 10v4h3.5L12 17.5v-11L7.5 10Z" />
    <path {...base(p.strokeWidth)} d="M15.8 9.3a4 4 0 0 1 0 5.4M18 7.2a7 7 0 0 1 0 9.6" />
  </Svg>
);

export const IconFullscreen = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4.5 9V6.5a2 2 0 0 1 2-2H9M15 4.5h2.5a2 2 0 0 1 2 2V9M19.5 15v2.5a2 2 0 0 1-2 2H15M9 19.5H6.5a2 2 0 0 1-2-2V15" />
  </Svg>
);

// ── Status / misc ──────────────────────────────────────────────────────

export const IconVerified = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M12 3.2 14 4.6l2.5-.3 1 2.3 2.3 1-.3 2.5 1.4 2-1.4 2 .3 2.5-2.3 1-1 2.3-2.5-.3L12 20.8l-2-1.4-2.5.3-1-2.3-2.3-1 .3-2.5-1.4-2 1.4-2-.3-2.5 2.3-1 1-2.3 2.5.3Z"
      fill="currentColor"
      stroke="none"
    />
    <path d="m8.5 12.3 2.2 2.2 4.6-4.8" stroke="var(--fk-verified-mark, #fff)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconSellerBadge = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M4.5 9 6 4.5h12L19.5 9" />
    <rect {...base(p.strokeWidth)} x="4.5" y="9" width="15" height="10.5" rx="1.5" />
    <path {...base(p.strokeWidth)} d="M9 12.5a3 3 0 0 0 6 0" />
  </Svg>
);

export const IconMore = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle {...base(p.strokeWidth)} cx="12" cy="12" r="4.2" />
    <path {...base(p.strokeWidth)} d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2Z" />
  </Svg>
);

export const IconTrend = (p: IconProps) => (
  <Svg {...p}>
    <path {...base(p.strokeWidth)} d="m4 16 5-5 3.5 3.5L20 7" />
    <path {...base(p.strokeWidth)} d="M15 7h5v5" />
  </Svg>
);

export const IconStar = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="m12 4.5 2.1 4.5 4.9.6-3.6 3.4.9 4.9-4.3-2.4-4.3 2.4.9-4.9-3.6-3.4 4.9-.6Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={p.strokeWidth ?? 1.75}
      strokeLinejoin="round"
    />
  </Svg>
);

/** A tiny waveform — the original story indicator, replacing a ring-around-a-photo. */
export function IconWaveGlyph({ className }: { className?: string }) {
  return (
    <svg width="44" height="12" viewBox="0 0 44 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M1 6c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4 2 4 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}