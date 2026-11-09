/**
 * OrganizationsHomePage.tsx
 * -----------------------------------------------------------------------------
 * /organizations (and the legacy /church) — the Fockis Organizations landing
 * page, recreated from the Fockis Organizations artwork:
 *
 *   hero    big Fockis Organizations wordmark, tagline with brush underline,
 *           five slanted photo panels (Faith, Business, Nonprofit, Sports,
 *           Community) with navy label bands, blue waves, and the remaining
 *           categories as an icon row.
 *   then    introduction · organization management · member management ·
 *           public websites · administration tools · discover (live data) ·
 *           benefits · create call to action · footer
 *
 * Every category links to Discover filtered by that category. The "Discover"
 * section lists real organizations from GET /organizations.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Globe,
  IdCard,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Lock,
  MapPin,
  Megaphone,
  Menu,
  Network,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { listOrganizations } from "../api/organizationsApi";
import { getAuthToken } from "../api/organizationApi";
import type { OrganizationSummary } from "../types/organization.types";
import FockisFMark from "../ui/FockisFMark";
import { PLATFORM_CATEGORIES, categoryInfo, type CategoryInfo, type PlatformCategory } from "../ui/orgTerminology";
import { typeLabel } from "../ui/orgCategories";
import { OrgLogoBox, useOrgFonts } from "../ui/orgUi";
import "../ui/fockisOrgTheme.scss";
import "../styles/OrganizationsLanding.scss";

const BASE = import.meta.env.BASE_URL || "/";
const HERO_PANELS = `${BASE}organizations/hero-panels.jpg`;
const HERO_PANELS_WEBP = `${BASE}organizations/hero-panels.webp`;

const discoverLink = (c: PlatformCategory) => `/organizations/discover?category=${encodeURIComponent(c)}`;
const byId = (id: PlatformCategory) => PLATFORM_CATEGORIES.find((c) => c.id === id) as CategoryInfo;

/** The five photo panels of the artwork, left to right, with their band shapes. */
const PANELS: { id: PlatformCategory; label: [string, string]; clip: string; cx: number }[] = [
  { id: "faith", label: ["Faith &", "Religion"], clip: "polygon(5.6% 69.12%, 25.52% 69.12%, 20.61% 100%, 0.67% 100%)", cx: 13.1 },
  { id: "business", label: ["Business &", "Professional"], clip: "polygon(26.49% 69.12%, 45.44% 69.12%, 40.75% 100%, 21.59% 100%)", cx: 33.57 },
  { id: "nonprofit", label: ["Nonprofit", "& Charity"], clip: "polygon(46.41% 69.12%, 65.45% 69.12%, 60.79% 100%, 41.72% 100%)", cx: 53.59 },
  { id: "sports", label: ["Sports &", "Recreation"], clip: "polygon(66.43% 69.12%, 85.23% 69.12%, 79.93% 100%, 61.77% 100%)", cx: 73.34 },
  { id: "social", label: ["Community", "& Social"], clip: "polygon(86.21% 69.12%, 100% 69.12%, 100% 100%, 80.91% 100%)", cx: 91.78 },
];

/** The icon row under the waves. Civic & Political completes the platform's list. */
const ROW: { id: PlatformCategory; label: [string, string?]; tone: string }[] = [
  { id: "clubs", label: ["Clubs &", "Associations"], tone: "blue" },
  { id: "arts", label: ["Arts &", "Culture"], tone: "teal" },
  { id: "health", label: ["Health &", "Wellness"], tone: "red" },
  { id: "youth", label: ["Youth &", "Family"], tone: "blue" },
  { id: "civic", label: ["Civic &", "Political"], tone: "navy" },
  { id: "technology", label: ["Technology"], tone: "navy" },
  { id: "environment", label: ["Environment"], tone: "green" },
  { id: "other", label: ["Other"], tone: "navy" },
];

const ORG_FEATURES = [
  { icon: Sparkles, title: "Branded profile", text: "Logo, cover, description, mission and vision — your organization's identity in one place." },
  { icon: MapPin, title: "Branches & locations", text: "One main location and as many branches as you need, each with its own address and contact." },
  { icon: Network, title: "Departments & groups", text: "Ministries, departments, committees, teams and small groups with their own leaders." },
  { icon: CalendarDays, title: "Events & attendance", text: "Publish events, collect RSVPs and record who attended — with absence reports." },
  { icon: Megaphone, title: "Communication", text: "Announcements, messages and notifications that reach the right people." },
  { icon: ImageIcon, title: "Media & live", text: "A media library for photos, videos and documents, plus livestreams." },
];

const MEMBER_FEATURES = [
  { icon: UserPlus, title: "Applications & approvals", text: "People ask to join with one link; administrators approve or decline." },
  { icon: KeyRound, title: "Roles & permissions", text: "Owner, administrators, leaders and members — each permission granted on purpose." },
  { icon: FileText, title: "Records & history", text: "Join dates, role changes, groups and attendance kept as an auditable history." },
  { icon: IdCard, title: "Member badges", text: "A digital membership card with a QR code anyone can verify." },
  { icon: Users, title: "Directory & search", text: "Search and filter by role, status and department in seconds." },
  { icon: UserCheck, title: "Your words", text: "Members, employees, volunteers or athletes — the platform speaks your language." },
];

const ADMIN_TOOLS = [
  { icon: LayoutDashboard, title: "Live dashboard", text: "Members, pending applications, upcoming events, growth and attendance at a glance." },
  { icon: BarChart3, title: "Growth & attendance", text: "Charts built from your real records — never sample numbers." },
  { icon: ClipboardCheck, title: "Quick actions", text: "Add or invite members, create events, send announcements, record attendance." },
  { icon: ShieldCheck, title: "Secure by design", text: "Every action is checked on the server. Private information stays private." },
];

const BENEFITS = [
  { icon: UsersRound, title: "Built into Fockis", text: "Your members already have Fockis accounts — no second sign-in, no new app to learn." },
  { icon: Globe, title: "Your own Fockis domain", text: "A permanent address like yourname.fockis.com for your organization and members." },
  { icon: Smartphone, title: "Everywhere", text: "Designed for phones, tablets and desktops from the first pixel." },
  { icon: Lock, title: "Private where it matters", text: "Visitors see only what you publish. Members see only what they are allowed to." },
  { icon: Zap, title: "Ready in minutes", text: "Create your organization in four short steps and start inviting people today." },
  { icon: BadgeCheck, title: "For every organization", text: "Faith, business, nonprofit, sports, community, civic, arts and more." },
];

function Waves(): React.JSX.Element {
  return (
    <svg className="fol-waves" viewBox="0 0 1672 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fol-wave-blue" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#0757c2" />
          <stop offset="45%" stopColor="#1a8cff" />
          <stop offset="100%" stopColor="#0a63d1" />
        </linearGradient>
        <linearGradient id="fol-wave-light" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f4f8fd" />
        </linearGradient>
        <linearGradient id="fol-wave-right" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#1a8cff" stopOpacity="0" />
          <stop offset="60%" stopColor="#1a8cff" />
          <stop offset="100%" stopColor="#0757c2" />
        </linearGradient>
      </defs>
      <path d="M0 40 C 180 120, 420 150, 640 120 C 900 85, 1250 105, 1672 95 L1672 300 L0 300 Z" fill="url(#fol-wave-blue)" />
      <path d="M0 64 C 210 140, 430 160, 650 132" fill="none" stroke="#7cc0ff" strokeWidth="3" opacity="0.7" />
      <path d="M0 150 C 260 132, 520 112, 820 108 C 1120 104, 1380 122, 1672 112 L1672 300 L0 300 Z" fill="url(#fol-wave-light)" />
      <path d="M1180 150 C 1380 170, 1560 150, 1672 120 L1672 210 C 1540 205, 1380 185, 1180 150 Z" fill="url(#fol-wave-right)" opacity="0.9" />
    </svg>
  );
}

function BrushUnderline(): React.JSX.Element {
  return (
    <svg className="fol-hero__brush" viewBox="0 0 300 18" aria-hidden="true" focusable="false">
      <path d="M4 14 C 80 4, 200 2, 296 8" fill="none" stroke="#1a8cff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export default function OrganizationsHomePage(): React.JSX.Element {
  useOrgFonts("#ffffff");
  const signedIn = Boolean(getAuthToken());
  const [menuOpen, setMenuOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [orgsState, setOrgsState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    listOrganizations({ page: 1, pageSize: 6 }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setOrgs(Array.isArray(res?.items) ? res.items.slice(0, 6) : []);
        setOrgsState("ready");
      })
      .catch(() => !controller.signal.aborted && setOrgsState("error"));
    return () => controller.abort();
  }, []);

  return (
    <div className="fo fol">
      {/* ------------------------------------------------------------ nav */}
      <header className="fol-nav">
        <Link to="/organizations" className="fol-nav__brand" aria-label="Fockis Organizations home">
          <FockisFMark size={28} />
          <span>
            <strong>Fockis</strong> Organizations
          </span>
        </Link>
        <button
          type="button"
          className="fol-nav__toggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="fol-nav-links"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav id="fol-nav-links" className={"fol-nav__links" + (menuOpen ? " is-open" : "")} aria-label="Fockis Organizations">
          <Link to="/organizations" aria-current="page">
            Home
          </Link>
          <Link to="/organizations/discover">Discover Organizations</Link>
          <Link to="/organization/me">My Organizations</Link>
          <Link to="/organizations/new">Create Organization</Link>
          <span className="fol-nav__lang">
            <LanguageSelector />
          </span>
          {signedIn ? (
            <Link to="/organization/me" className="fo-btn fo-btn--primary fo-btn--sm">
              Open my portal
            </Link>
          ) : (
            <Link to={"/login?returnTo=" + encodeURIComponent("/organizations")} className="fo-btn fo-btn--primary fo-btn--sm">
              Sign In
            </Link>
          )}
        </nav>
      </header>

      {/* ----------------------------------------------------------- hero */}
      <section className="fol-hero" aria-labelledby="fol-hero-title">
        <div className="fol-hero__canvas">
          <div className="fol-hero__text">
            <h1 id="fol-hero-title" className="fol-hero__logo">
              <FockisFMark className="fol-hero__f" size="100%" />
              <span className="fol-hero__word">Fockis</span>
              <span className="fol-hero__product">Organizations</span>
            </h1>
            <p className="fol-hero__tagline">
              Create, Manage, and Grow
              <br />
              Your Organization on Fockis.
            </p>
            <BrushUnderline />
            <div className="fol-hero__cta">
              <Link to="/organizations/new" className="fo-btn fo-btn--primary fo-btn--lg">
                Create your organization <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/organizations/discover" className="fo-btn fo-btn--secondary fo-btn--lg">
                Discover organizations
              </Link>
            </div>
          </div>

          <div className="fol-panels">
            <picture>
              <source srcSet={HERO_PANELS_WEBP} type="image/webp" />
              <img className="fol-panels__photo" src={HERO_PANELS} alt="" draggable={false} />
            </picture>
            {PANELS.map((p) => {
              const Icon = byId(p.id).icon;
              return (
                <Link
                  key={p.id}
                  to={discoverLink(p.id)}
                  className="fol-band"
                  style={{ clipPath: p.clip, WebkitClipPath: p.clip }}
                  aria-label={`Discover ${byId(p.id).label} organizations`}
                >
                  <span className="fol-band__label" style={{ left: `${p.cx}%` }}>
                    <Icon className="fol-band__icon" aria-hidden="true" strokeWidth={1.6} />
                    <span>
                      {p.label[0]}
                      <br />
                      {p.label[1]}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <Waves />
        </div>

        <ul className="fol-row" aria-label="More organization categories">
          {ROW.map((r) => {
            const Icon = byId(r.id).icon;
            return (
              <li key={r.id}>
                <Link to={discoverLink(r.id)} className={`fol-row__item fol-row__item--${r.tone}`}>
                  <Icon aria-hidden="true" strokeWidth={1.7} />
                  <span>
                    {r.label[0]}
                    {r.label[1] && (
                      <>
                        <br />
                        {r.label[1]}
                      </>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------------------------------------------- 1. intro */}
      <section className="fol-section fol-intro">
        <div className="fol-wrap fol-intro__grid">
          <div>
            <span className="fol-eyebrow">Fockis Organizations</span>
            <h2>One professional home for every kind of organization.</h2>
          </div>
          <div className="fol-intro__text">
            <p>
              Fockis Organizations gives churches, companies, charities, clubs, teams, civic groups and communities everything they
              need to run their organization and bring their people together — a public website, a member portal and a complete
              administration workspace, all connected to the Fockis accounts your people already use.
            </p>
            <p>
              Start with the essentials and switch on the tools that fit your organization. A church sees ministries and services; a
              business sees employees and teams; a sports club sees athletes and teams.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------- 2. organization management */}
      <section className="fol-section">
        <div className="fol-wrap">
          <header className="fol-heading">
            <span className="fol-eyebrow">Organization management</span>
            <h2>Everything your organization runs on</h2>
            <p>Structure, activities and communication, organized the way you work.</p>
          </header>
          <div className="fol-cards">
            {ORG_FEATURES.map((f) => (
              <article key={f.title} className="fol-card">
                <span className="fol-card__icon">
                  <f.icon aria-hidden="true" />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------- 3. member management */}
      <section className="fol-section fol-section--tint">
        <div className="fol-wrap">
          <header className="fol-heading">
            <span className="fol-eyebrow">Member management</span>
            <h2>Know your people. Serve them well.</h2>
            <p>From the first application to years of history, every member has a clear, secure record.</p>
          </header>
          <div className="fol-cards">
            {MEMBER_FEATURES.map((f) => (
              <article key={f.title} className="fol-card">
                <span className="fol-card__icon fol-card__icon--violet">
                  <f.icon aria-hidden="true" />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------ 4. public websites */}
      <section className="fol-section">
        <div className="fol-wrap fol-split">
          <div>
            <span className="fol-eyebrow">Public organization websites</span>
            <h2>A beautiful public page, ready on day one</h2>
            <p className="fol-lead">
              Every organization gets its own public website on Fockis — cover photo, about, mission and vision, departments, groups,
              events, announcements, media and locations — with Follow, Join and membership requests built in.
            </p>
            <ul className="fol-checks">
              <li>Works for visitors without signing in</li>
              <li>Shows only what you publish — private details never appear</li>
              <li>Adapts to your kind of organization</li>
              <li>Your permanent address: yourname.fockis.com</li>
            </ul>
          </div>
          <div className="fol-browser" aria-hidden="true">
            <div className="fol-browser__bar">
              <span />
              <span />
              <span />
              <em>yourname.fockis.com</em>
            </div>
            <div className="fol-browser__hero">
              <strong>Your Organization</strong>
              <small>Your mission, in one line.</small>
              <span className="fol-browser__btns">
                <i>Join</i>
                <i className="is-light">Plan a visit</i>
              </span>
            </div>
            <div className="fol-browser__tiles">
              <span>
                <CalendarDays /> Events
              </span>
              <span>
                <Network /> Departments
              </span>
              <span>
                <UsersRound /> Groups
              </span>
              <span>
                <ImageIcon /> Media
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------- 5. administration */}
      <section className="fol-section fol-section--navy">
        <div className="fol-wrap">
          <header className="fol-heading fol-heading--light">
            <span className="fol-eyebrow">Organization administration</span>
            <h2>A complete administration workspace</h2>
            <p>Built for owners, administrators and leaders — each sees exactly the tools their role allows.</p>
          </header>
          <div className="fol-cards fol-cards--4">
            {ADMIN_TOOLS.map((f) => (
              <article key={f.title} className="fol-card fol-card--glass">
                <span className="fol-card__icon fol-card__icon--light">
                  <f.icon aria-hidden="true" />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- 6. discover */}
      <section className="fol-section">
        <div className="fol-wrap">
          <header className="fol-heading fol-heading--row">
            <div>
              <span className="fol-eyebrow">Discover organizations</span>
              <h2>Find your people on Fockis</h2>
            </div>
            <Link to="/organizations/discover" className="fo-btn fo-btn--secondary">
              Browse all <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          <div className="fol-chips">
            {PLATFORM_CATEGORIES.map((c) => (
              <Link key={c.id} to={discoverLink(c.id)} className="fol-chip">
                <c.icon aria-hidden="true" />
                {c.label}
              </Link>
            ))}
          </div>

          {orgsState === "loading" ? (
            <div className="fol-orgs" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="fo-skeleton" style={{ height: 150 }} />
              ))}
            </div>
          ) : orgsState === "error" ? (
            <p className="fol-note">Organizations could not be loaded right now. You can still browse the full directory.</p>
          ) : orgs.length === 0 ? (
            <p className="fol-note">
              No public organizations yet. <Link to="/organizations/new">Be the first to create one.</Link>
            </p>
          ) : (
            <div className="fol-orgs">
              {orgs.map((o) => {
                const cat = categoryInfo(o.organizationType);
                return (
                  <Link key={o.id} to={`/organizations/${encodeURIComponent(o.id)}`} className="fol-org">
                    <OrgLogoBox name={o.name} url={o.logoUrl} icon={cat.icon} className="fol-org__logo" />
                    <span className="fol-org__body">
                      <strong>{o.name}</strong>
                      <small>
                        {typeLabel(o.organizationType)}
                        {o.mainLocation?.city ? ` · ${o.mainLocation.city}` : ""}
                      </small>
                      {o.description && <span className="fol-org__desc">{o.description}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------- 7. benefits */}
      <section className="fol-section fol-section--tint">
        <div className="fol-wrap">
          <header className="fol-heading">
            <span className="fol-eyebrow">Why Fockis</span>
            <h2>The benefits of running your organization on Fockis</h2>
          </header>
          <div className="fol-benefits">
            {BENEFITS.map((b) => (
              <div key={b.title} className="fol-benefit">
                <b.icon aria-hidden="true" />
                <div>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- 8. CTA */}
      <section className="fol-cta">
        <div className="fol-wrap fol-cta__inner">
          <div>
            <h2>Create your organization on Fockis today.</h2>
            <p>Four short steps: details, branding, locations and settings. Free to start.</p>
          </div>
          <div className="fol-cta__actions">
            <Link to="/organizations/new" className="fo-btn fo-btn--light fo-btn--lg">
              Create Organization <ArrowRight aria-hidden="true" />
            </Link>
            {!signedIn && (
              <Link to={"/login?returnTo=" + encodeURIComponent("/organizations/new")} className="fol-cta__link">
                Sign in first
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- 9. footer */}
      <footer className="fol-footer">
        <div className="fol-wrap fol-footer__grid">
          <div className="fol-footer__brand">
            <span className="fol-footer__logo">
              <FockisFMark size={30} />
              <span>
                <strong>Fockis</strong> Organizations
              </span>
            </span>
            <p>Create, manage and grow your organization on Fockis.</p>
          </div>
          <nav aria-label="Organizations">
            <h3>Organizations</h3>
            <Link to="/organizations/discover">Discover</Link>
            <Link to="/organization/me">My Organizations</Link>
            <Link to="/organizations/new">Create Organization</Link>
          </nav>
          <nav aria-label="Categories">
            <h3>Categories</h3>
            {(["faith", "business", "nonprofit", "sports", "social"] as PlatformCategory[]).map((id) => (
              <Link key={id} to={discoverLink(id)}>
                {byId(id).label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Fockis">
            <h3>Fockis</h3>
            <Link to="/">Fockis home</Link>
            <Link to="/organization-identity">Organization identity</Link>
            {!signedIn && <Link to={"/login?returnTo=" + encodeURIComponent("/organizations")}>Sign In</Link>}
          </nav>
        </div>
        <div className="fol-wrap fol-footer__bottom">© {new Date().getFullYear()} Fockis. All rights reserved.</div>
      </footer>
    </div>
  );
}
