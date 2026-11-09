/**
 * OrgShell.tsx
 * -----------------------------------------------------------------------------
 * Building blocks shared by every organization page so they all look the same:
 *
 *   <OrgShell>      header + (optional) organization side menu + content
 *   <PageHead>      eyebrow, title, subtitle, actions
 *   <Section>       titled block
 *   <Tile>          icon link card
 *   <Empty>         empty state with actions
 *   <Loading>       skeleton
 *   <ErrorNote>     red notice
 *   <OrgLogo>       organization logo or initial
 * -----------------------------------------------------------------------------
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import OrganizationHeader from "../components/OrganizationHeader";
import OrganizationSidebar from "../components/OrganizationSidebar";
import { useSidebarViewer } from "../hooks/useSidebarViewer";
import "../styles/OrganizationForms.scss";

/* ---------------------------------------------------------------- shell */

export function OrgShell({
  organizationId,
  organizationName,
  sidebar = Boolean(organizationId),
  narrow = false,
  children,
}: {
  organizationId?: string;
  organizationName?: string;
  sidebar?: boolean;
  narrow?: boolean;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="church-page fko-page">
      <OrganizationHeader organizationId={organizationId} organizationName={organizationName} />
      {sidebar && organizationId ? (
        <div className="church-container church-org-layout">
          <ShellSidebar organizationId={organizationId} organizationName={organizationName} />
          <main className="church-org-content fko-content">{children}</main>
        </div>
      ) : (
        <main className={narrow ? "fko-narrow" : "fko-main"}>{children}</main>
      )}
    </div>
  );
}

function ShellSidebar({ organizationId, organizationName }: { organizationId: string; organizationName?: string }) {
  const viewer = useSidebarViewer(organizationId);
  return <OrganizationSidebar organizationId={organizationId} organizationName={organizationName} viewer={viewer} />;
}

/* ------------------------------------------------------------ page head */

export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}): React.JSX.Element {
  return (
    <header className="fko-head">
      <div className="fko-head__text">
        {eyebrow && <span className="fko-eyebrow">{eyebrow}</span>}
        <h1 className="fko-title">{title}</h1>
        {subtitle && <p className="fko-muted">{subtitle}</p>}
      </div>
      {actions && <div className="fko-head__actions">{actions}</div>}
    </header>
  );
}

/* -------------------------------------------------------------- section */

export function Section({
  title,
  action,
  children,
  card = false,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  card?: boolean;
}): React.JSX.Element {
  const body = (
    <>
      {(title || action) && (
        <div className="fko-section__head">
          {title && <h2 className="fko-subtitle">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </>
  );
  return card ? <section className="fko-card fko-section">{body}</section> : <section className="fko-section">{body}</section>;
}

/* ----------------------------------------------------------------- tile */

export function Tile({
  to,
  icon,
  title,
  text,
  badge,
}: {
  to: string;
  icon: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  badge?: ReactNode;
}): React.JSX.Element {
  return (
    <Link to={to} className="fko-tile">
      <span className="fko-tile__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="fko-tile__title">
        {title}
        {badge !== undefined && badge !== null && badge !== 0 && <span className="fko-tile__badge">{badge}</span>}
      </span>
      {text && <span className="fko-tile__text">{text}</span>}
    </Link>
  );
}

/* ---------------------------------------------------------- empty/load */

export function Empty({ title, text, children }: { title: ReactNode; text?: ReactNode; children?: ReactNode }) {
  return (
    <div className="fko-card fko-empty">
      <strong>{title}</strong>
      {text && <span className="fko-muted">{text}</span>}
      {children && <div className="fko-actions">{children}</div>}
    </div>
  );
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="fko-tiles" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="fko-skeleton" />
      ))}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="fko-error" role="alert">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ logo */

export function OrgLogo({ name, url, className = "fko-orgcard__logo" }: { name?: string; url?: string | null; className?: string }) {
  if (url) return <img src={url} alt="" className={className} />;
  return (
    <span className={className} aria-hidden="true">
      {(name ?? "?").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------------------------------------------------------------- utils */

export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export const orgPath = (id: string, suffix = "") => `/organizations/${encodeURIComponent(id)}${suffix}`;
