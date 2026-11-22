/**
 * ContactMediaPage.tsx — /news/:slug/contact — "Contact <Media>":
 * coverage requests, interviews, news tips, stories, advertising, partnerships,
 * corrections and general inquiries. Each submission gets a reference number
 * and a private tracking code.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Copy, ImagePlus, Info, Loader2, MapPin, Send, X } from "lucide-react";

import NewsShell from "./NewsShell";
import { REQUEST_ICONS } from "./MediaProfilePage";
import { Empty, OutletLogo, Skeleton, Verified, loginPath, signedIn } from "./NewsParts";
import { REQUEST_TYPES, newsApi, newsError, type MediaProfile, type RequestReceipt } from "./newsApi";

const CONFIDENTIAL = new Set(["news_tip", "story"]);
const MAX_FILES = 6;

export default function ContactMediaPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const type = REQUEST_TYPES.some((t) => t.id === params.get("type")) ? params.get("type")! : "coverage";
  const meta = REQUEST_TYPES.find((t) => t.id === type)!;
  const [p, setP] = useState<MediaProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ subject: "", description: "", contactName: "", email: "", phone: "", location: "", confidential: false, anonymous: false, website: "" });
  const [files, setFiles] = useState<{ url: string; name: string; image: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState<RequestReceipt | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    newsApi
      .profile(slug)
      .then((r) => {
        setP(r);
        document.title = `Contact ${r.name} · Fockis News`;
      })
      .catch((err) => setError(newsError(err, "This media organization was not found.")));
  }, [slug]);

  useEffect(() => {
    setFormError("");
    if (!CONFIDENTIAL.has(type)) setF((x) => ({ ...x, anonymous: false }));
  }, [type]);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    if (!signedIn()) return setFormError("Sign in to attach files.");
    setUploading(true);
    setFormError("");
    try {
      for (const file of Array.from(list).slice(0, MAX_FILES - files.length)) {
        if (!/^(image|video|audio)\//.test(file.type)) throw new Error("Attach photos, videos or audio files.");
        if (file.size > 200 * 1024 * 1024) throw new Error("Each file can be up to 200 MB.");
        const url = await newsApi.uploadFile(file);
        setFiles((x) => [...x, { url, name: file.name, image: file.type.startsWith("image/") }]);
      }
    } catch (err) {
      setFormError(newsError(err, "The file could not be uploaded."));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (f.subject.trim().length < 4) return setFormError("Add a subject.");
    if (f.description.trim().length < 20) return setFormError("Describe your request in a little more detail (at least 20 characters).");
    if (!f.anonymous) {
      if (f.contactName.trim().length < 2) return setFormError("Add your name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setFormError("Add a valid email so the newsroom can reply.");
    }
    setBusy(true);
    setFormError("");
    try {
      setDone(await newsApi.submitRequest(slug, { ...f, type, attachments: files.map((x) => x.url) }));
    } catch (err) {
      setFormError(newsError(err, "Your request could not be sent."));
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return (
      <NewsShell compactHeader>
        <Empty title="Not available" text={error} />
      </NewsShell>
    );

  return (
    <NewsShell compactHeader>
      {!p && <Skeleton h={520} />}
      {p && (
        <div className="nm-contact">
          <header className="nm-contact__head">
            <OutletLogo outlet={p} size={56} />
            <div>
              <h1>
                Contact {p.name} {p.verified && <Verified size={26} />}
              </h1>
              <p>Send a request, news tip or inquiry to our newsroom.</p>
            </div>
          </header>

          {!p.requestsEnabled && <p className="nm-callout">{p.name} is not accepting requests right now.</p>}

          {done ? (
            <section className="nm-card nm-receipt">
              <CheckCircle2 className="nm-receipt__icon" />
              <h2>Your request was sent</h2>
              <p>{done.message}</p>
              <dl className="nm-dl">
                <dt>Reference number</dt>
                <dd>
                  <b>{done.reference}</b>
                </dd>
                <dt>Tracking code</dt>
                <dd>
                  <code>{done.trackingCode}</code>{" "}
                  <button type="button" className="nm-link" onClick={() => navigator.clipboard?.writeText(`${done.reference} ${done.trackingCode}`)}>
                    <Copy /> Copy
                  </button>
                </dd>
              </dl>
              <p className="nm-note">
                <Info /> Save the tracking code now — it is shown only once and lets you check the status and read replies.
              </p>
              {done.notice && <p className="nm-note nm-note--amber">{done.notice}</p>}
              <div className="nm-row-actions">
                <Link to={`/news/requests/track?ref=${encodeURIComponent(done.reference)}`} className="nm-btn nm-btn--primary">
                  Track this request
                </Link>
                <Link to={`/news/${p.slug}`} className="nm-btn nm-btn--ghost">
                  Back to {p.name}
                </Link>
              </div>
            </section>
          ) : (
            <div className="nm-contact__grid">
              <nav className="nm-reqtypes" aria-label="Request type">
                {REQUEST_TYPES.map((t) => {
                  const Icon = REQUEST_ICONS[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={type === t.id ? "is-on" : ""}
                      aria-pressed={type === t.id}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set("type", t.id);
                        setParams(next, { replace: true });
                      }}
                    >
                      <span className="nm-reqtypes__icon">
                        <Icon />
                      </span>
                      <span>
                        <b>{t.label}</b>
                        <small>{t.hint}</small>
                      </span>
                    </button>
                  );
                })}
              </nav>

              <form className="nm-card nm-reqform" onSubmit={submit} noValidate>
                <h2 className="nm-card__title">{meta.label}</h2>
                {/* Honeypot (spam protection): hidden from people. */}
                <input type="text" tabIndex={-1} autoComplete="off" className="nm-hp" value={f.website} onChange={(ev) => setF({ ...f, website: ev.target.value })} aria-hidden="true" />
                <label className="nm-field">
                  <span className="nm-field__label">
                    Subject <i>*</i>
                  </span>
                  <input className="nm-input" maxLength={200} value={f.subject} onChange={(ev) => setF({ ...f, subject: ev.target.value })} required />
                </label>
                <label className="nm-field">
                  <span className="nm-field__label">
                    Description <i>*</i>
                  </span>
                  <textarea className="nm-input" rows={5} maxLength={8000} value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} required />
                </label>
                {!f.anonymous && (
                  <div className="nm-form-row">
                    <label className="nm-field">
                      <span className="nm-field__label">
                        Your name <i>*</i>
                      </span>
                      <input className="nm-input" maxLength={120} value={f.contactName} onChange={(ev) => setF({ ...f, contactName: ev.target.value })} autoComplete="name" />
                    </label>
                    <label className="nm-field">
                      <span className="nm-field__label">
                        Email <i>*</i>
                      </span>
                      <input className="nm-input" type="email" maxLength={200} value={f.email} onChange={(ev) => setF({ ...f, email: ev.target.value })} autoComplete="email" />
                    </label>
                    <label className="nm-field">
                      <span className="nm-field__label">Phone (optional)</span>
                      <input className="nm-input" type="tel" maxLength={40} value={f.phone} onChange={(ev) => setF({ ...f, phone: ev.target.value })} autoComplete="tel" />
                    </label>
                  </div>
                )}
                <label className="nm-field">
                  <span className="nm-field__label">Location</span>
                  <span className="nm-iconinput">
                    <MapPin />
                    <input className="nm-input" maxLength={200} value={f.location} onChange={(ev) => setF({ ...f, location: ev.target.value })} placeholder="City, neighborhood…" />
                  </span>
                </label>
                <div className="nm-field">
                  <span className="nm-field__label">Attachments (optional)</span>
                  <div className="nm-attach">
                    {files.map((x) => (
                      <span key={x.url} className="nm-attach__item">
                        {x.image ? <img src={x.url} alt="" /> : <span className="nm-attach__file">{x.name}</span>}
                        <button type="button" aria-label={`Remove ${x.name}`} onClick={() => setFiles((list) => list.filter((y) => y.url !== x.url))}>
                          <X />
                        </button>
                      </span>
                    ))}
                    {files.length < MAX_FILES && (
                      <button type="button" className="nm-attach__add" onClick={() => (signedIn() ? fileInput.current?.click() : window.location.assign(loginPath()))} disabled={uploading}>
                        {uploading ? <Loader2 className="nm-spin" /> : <ImagePlus />} Add Files
                      </button>
                    )}
                    <input ref={fileInput} type="file" hidden multiple accept="image/*,video/*,audio/*" onChange={(ev) => addFiles(ev.target.files)} />
                  </div>
                  <small>Photos, video or audio. {signedIn() ? "" : "Sign in to attach files."}</small>
                </div>
                <label className="nm-check">
                  <input type="checkbox" checked={f.confidential || f.anonymous} disabled={f.anonymous} onChange={(ev) => setF({ ...f, confidential: ev.target.checked })} /> Keep my identity confidential (optional)
                  <span className="nm-tip" title="Only authorized newsroom staff can see confidential submissions. Confidentiality cannot be guaranteed in every situation.">
                    <Info />
                  </span>
                </label>
                {CONFIDENTIAL.has(type) && (
                  <label className="nm-check">
                    <input type="checkbox" checked={f.anonymous} onChange={(ev) => setF({ ...f, anonymous: ev.target.checked })} /> Submit anonymously (no name or account attached)
                  </label>
                )}
                {(f.confidential || f.anonymous) && (
                  <p className="nm-note nm-note--amber">
                    <Info /> Access is limited to authorized newsroom staff. We cannot promise absolute anonymity — details you share may identify you.
                  </p>
                )}
                {formError && (
                  <p className="nm-form-error" role="alert">
                    {formError}
                  </p>
                )}
                <div className="nm-form-actions">
                  <Link to={`/news/${p.slug}`} className="nm-btn nm-btn--ghost nm-btn--lg">
                    Cancel
                  </Link>
                  <button type="submit" className="nm-btn nm-btn--primary nm-btn--lg" disabled={busy || uploading || !p.requestsEnabled}>
                    {busy ? <Loader2 className="nm-spin" /> : <Send />} Submit Request
                  </button>
                </div>
                <p className="nm-muted nm-small">
                  Already sent a request? <Link to="/news/requests/track">Track it here</Link>.
                </p>
              </form>
            </div>
          )}
        </div>
      )}
    </NewsShell>
  );
}
