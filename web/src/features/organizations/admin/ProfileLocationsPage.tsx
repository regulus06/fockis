/**
 * ProfileLocationsPage.tsx — Organizations → Profile & Locations
 * Route: /church/admin/organizations/:organizationId/edit
 *
 * The organization's profile editor (replaces the old OrganizationForm edit
 * view on this route; same APIs, nothing duplicated):
 *
 *   profile fields  PATCH /organizations/:id         (updateOrganization;
 *                   the domain is never sent — it's permanent)
 *   cover photo     POST/DELETE /organizations/:id/cover
 *                   (uploadOrganizationCover / deleteOrganizationCover)
 *   logo            the organization's shared image upload (page-branding
 *                   upload), saved as logoUrl
 *   locations       GET/POST/PATCH/DELETE /organizations/:id/branches
 *                   — each location is saved on its own; edits send the
 *                   full address and contact and keep service times,
 *                   timezone and photo untouched.
 *
 * Every change is checked again by the server (organization permissions).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AtSign,
  Building2,
  Check,
  ClipboardList,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { churchDelete, churchGet, churchPatch, churchPost } from "../api/organizationApi";
import { deleteOrganizationCover, updateOrganization, uploadOrganizationCover } from "../api/organizationsApi";
import { pageBrandingApi } from "../branding/pageBrandingApi";
import { hasBanner } from "../branding/PageBrandingParts";
import { usePageBranding } from "../branding/usePageBranding";
import SidebarAppearance from "../branding/SidebarAppearance";
import OrgBanner from "../branding/OrgBanner";
import { pageKeyFromPath } from "../branding/pageBrandingApi";
import { useOrgAdmin } from "../hooks/useOrgAdmin";
import { typeLabel } from "../ui/orgCategories";
import { PLATFORM_CATEGORIES, categoryInfo, platformCategoryOf, typesForCategory, type PlatformCategory } from "../ui/orgTerminology";
import OrgAppShell from "../ui/OrgAppShell";
import { Avatar, errorMessage } from "../ui/orgUi";
import type { Address, Branch, ContactInfo, Organization, OrganizationType, UpdateOrganizationInput } from "../types/organization.types";
import "../ui/fockisOrgTheme.scss";
import "./profileLocations.scss";

/* ============================================================================
 * Draft
 * ========================================================================== */

type Social = "facebook" | "instagram" | "youtube" | "x" | "tiktok";
const SOCIALS: { key: Social; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourchurch" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourchurch" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchurch" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/yourchurch" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourchurch" },
];

interface Draft {
  name: string;
  category: PlatformCategory;
  organizationType: OrganizationType | "";
  description: string;
  tagline: string;
  mission: string;
  vision: string;
  website: string;
  email: string;
  phone: string;
  social: Record<Social, string>;
  logoUrl: string;
}

function draftOf(org: Organization): Draft {
  const s = org.contact?.socialLinks ?? {};
  return {
    name: org.name ?? "",
    category: platformCategoryOf(org.organizationType),
    organizationType: org.organizationType ?? "",
    description: org.description ?? "",
    tagline: org.tagline ?? "",
    mission: org.mission ?? "",
    vision: org.vision ?? "",
    website: org.website ?? org.contact?.website ?? "",
    email: org.contact?.email ?? "",
    phone: org.contact?.phone ?? "",
    social: { facebook: s.facebook ?? "", instagram: s.instagram ?? "", youtube: s.youtube ?? "", x: s.x ?? "", tiktok: s.tiktok ?? "" },
    logoUrl: org.logoUrl ?? "",
  };
}

const isUrl = (v: string) => {
  if (!v.trim()) return true;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};
const isEmail = (v: string) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Tab = "profile" | "branding" | "domain" | "leadership" | "locations" | "about" | "social";
const TABS: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "branding", label: "Branding", icon: ImageIcon },
  { id: "domain", label: "Domain", icon: Globe },
  { id: "leadership", label: "Leadership", icon: Users },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "about", label: "About", icon: Info },
  { id: "social", label: "Social Links", icon: Link2 },
];

/* ============================================================================
 * Page
 * ========================================================================== */

export default function ProfileLocationsPage() {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const admin = useOrgAdmin(organizationId);
  const org = admin.org;
  const branding = usePageBranding(organizationId);

  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.replace("#", "") as Tab;
    return TABS.some((t) => t.id === h) ? h : "profile";
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Load the draft from the organization (and again after a save → reload).
  useEffect(() => {
    if (org) setDraft(draftOf(org));
  }, [org]);

  useEffect(() => {
    window.history.replaceState(null, "", `#${tab}`);
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    },
    [coverPreview, logoPreview],
  );

  const baseline = useMemo(() => (org ? draftOf(org) : null), [org]);
  const dirty = Boolean(draft && baseline && (JSON.stringify(draft) !== JSON.stringify(baseline) || coverFile || coverRemoved || logoFile));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  function pickImage(e: ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setToast({ tone: "error", text: `The ${kind} must be a JPG, PNG or WebP image.` });
    const max = kind === "logo" ? 5 : 10;
    if (file.size > max * 1024 * 1024) return setToast({ tone: "error", text: `The ${kind} can't be larger than ${max} MB.` });
    const url = URL.createObjectURL(file);
    if (kind === "logo") {
      setLogoFile(file);
      setLogoPreview(url);
    } else {
      setCoverFile(file);
      setCoverPreview(url);
      setCoverRemoved(false);
    }
  }

  function cancel() {
    if (org) setDraft(draftOf(org));
    setCoverFile(null);
    setCoverPreview(null);
    setCoverRemoved(false);
    setLogoFile(null);
    setLogoPreview(null);
  }

  async function save() {
    if (!org || !draft) return;
    const problems: string[] = [];
    if (!draft.name.trim()) problems.push("Enter the organization name.");
    if (!draft.organizationType) problems.push("Choose the organization type.");
    if (!isUrl(draft.website)) problems.push("The website must start with http:// or https://.");
    if (!isEmail(draft.email)) problems.push("Enter a valid contact email.");
    for (const s of SOCIALS) if (!isUrl(draft.social[s.key])) problems.push(`The ${s.label} link must start with http:// or https://.`);
    if (problems.length) return setToast({ tone: "error", text: problems[0] });

    setSaving(true);
    try {
      let logoUrl = draft.logoUrl.trim();
      if (logoFile) {
        const up = await pageBrandingApi.upload(org.id, logoFile, logoFile.name || "logo.png");
        logoUrl = mediaUrl(up.fileUrl) ?? up.fileUrl;
      }
      const socialLinks: ContactInfo["socialLinks"] = {};
      for (const s of SOCIALS) if (draft.social[s.key].trim()) socialLinks[s.key] = draft.social[s.key].trim();
      const input: UpdateOrganizationInput = {
        name: draft.name.trim(),
        organizationType: draft.organizationType as OrganizationType,
        description: draft.description.trim(),
        tagline: draft.tagline.trim(),
        mission: draft.mission.trim(),
        vision: draft.vision.trim(),
        website: draft.website.trim(),
        logoUrl,
        // The server merges contact; send every contact field we show.
        contact: { ...org.contact, email: draft.email.trim(), phone: draft.phone.trim(), website: draft.website.trim(), socialLinks },
      };
      await updateOrganization(org.id, input);
      if (coverFile) await uploadOrganizationCover(org.id, coverFile);
      else if (coverRemoved && org.bannerUrl) await deleteOrganizationCover(org.id);
      setCoverFile(null);
      setCoverPreview(null);
      setCoverRemoved(false);
      setLogoFile(null);
      setLogoPreview(null);
      admin.reload();
      setToast({ tone: "ok", text: "Profile saved." });
    } catch (err) {
      setToast({ tone: "error", text: errorMessage(err, "The profile could not be saved.") });
    } finally {
      setSaving(false);
    }
  }

  const p = (s = "") => `/organizations/${encodeURIComponent(organizationId)}${s}`;
  const navTo = `/church/admin/organizations/${encodeURIComponent(organizationId)}/edit`;
  const customBanner = hasBanner(branding.publishedFor(pageKeyFromPath(navTo, organizationId)));

  const cover = coverPreview ?? (coverRemoved ? null : mediaUrl(org?.bannerUrl ?? null));
  const coverIsVideo = !coverPreview && !coverRemoved && (org as (Organization & { bannerMediaType?: string | null }) | null)?.bannerMediaType === "video";
  const logo = logoPreview ?? (draft?.logoUrl ? mediaUrl(draft.logoUrl) : null);

  return (
    <OrgAppShell variant="admin" organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={navTo}>
      <div className="pl">
        {admin.allowed === false && <p className="pl-card pl-alert">{admin.error ?? "You don't have access to this organization's profile."}</p>}
        {admin.allowed !== false && (!org || !draft) && (
          <p className="pl-card pl-muted">
            <Loader2 className="pl-spin" aria-hidden="true" /> Loading profile…
          </p>
        )}

        {org && draft && (
          <>
            {!customBanner && <OrgBanner organizationId={org.id} name={draft.name || org.name} tagline={draft.tagline} logoSrc={logo} coverSrc={coverIsVideo ? null : cover} />}

            <header className="pl-title">
              <span className="pl-title__icon" aria-hidden="true">
                <Building2 />
              </span>
              <div>
                <h1>Profile &amp; Locations</h1>
                <p>Manage your organization profile, branding, domain, contact information and locations.</p>
              </div>
            </header>

            <nav className="pl-tabs" role="tablist" aria-label="Profile sections">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>
                  <t.icon aria-hidden="true" /> {t.label}
                </button>
              ))}
            </nav>

            <div className="pl-layout">
              <div className="pl-main">
                {tab === "profile" && (
                  <>
                    <div className="pl-grid">
                      <BasicInfo draft={draft} set={set} />
                      <div className="pl-stack">
                        <BrandingCard logo={logo} cover={cover} coverIsVideo={coverIsVideo} onPick={pickImage} onRemoveCover={() => (setCoverFile(null), setCoverPreview(null), setCoverRemoved(true))} onRemoveLogo={() => (setLogoFile(null), setLogoPreview(null), set({ logoUrl: "" }))} />
                        <Card icon={FileText} title="Description">
                          <textarea className="pl-input" rows={5} maxLength={2000} value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Tell people who you are, what you believe and what you do." aria-label="Description" />
                        </Card>
                      </div>
                    </div>
                    <ContactRow draft={draft} set={set} />
                    <Locations organizationId={org.id} initial={org.branches} />
                  </>
                )}
                {tab === "branding" && (
                  <>
                    <SidebarAppearance organization={{ id: org.id, name: org.name, organizationType: org.organizationType, logoUrl: org.logoUrl }} notify={(tone, text) => setToast({ tone, text })} />
                    <BrandingCard large logo={logo} cover={cover} coverIsVideo={coverIsVideo} onPick={pickImage} onRemoveCover={() => (setCoverFile(null), setCoverPreview(null), setCoverRemoved(true))} onRemoveLogo={() => (setLogoFile(null), setLogoPreview(null), set({ logoUrl: "" }))} />
                    <Card icon={Info} title="More branding">
                      <ul className="pl-list">
                        <li>
                          The homepage photo of your public website is changed from the website itself: open <Link to={p()}>your public page</Link> and click <b>Change Background</b>.
                        </li>
                        <li>
                          Each admin page can have its own banner and menu thumbnail: use <b>Customize page</b> at the top right.
                        </li>
                      </ul>
                    </Card>
                  </>
                )}
                {tab === "domain" && (
                  <Card icon={Globe} title="Fockis domain">
                    <div className="pl-domain">
                      <Globe aria-hidden="true" />
                      <b>{org.domain || "No domain"}</b>
                      <span className="pl-badge">Permanent</span>
                    </div>
                    <p className="pl-help">Your Fockis domain is your organization's permanent address. It can't be changed from the profile, so member accounts and links keep working.</p>
                    <Link to={p("/admin/domains")} className="pl-btn pl-btn--ghost">
                      <Globe aria-hidden="true" /> Manage Fockis domains
                    </Link>
                  </Card>
                )}
                {tab === "leadership" && <Leadership org={org} settingsTo={p("/admin/settings")} />}
                {tab === "locations" && <Locations organizationId={org.id} initial={org.branches} />}
                {tab === "about" && (
                  <Card icon={Info} title="About">
                    <Field label="Tagline" hint="One short line shown under your name, e.g. Foi • Adoration • Service">
                      <input className="pl-input" maxLength={140} value={draft.tagline} onChange={(e) => set({ tagline: e.target.value })} />
                    </Field>
                    <Field label="Description">
                      <textarea className="pl-input" rows={5} maxLength={2000} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
                    </Field>
                    <Field label="Mission">
                      <textarea className="pl-input" rows={3} maxLength={1000} value={draft.mission} onChange={(e) => set({ mission: e.target.value })} />
                    </Field>
                    <Field label="Vision">
                      <textarea className="pl-input" rows={3} maxLength={1000} value={draft.vision} onChange={(e) => set({ vision: e.target.value })} />
                    </Field>
                  </Card>
                )}
                {tab === "social" && (
                  <Card icon={Link2} title="Social links">
                    <div className="pl-grid2">
                      {SOCIALS.map((s) => (
                        <Field key={s.key} label={s.label}>
                          <input className="pl-input" type="url" inputMode="url" placeholder={s.placeholder} value={draft.social[s.key]} onChange={(e) => set({ social: { ...draft.social, [s.key]: e.target.value } })} />
                        </Field>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <aside className="pl-side">
                <Preview draft={draft} org={org} logo={logo} cover={coverIsVideo ? null : cover} publicTo={p()} />
                <div className="pl-actions">
                  <button type="button" className="pl-btn pl-btn--ghost" onClick={cancel} disabled={!dirty || saving}>
                    Cancel
                  </button>
                  <button type="button" className="pl-btn pl-btn--primary" onClick={() => void save()} disabled={!dirty || saving}>
                    {saving ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save Changes
                  </button>
                </div>
                <p className="pl-help pl-center">{dirty ? "You have unsaved changes." : "Locations are saved as soon as you add, edit or delete them."}</p>
              </aside>
            </div>
          </>
        )}
      </div>
      {toast && (
        <div className={"pl-toast pl-toast--" + toast.tone} role="status">
          {toast.text}
        </div>
      )}
    </OrgAppShell>
  );
}

/* ============================================================================
 * Pieces
 * ========================================================================== */

function Card({ icon: Icon, title, sub, action, children, className = "" }: { icon: typeof Info; title: string; sub?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={"pl-card " + className}>
      <header className="pl-card__head">
        <Icon aria-hidden="true" />
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="pl-field">
      <span>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** Church-branded hero header (also used by Settings & Roles). */
export function Hero({ name, tagline, logo, cover }: { name: string; tagline: string; logo: string | null; cover: string | null }) {
  return (
    <div className="pl-hero">
      {cover && <div className="pl-hero__photo" style={{ backgroundImage: `url("${cover}")` }} />}
      <div className="pl-hero__inner">
        {logo ? <img className="pl-hero__logo" src={logo} alt="" /> : <span className="pl-hero__logo pl-hero__logo--empty">{name.slice(0, 1)}</span>}
        <div>
          <strong>{name}</strong>
          <i aria-hidden="true" />
          {tagline && <span>{tagline}</span>}
        </div>
      </div>
    </div>
  );
}

function BasicInfo({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const types = typesForCategory(draft.category);
  return (
    <Card icon={ClipboardList} title="Basic Information">
      <Field label="Organization name" required>
        <input className="pl-input" maxLength={150} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Organization category" required>
        <select
          className="pl-input"
          value={draft.category}
          onChange={(e) => {
            const category = e.target.value as PlatformCategory;
            const keep = typesForCategory(category).some((t) => t.value === draft.organizationType);
            set({ category, organizationType: keep ? draft.organizationType : "" });
          }}
        >
          {PLATFORM_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Organization type" required>
        <select className="pl-input" value={draft.organizationType} onChange={(e) => set({ organizationType: e.target.value as OrganizationType })}>
          {!draft.organizationType && <option value="">Choose a type…</option>}
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tagline" hint="Shown under your name on the public page.">
        <input className="pl-input" maxLength={140} value={draft.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="e.g. Foi • Adoration • Service" />
      </Field>
    </Card>
  );
}

function BrandingCard({
  logo,
  cover,
  coverIsVideo,
  large,
  onPick,
  onRemoveCover,
  onRemoveLogo,
}: {
  logo: string | null;
  cover: string | null;
  coverIsVideo: boolean;
  large?: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") => void;
  onRemoveCover: () => void;
  onRemoveLogo: () => void;
}) {
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  return (
    <Card icon={ImageIcon} title="Organization Branding" sub="Add a logo and a cover photo for your organization page." className={large ? "pl-card--large" : ""}>
      <div className="pl-brand">
        <div className="pl-brand__logo">
          <span className="pl-label">Logo</span>
          <button type="button" className="pl-upload pl-upload--logo" onClick={() => logoRef.current?.click()} aria-label="Change logo">
            {logo ? <img src={logo} alt="Logo" /> : <Upload aria-hidden="true" />}
            <span className="pl-upload__edit">
              <Pencil aria-hidden="true" />
            </span>
          </button>
          <input ref={logoRef} type="file" accept={IMAGE_TYPES.join(",")} hidden onChange={(e) => onPick(e, "logo")} />
          {logo && (
            <button type="button" className="pl-linkbtn" onClick={onRemoveLogo}>
              Remove
            </button>
          )}
        </div>
        <div className="pl-brand__cover">
          <span className="pl-label">Cover photo</span>
          <button type="button" className="pl-upload pl-upload--cover" onClick={() => coverRef.current?.click()} aria-label="Change cover photo">
            {cover ? coverIsVideo ? <video src={cover} muted playsInline /> : <img src={cover} alt="Cover" /> : (
              <span className="pl-upload__empty">
                <Upload aria-hidden="true" /> Upload a cover photo
              </span>
            )}
            <span className="pl-upload__edit">
              <Pencil aria-hidden="true" />
            </span>
          </button>
          <input ref={coverRef} type="file" accept={IMAGE_TYPES.join(",")} hidden onChange={(e) => onPick(e, "cover")} />
          {cover && (
            <button type="button" className="pl-linkbtn" onClick={onRemoveCover}>
              Remove cover
            </button>
          )}
        </div>
      </div>
      <p className="pl-help">JPG, PNG or WebP. Logo up to 5 MB (square works best), cover up to 10 MB (wide, at least 1600 px). Uploaded when you save.</p>
    </Card>
  );
}

function ContactRow({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <section className="pl-card pl-contact">
      <Field label="Website">
        <span className="pl-iconinput">
          <Link2 aria-hidden="true" />
          <input className="pl-input" type="url" inputMode="url" placeholder="https://" value={draft.website} onChange={(e) => set({ website: e.target.value })} />
        </span>
      </Field>
      <Field label="Contact email">
        <span className="pl-iconinput">
          <Mail aria-hidden="true" />
          <input className="pl-input" type="email" placeholder="contact@…" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
        </span>
      </Field>
      <Field label="Contact phone">
        <span className="pl-iconinput">
          <Phone aria-hidden="true" />
          <input className="pl-input" type="tel" placeholder="+509 …" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
        </span>
      </Field>
    </section>
  );
}

function Preview({ draft, org, logo, cover, publicTo }: { draft: Draft; org: Organization; logo: string | null; cover: string | null; publicTo: string }) {
  const main = org.branches?.find((b) => b.isMainLocation) ?? org.branches?.[0];
  const place = [main?.address?.city, main?.address?.country].filter(Boolean).join(", ");
  const chips = draft.tagline
    .split(/\s*[•·|,]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const cat = categoryInfo(draft.organizationType || org.organizationType);
  return (
    <section className="pl-card pl-preview" aria-label="Public profile preview">
      <header className="pl-card__head">
        <Eye aria-hidden="true" />
        <div>
          <h2>Public Profile Preview</h2>
        </div>
      </header>
      <div className="pl-preview__cover">{cover && <img src={cover} alt="" />}</div>
      <div className="pl-preview__logo">{logo ? <img src={logo} alt="" /> : <span>{(draft.name || org.name).slice(0, 1)}</span>}</div>
      <strong className="pl-preview__name">{draft.name || "Organization name"}</strong>
      <span className="pl-preview__type">
        {draft.organizationType ? typeLabel(draft.organizationType) : "Type not set"} • {cat.label}
      </span>
      {place && (
        <span className="pl-preview__place">
          <MapPin aria-hidden="true" /> {place}
        </span>
      )}
      {chips.length > 1 ? (
        <ul className="pl-preview__chips">
          {chips.slice(0, 6).map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : chips.length === 1 ? (
        <p className="pl-preview__tagline">{chips[0]}</p>
      ) : null}
      {draft.description && <p className="pl-preview__desc">{draft.description}</p>}
      <div className="pl-preview__contact">
        {draft.website && (
          <span>
            <Globe aria-hidden="true" /> {draft.website.replace(/^https?:\/\//, "")}
          </span>
        )}
        {draft.email && (
          <span>
            <AtSign aria-hidden="true" /> {draft.email}
          </span>
        )}
        {draft.phone && (
          <span>
            <Phone aria-hidden="true" /> {draft.phone}
          </span>
        )}
      </div>
      <Link to={publicTo} target="_blank" rel="noopener" className="pl-btn pl-btn--ghost pl-btn--block">
        View Public Page <ExternalLink aria-hidden="true" />
      </Link>
    </section>
  );
}

function Leadership({ org, settingsTo }: { org: Organization; settingsTo: string }) {
  const leaders = [...(org.leadership ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const role = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Card
      icon={Users}
      title="Leadership"
      sub="People shown as leaders of your organization."
      action={
        <Link to={settingsTo} className="pl-btn pl-btn--ghost pl-btn--sm">
          Manage roles
        </Link>
      }
    >
      {leaders.length === 0 ? (
        <p className="pl-muted">No leaders listed yet. Assign roles in Settings &amp; Roles.</p>
      ) : (
        <ul className="pl-leaders">
          {leaders.map((l) => (
            <li key={l.id}>
              <Avatar name={l.user?.displayName ?? "?"} url={l.user?.avatarUrl ?? null} />
              <span>
                <b>{l.user?.displayName ?? "Unknown"}</b>
                <small>{l.title || role(String(l.role))}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ============================================================================
 * Locations (branches API)
 * ========================================================================== */

const branchesPath = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}/branches`;

function Locations({ organizationId, initial }: { organizationId: string; initial: Branch[] }) {
  const [items, setItems] = useState<Branch[]>(initial ?? []);
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await churchGet<Branch[]>(branchesPath(organizationId));
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorMessage(err, "Locations could not be loaded."));
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(b: Branch) {
    if (items.length <= 1) return setError("Keep at least one location. Edit this one instead.");
    if (!window.confirm(`Delete the location "${b.name}"?${b.isMainLocation ? " Another location will become the main location." : ""}`)) return;
    setBusy(b.id);
    setError(null);
    try {
      await churchDelete(`${branchesPath(organizationId)}/${encodeURIComponent(b.id)}`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "The location could not be deleted."));
    } finally {
      setBusy(null);
    }
  }

  async function makeMain(b: Branch) {
    setBusy(b.id);
    setError(null);
    try {
      await churchPatch(`${branchesPath(organizationId)}/${encodeURIComponent(b.id)}`, { isMainLocation: true });
      await load();
    } catch (err) {
      setError(errorMessage(err, "The main location could not be changed."));
    } finally {
      setBusy(null);
    }
  }

  const sorted = [...items].sort((a, b) => Number(b.isMainLocation) - Number(a.isMainLocation));

  return (
    <Card
      icon={MapPin}
      title="Locations"
      sub="Add the main location and any additional branches."
      action={
        <button type="button" className="pl-btn pl-btn--ghost pl-btn--sm" onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" /> Add Location
        </button>
      }
    >
      {error && (
        <p className="pl-alert" role="alert">
          {error}
        </p>
      )}
      {sorted.length === 0 ? (
        <p className="pl-muted">No locations yet. Add your main location so people can find you.</p>
      ) : (
        <div className="pl-tablewrap">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Location name</th>
                <th>Address</th>
                <th>City</th>
                <th>Country</th>
                <th>Type</th>
                <th className="pl-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr key={b.id}>
                  <td data-label="Location">
                    {b.isMainLocation && <span className="pl-tag">Main</span>} <b>{b.name}</b>
                    {(b.serviceTimes?.length ?? 0) > 0 && <small className="pl-sub">{b.serviceTimes!.length} service time{b.serviceTimes!.length === 1 ? "" : "s"}</small>}
                  </td>
                  <td data-label="Address">{[b.address?.line1, b.address?.line2].filter(Boolean).join(", ") || "—"}</td>
                  <td data-label="City">{b.address?.city || "—"}</td>
                  <td data-label="Country">{b.address?.country || "—"}</td>
                  <td data-label="Type">
                    <span className={"pl-pill" + (b.isMainLocation ? " is-main" : "")}>{b.isMainLocation ? "Main Location" : "Branch"}</span>
                  </td>
                  <td className="pl-right pl-rowactions">
                    {busy === b.id ? (
                      <Loader2 className="pl-spin" aria-hidden="true" />
                    ) : (
                      <>
                        {!b.isMainLocation && (
                          <button type="button" className="pl-iconbtn" title="Make main location" aria-label={`Make ${b.name} the main location`} onClick={() => void makeMain(b)}>
                            <Star aria-hidden="true" />
                          </button>
                        )}
                        <button type="button" className="pl-iconbtn" title="Edit" aria-label={`Edit ${b.name}`} onClick={() => setEditing(b)}>
                          <Pencil aria-hidden="true" />
                        </button>
                        <button type="button" className="pl-iconbtn pl-iconbtn--danger" title="Delete" aria-label={`Delete ${b.name}`} onClick={() => void remove(b)}>
                          <Trash2 aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <LocationDialog
          organizationId={organizationId}
          branch={editing === "new" ? null : editing}
          firstLocation={items.length === 0}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </Card>
  );
}

function LocationDialog({ organizationId, branch, firstLocation, onClose, onSaved }: { organizationId: string; branch: Branch | null; firstLocation: boolean; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const a: Partial<Address> = branch?.address ?? {};
  const [f, setF] = useState({
    name: branch?.name ?? "",
    isMainLocation: branch ? branch.isMainLocation : firstLocation,
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    postalCode: a.postalCode ?? "",
    country: a.country ?? "",
    phone: branch?.contact?.phone ?? "",
    email: branch?.contact?.email ?? "",
    serviceTimes: (branch?.serviceTimes ?? []).join("\n"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const up = (patch: Partial<typeof f>) => setF((cur) => ({ ...cur, ...patch }));

  async function submit() {
    if (!f.name.trim()) return setError("Enter the location name.");
    if (!f.line1.trim() || !f.city.trim() || !f.country.trim()) return setError("Enter the street address, city and country.");
    if (!isEmail(f.email)) return setError("Enter a valid email for this location.");
    const trim = (v: string) => v.trim() || undefined;
    const body = {
      name: f.name.trim(),
      isMainLocation: f.isMainLocation,
      // Full objects: the server replaces address/contact as a whole.
      address: { ...(branch?.address ?? {}), line1: f.line1.trim(), line2: trim(f.line2), city: f.city.trim(), state: trim(f.state), postalCode: trim(f.postalCode), country: f.country.trim() },
      contact: { ...(branch?.contact?.website ? { website: branch.contact.website } : {}), phone: trim(f.phone), email: trim(f.email) },
      serviceTimes: f.serviceTimes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
    };
    setSaving(true);
    setError(null);
    try {
      if (branch) await churchPatch(`${branchesPath(organizationId)}/${encodeURIComponent(branch.id)}`, body);
      else await churchPost(branchesPath(organizationId), body);
      await onSaved();
    } catch (err) {
      setError(errorMessage(err, "The location could not be saved."));
      setSaving(false);
    }
  }

  return (
    <div className="pl-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="pl-modal__box" role="dialog" aria-modal="true" aria-labelledby="pl-loc-title">
        <header className="pl-modal__head">
          <h2 id="pl-loc-title">{branch ? "Edit location" : "Add location"}</h2>
          <button type="button" className="pl-iconbtn" onClick={onClose} aria-label="Close" disabled={saving}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="pl-modal__body">
          <Field label="Location name" required>
            <input className="pl-input" maxLength={150} value={f.name} onChange={(e) => up({ name: e.target.value })} placeholder="e.g. Main church, Branch Dosmond" />
          </Field>
          <label className="pl-check">
            <input type="checkbox" checked={f.isMainLocation} disabled={Boolean(branch?.isMainLocation)} onChange={(e) => up({ isMainLocation: e.target.checked })} />
            <span>
              Main location
              <small>{branch?.isMainLocation ? "To change it, make another location the main one." : "The main location is shown first on your public page."}</small>
            </span>
          </label>
          <Field label="Street address" required>
            <input className="pl-input" maxLength={200} value={f.line1} onChange={(e) => up({ line1: e.target.value })} />
          </Field>
          <Field label="Address line 2">
            <input className="pl-input" maxLength={200} value={f.line2} onChange={(e) => up({ line2: e.target.value })} />
          </Field>
          <div className="pl-grid2">
            <Field label="City" required>
              <input className="pl-input" maxLength={100} value={f.city} onChange={(e) => up({ city: e.target.value })} />
            </Field>
            <Field label="State / Department">
              <input className="pl-input" maxLength={100} value={f.state} onChange={(e) => up({ state: e.target.value })} />
            </Field>
            <Field label="Postal code">
              <input className="pl-input" maxLength={30} value={f.postalCode} onChange={(e) => up({ postalCode: e.target.value })} />
            </Field>
            <Field label="Country" required>
              <input className="pl-input" maxLength={100} value={f.country} onChange={(e) => up({ country: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="pl-input" type="tel" maxLength={40} value={f.phone} onChange={(e) => up({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="pl-input" type="email" maxLength={254} value={f.email} onChange={(e) => up({ email: e.target.value })} />
            </Field>
          </div>
          <Field label="Service times" hint="One per line, as Name – day and time, e.g. Culte principal – Dimanche 10h00. Shown in the service schedule on your website.">
            <textarea className="pl-input" rows={3} value={f.serviceTimes} onChange={(e) => up({ serviceTimes: e.target.value })} />
          </Field>
          {error && (
            <p className="pl-alert" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="pl-modal__foot">
          <button type="button" className="pl-btn pl-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="pl-btn pl-btn--primary" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Check aria-hidden="true" />} {branch ? "Save location" : "Add location"}
          </button>
        </footer>
      </div>
    </div>
  );
}
