import type { ReactNode } from "react";
import {
  BadgeCheck,
  CircleCheck,
  CircleDot,
  Clock3,
  Copyright,
  CreditCard,
  Database,
  FileText,
  Flag,
  History,
  Home,
  Lock,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { PolicySection } from "../api/policyCenterApi";

export const POLICY_TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/settings/policy", label: "Overview", icon: Home, end: true },
  { to: "/settings/policy/guidelines", label: "Policies & Guidelines", icon: FileText },
  { to: "/settings/policy/privacy", label: "Privacy Controls", icon: ShieldCheck },
  { to: "/settings/policy/data", label: "My Data", icon: Database },
  { to: "/settings/policy/consent", label: "Consent", icon: BadgeCheck },
  { to: "/settings/policy/safety", label: "Safety Center", icon: Flag },
  { to: "/settings/policy/appeals", label: "Appeals", icon: Scale },
  { to: "/settings/policy/history", label: "Policy History", icon: History },
];

export function policyIcon(slug: string, category: string): LucideIcon {
  if (slug === "terms") return FileText;
  if (category === "privacy") return Lock;
  if (category === "community") return Users;
  if (category === "fockis_shop") return ShoppingCart;
  if (category === "payments") return CreditCard;
  if (category === "copyright") return Copyright;
  if (category === "data_retention") return Database;
  if (category === "moderation") return Scale;
  if (category === "security") return ShieldCheck;
  return FileText;
}

/** Policy text: paragraphs, "- " bullets and "1. " numbered lines. */
export function PolicyBody({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length}>
        {list.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of String(text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(/^[-•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    blocks.push(<p key={blocks.length}>{line}</p>);
  }
  flush();
  return <>{blocks}</>;
}

export function PolicyDocument({ sections }: { sections: PolicySection[] }) {
  return (
    <div className="fk-pol-doc">
      {sections.map((s, i) => (
        <section key={i} id={`section-${i + 1}`}>
          {s.heading && <h2>{s.heading}</h2>}
          <PolicyBody text={s.body} />
        </section>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`fk-pol-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

const STATUS: Record<string, { label: string; tone: string; icon: LucideIcon }> = {
  accepted: { label: "Accepted", tone: "green", icon: CircleCheck },
  action_needed: { label: "Review needed", tone: "amber", icon: Clock3 },
  not_required: { label: "For information", tone: "gray", icon: CircleDot },
};

export function AcceptancePill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.not_required;
  const Icon = s.icon;
  return (
    <span className={`fk-pol-pill fk-pol-pill--${s.tone}`}>
      <Icon size={14} aria-hidden /> {s.label}
    </span>
  );
}

export function Pill({ tone, children }: { tone: "green" | "amber" | "red" | "blue" | "gray" | "purple"; children: ReactNode }) {
  return <span className={`fk-pol-pill fk-pol-pill--${tone}`}>{children}</span>;
}

export function Card({ title, icon, action, children, className = "" }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`fk-pol-card ${className}`.trim()}>
      {(title || action) && (
        <header className="fk-pol-card__head">
          {icon && <span className="fk-pol-card__icon">{icon}</span>}
          {title && <h2>{title}</h2>}
          {action && <div className="fk-pol-card__action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
