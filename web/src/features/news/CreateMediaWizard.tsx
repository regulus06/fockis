/**
 * CreateMediaWizard.tsx — /news/create — create a media organization and its
 * independent website (Website Studio) in five steps:
 * Media type · Organization · Website template · Website address · Review & publish.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Globe,
  ImagePlus,
  Loader2,
  Mic,
  Monitor,
  Newspaper,
  Podcast,
  Radio as RadioIcon,
  Smartphone,
  Sparkles,
  Tablet,
  Tv,
  BookOpen,
} from "lucide-react";

import { websiteStudioApi } from "../website-studio/services/websiteStudioApi";
import type { WebsiteTemplate } from "../website-studio/types/studio";
import NewsShell from "./NewsShell";
import { Empty, Modal, OutletLogo, loginPath, signedIn } from "./NewsParts";
import { LANGUAGE_LABELS, MEDIA_TYPE_LABELS, newsApi, newsError } from "./newsApi";

const TYPES: { id: string; icon: typeof Newspaper; text: string }[] = [
  { id: "online_newspaper", icon: Newspaper, text: "Daily news, sections, opinion and breaking news." },
  { id: "news_journalism", icon: Mic, text: "Investigations, long-form reporting and fact-checking." },
  { id: "tv_channel", icon: Tv, text: "Live TV, programs, replays and video reports." },
  { id: "radio_station", icon: RadioIcon, text: "Live radio, schedule, presenters and archives." },
  { id: "digital_magazine", icon: BookOpen, text: "Premium features, editions and collections." },
  { id: "media_entertainment", icon: Sparkles, text: "Entertainment news, interviews and videos." },
  { id: "podcast_network", icon: Podcast, text: "Shows, episodes, hosts and subscriptions." },
];

const STEPS = ["Media Type", "Organization", "Template", "Website Address", "Review & Publish"];
const ROOT = (import.meta.env.VITE_WEBSITE_STUDIO_ROOT_DOMAIN as string | undefined) || "fockis.com";
const slugify = (v: string) =>
  v
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);

export default function CreateMediaWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    mediaType: "",
    name: "",
    tagline: "",
    about: "",
    country: "",
    city: "",
    address: "",
    email: "",
    phone: "",
    primaryLanguage: "en",
    languages: [] as string[],
    socials: { facebook: "", x: "", instagram: "", youtube: "", tiktok: "" } as Record<string, string>,
    logoUrl: "",
    coverUrl: "",
    organizationId: "",
    templateSlug: "",
    slug: "",
    customDomain: "",
  });
  const [orgs, setOrgs] = useState<{ id: string; name: string; type: string; logoUrl: string }[]>([]);
  const [templates, setTemplates] = useState<WebsiteTemplate[] | null>(null);
  const [preview, setPreview] = useState<WebsiteTemplate | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [slugState, setSlugState] = useState<{ checking: boolean; available: boolean | null; reason: string }>({ checking: false, available: null, reason: "" });
  const [uploading, setUploading] = useState<"" | "logo" | "cover">("");
  const [confirm, setConfirm] = useState(false);
  const [publishNow, setPublishNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; slug: string; website: { url: string; status: string } | null; websiteNote: string } | null>(null);
  const logoInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!signedIn()) return;
    newsApi.linkableOrgs().then((r) => setOrgs(r.items)).catch(() => setOrgs([]));
    websiteStudioApi
      .templates({ category: "news-and-magazine" })
      .then(async (list) => (list.length ? list : await websiteStudioApi.templates({})))
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    if (!f.slug && f.name) setF((x) => ({ ...x, slug: slugify(x.name) }));
  }, [f.name, f.slug]);

  useEffect(() => {
    if (step !== 3 || !f.slug) return;
    setSlugState((s) => ({ ...s, checking: true }));
    const t = window.setTimeout(() => {
      newsApi
        .slugAvailable(f.slug)
        .then((r) => setSlugState({ checking: false, available: r.available, reason: r.reason }))
        .catch(() => setSlugState({ checking: false, available: null, reason: "" }));
    }, 350);
    return () => window.clearTimeout(t);
  }, [f.slug, step]);

  const problem = useMemo(() => {
    if (step === 0 && !f.mediaType) return "Choose a media type.";
    if (step === 1) {
      if (f.name.trim().length < 2) return "Enter the media organization name.";
      if (!f.country.trim()) return "Enter the country.";
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return "Enter a valid contact email.";
    }
    if (step === 3) {
      if (f.slug.length < 3) return "The website address needs at least 3 letters or numbers.";
      if (slugState.available === false) return slugState.reason || "This address is not available.";
      if (f.customDomain && !/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(f.customDomain.trim())) return "Enter a domain like www.example.com.";
    }
    return "";
  }, [step, f, slugState]);

  async function upload(kind: "logo" | "cover", file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image (JPG, PNG or WebP).");
    if (file.size > 15 * 1024 * 1024) return setError("Images can be up to 15 MB.");
    setUploading(kind);
    setError("");
    try {
      const url = await newsApi.uploadFile(file);
      setF((x) => ({ ...x, [kind === "logo" ? "logoUrl" : "coverUrl"]: url }));
    } catch (err) {
      setError(newsError(err, "The image could not be uploaded."));
    } finally {
      setUploading("");
    }
  }

  async function create() {
    if (!confirm) return setError("Confirm that the information is correct.");
    setBusy(true);
    setError("");
    try {
      const socials = Object.fromEntries(Object.entries(f.socials).filter(([, v]) => v.trim()));
      const res = await newsApi.createOutlet({
        ...f,
        socials,
        organizationId: f.organizationId || undefined,
        templateSlug: f.templateSlug || undefined,
        createWebsite: true,
        publishWebsite: publishNow,
      });
      setCreated(res);
    } catch (err) {
      setError(newsError(err, "The media organization could not be created."));
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn())
    return (
      <NewsShell compactHeader>
        <Empty title="Sign in to create a media organization" action={<Link to={loginPath()} className="nm-btn nm-btn--primary">Sign in</Link>} />
      </NewsShell>
    );

  if (created)
    return (
      <NewsShell compactHeader>
        <section className="nm-card nm-receipt nm-narrow">
          <CheckCircle2 className="nm-receipt__icon" />
          <h2>{f.name} is on Fockis!</h2>
          <p>Your media profile is live at Fockis News. Start writing articles from the Media Administration Center.</p>
          {created.website && (
            <p>
              Website: <a href={created.website.url} target="_blank" rel="noreferrer">{created.website.url.replace(/^https?:\/\//, "")}</a> —{" "}
              {created.website.status === "published" ? <span className="nm-okpill">Published</span> : <span className="nm-greypill">Draft</span>}
            </p>
          )}
          {created.websiteNote && <p className="nm-note nm-note--amber">{created.websiteNote}</p>}
          {f.customDomain && <p className="nm-note">To connect {f.customDomain}, open Domain Management in your administration center and follow the DNS steps. It becomes active only after verification.</p>}
          <div className="nm-row-actions">
            <button type="button" className="nm-btn nm-btn--primary" onClick={() => navigate(`/news/admin/${created.id}`)}>
              Open Media Administration
            </button>
            <Link to={`/news/${created.slug}`} className="nm-btn nm-btn--ghost">
              View public profile
            </Link>
          </div>
        </section>
      </NewsShell>
    );

  const typeLabel = MEDIA_TYPE_LABELS[f.mediaType] ?? "";
  const tpl = templates?.find((t) => t.slug === f.templateSlug) ?? null;

  return (
    <NewsShell compactHeader>
      <div className="nm-wizard">
        <header className="nm-pagehead">
          <h1>Create Your Media</h1>
          <p>Launch your newspaper, TV channel, radio station, magazine or podcast network with its own website.</p>
        </header>
        <ol className="nm-wizard__steps" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? "is-on" : i < step ? "is-done" : ""}>
              <span>{i < step ? <Check /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <section className="nm-card nm-wizard__body">
          {step === 0 && (
            <div className="nm-typegrid" role="radiogroup" aria-label="Media type">
              {TYPES.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={f.mediaType === t.id} className={f.mediaType === t.id ? "is-on" : ""} onClick={() => setF({ ...f, mediaType: t.id })}>
                  <t.icon />
                  <b>{MEDIA_TYPE_LABELS[t.id]}</b>
                  <small>{t.text}</small>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="nm-form">
              {orgs.length > 0 && (
                <label className="nm-field">
                  <span className="nm-field__label">Connect an existing Fockis organization (optional)</span>
                  <select className="nm-input" value={f.organizationId} onChange={(ev) => setF({ ...f, organizationId: ev.target.value })}>
                    <option value="">No — this media is its own organization</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <small>Linking avoids creating a duplicate organization. Only organizations you own are listed.</small>
                </label>
              )}
              <div className="nm-imgrow">
                <div className="nm-imgpick nm-imgpick--logo">
                  {f.logoUrl ? <img src={f.logoUrl} alt="Logo" /> : <OutletLogo outlet={{ name: f.name || "Media", logoUrl: "" }} size={96} />}
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => logoInput.current?.click()} disabled={Boolean(uploading)}>
                    {uploading === "logo" ? <Loader2 className="nm-spin" /> : <ImagePlus />} Logo
                  </button>
                  <input ref={logoInput} type="file" accept="image/*" hidden onChange={(ev) => upload("logo", ev.target.files?.[0])} />
                </div>
                <div className="nm-imgpick nm-imgpick--cover">
                  {f.coverUrl ? <img src={f.coverUrl} alt="Cover" /> : <span className="nm-imgpick__ph">Cover image</span>}
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => coverInput.current?.click()} disabled={Boolean(uploading)}>
                    {uploading === "cover" ? <Loader2 className="nm-spin" /> : <ImagePlus />} Cover image
                  </button>
                  <input ref={coverInput} type="file" accept="image/*" hidden onChange={(ev) => upload("cover", ev.target.files?.[0])} />
                </div>
              </div>
              <div className="nm-form-row">
                <label className="nm-field">
                  <span className="nm-field__label">
                    Media organization name <i>*</i>
                  </span>
                  <input className="nm-input" maxLength={120} value={f.name} onChange={(ev) => setF({ ...f, name: ev.target.value })} placeholder="Ouanaminthe View" />
                </label>
                <label className="nm-field">
                  <span className="nm-field__label">Organization type</span>
                  <input className="nm-input" value={typeLabel} readOnly />
                </label>
              </div>
              <label className="nm-field">
                <span className="nm-field__label">Short description</span>
                <input className="nm-input" maxLength={400} value={f.tagline} onChange={(ev) => setF({ ...f, tagline: ev.target.value })} placeholder="Independent, reliable and community-focused news…" />
              </label>
              <label className="nm-field">
                <span className="nm-field__label">About</span>
                <textarea className="nm-input" rows={4} maxLength={6000} value={f.about} onChange={(ev) => setF({ ...f, about: ev.target.value })} />
              </label>
              <div className="nm-form-row">
                <label className="nm-field">
                  <span className="nm-field__label">
                    Country <i>*</i>
                  </span>
                  <input className="nm-input" maxLength={80} value={f.country} onChange={(ev) => setF({ ...f, country: ev.target.value })} />
                </label>
                <label className="nm-field">
                  <span className="nm-field__label">City</span>
                  <input className="nm-input" maxLength={80} value={f.city} onChange={(ev) => setF({ ...f, city: ev.target.value })} />
                </label>
                <label className="nm-field">
                  <span className="nm-field__label">Address (optional)</span>
                  <input className="nm-input" maxLength={300} value={f.address} onChange={(ev) => setF({ ...f, address: ev.target.value })} />
                </label>
              </div>
              <div className="nm-form-row">
                <label className="nm-field">
                  <span className="nm-field__label">Contact email</span>
                  <input className="nm-input" type="email" maxLength={200} value={f.email} onChange={(ev) => setF({ ...f, email: ev.target.value })} />
                </label>
                <label className="nm-field">
                  <span className="nm-field__label">Phone</span>
                  <input className="nm-input" type="tel" maxLength={40} value={f.phone} onChange={(ev) => setF({ ...f, phone: ev.target.value })} />
                </label>
                <label className="nm-field">
                  <span className="nm-field__label">Primary language</span>
                  <select className="nm-input" value={f.primaryLanguage} onChange={(ev) => setF({ ...f, primaryLanguage: ev.target.value })}>
                    {Object.entries(LANGUAGE_LABELS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="nm-field">
                <span className="nm-field__label">Additional languages</span>
                <div className="nm-checks">
                  {Object.entries(LANGUAGE_LABELS)
                    .filter(([k]) => k !== f.primaryLanguage)
                    .map(([k, l]) => (
                      <label key={k} className="nm-check">
                        <input type="checkbox" checked={f.languages.includes(k)} onChange={(ev) => setF({ ...f, languages: ev.target.checked ? [...f.languages, k] : f.languages.filter((x) => x !== k) })} /> {l}
                      </label>
                    ))}
                </div>
              </div>
              <div className="nm-form-row">
                {Object.keys(f.socials).map((k) => (
                  <label key={k} className="nm-field">
                    <span className="nm-field__label">{k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)}</span>
                    <input className="nm-input" type="url" placeholder="https://" value={f.socials[k]} onChange={(ev) => setF({ ...f, socials: { ...f.socials, [k]: ev.target.value } })} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <p className="nm-muted">Choose a design for your independent website. You can switch templates later without losing content, and customize colors, fonts, images and sections in Website Studio.</p>
              {!templates && <Loader2 className="nm-spin" />}
              {templates && templates.length === 0 && <p className="nm-note">No templates are available yet. Your website will start from the default design and you can change it in Website Studio.</p>}
              <div className="nm-tplgrid">
                {templates?.map((t) => (
                  <article key={t.slug} className={`nm-tpl${f.templateSlug === t.slug ? " is-on" : ""}`}>
                    <span className="nm-tpl__img">{t.thumbnail ? <img src={t.thumbnail} alt="" /> : <Globe />}</span>
                    <b>{t.name}</b>
                    <small>{t.description}</small>
                    <div className="nm-row-actions">
                      <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => setPreview(t)}>
                        <Eye /> Preview
                      </button>
                      <button type="button" className="nm-btn nm-btn--primary nm-btn--sm" onClick={() => setF({ ...f, templateSlug: t.slug })}>
                        {f.templateSlug === t.slug ? (
                          <>
                            <Check /> Selected
                          </>
                        ) : (
                          "Use Template"
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="nm-form">
              <label className="nm-field">
                <span className="nm-field__label">Fockis website address</span>
                <span className="nm-domaininput">
                  <input value={f.slug} onChange={(ev) => setF({ ...f, slug: slugify(ev.target.value) })} aria-label="Subdomain" />
                  <span>.{ROOT}</span>
                </span>
                <small>
                  {slugState.checking ? "Checking…" : slugState.available === true ? <span className="nm-ok">✓ {f.slug}.{ROOT} is available</span> : slugState.available === false ? <span className="nm-bad">{slugState.reason}</span> : ""}
                </small>
              </label>
              <label className="nm-field">
                <span className="nm-field__label">Custom domain (optional)</span>
                <input className="nm-input" value={f.customDomain} onChange={(ev) => setF({ ...f, customDomain: ev.target.value.trim().toLowerCase() })} placeholder="www.ouanamintheview.com" />
                <small>You'll connect it after creation in Domain Management (DNS verification). It is never marked active until verification succeeds.</small>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="nm-review">
              <div className="nm-review__card">
                {f.coverUrl && <img className="nm-review__cover" src={f.coverUrl} alt="" />}
                <div className="nm-review__who">
                  <OutletLogo outlet={{ name: f.name, logoUrl: f.logoUrl }} size={64} />
                  <div>
                    <b>{f.name}</b>
                    <small>
                      {typeLabel} · {[f.city, f.country].filter(Boolean).join(", ")}
                    </small>
                  </div>
                </div>
                {f.tagline && <p>{f.tagline}</p>}
              </div>
              <dl className="nm-dl">
                <dt>Linked organization</dt>
                <dd>{orgs.find((o) => o.id === f.organizationId)?.name ?? "None (new media organization)"}</dd>
                <dt>Languages</dt>
                <dd>{[f.primaryLanguage, ...f.languages].map((l) => LANGUAGE_LABELS[l]).join(", ")}</dd>
                <dt>Contact</dt>
                <dd>{[f.email, f.phone].filter(Boolean).join(" · ") || "—"}</dd>
                <dt>Template</dt>
                <dd>{tpl?.name ?? "Default News & Magazine design"}</dd>
                <dt>Website address</dt>
                <dd>
                  {f.slug}.{ROOT}
                </dd>
                {f.customDomain && (
                  <>
                    <dt>Custom domain</dt>
                    <dd>{f.customDomain} (connect after creation)</dd>
                  </>
                )}
              </dl>
              <label className="nm-check">
                <input type="checkbox" checked={publishNow} onChange={(ev) => setPublishNow(ev.target.checked)} /> Publish the website now (otherwise it stays a private draft)
              </label>
              <label className="nm-check">
                <input type="checkbox" checked={confirm} onChange={(ev) => setConfirm(ev.target.checked)} /> I confirm this information is correct and I am authorized to represent this media organization.
              </label>
            </div>
          )}

          {error && <p className="nm-form-error">{error}</p>}

          <footer className="nm-wizard__foot">
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => (step ? setStep(step - 1) : navigate("/news"))} disabled={busy}>
              <ArrowLeft /> {step ? "Back" : "Cancel"}
            </button>
            {step < 4 ? (
              <button
                type="button"
                className="nm-btn nm-btn--primary"
                onClick={() => {
                  if (problem) return setError(problem);
                  setError("");
                  setStep(step + 1);
                }}
              >
                Continue <ArrowRight />
              </button>
            ) : (
              <button type="button" className="nm-btn nm-btn--red" onClick={create} disabled={busy || !confirm}>
                {busy ? <Loader2 className="nm-spin" /> : <CheckCircle2 />} {publishNow ? "Create & Publish" : "Create Media"}
              </button>
            )}
          </footer>
        </section>
      </div>

      {preview && (
        <Modal title={preview.name} subtitle={preview.description} onClose={() => setPreview(null)} wide>
          <div className="nm-devices" role="radiogroup" aria-label="Preview size">
            {(
              [
                ["desktop", Monitor],
                ["tablet", Tablet],
                ["mobile", Smartphone],
              ] as const
            ).map(([d, Icon]) => (
              <button key={d} type="button" role="radio" aria-checked={device === d} className={device === d ? "is-on" : ""} onClick={() => setDevice(d)}>
                <Icon /> {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <div className={`nm-frame nm-frame--${device}`}>
            <iframe title={`${preview.name} preview`} src={`/website-studio/templates/${encodeURIComponent(preview.slug)}?embed=1`} />
          </div>
          <div className="nm-row-actions nm-mt">
            <button
              type="button"
              className="nm-btn nm-btn--primary"
              onClick={() => {
                setF({ ...f, templateSlug: preview.slug });
                setPreview(null);
              }}
            >
              Use Template
            </button>
          </div>
        </Modal>
      )}
    </NewsShell>
  );
}
