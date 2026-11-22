/**
 * MinistryBanner.tsx
 * -----------------------------------------------------------------------------
 * The ministry cover banner from the Fockis ministry design:
 *
 *   wide rounded landscape photo · navy shade on the left · blue icon tile ·
 *   large white ministry name · church name underneath · short description ·
 *   hand-lettered ministry name on a blue brush stroke at the right.
 *
 * Every word comes from the ministry and church records; nothing is fixed to
 * "Youth Ministry". Without a photo the banner falls back to a blue gradient.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useId } from "react";
import { BookOpen, HandHeart, HeartHandshake, Megaphone, Music, UsersRound, type LucideIcon } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";

export function ministryIcon(name: string, type?: string | null): LucideIcon {
  const t = `${name} ${type ?? ""}`.toLowerCase();
  if (/music|worship|choir|praise/.test(t)) return Music;
  if (/pray|intercess/.test(t)) return HeartHandshake;
  if (/bible|study|school|teach|education/.test(t)) return BookOpen;
  if (/outreach|mission|evangel|community|service/.test(t)) return HandHeart;
  if (/media|communication|announce/.test(t)) return Megaphone;
  return UsersRound;
}

/** "Youth Ministry" → ["Youth", "Ministry"]; long names split near the middle. */
function scriptLines(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [name, ""];
  if (words.length === 2) return [words[0], words[1]];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** Dry-brush stroke behind the hand-lettered title (rough edges come from an SVG noise filter). */
function BrushStroke() {
  const id = `mb-rough-${useId().replace(/:/g, "")}`;
  return (
    <svg className="mb-script__brush" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.6" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={`url(#${id})`} fill="currentColor">
        <path d="M30 44 C100 34 190 24 290 16 L304 120 C220 132 130 150 34 176 Z" />
        <path d="M14 64 L36 52 L40 168 L18 160 Z" opacity=".8" />
        <path d="M292 22 L316 34 L312 110 L300 122 Z" opacity=".8" />
      </g>
      <g stroke="currentColor" strokeLinecap="round" fill="none" filter={`url(#${id})`}>
        <path d="M24 188 C100 170 180 156 270 146" strokeWidth="5" opacity=".6" />
        <path d="M70 18 C150 10 220 6 296 4" strokeWidth="4" opacity=".5" />
      </g>
    </svg>
  );
}

export interface MinistryBannerProps {
  ministryName: string;
  organizationName: string;
  description?: string | null;
  imageUrl?: string | null;
  ministryType?: string | null;
  /** Show the hand-lettered name on the right (default on). */
  showScript?: boolean;
}

const SCRIPT_FONT_ID = "fockis-script-font";

/** Loads the hand-lettering font once (falls back to the system script font offline). */
function useScriptFont() {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(SCRIPT_FONT_ID)) return;
    const link = document.createElement("link");
    link.id = SCRIPT_FONT_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Kaushan+Script&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function MinistryBanner({ ministryName, organizationName, description, imageUrl, ministryType, showScript = true }: MinistryBannerProps): React.JSX.Element {
  useScriptFont();
  const img = mediaUrl(imageUrl);
  const Icon = ministryIcon(ministryName, ministryType);
  const [line1, line2] = scriptLines(ministryName);
  const longName = ministryName.length > 26;

  return (
    <section className={"mb" + (img ? "" : " mb--plain")} aria-label={`${ministryName} banner`}>
      {img && <div className="mb__media" style={{ backgroundImage: `url("${img}")` }} />}
      <div className="mb__shade" />

      <div className="mb__content">
        <div className="mb__titlerow">
          <span className="mb__icon">
            <Icon aria-hidden="true" />
          </span>
          <div className="mb__titles">
            <h1>{ministryName}</h1>
            <p className="mb__org">{organizationName}</p>
          </div>
        </div>
        {description && <p className="mb__desc">{description}</p>}
      </div>

      {showScript && !longName && (
        <div className="mb-script" aria-hidden="true">
          <BrushStroke />
          <span className="mb-script__text">
            <span>{line1}</span>
            {line2 && <span>{line2}</span>}
          </span>
        </div>
      )}
    </section>
  );
}
