/**
 * CustomizeDialog.tsx — "Customize page" in the organization top bar.
 * -----------------------------------------------------------------------------
 * One place to customize the organization dashboard, with a live preview:
 *   Sidebar    background image (position, scale, dark overlay, opacity) and
 *              the sidebar color used when there is no image
 *   Header     banner background image, style, overlay, tagline, logo
 *   Colors     primary, accent, buttons, active menu item
 *   This page  the existing per-page banner / menu thumbnail editor
 *
 * Persisted with the existing page-branding API (MongoDB
 * "organization_page_branding"): pageKey "sidebar-background" and
 * "dashboard-theme". The logo uses the existing organization logo upload.
 * The server only lets the owner and administrators with the Settings &
 * Roles permission save (the logo needs Update organization).
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartHorizontal,
  Eye,
  EyeOff,
  FileImage,
  Image as ImageIcon,
  Info,
  Loader2,
  Palette,
  PanelLeft,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getOrganization } from "../api/organizationsApi";
import { mediaUrl, uploadOrganizationLogo } from "../api/dashboardApi";
import { ORG_UPDATED_EVENT } from "../hooks/useOrgAdmin";
import { FockisOrgBrand } from "../ui/orgUi";
import { shellSections, type ShellOrganization } from "../ui/OrgAppShell";
import { BRANDING_ERROR, pageBrandingApi } from "./pageBrandingApi";
import { applyManagedBranding, usePageBranding } from "./usePageBranding";
import { DEFAULT_SIDEBAR_BG, SIDEBAR_BG_KEY, SIDEBAR_BG_MAX_BYTES, SIDEBAR_BG_TYPES, sidebarBgContent, sidebarBgFrom, sidebarBgProps, type SidebarBg } from "./sidebarBackground";
import { DASHBOARD_THEME_KEY, DEFAULT_COLORS, DEFAULT_THEME, isDefaultTheme, themeContent, themeFrom, themeVars, type DashboardTheme, type ThemeColors } from "./dashboardTheme";
import OrgBanner from "./OrgBanner";
import "./customizeDialog.scss";

type Tab = "sidebar" | "header" | "colors" | "page";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "sidebar", label: "Sidebar", icon: PanelLeft },
  { id: "header", label: "Header", icon: ImageIcon },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "page", label: "This page", icon: FileImage },
];

const PRESETS: { label: string; colors: ThemeColors }[] = [
  { label: "Fockis Blue", colors: { ...DEFAULT_COLORS } },
  { label: "Royal Purple", colors: { primary: "#5b3cc4", secondary: "#e0a526", button: "#5b3cc4", navActive: "#6d4ee0", sidebar: "#1e1446" } },
  { label: "Emerald", colors: { primary: "#0f7a5c", secondary: "#d9a42b", button: "#0f7a5c", navActive: "#12916d", sidebar: "#0b2e25" } },
  { label: "Crimson", colors: { primary: "#b3202c", secondary: "#1d4ed8", button: "#b3202c", navActive: "#c92a37", sidebar: "#2a0b10" } },
  { label: "Navy & Gold", colors: { primary: "#16367a", secondary: "#c9962b", button: "#c9962b", navActive: "#1d4596", sidebar: "#0a1733" } },
];

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: "primary", label: "Primary color", hint: "Links, highlights and the header banner." },
  { key: "secondary", label: "Secondary (accent) color", hint: "The line under your name and small accents." },
  { key: "button", label: "Button color", hint: "Main action buttons." },
  { key: "navActive", label: "Navigation active color", hint: "The selected menu item." },
];

const IMAGE_OK = (f: File) => SIDEBAR_BG_TYPES.includes(f.type);

interface Picked {
  file: File;
  url: string;
}

export default function CustomizeDialog({
  organization,
  activePage,
  onEditPage,
  onClose,
}: {
  organization: ShellOrganization;
  activePage: { key: string; label: string } | null;
  onEditPage: () => void;
  onClose: () => void;
}) {
  const orgId = organization.id;
  const branding = usePageBranding(orgId);
  const savedSide = useMemo(() => sidebarBgFrom(branding.publishedFor(SIDEBAR_BG_KEY)), [branding]);
  const savedTheme = useMemo(() => themeFrom(branding.publishedFor(DASHBOARD_THEME_KEY)), [branding]);

  const [tab, setTab] = useState<Tab>("sidebar");
  const [side, setSide] = useState<SidebarBg>(savedSide);
  const [theme, setTheme] = useState<DashboardTheme>(savedTheme);
  const [sideFile, setSideFile] = useState<Picked | null>(null);
  const [headerFile, setHeaderFile] = useState<Picked | null>(null);
  const [logoFile, setLogoFile] = useState<Picked | null>(null);
  const [orgInfo, setOrgInfo] = useState<{ tagline: string; bannerUrl: string | null; logoUrl: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [bigPreview, setBigPreview] = useState(false);
  const canEdit = branding.canEdit;

  useEffect(() => {
    const c = new AbortController();
    getOrganization(orgId, c.signal)
      .then((o) => setOrgInfo({ tagline: o.tagline ?? "", bannerUrl: o.bannerUrl ?? null, logoUrl: o.logoUrl ?? null }))
      .catch(() => setOrgInfo({ tagline: "", bannerUrl: null, logoUrl: organization.logoUrl ?? null }));
    return () => c.abort();
  }, [orgId, organization.logoUrl]);

  // Free local preview URLs.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const dirty =
    Boolean(sideFile || headerFile || logoFile) ||
    JSON.stringify(side) !== JSON.stringify(savedSide) ||
    JSON.stringify(theme) !== JSON.stringify(savedTheme);

  function close() {
    if (dirty && !busy && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function pick(e: ChangeEvent<HTMLInputElement>, max: number, set: (p: Picked) => void) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!IMAGE_OK(f)) return setError("Choose a JPG, PNG or WebP image.");
    if (f.size > max) return setError(`That image is larger than ${Math.round(max / 1024 / 1024)} MB.`);
    setError(null);
    const url = URL.createObjectURL(f);
    urls.current.push(url);
    set({ file: f, url });
  }

  function restoreDefaults() {
    if (!window.confirm("Restore the default Fockis design? The sidebar image, header image and colors go back to the defaults when you save.")) return;
    setSide({ ...DEFAULT_SIDEBAR_BG });
    setTheme({ ...DEFAULT_THEME, colors: { ...DEFAULT_COLORS } });
    setSideFile(null);
    setHeaderFile(null);
  }

  function cancel() {
    setSide(savedSide);
    setTheme(savedTheme);
    setSideFile(null);
    setHeaderFile(null);
    setLogoFile(null);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      // Sidebar background.
      let sideUrl = side.url;
      if (sideFile) sideUrl = (await pageBrandingApi.upload(orgId, sideFile.file, sideFile.file.name)).fileUrl;
      if (sideUrl) {
        const r = await pageBrandingApi.publish(orgId, SIDEBAR_BG_KEY, sidebarBgContent({ ...side, url: sideUrl }));
        applyManagedBranding(orgId, SIDEBAR_BG_KEY, "", r);
      } else if (branding.managedFor(SIDEBAR_BG_KEY)) {
        applyManagedBranding(orgId, SIDEBAR_BG_KEY, "", await pageBrandingApi.reset(orgId, SIDEBAR_BG_KEY));
      }

      // Theme (colors + header).
      let headerUrl = theme.headerUrl;
      if (headerFile) headerUrl = (await pageBrandingApi.upload(orgId, headerFile.file, headerFile.file.name)).fileUrl;
      const nextTheme = { ...theme, headerUrl };
      if (!isDefaultTheme(nextTheme)) {
        const r = await pageBrandingApi.publish(orgId, DASHBOARD_THEME_KEY, themeContent(nextTheme));
        applyManagedBranding(orgId, DASHBOARD_THEME_KEY, "", r);
      } else if (branding.managedFor(DASHBOARD_THEME_KEY)) {
        applyManagedBranding(orgId, DASHBOARD_THEME_KEY, "", await pageBrandingApi.reset(orgId, DASHBOARD_THEME_KEY));
      }

      // Logo (existing organization logo upload).
      if (logoFile) {
        const r = await uploadOrganizationLogo(orgId, logoFile.file);
        setOrgInfo((o) => (o ? { ...o, logoUrl: r.logoUrl } : o));
        window.dispatchEvent(new CustomEvent(ORG_UPDATED_EVENT, { detail: { organizationId: orgId } }));
      }

      setSide((s) => ({ ...s, url: sideUrl }));
      setTheme(nextTheme);
      setSideFile(null);
      setHeaderFile(null);
      setLogoFile(null);
      setDone("Saved. Your design now shows on every dashboard page.");
    } catch (err) {
      setError(BRANDING_ERROR(err, "Your changes could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  const sideSrc = sideFile?.url ?? (side.url ? mediaUrl(side.url) : null);
  const headerSrc = headerFile?.url ?? (theme.headerUrl ? mediaUrl(theme.headerUrl) : null);
  const logoSrc = logoFile?.url ?? (orgInfo?.logoUrl ? mediaUrl(orgInfo.logoUrl) : organization.logoUrl ? mediaUrl(organization.logoUrl) : null);
  const setColors = (p: Partial<ThemeColors>) => setTheme((t) => ({ ...t, colors: { ...t.colors, ...p } }));

  return (
    <div className="cz-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={"cz" + (bigPreview ? " cz--big" : "")} role="dialog" aria-modal="true" aria-labelledby="cz-title">
        <header className="cz__head">
          <span className="cz__icon" aria-hidden="true">
            <Palette />
          </span>
          <div>
            <h2 id="cz-title">Customize page</h2>
            <p>Change how your organization dashboard looks. Changes show in the preview until you save.</p>
          </div>
          <button type="button" className="cz__x" onClick={close} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>

        {!canEdit && branding.loaded && (
          <p className="cz-note">Only the owner and administrators with the Settings &amp; Roles permission can change the design.</p>
        )}

        <div className="cz__body">
          <div className="cz__controls">
            <nav className="cz-tabs" role="tablist" aria-label="Customize">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>
                  <t.icon aria-hidden="true" /> {t.label}
                </button>
              ))}
            </nav>

            {tab === "sidebar" && (
              <div className="cz-panel">
                <h3>Sidebar background image</h3>
                <ImagePicker
                  src={sideSrc}
                  empty="Default sidebar"
                  hint="JPG, PNG or WebP. Max 10 MB. Recommended 400 × 1400 px (vertical)."
                  disabled={!canEdit || busy}
                  onPick={(e) => pick(e, SIDEBAR_BG_MAX_BYTES, setSideFile)}
                  onRemove={() => {
                    setSideFile(null);
                    setSide((s) => ({ ...s, url: null }));
                  }}
                />
                <h3>Image position</h3>
                <Choice
                  value={side.position}
                  disabled={!canEdit || !sideSrc}
                  options={[
                    { id: "top", label: "Top", icon: AlignStartHorizontal },
                    { id: "center", label: "Center", icon: AlignCenterHorizontal },
                    { id: "bottom", label: "Bottom", icon: AlignEndHorizontal },
                  ]}
                  onChange={(position) => setSide((s) => ({ ...s, position }))}
                />
                <h3>Image scale</h3>
                <Choice
                  value={side.fit}
                  disabled={!canEdit || !sideSrc}
                  options={[
                    { id: "cover", label: "Cover" },
                    { id: "contain", label: "Contain" },
                  ]}
                  onChange={(fit) => setSide((s) => ({ ...s, fit }))}
                />
                <SwitchRow label="Dark overlay" sub="Keeps menu text readable on any photo." checked={side.overlay} disabled={!canEdit || !sideSrc} onChange={(overlay) => setSide((s) => ({ ...s, overlay }))} />
                <Slider label="Overlay opacity" value={side.opacity} disabled={!canEdit || !sideSrc || !side.overlay} onChange={(opacity) => setSide((s) => ({ ...s, opacity }))} />
                <ColorField label="Sidebar background color" hint="Used behind the image, and on its own when there is no image." value={theme.colors.sidebar} disabled={!canEdit} onChange={(sidebar) => setColors({ sidebar })} />
              </div>
            )}

            {tab === "header" && (
              <div className="cz-panel">
                <h3>Header style</h3>
                <Choice
                  value={theme.headerStyle}
                  disabled={!canEdit}
                  options={[
                    { id: "image", label: "Photo" },
                    { id: "gradient", label: "Gradient" },
                    { id: "solid", label: "Solid" },
                  ]}
                  onChange={(headerStyle) => setTheme((t) => ({ ...t, headerStyle }))}
                />
                {theme.headerStyle === "image" && (
                  <>
                    <h3>Header background image</h3>
                    <ImagePicker
                      src={headerSrc}
                      empty={orgInfo?.bannerUrl ? "Using your cover photo" : "No image"}
                      hint="JPG, PNG or WebP. Max 10 MB. Wide images work best (at least 1600 px). Without one, your cover photo is used."
                      disabled={!canEdit || busy}
                      onPick={(e) => pick(e, SIDEBAR_BG_MAX_BYTES, setHeaderFile)}
                      onRemove={() => {
                        setHeaderFile(null);
                        setTheme((t) => ({ ...t, headerUrl: null }));
                      }}
                    />
                    <Slider label="Image overlay" value={theme.headerOpacity} disabled={!canEdit} onChange={(headerOpacity) => setTheme((t) => ({ ...t, headerOpacity }))} />
                  </>
                )}
                <SwitchRow label="Show tagline" sub="The line under your organization name." checked={theme.showTagline} disabled={!canEdit} onChange={(showTagline) => setTheme((t) => ({ ...t, showTagline }))} />
                <h3>Organization logo</h3>
                <ImagePicker
                  src={logoSrc}
                  empty="No logo"
                  square
                  hint="JPG, PNG or WebP. Max 5 MB. Square works best. Saved to your organization profile."
                  disabled={!canEdit || busy}
                  onPick={(e) => pick(e, 5 * 1024 * 1024, setLogoFile)}
                  onRemove={logoFile ? () => setLogoFile(null) : undefined}
                  removeLabel="Undo"
                />
              </div>
            )}

            {tab === "colors" && (
              <div className="cz-panel">
                <h3>Color presets</h3>
                <div className="cz-presets">
                  {PRESETS.map((p) => (
                    <button key={p.label} type="button" disabled={!canEdit} onClick={() => setColors(p.colors)} className={JSON.stringify(p.colors) === JSON.stringify(theme.colors) ? "is-on" : ""}>
                      <span className="cz-presets__dots" aria-hidden="true">
                        <i style={{ background: p.colors.sidebar }} />
                        <i style={{ background: p.colors.primary }} />
                        <i style={{ background: p.colors.secondary }} />
                      </span>
                      {p.label}
                    </button>
                  ))}
                </div>
                {COLOR_FIELDS.map((f) => (
                  <ColorField key={f.key} label={f.label} hint={f.hint} value={theme.colors[f.key]} disabled={!canEdit} onChange={(v) => setColors({ [f.key]: v })} />
                ))}
              </div>
            )}

            {tab === "page" && (
              <div className="cz-panel">
                <p className="cz-muted">
                  Each dashboard page can also have its own banner and menu thumbnail.
                  {activePage ? ` You are on "${activePage.label}".` : ""}
                </p>
                <button type="button" className="cz-btn cz-btn--ghost" onClick={onEditPage} disabled={!activePage || !canEdit}>
                  <FileImage aria-hidden="true" /> Edit this page's banner &amp; thumbnail
                </button>
                {dirty && <p className="cz-muted">Save or cancel your design changes first, or they will be lost.</p>}
              </div>
            )}
          </div>

          <div className="cz__preview">
            <div className="cz__previewhead">
              <b>Live preview</b>
              <button type="button" className="cz-link" onClick={() => setBigPreview((v) => !v)}>
                {bigPreview ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />} {bigPreview ? "Back to settings" : "Preview changes"}
              </button>
            </div>
            <Preview organization={organization} side={side} sideSrc={sideSrc} theme={theme} headerSrc={headerSrc} logoSrc={logoSrc} tagline={orgInfo?.tagline ?? ""} cover={orgInfo?.bannerUrl ?? null} />
          </div>
        </div>

        {error && <p className="cz-error">{error}</p>}
        {done && !dirty && <p className="cz-ok">{done}</p>}

        <footer className="cz__foot">
          <button type="button" className="cz-btn cz-btn--ghost" onClick={restoreDefaults} disabled={!canEdit || busy}>
            <RotateCcw aria-hidden="true" /> Restore default design
          </button>
          <span className="cz__spacer" />
          <button type="button" className="cz-btn cz-btn--ghost" onClick={cancel} disabled={!dirty || busy}>
            Cancel changes
          </button>
          <button type="button" className="cz-btn cz-btn--primary" onClick={() => void save()} disabled={!canEdit || !dirty || busy}>
            {busy ? <Loader2 className="cz-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save changes
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ preview */

function Preview({
  organization,
  side,
  sideSrc,
  theme,
  headerSrc,
  logoSrc,
  tagline,
  cover,
}: {
  organization: ShellOrganization;
  side: SidebarBg;
  sideSrc: string | null;
  theme: DashboardTheme;
  headerSrc: string | null;
  logoSrc: string | null;
  tagline: string;
  cover: string | null;
}) {
  const sections = useMemo(() => shellSections("admin", organization), [organization]);
  const bg = sidebarBgProps(sideSrc ? side : null, sideSrc, theme.colors.sidebar);
  return (
    <div className="cz-prev" style={themeVars(theme.colors)} aria-hidden="true">
      <div className={"cz-prev__side " + bg.className} style={bg.style}>
        <FockisOrgBrand />
        <div className="fo-nav">
          {sections.map((sec, i) => (
            <div key={i}>
              {sec.label && <div className="fo-nav__label">{sec.label}</div>}
              {sec.items.map((item, j) => (
                <span key={item.to + item.label} className={"fo-nav__link" + (i === 0 && j === 0 ? " is-active" : "")}>
                  <item.icon />
                  <span className="fo-nav__text">{item.label}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="cz-prev__main">
        <OrgBanner
          organizationId={organization.id}
          name={organization.name}
          tagline={tagline}
          coverUrl={cover}
          theme={theme}
          headerSrc={theme.headerStyle === "image" ? (headerSrc ?? (cover ? mediaUrl(cover) : null)) : null}
          logoSrc={logoSrc}
          compact
        />
        <div className="cz-prev__title">
          <b>Organization Dashboard</b>
          <span className="cz-prev__btn" style={{ background: "var(--fo-btn, var(--fo-blue))" } as CSSProperties}>
            Primary button
          </span>
        </div>
        <div className="cz-prev__cards">
          {["Total Members", "Active Members", "Events"].map((l, i) => (
            <span key={l} className="cz-prev__card">
              <i style={{ background: i === 2 ? "var(--fo-accent, #d62839)" : "var(--fo-blue)" }} />
              <b>{i + 1}</b>
              <small>{l}</small>
            </span>
          ))}
        </div>
        <div className="cz-prev__chart">
          <svg viewBox="0 0 200 50" preserveAspectRatio="none">
            <path d="M0 45 L40 40 L80 42 L120 30 L160 22 L200 6 L200 50 L0 50 Z" style={{ fill: "var(--fo-blue-100, #dbe9fd)" }} />
            <path d="M0 45 L40 40 L80 42 L120 30 L160 22 L200 6" style={{ fill: "none", stroke: "var(--fo-blue)", strokeWidth: 2 }} />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- parts */

function ImagePicker({
  src,
  empty,
  hint,
  disabled,
  onPick,
  onRemove,
  removeLabel = "Remove image",
  square,
}: {
  src: string | null;
  empty: string;
  hint: string;
  disabled?: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove?: () => void;
  removeLabel?: string;
  square?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="cz-img">
      <div className={"cz-img__thumb" + (square ? " cz-img__thumb--square" : "")}>{src ? <img src={src} alt="" /> : <span>{empty}</span>}</div>
      <div className="cz-img__acts">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
        <button type="button" className="cz-btn cz-btn--ghost cz-btn--sm" onClick={() => input.current?.click()} disabled={disabled}>
          <Upload aria-hidden="true" /> {src ? "Change image" : "Upload image"}
        </button>
        {onRemove && src && (
          <button type="button" className="cz-btn cz-btn--danger cz-btn--sm" onClick={onRemove} disabled={disabled}>
            <Trash2 aria-hidden="true" /> {removeLabel}
          </button>
        )}
        <small>{hint}</small>
      </div>
    </div>
  );
}

function Choice<T extends string>({ value, options, onChange, disabled }: { value: T; options: { id: T; label: string; icon?: LucideIcon }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="cz-choice" role="radiogroup">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? "is-on" : ""} onClick={() => onChange(o.id)} disabled={disabled}>
          {o.icon && <o.icon aria-hidden="true" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SwitchRow({ label, sub, checked, onChange, disabled }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="cz-switchrow">
      <span>
        <b>{label}</b>
        <small>{sub}</small>
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className={"cz-switch" + (checked ? " is-on" : "")} onClick={() => onChange(!checked)} disabled={disabled}>
        <span />
      </button>
    </div>
  );
}

function Slider({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const pct = Math.round(value * 100);
  return (
    <label className={"cz-slider" + (disabled ? " is-off" : "")}>
      <b>{label}</b>
      <span>
        <input type="range" min={0} max={90} step={5} value={pct} disabled={disabled} onChange={(e) => onChange(Number(e.target.value) / 100)} style={{ "--cz-fill": `${(pct / 90) * 100}%` } as CSSProperties} />
        <output>{pct}%</output>
      </span>
    </label>
  );
}

function ColorField({ label, hint, value, onChange, disabled }: { label: string; hint: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="cz-color">
      <span>
        <b>{label}</b>
        <small>{hint}</small>
      </span>
      <span className="cz-color__inputs">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toLowerCase())} disabled={disabled} aria-label={label} />
        <input
          type="text"
          value={text}
          maxLength={7}
          disabled={disabled}
          aria-label={`${label} (hex)`}
          onChange={(e) => {
            const v = e.target.value.trim();
            setText(v);
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
          }}
          onBlur={() => setText(value)}
        />
      </span>
      {/^#[0-9a-f]{6}$/i.test(text) ? null : <Info className="cz-color__warn" aria-label="Use a color like #0b63d1" />}
    </div>
  );
}
