import { Gavel, LifeBuoy, Server, ShieldAlert, ShoppingBag, UserCog, type LucideIcon } from "lucide-react";

import type { NotificationCategory, NotificationPriority } from "./adminNotificationsApi";

export const CATEGORY_META: Record<NotificationCategory, { label: string; icon: LucideIcon }> = {
  security: { label: "Security", icon: ShieldAlert },
  accounts: { label: "Accounts", icon: UserCog },
  marketplace: { label: "Marketplace", icon: ShoppingBag },
  support: { label: "Support", icon: LifeBuoy },
  legal: { label: "Legal", icon: Gavel },
  system: { label: "System", icon: Server },
};

export const PRIORITY_LABEL: Record<NotificationPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function CategoryIcon({ category, size = 16 }: { category: NotificationCategory; size?: number }) {
  const Icon = CATEGORY_META[category]?.icon ?? Server;
  return (
    <span className={`fk-notif-cat fk-notif-cat--${category}`} title={CATEGORY_META[category]?.label ?? category}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
