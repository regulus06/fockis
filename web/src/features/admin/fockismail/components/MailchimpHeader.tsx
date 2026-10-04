import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "./ui/Icon";
import { Avatar, DemoBadge } from "./ui/Badge";
import { Popover } from "./ui/Popover";
import { useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import { campaignsApi } from "../services/campaignsApi";
import { audienceApi } from "../services/audienceApi";
import { templatesApi } from "../services/templatesApi";
import { NAV_ITEMS } from "./navigation";
import type { MarketingNotification } from "../types/platform.types";
import { notificationsApi, subscribeNotifications } from "../services/notificationsApi";
import { useMarketingWorkspace, useViewer } from "../hooks/useMarketingWorkspace";
import { useCredits } from "../hooks/useCredits";
import { CreditPill } from "./CreditMeter";
import { NOTIFICATION_ICONS } from "../utils/platformLabels";
import { timeAgo } from "../utils/format";
import type { IconName } from "./ui/Icon";

interface SearchResult {
  id: string;
  label: string;
  meta: string;
  path: string;
  icon: IconName;
}

function GlobalSearch() {
  const to = useMarketingPath();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !target.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  useEffect(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) {
      setResults((r) => (r.length ? [] : r));
      return;
    }
    let live = true;
    const timer = window.setTimeout(async () => {
      const [campaigns, contacts, templates] = await Promise.all([
        campaignsApi.list({ search: term }),
        audienceApi.contacts({ search: term }),
        templatesApi.list(),
      ]);
      if (!live) return;
      const pages: SearchResult[] = NAV_ITEMS.flatMap((n) => [{ label: n.label, path: n.path }, ...(n.children ?? [])])
        .filter((p) => p.label.toLowerCase().includes(term))
        .slice(0, 4)
        .map((p) => ({ id: `page-${p.path}-${p.label}`, label: p.label, meta: "Page", path: p.path, icon: "layout" }));
      setResults([
        ...pages,
        ...campaigns.slice(0, 4).map((c) => ({ id: c.id, label: c.name, meta: "Campaign", path: to(`campaigns/${c.id}`), icon: "send" as IconName })),
        ...contacts.slice(0, 4).map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}`, meta: c.email, path: to(`audience/${c.id}`), icon: "users" as IconName })),
        ...templates.filter((t) => t.name.toLowerCase().includes(term)).slice(0, 3).map((t) => ({ id: t.id, label: t.name, meta: "Template", path: to(`templates?preview=${t.id}`), icon: "layout" as IconName })),
      ]);
      setActive(0);
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [q, to]);

  const go = (r: SearchResult) => {
    navigate(r.path);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="fm-gsearch" ref={box}>
      <Icon name="search" size={16} />
      <input
        ref={input}
        type="search"
        placeholder="Search campaigns, contacts, templates"
        aria-label="Search marketing"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="fm-gsearch-results"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && results[active]) go(results[active]);
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <kbd aria-hidden>/</kbd>
      {open && q.trim().length >= 2 && (
        <ul id="fm-gsearch-results" className="fm-gsearch__results" role="listbox">
          {results.length === 0 && <li className="fm-gsearch__empty">No matches for “{q}”.</li>}
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === active}>
              <button type="button" className={i === active ? "is-active" : undefined} onMouseEnter={() => setActive(i)} onClick={() => go(r)}>
                <Icon name={r.icon} size={16} />
                <span className="fm-gsearch__label">{r.label}</span>
                <span className="fm-gsearch__meta">{r.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface HeaderProps {
  onOpenMenu: () => void;
}

function NotificationsMenu() {
  const { currentBusiness } = useMarketingWorkspace();
  const { can } = useViewer();
  const navigate = useNavigate();
  const [items, setItems] = useState<MarketingNotification[] | null>(null);
  const businessId = currentBusiness?.id;
  const agency = can("agency.view");

  useEffect(() => {
    if (!businessId) return;
    const load = () => notificationsApi.list(businessId, agency).then(setItems).catch(() => setItems([]));
    load();
    return subscribeNotifications(load);
  }, [businessId, agency]);

  const unread = items?.filter((n) => !n.read).length ?? 0;

  return (
    <Popover
      id="fm-notifications"
      label="Notifications"
      width={380}
      trigger={({ open, toggle, id }) => (
        <button type="button" className="fm-iconbtn fm-header__bell" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} aria-controls={id} onClick={toggle}>
          <Icon name="bell" />
          {unread > 0 && <span className="fm-dot" aria-hidden />}
        </button>
      )}
    >
      {(close) => (
        <div className="fm-notifs">
          <div className="fm-notifs__head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" className="fm-linkbtn" onClick={() => items && notificationsApi.markAllRead(items.map((n) => n.id))}>Mark all as read</button>}
          </div>
          {!items && <p className="fm-muted fm-pad">Loading…</p>}
          {items?.length === 0 && <p className="fm-muted fm-pad">You're all caught up.</p>}
          <ul>
            {items?.map((n) => (
              <li key={n.id} className={n.read ? undefined : "is-unread"}>
                <button
                  type="button"
                  className="fm-notifs__item"
                  onClick={() => {
                    notificationsApi.markRead(n.id);
                    close();
                    if (n.link) navigate(n.link);
                  }}
                >
                  <span className={`fm-notifs__icon is-${n.type.toLowerCase()}`}><Icon name={NOTIFICATION_ICONS[n.type]} size={15} /></span>
                  <span className="fm-notifs__text">
                    <strong>{n.title}</strong>
                    <span>{n.body}</span>
                    <time>{timeAgo(n.createdAt)}</time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Popover>
  );
}

function HeaderCredits() {
  const { currentBusiness } = useMarketingWorkspace();
  const credits = useCredits(currentBusiness?.id);
  if (!credits.data) return null;
  return (
    <div className="fm-header__credits" aria-label="Credits remaining">
      <CreditPill balance={credits.data} channel="email" thresholds={credits.thresholds} />
      <CreditPill balance={credits.data} channel="sms" thresholds={credits.thresholds} />
    </div>
  );
}

export function MailchimpHeader({ onOpenMenu }: HeaderProps) {
  const { isMock, userName, toast } = useMailchimp();
  const to = useMarketingPath();

  return (
    <header className="fm-header">
      <button type="button" className="fm-iconbtn fm-header__menu" onClick={onOpenMenu} aria-label="Open navigation">
        <Icon name="menu" />
      </button>
      <Link to={to()} className="fm-header__title">
        <span className="fm-logo fm-logo--sm" aria-hidden>F</span>
        <span>Fockis Marketing</span>
      </Link>
      <GlobalSearch />
      <div className="fm-header__actions">
        <HeaderCredits />
        {isMock && <DemoBadge label="Demo mode" />}

        <NotificationsMenu />

        <Popover
          id="fm-help"
          label="Help"
          width={260}
          trigger={({ open, toggle, id }) => (
            <button type="button" className="fm-iconbtn" aria-label="Help" aria-expanded={open} aria-controls={id} onClick={toggle}>
              <Icon name="help" />
            </button>
          )}
        >
          {(close) => (
            <div className="fm-menu-list">
              <p className="fm-menu-list__title">Help</p>
              <button type="button" onClick={() => { close(); toast("Press / to search. Use arrow keys in menus and tabs.", "info"); }}>
                <Icon name="code" size={15} /> Keyboard shortcuts
              </button>
              <Link to={to("settings?section=domains")} onClick={close}><Icon name="globe" size={15} /> Set up a sending domain</Link>
              <Link to={to("integrations")} onClick={close}><Icon name="plug" size={15} /> Connect integrations</Link>
              <button type="button" onClick={() => { close(); toast("Fockis support will reply by email within one business day.", "info"); }}>
                <Icon name="mail" size={15} /> Contact support
              </button>
            </div>
          )}
        </Popover>

        <Popover
          id="fm-account"
          label="Account"
          width={250}
          trigger={({ open, toggle, id }) => (
            <button type="button" className="fm-account" aria-label="Account menu" aria-expanded={open} aria-controls={id} onClick={toggle}>
              <Avatar name={userName} size={30} />
              <span className="fm-account__name">{userName}</span>
              <Icon name="chevronDown" size={14} />
            </button>
          )}
        >
          {(close) => (
            <div className="fm-menu-list">
              <div className="fm-account__card">
                <Avatar name={userName} size={36} />
                <div>
                  <strong>{userName}</strong>
                  <small>Fockis Marketing admin</small>
                </div>
              </div>
              <Link to={to("settings")} onClick={close}><Icon name="settings" size={15} /> Marketing settings</Link>
              <Link to="/marketing/billing" onClick={close}><Icon name="receipt" size={15} /> Billing & credits</Link>
              <Link to="/marketing/agency" onClick={close}><Icon name="grid" size={15} /> Agency dashboard</Link>
              <Link to={to("legacy")} onClick={close}><Icon name="mail" size={15} /> Classic Mailchimp panel</Link>
              <Link to="/fockis-preview" onClick={close}><Icon name="home" size={15} /> Back to Fockis</Link>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}
