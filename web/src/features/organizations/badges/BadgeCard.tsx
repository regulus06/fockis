/**
 * BadgeCard.tsx
 * -----------------------------------------------------------------------------
 * A member badge in one of four templates. Standard ID-card size
 * (CR80: 85.6 × 54 mm) — portrait for Classic, Minimal and Event pass,
 * landscape for Modern. The QR code links to /badges/verify/<token>.
 * -----------------------------------------------------------------------------
 */

import { useMemo } from "react";

import { MEMBER_ROLE_LABELS } from "../types/organization.types";
import { typeLabel } from "../ui/orgCategories";
import { qrMatrix, qrSvgPath } from "./qr";
import { badgePhotoSrc, badgeVerifyUrl, type Badge, type BadgeDesign } from "./badgeApi";
import "./Badges.scss";

export function QrCode({ value, className }: { value: string; className?: string }): React.JSX.Element {
  const svg = useMemo(() => {
    if (!value) return null;
    try {
      const m = qrMatrix(value);
      return { size: m.length + 8, d: qrSvgPath(m) };
    } catch {
      return null;
    }
  }, [value]);
  if (!svg) return <span className={"badge-qr badge-qr--empty " + (className ?? "")}>QR</span>;
  return (
    <svg className={"badge-qr " + (className ?? "")} viewBox={`0 0 ${svg.size} ${svg.size}`} shapeRendering="crispEdges" role="img" aria-label="Badge QR code">
      <rect width={svg.size} height={svg.size} fill="#fff" />
      <path d={svg.d} fill="#000" />
    </svg>
  );
}

/** White or dark text, whichever reads better on the accent colour. */
function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#14213d" : "#fff";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function year(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

function Photo({ badge, className }: { badge: Badge; className: string }) {
  return badge.avatarUrl ? (
    <img className={className} src={badgePhotoSrc(badge.avatarUrl) ?? undefined} alt="" crossOrigin="anonymous" />
  ) : (
    <span className={className + " badge-photo--initials"} aria-hidden="true">
      {initials(badge.displayName)}
    </span>
  );
}

function Logo({ badge }: { badge: Badge }) {
  return badge.organizationLogoUrl ? (
    <img className="badge-logo" src={badge.organizationLogoUrl} alt="" crossOrigin="anonymous" />
  ) : (
    <span className="badge-logo badge-logo--initials" aria-hidden="true">
      {initials(badge.organizationName)}
    </span>
  );
}

export default function BadgeCard({ badge, design }: { badge: Badge; design: BadgeDesign }): React.JSX.Element {
  const accent = /^#[0-9a-f]{6}$/i.test(design.accentColor) ? design.accentColor : "#005a8d";
  const style = { "--badge-accent": accent, "--badge-on-accent": textOn(accent) } as React.CSSProperties;
  const qr = badgeVerifyUrl(badge.verifyToken);
  const role = MEMBER_ROLE_LABELS[badge.role as keyof typeof MEMBER_ROLE_LABELS] ?? badge.role;
  const since = design.showMemberSince ? year(badge.joinedAt) : "";
  const extras = [
    ...(design.showDepartments ? badge.departmentNames : []),
    ...(design.showGroups ? badge.groupNames : []),
  ].slice(0, 3);
  const inactive = !badge.active || badge.status !== "active";

  const details = (
    <>
      {design.showRole && role && role.toLowerCase() !== design.badgeTitle.trim().toLowerCase() && <span className="badge-role">{role}</span>}
      {extras.length > 0 && <span className="badge-extra">{extras.join(" · ")}</span>}
      {design.showMemberDomain && badge.memberDomain && <span className="badge-domain">{badge.memberDomain}</span>}
    </>
  );

  const number = (
    <span className="badge-number">
      <span className="badge-number__id">
        <small>No.</small> {badge.memberNumber}
      </span>
      {since && <small className="badge-since">Member since {since}</small>}
    </span>
  );

  const shared = { className: `badge badge--${design.template}${inactive ? " badge--inactive" : ""}`, style };

  if (design.template === "modern") {
    return (
      <article {...shared} aria-label={`${badge.displayName} badge`}>
        <header className="badge-top">
          <Logo badge={badge} />
          <span className="badge-org">{badge.organizationName}</span>
        </header>
        <div className="badge-body">
          <Photo badge={badge} className="badge-photo" />
          <div className="badge-info">
            <strong className="badge-name">{badge.displayName}</strong>
            {details}
            {number}
          </div>
          <QrCode value={qr} />
        </div>
        <footer className="badge-band">
          <span>{design.badgeTitle}</span>
          {design.footerText && <span className="badge-footer">{design.footerText}</span>}
        </footer>
        {inactive && <span className="badge-void">NOT VALID</span>}
      </article>
    );
  }

  if (design.template === "minimal") {
    return (
      <article {...shared} aria-label={`${badge.displayName} badge`}>
        <header className="badge-top">
          <Logo badge={badge} />
          <span className="badge-org">{badge.organizationName}</span>
        </header>
        <div className="badge-who">
          <Photo badge={badge} className="badge-photo" />
          <div className="badge-info">
            <span className="badge-title">{design.badgeTitle}</span>
            <strong className="badge-name">{badge.displayName}</strong>
            {details}
          </div>
        </div>
        <div className="badge-qrbox">
          <QrCode value={qr} />
          {number}
        </div>
        {design.footerText && <footer className="badge-footer">{design.footerText}</footer>}
        {inactive && <span className="badge-void">NOT VALID</span>}
      </article>
    );
  }

  if (design.template === "bold") {
    return (
      <article {...shared} aria-label={`${badge.displayName} badge`}>
        <span className="badge-slot" aria-hidden="true" />
        <header className="badge-top">
          <span className="badge-org">{badge.organizationName}</span>
          <span className="badge-kind">{badge.organizationType ? typeLabel(badge.organizationType) : ""}</span>
        </header>
        <span className="badge-title">{design.badgeTitle}</span>
        <Photo badge={badge} className="badge-photo" />
        <strong className="badge-name">{badge.displayName}</strong>
        <div className="badge-details">{details}</div>
        <div className="badge-qrbox">
          <QrCode value={qr} />
          <div>
            {number}
            {design.footerText && <span className="badge-footer">{design.footerText}</span>}
          </div>
        </div>
        {inactive && <span className="badge-void">NOT VALID</span>}
      </article>
    );
  }

  // classic
  return (
    <article {...shared} aria-label={`${badge.displayName} badge`}>
      <header className="badge-top">
        <Logo badge={badge} />
        <span className="badge-org">{badge.organizationName}</span>
      </header>
      <Photo badge={badge} className="badge-photo" />
      <span className="badge-title">{design.badgeTitle}</span>
      <strong className="badge-name">{badge.displayName}</strong>
      <div className="badge-details">{details}</div>
      <div className="badge-bottom">
        {number}
        <QrCode value={qr} />
      </div>
      {design.footerText && <footer className="badge-footer">{design.footerText}</footer>}
      {inactive && <span className="badge-void">NOT VALID</span>}
    </article>
  );
}

/** Sample member for template previews when the organization has no badges yet. */
export function sampleBadge(organizationName: string, organizationType: string | null, prefix = "ORG"): Badge {
  return {
    id: "sample",
    organizationId: "",
    membershipId: "sample",
    userId: "",
    memberNumber: `${prefix}-4F2A9C`,
    displayName: "Marie Joseph",
    avatarUrl: null,
    organizationName,
    organizationLogoUrl: null,
    organizationType,
    role: "member",
    status: "active",
    joinedAt: new Date(new Date().getFullYear() - 2, 2, 1).toISOString(),
    departmentNames: ["Hospitality"],
    groupNames: ["Youth choir"],
    verifyToken: "sample-badge-preview-0000",
    memberDomain: "marie.example.fockis.org",
    active: true,
    issuedAt: new Date().toISOString(),
  };
}
