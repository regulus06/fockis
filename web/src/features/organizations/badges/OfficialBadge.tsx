/**
 * OfficialBadge.tsx
 * -----------------------------------------------------------------------------
 * The official Fockis church member badge (My Badge reference design), drawn
 * as one SVG. The same drawing is used on screen, in the photo editor preview,
 * when printing and for PNG/PDF downloads, so they always look identical.
 * -----------------------------------------------------------------------------
 */

import { forwardRef, useId, useMemo } from "react";

import { mediaUrl } from "../api/dashboardApi";
import { MEMBER_ROLE_LABELS } from "../types/organization.types";
import { badgePhotoSrc, badgeVerifyUrl, type Badge, type BadgeVerifyState, type PhotoShape } from "./badgeApi";
import { qrMatrix, qrSvgPath } from "./qr";

export const BADGE_W = 390;
export const BADGE_H = 548;

const NAVY = "#0b1f4d";
const BLUE = "#0d47b8";
const BLUE_2 = "#1a5fd8";
const LIGHT = "#6ea2f2";
const FONT = "'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif";

export function roleLabel(badge: Pick<Badge, "role" | "customTitle">): string {
  return badge.customTitle || MEMBER_ROLE_LABELS[badge.role as keyof typeof MEMBER_ROLE_LABELS] || badge.role || "Member";
}

/** Aspect ratio (width / height) of each photo shape. */
export function shapeAspect(shape: PhotoShape): number {
  return shape === "rectangle" || shape === "oval" ? 4 / 5 : 1;
}

/** Shape outline as SVG path data, inside the box (x, y, w, h). */
export function shapePath(shape: PhotoShape, x: number, y: number, w: number, h: number, cornerPct = 24): string {
  const rr = (r: number) => {
    const k = Math.max(0, Math.min(r, w / 2, h / 2));
    return `M${x + k},${y}H${x + w - k}A${k},${k} 0 0 1 ${x + w},${y + k}V${y + h - k}A${k},${k} 0 0 1 ${x + w - k},${y + h}H${x + k}A${k},${k} 0 0 1 ${x},${y + h - k}V${y + k}A${k},${k} 0 0 1 ${x + k},${y}Z`;
  };
  const ellipse = () => {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    return `M${cx - rx},${cy}A${rx},${ry} 0 1 0 ${cx + rx},${cy}A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`;
  };
  const short = Math.min(w, h);
  switch (shape) {
    case "circle":
    case "oval":
      return ellipse();
    case "rounded":
      return rr(short * 0.2);
    case "square":
      return rr(short * 0.03);
    case "rectangle":
      return rr(short * 0.06);
    case "custom":
      return rr((short * Math.max(0, Math.min(50, cornerPct))) / 100);
    default:
      return ellipse();
  }
}

/** Rough text width for the badge font, used to shrink long names. */
function fitSize(text: string, maxWidth: number, base: number, bold = true): number {
  const per = bold ? 0.58 : 0.52;
  const width = text.length * base * per;
  return width <= maxWidth ? base : Math.max(base * 0.55, Math.floor((maxWidth / (text.length * per)) * 10) / 10);
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const STAMP: Partial<Record<BadgeVerifyState, string>> = {
  suspended: "SUSPENDED",
  revoked: "REVOKED",
  expired: "EXPIRED",
  membership_inactive: "INACTIVE",
  not_member: "INVALID",
  pending: "PENDING",
};

export interface OfficialBadgeProps {
  badge: Badge;
  /** Use this picture instead of the saved one (photo editor preview). */
  photoOverride?: string | null;
  shapeOverride?: PhotoShape;
  cornerOverride?: number;
  /** Data URLs to embed (for downloads); keys: "logo", "photo". */
  embedded?: { logo?: string | null; photo?: string | null };
  title?: string;
  className?: string;
  /** Hide the status stamp (e.g. sample previews). */
  noStamp?: boolean;
}

const OfficialBadge = forwardRef<SVGSVGElement, OfficialBadgeProps>(function OfficialBadge(
  { badge, photoOverride, shapeOverride, cornerOverride, embedded, title, className, noStamp },
  ref,
) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const shape: PhotoShape = shapeOverride ?? badge.photo?.shape ?? "circle";
  const corner = cornerOverride ?? badge.photo?.cornerRadius ?? 24;
  const photo = embedded?.photo ?? (photoOverride !== undefined ? photoOverride : badgePhotoSrc(badge.avatarUrl));
  const logo = embedded?.logo ?? mediaUrl(badge.organizationLogoUrl);

  const qr = useMemo(() => {
    const value = badgeVerifyUrl(badge.verifyToken);
    if (!value) return null;
    try {
      const m = qrMatrix(value);
      return { size: m.length + 8, d: qrSvgPath(m) };
    } catch {
      return null;
    }
  }, [badge.verifyToken]);

  // Photo box: 172 wide; rectangle/oval are 4:5.
  const aspect = shapeAspect(shape);
  const pw = aspect < 1 ? 150 : 172;
  const ph = pw / aspect;
  const pcx = BADGE_W / 2;
  const pcy = 178;
  const px = pcx - pw / 2;
  const py = pcy - ph / 2;
  const ring = 7;
  const photoClip = shapePath(shape, px, py, pw, ph, corner);
  const ringPath = shapePath(shape, px - ring, py - ring, pw + ring * 2, ph + ring * 2, corner);

  const name = badge.displayName || "Member";
  const role = roleLabel(badge);
  const ministry = badge.ministry ?? (badge.departmentNames?.[0] || null);
  const ministryText = ministry || "No Ministry Assigned";
  const orgName = badge.organizationName || "Organization";
  const location = badge.organizationLocation || "";
  const since = badge.joinedAt ? new Date(badge.joinedAt).getFullYear() : null;
  const state = badge.verifyState ?? (badge.active ? "verified" : "membership_inactive");
  const stamp = noStamp ? undefined : STAMP[state];

  const nameSize = fitSize(name, 330, 33);
  const orgSize = fitSize(orgName, 268, 21);
  const pillTop = Math.min(py + ph + 10, 284);

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${BADGE_W} ${BADGE_H}`}
      width={BADGE_W}
      height={BADGE_H}
      className={className}
      role="img"
      aria-label={title ?? `${orgName} member badge for ${name}`}
      fontFamily={FONT}
    >
      <defs>
        <clipPath id={`card${uid}`}>
          <rect x="0" y="0" width={BADGE_W} height={BADGE_H} rx="20" />
        </clipPath>
        <clipPath id={`photo${uid}`}>
          <path d={photoClip} />
        </clipPath>
        <clipPath id={`logo${uid}`}>
          <circle cx="50" cy="52" r="29" />
        </clipPath>
        <linearGradient id={`head${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a3a9c" />
          <stop offset="1" stopColor={BLUE_2} />
        </linearGradient>
        <linearGradient id={`foot${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a3a9c" />
          <stop offset="1" stopColor={BLUE_2} />
        </linearGradient>
      </defs>

      <g clipPath={`url(#card${uid})`}>
        <rect width={BADGE_W} height={BADGE_H} fill="#ffffff" />

        {/* watermark: cross over a small chapel roof */}
        <g opacity="0.13" fill={BLUE_2}>
          <rect x="333" y="318" width="12" height="62" rx="2" />
          <rect x="314" y="334" width="50" height="11" rx="2" />
          <path d="M290 440 L339 392 L390 440 V470 H290 Z" />
        </g>

        {/* header waves */}
        <path d="M0 0H390V112C352 104 318 110 280 124C214 149 128 178 0 168Z" fill={LIGHT} opacity="0.9" />
        <path d="M0 0H390V102C350 94 316 100 276 113C210 136 126 160 0 150Z" fill={`url(#head${uid})`} />
        <path d="M0 150C126 160 210 136 276 113C316 100 350 94 390 102V108C350 100 318 106 280 119C212 143 128 168 0 158Z" fill="#ffffff" opacity="0.18" />

        {/* footer waves */}
        <path d="M0 516C96 524 196 538 318 548H0Z" fill={LIGHT} opacity="0.85" />
        <path d="M0 527C90 532 180 542 280 548H0Z" fill={`url(#foot${uid})`} />

        {/* logo */}
        <circle cx="50" cy="52" r="33" fill="#ffffff" />
        {logo ? (
          <image data-embed="logo" href={logo} x="21" y="23" width="58" height="58" preserveAspectRatio="xMidYMid slice" clipPath={`url(#logo${uid})`} />
        ) : (
          <text x="50" y="60" textAnchor="middle" fontSize="22" fontWeight="700" fill={BLUE}>
            {initials(orgName)}
          </text>
        )}

        {/* church name + location */}
        <text x="96" y={location ? 47 : 58} fontSize={orgSize} fontWeight="700" fill="#ffffff">
          {orgName}
        </text>
        {location && (
          <text x="96" y="71" fontSize="14" fill="#dbe7ff">
            {location}
          </text>
        )}

        {/* photo */}
        <path d={ringPath} fill="#ffffff" stroke="#d6e3f8" strokeWidth="1.5" />
        {photo ? (
          <image
            data-embed="photo"
            href={photo}
            x={px}
            y={py}
            width={pw}
            height={ph}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#photo${uid})`}
          />
        ) : (
          <g clipPath={`url(#photo${uid})`}>
            <rect x={px} y={py} width={pw} height={ph} fill="#e6eefb" />
            <circle cx={pcx} cy={pcy - ph * 0.12} r={pw * 0.2} fill="#a9bfe3" />
            <ellipse cx={pcx} cy={py + ph * 0.98} rx={pw * 0.38} ry={ph * 0.3} fill="#a9bfe3" />
          </g>
        )}

        {/* MEMBER pill */}
        <rect x={pcx - 59} y={pillTop} width="118" height="27" rx="13.5" fill={BLUE} />
        <text x={pcx} y={pillTop + 19} textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffffff" letterSpacing="1">
          MEMBER
        </text>

        {/* name, role, ministry */}
        <text x={pcx} y={pillTop + 62} textAnchor="middle" fontSize={nameSize} fontWeight="700" fill={NAVY}>
          {name}
        </text>
        <text x={pcx} y={pillTop + 89} textAnchor="middle" fontSize={fitSize(role, 320, 18)} fontWeight="700" fill={BLUE_2}>
          {role}
        </text>
        <text x={pcx} y={pillTop + 113} textAnchor="middle" fontSize={fitSize(ministryText, 320, 16.5, false)} fill="#334155">
          {ministryText}
        </text>

        {/* number + year */}
        <text x="26" y="482" fontSize="16" fill={NAVY}>
          No.{" "}
          <tspan fontWeight="700" fontSize={fitSize(badge.memberNumber, 150, 17)}>
            {badge.memberNumber}
          </tspan>
        </text>
        {since && (
          <text x="26" y="505" fontSize="14" fill="#64748b">
            Member since {since}
          </text>
        )}

        {/* QR */}
        <rect x="258" y="414" width="108" height="108" rx="8" fill="#ffffff" />
        {qr ? (
          <svg x="260" y="416" width="104" height="104" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges">
            <rect width={qr.size} height={qr.size} fill="#ffffff" />
            <path d={qr.d} fill="#0b1220" />
          </svg>
        ) : (
          <text x="312" y="472" textAnchor="middle" fontSize="13" fill="#94a3b8">
            QR
          </text>
        )}

        {stamp && (
          <g transform={`rotate(-18 ${pcx} ${pcy + 40})`}>
            <rect x={pcx - 128} y={pcy + 12} width="256" height="56" rx="10" fill="#ffffff" fillOpacity="0.82" stroke="#dc2626" strokeWidth="4" />
            <text x={pcx} y={pcy + 52} textAnchor="middle" fontSize="30" fontWeight="800" fill="#dc2626" letterSpacing="3">
              {stamp}
            </text>
          </g>
        )}
      </g>
      <rect x="0.5" y="0.5" width={BADGE_W - 1} height={BADGE_H - 1} rx="19.5" fill="none" stroke="#c9d8f0" />
    </svg>
  );
});

export default OfficialBadge;
