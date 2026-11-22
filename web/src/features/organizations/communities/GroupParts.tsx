/**
 * GroupParts.tsx
 * Visuals shared by the Groups & Communities screens. Generic pieces (modal,
 * fields, menus, toasts, avatars) are the ones the Ministries module uses.
 */

import { useState } from "react";
import { Baby, BookOpen, Church, Heart, HeartHandshake, HandHeart, Sparkles, UsersRound, type LucideIcon } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { STATUS_LABELS } from "./communitiesApi";

export { DotsMenu, Empty, Field, Modal, PersonAvatar, SkeletonCards, Tone, fmtDate, money, useToast, type MenuItem } from "../ministries/MinistryParts";

export const CATEGORY_LOOK: Record<string, { icon: LucideIcon; color: string }> = {
  fellowship: { icon: UsersRound, color: "#1f63f2" },
  bible_study: { icon: BookOpen, color: "#1f63f2" },
  prayer: { icon: HandHeart, color: "#7c3aed" },
  age: { icon: Baby, color: "#0ea5e9" },
  family: { icon: Heart, color: "#e11d48" },
  outreach: { icon: HeartHandshake, color: "#0ea5e9" },
  custom: { icon: Sparkles, color: "#8b3df5" },
};

export const lookFor = (category: string) => CATEGORY_LOOK[category] ?? { icon: Church, color: "#1f63f2" };

export function GroupIcon({ category, logoUrl, size = 40 }: { category: string; logoUrl?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const look = lookFor(category);
  const src = mediaUrl(logoUrl ?? null);
  if (src && !broken)
    return (
      <span className="gc-icon gc-icon--img" style={{ width: size, height: size }}>
        <img src={src} alt="" onError={() => setBroken(true)} />
      </span>
    );
  const Icon = look.icon;
  return (
    <span className="gc-icon" style={{ width: size, height: size, background: look.color }}>
      <Icon aria-hidden="true" style={{ width: size * 0.52, height: size * 0.52 }} />
    </span>
  );
}

export function GroupCover({ photoUrl, category, className = "" }: { photoUrl: string | null; category: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = mediaUrl(photoUrl);
  const look = lookFor(category);
  if (src && !broken) return <img className={"gc-cover " + className} src={src} alt="" loading="lazy" onError={() => setBroken(true)} />;
  const Icon = look.icon;
  return (
    <div className={"gc-cover gc-cover--art " + className} style={{ background: `linear-gradient(135deg, ${look.color} 0%, ${look.color}c0 55%, ${look.color}70 100%)` }} aria-hidden="true">
      <Icon />
    </div>
  );
}

export function GroupStatus({ status }: { status: string }) {
  return <span className={`mn-pill mn-pill--${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}

export const groupPath = (organizationId: string, groupId: string, tab?: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/groups/${encodeURIComponent(groupId)}${tab ? `?tab=${tab}` : ""}`;
