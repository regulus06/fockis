/**
 * SidebarAppearance.tsx — Profile & Locations → Branding → "Sidebar Appearance"
 * -----------------------------------------------------------------------------
 * Upload a background image for the organization dashboard sidebar, choose its
 * position / scaling and the dark overlay, with a live preview of the real
 * menu. Saved through the existing page-branding API (pageKey
 * "sidebar-background"); the server only lets the owner and administrators
 * with the Settings & Roles permission change it, and only accepts images
 * uploaded to this organization.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AlignCenterHorizontal, AlignEndHorizontal, AlignStartHorizontal, CheckCircle2, Expand, ImageIcon, Info, Loader2, RotateCcw, Save, Shrink, Trash2, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FockisOrgBrand } from "../ui/orgUi";
import { shellSections, type ShellOrganization } from "../ui/OrgAppShell";
import { mediaUrl } from "../api/dashboardApi";
import { BRANDING_ERROR, pageBrandingApi } from "./pageBrandingApi";
import { applyManagedBranding, usePageBranding } from "./usePageBranding";
import { DEFAULT_SIDEBAR_BG, SIDEBAR_BG_KEY, SIDEBAR_BG_MAX_BYTES, SIDEBAR_BG_TYPES, sidebarBgContent, sidebarBgFrom, sidebarBgProps, type SidebarBg } from "./sidebarBackground";
import { DASHBOARD_THEME_KEY, themeFrom } from "./dashboardTheme";
import "./sidebarAppearance.scss";

const POSITIONS: { id: SidebarBg["position"]; label: string; icon: LucideIcon }[] = [
  { id: "top", label: "Top", icon: AlignStartHorizontal },
  { id: "center", label: "Center", icon: AlignCenterHorizontal },
  { id: "bottom", label: "Bottom", icon: AlignEndHorizontal },
];
const FITS: { id: SidebarBg["fit"]; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "cover", label: "Cover", icon: Expand, hint: "Fills the sidebar (may crop)" },
  { id: "contain", label: "Contain", icon: Shrink, hint: "Shows the whole image" },
];

export default function SidebarAppearance({ organization, activeLabel = "Profile & Locations", notify }: { organization: ShellOrganization; activeLabel?: string; notify: (tone: "ok" | "error", text: string) => void }) {
  const orgId = organization.id;
  const branding = usePageBranding(orgId);
  const saved = useMemo(() => sidebarBgFrom(branding.publishedFor(SIDEBAR_BG_KEY)), [branding]);
  const [bg, setBg] = useState<SidebarBg>(saved);
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const canEdit = branding.canEdit;

  // Follow the saved value until the user starts editing.
  const savedSig = JSON.stringify(saved);
  const [baseSig, setBaseSig] = useState(savedSig);
  useEffect(() => {
    if (savedSig !== baseSig && !file && JSON.stringify(bg) === baseSig) setBg(saved);
    setBaseSig(savedSig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSig]);

  useEffect(() => () => void (localUrl && URL.revokeObjectURL(localUrl)), [localUrl]);

  const dirty = Boolean(file) || JSON.stringify(bg) !== savedSig;
  const shownSrc = localUrl ?? (bg.url ? mediaUrl(bg.url) : null);
  const hasImage = Boolean(shownSrc);
  const sections = useMemo(() => shellSections("admin", organization), [organization]);
  const sideColor = themeFrom(branding.publishedFor(DASHBOARD_THEME_KEY)).colors.sidebar;
  const preview = sidebarBgProps(hasImage ? bg : null, shownSrc, sideColor);

  function set(p: Partial<SidebarBg>) {
    setBg((b) => ({ ...b, ...p }));
  }

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!SIDEBAR_BG_TYPES.includes(f.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (f.size > SIDEBAR_BG_MAX_BYTES) return setError("That image is larger than 10 MB.");
    setError(null);
    setFile(f);
    setLocalUrl(URL.createObjectURL(f));
  }

  function removeImage() {
    setFile(null);
    setLocalUrl(null);
    set({ url: null });
  }

  function cancel() {
    setFile(null);
    setLocalUrl(null);
    setError(null);
    setBg(saved);
  }

  async function save() {
    setBusy("save");
    setError(null);
    try {
      let url = bg.url;
      if (file) {
        setProgress(0);
        url = (await pageBrandingApi.upload(orgId, file, file.name, setProgress)).fileUrl;
      }
      if (!url) {
        // No image: back to the default Fockis sidebar.
        const r = await pageBrandingApi.reset(orgId, SIDEBAR_BG_KEY);
        applyManagedBranding(orgId, SIDEBAR_BG_KEY, "", r);
      } else {
        const r = await pageBrandingApi.publish(orgId, SIDEBAR_BG_KEY, sidebarBgContent({ ...bg, url }));
        applyManagedBranding(orgId, SIDEBAR_BG_KEY, "", r);
        setBg((b) => ({ ...b, url }));
      }
      setFile(null);
      setLocalUrl(null);
      notify("ok", url ? "Sidebar background saved. It now shows on every dashboard page." : "Default sidebar restored.");
    } catch (err) {
      setError(BRANDING_ERROR(err, "The sidebar background could not be saved."));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function restoreDefault() {
    if (!window.confirm("Restore the default Fockis sidebar? Your custom background will be removed.")) return;
    setBusy("reset");
    setError(null);
    try {
      const r = await pageBrandingApi.reset(orgId, SIDEBAR_BG_KEY);
      applyManagedBranding(orgId, SIDEBAR_BG_KEY, "", r);
      setFile(null);
      setLocalUrl(null);
      setBg({ ...DEFAULT_SIDEBAR_BG });
      notify("ok", "Default sidebar restored.");
    } catch (err) {
      setError(BRANDING_ERROR(err, "The default sidebar could not be restored."));
    } finally {
      setBusy(null);
    }
  }

  const savedHasImage = Boolean(saved.url);

  return (
    <section className="sa-card" aria-labelledby="sa-title">
      <header className="sa-head">
        <span className="sa-head__icon" aria-hidden="true">
          <ImageIcon />
        </span>
        <div>
          <h2 id="sa-title">Sidebar Appearance</h2>
          <p>Customize the background of your organization sidebar.</p>
        </div>
      </header>

      {!branding.loaded ? (
        <p className="sa-muted">
          <Loader2 className="sa-spin" aria-hidden="true" /> Loading…
        </p>
      ) : (
        <div className="sa-body">
          {/* ------------------------------------------------ live preview */}
          <div className="sa-previewcol">
            <h3>Sidebar Preview</h3>
            <div className={"sa-preview fo-app__side " + preview.className} style={preview.style} aria-label="Sidebar preview" role="img">
              <div className="sa-preview__inner" aria-hidden="true">
                <FockisOrgBrand />
                <div className="fo-nav">
                  {sections.map((sec, i) => (
                    <div key={i}>
                      {sec.label && <div className="fo-nav__label">{sec.label}</div>}
                      {sec.items.map((item) => (
                        <span key={item.to + item.label} className={"fo-nav__link" + (item.label === activeLabel ? " is-active" : "")}>
                          <item.icon />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ settings */}
          <div className="sa-settings">
            {!canEdit && <p className="sa-note">Only the owner and administrators with the Settings &amp; Roles permission can change the sidebar.</p>}

            <div className="sa-box">
              <h3>
                Sidebar Background Image{" "}
                <span title="Shown behind the menu on every dashboard page of this organization." className="sa-info">
                  <Info aria-label="About the sidebar background" />
                </span>
              </h3>
              <div className="sa-current">
                <div className="sa-thumb">{shownSrc ? <img src={shownSrc} alt="Selected sidebar background" style={{ objectPosition: `center ${bg.position}`, objectFit: bg.fit }} /> : <span>Default Fockis sidebar</span>}</div>
                <p className={"sa-state" + (file || (dirty && bg.url !== saved.url) ? " is-new" : "")}>
                  {file ? (
                    <>New image — press Save Changes</>
                  ) : bg.url !== saved.url ? (
                    <>Image removed — press Save Changes</>
                  ) : savedHasImage ? (
                    <>
                      <CheckCircle2 aria-hidden="true" /> Current background
                    </>
                  ) : (
                    <>Using the default sidebar</>
                  )}
                </p>
              </div>
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
              <button type="button" className="sa-btn sa-btn--ghost sa-btn--block" onClick={() => input.current?.click()} disabled={!canEdit || Boolean(busy)}>
                <Upload aria-hidden="true" /> {hasImage ? "Upload New Image" : "Upload Image"}
              </button>
              <p className="sa-muted sa-small">JPG, PNG or WebP. Max 10 MB. Recommended size: 400 × 1400 px (vertical).</p>
              {progress !== null && (
                <div className="sa-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${progress}%` }} />
                </div>
              )}

              <h3>Image Position</h3>
              <div className="sa-choices sa-choices--3" role="radiogroup" aria-label="Image position">
                {POSITIONS.map((o) => (
                  <button key={o.id} type="button" role="radio" aria-checked={bg.position === o.id} className={bg.position === o.id ? "is-on" : ""} onClick={() => set({ position: o.id })} disabled={!canEdit || !hasImage}>
                    <o.icon aria-hidden="true" />
                    {o.label}
                  </button>
                ))}
              </div>

              <h3>Image Scale</h3>
              <div className="sa-choices sa-choices--2" role="radiogroup" aria-label="Image scale">
                {FITS.map((o) => (
                  <button key={o.id} type="button" role="radio" aria-checked={bg.fit === o.id} title={o.hint} className={bg.fit === o.id ? "is-on" : ""} onClick={() => set({ fit: o.id })} disabled={!canEdit || !hasImage}>
                    <o.icon aria-hidden="true" />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sa-row">
              <span>
                <b>Dark Overlay</b> <small>(for better text readability)</small>
              </span>
              <button type="button" role="switch" aria-checked={bg.overlay} aria-label="Dark overlay" className={"sa-switch" + (bg.overlay ? " is-on" : "")} onClick={() => set({ overlay: !bg.overlay })} disabled={!canEdit || !hasImage}>
                <span />
              </button>
            </div>

            <div className={"sa-opacity" + (bg.overlay ? "" : " is-off")}>
              <label htmlFor="sa-opacity">
                <b>Overlay Opacity</b>
              </label>
              <div className="sa-opacity__row">
                <input
                  id="sa-opacity"
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={Math.round(bg.opacity * 100)}
                  onChange={(e) => set({ opacity: Number(e.target.value) / 100 })}
                  disabled={!canEdit || !hasImage || !bg.overlay}
                  style={{ "--sa-fill": `${(bg.opacity / 0.9) * 100}%` } as React.CSSProperties}
                />
                <output htmlFor="sa-opacity">{Math.round(bg.opacity * 100)}%</output>
              </div>
            </div>

            {error && <p className="sa-error">{error}</p>}

            <div className="sa-actions">
              <button type="button" className="sa-btn sa-btn--ghost" onClick={() => void restoreDefault()} disabled={!canEdit || Boolean(busy) || !branding.managedFor(SIDEBAR_BG_KEY)}>
                {busy === "reset" ? <Loader2 className="sa-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />} Restore Default
              </button>
              <button type="button" className="sa-btn sa-btn--danger" onClick={removeImage} disabled={!canEdit || Boolean(busy) || !hasImage}>
                <Trash2 aria-hidden="true" /> Remove Image
              </button>
            </div>
            <div className="sa-actions sa-actions--end">
              <button type="button" className="sa-btn sa-btn--ghost" onClick={cancel} disabled={!dirty || Boolean(busy)}>
                Cancel
              </button>
              <button type="button" className="sa-btn sa-btn--primary" onClick={() => void save()} disabled={!canEdit || !dirty || Boolean(busy)}>
                {busy === "save" ? <Loader2 className="sa-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
