/**
 * SocialIcons.tsx — round social media links for the public homepage
 * (contact panel and footer). Only links the organization saved are shown.
 * Simple inline icons (no icon-font dependency).
 */

import { Globe } from "lucide-react";

const LABELS: Record<string, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  twitter: "X",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};

function Icon({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": true as const };
  switch (name) {
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} fill="currentColor">
          <path d="M16.6 3h-3.1v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.4a5.9 5.9 0 1 0 5 5.8V9.1a7.5 7.5 0 0 0 4.4 1.4V7.4a4.4 4.4 0 0 1-4.4-4.4Z" />
        </svg>
      );
    case "x":
    case "twitter":
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L5 21H1.9l7.3-8.3L1.6 3H8l4.4 5.9L17.5 3Zm-1.1 16.2h1.7L7.2 4.7H5.4l11 14.5Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common} fill="currentColor">
          <path d="M6.9 8.8H3.6V20h3.3V8.8ZM5.3 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 13.7c0-3-1.6-5.2-4.4-5.2-1.4 0-2.4.8-2.8 1.5V8.8H10V20h3.3v-5.6c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.3v-6.3Z" />
        </svg>
      );
    default:
      return <Globe width={18} height={18} aria-hidden="true" />;
  }
}

export default function SocialIcons({ links, className = "cw-socials" }: { links: (readonly [string, string])[]; className?: string }) {
  if (!links.length) return null;
  return (
    <span className={className}>
      {links.map(([key, href]) => (
        <a key={key} href={href} target="_blank" rel="noreferrer noopener" aria-label={LABELS[key] ?? key} title={LABELS[key] ?? key}>
          <Icon name={key} />
        </a>
      ))}
    </span>
  );
}
