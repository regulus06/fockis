import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMarketingWorkspace, useViewer } from "../hooks/useMarketingWorkspace";
import { Icon } from "./ui/Icon";
import { BUSINESS_TYPE_LABELS } from "../utils/platformLabels";
import { cx } from "../utils/format";
import type { Business } from "../types/platform.types";
import { MARKETING_ROUTES } from "./navigation";

export function BusinessMark({ business, size = 32 }: { business: Pick<Business, "name" | "accent" | "logo">; size?: number }) {
  if (business.logo) return <img src={business.logo} alt="" className="fm-bizmark" style={{ width: size, height: size }} />;
  const letters = business.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="fm-bizmark" style={{ width: size, height: size, background: business.accent, fontSize: size * 0.4 }} aria-hidden>
      {letters}
    </span>
  );
}

/** Sidebar workspace selector: agency views, client workspaces, create business. */
export function WorkspaceSwitcher({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { currentBusiness, businesses, switchBusiness } = useMarketingWorkspace();
  const { can } = useViewer();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!currentBusiness) return <div className="fm-wsswitch is-loading" aria-hidden />;

  const list = businesses.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));
  const choose = (b: Business) => {
    switchBusiness(b.id);
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate(MARKETING_ROUTES.overview);
  };

  return (
    <div className={cx("fm-wsswitch", compact && "is-compact")} ref={ref}>
      <button type="button" className="fm-wsswitch__btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} title={compact ? currentBusiness.name : undefined}>
        <BusinessMark business={currentBusiness} size={compact ? 34 : 36} />
        {!compact && (
          <span className="fm-wsswitch__text">
            <small>Fockis Marketing</small>
            <strong>{currentBusiness.name}</strong>
          </span>
        )}
        {!compact && <Icon name="chevronDown" size={15} />}
      </button>

      {open && (
        <div className="fm-wsswitch__panel" role="dialog" aria-label="Switch workspace">
          <p className="fm-wsswitch__label">Current workspace</p>
          <div className="fm-wsswitch__current">
            <BusinessMark business={currentBusiness} size={28} />
            <div>
              <strong>{currentBusiness.name}</strong>
              <small>{currentBusiness.isAgencyOwner ? "Fockis (your agency)" : BUSINESS_TYPE_LABELS[currentBusiness.type]}</small>
            </div>
          </div>
          {can("agency.view") && (
            <div className="fm-wsswitch__group">
              <Link to={MARKETING_ROUTES.agency} onClick={() => { setOpen(false); onNavigate?.(); }}><Icon name="grid" size={15} /> Agency dashboard</Link>
              <Link to={MARKETING_ROUTES.clients} onClick={() => { setOpen(false); onNavigate?.(); }}><Icon name="users" size={15} /> All clients</Link>
            </div>
          )}
          {businesses.length > 6 && (
            <input className="fm-input fm-wsswitch__search" placeholder="Find a workspace" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a workspace" autoFocus />
          )}
          <ul className="fm-wsswitch__list">
            {list.map((b) => (
              <li key={b.id}>
                <button type="button" className={cx(b.id === currentBusiness.id && "is-active")} onClick={() => choose(b)} aria-current={b.id === currentBusiness.id ? "true" : undefined}>
                  <BusinessMark business={b} size={24} />
                  <span>{b.name}</span>
                  {b.status === "onboarding" && <small>Onboarding</small>}
                  {b.id === currentBusiness.id && <Icon name="check" size={14} />}
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="fm-muted fm-small fm-pad">No workspace matches “{query}”.</li>}
          </ul>
          {can("agency.manage_clients") && (
            <Link className="fm-wsswitch__create" to={MARKETING_ROUTES.newClient} onClick={() => { setOpen(false); onNavigate?.(); }}>
              <Icon name="plus" size={15} /> Create business
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
