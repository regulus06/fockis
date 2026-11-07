import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Progress } from "../../../components/academy/market/Shared";
import { useAcademySession } from "../../../lib/academySession";
import { mediaUrl, uploadStudioFile } from "../../../lib/studioApi";
import { INSTITUTION_TYPE_LABEL, schoolsApi, type InstitutionDetails, type InstitutionType } from "../../../lib/institutionsApi";
import { SignInGate } from "../AcademyPortal";

const toSlug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);

export const EMPTY_SCHOOL: InstitutionDetails = { name: "", slug: "", type: "school", allowApplications: true };

/** The school details form, used to register and to edit. */
export function SchoolForm({
  value,
  onChange,
  lockSlug = false,
}: {
  value: InstitutionDetails;
  onChange: (v: InstitutionDetails) => void;
  lockSlug?: boolean;
}) {
  const v = value;
  const set = (p: Partial<InstitutionDetails>) => onChange({ ...v, ...p });
  const [slugTouched, setSlugTouched] = useState(!!v.slug);
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [up, setUp] = useState<{ kind: "logo" | "proof"; pct: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (lockSlug || !v.slug || v.slug.length < 3) return setCheck(null);
    const t = window.setTimeout(() => {
      schoolsApi
        .checkDomain(v.slug)
        .then((r) => setCheck({ ok: r.available, text: r.available ? `${r.domain} is available` : r.reason || "Not available" }))
        .catch(() => setCheck(null));
    }, 350);
    return () => window.clearTimeout(t);
  }, [v.slug, lockSlug]);

  async function upload(kind: "logo" | "proof", file?: File) {
    if (!file) return;
    setErr(null);
    setUp({ kind, pct: 0 });
    try {
      const r = await uploadStudioFile(file, kind === "logo" ? "image" : "pdf", (pct) => setUp({ kind, pct }));
      if (kind === "logo") set({ logoUrl: r.url });
      else set({ proofStorageKey: r.storageKey, proofFileName: r.fileName });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUp(null);
    }
  }

  return (
    <div className="fa-fields">
      <div className="fa-row2">
        <label className="fa-field">
          <span>
            Name of the school or organization<i>*</i>
          </span>
          <input
            value={v.name}
            maxLength={160}
            placeholder="e.g. Bell Bakery Academy"
            onChange={(e) => set({ name: e.target.value, ...(!slugTouched && !lockSlug ? { slug: toSlug(e.target.value) } : {}) })}
          />
        </label>
        <label className="fa-field">
          <span>Type</span>
          <select value={v.type} onChange={(e) => set({ type: e.target.value as InstitutionType })}>
            {(Object.keys(INSTITUTION_TYPE_LABEL) as InstitutionType[]).map((t) => (
              <option key={t} value={t}>
                {INSTITUTION_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="fa-field">
        <span>
          Fockis domain<i>*</i>
        </span>
        <div className={`fa-domain ${lockSlug ? "is-locked" : ""}`}>
          <input
            value={v.slug}
            disabled={lockSlug}
            maxLength={30}
            placeholder="bellbakery"
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
            }}
            aria-label="Domain name"
          />
          <span>.fockis.com</span>
        </div>
        <small className={check ? (check.ok ? "fa-st-ok" : "fa-error") : "fa-muted"}>
          {lockSlug
            ? "The domain can't change once the school is approved — student logins use it."
            : check?.text ?? `Student logins will look like amara.j@${v.slug || "yourschool"}.fockis.com`}
        </small>
      </div>

      <label className="fa-field">
        <span>About</span>
        <textarea rows={4} maxLength={4000} value={v.description ?? ""} placeholder="What you teach, who your students are" onChange={(e) => set({ description: e.target.value })} />
      </label>

      <div className="fa-row3">
        <label className="fa-field">
          <span>Country</span>
          <input value={v.country ?? ""} maxLength={80} onChange={(e) => set({ country: e.target.value })} />
        </label>
        <label className="fa-field">
          <span>City</span>
          <input value={v.city ?? ""} maxLength={80} onChange={(e) => set({ city: e.target.value })} />
        </label>
        <label className="fa-field">
          <span>Phone</span>
          <input value={v.phone ?? ""} maxLength={40} onChange={(e) => set({ phone: e.target.value })} />
        </label>
      </div>
      <label className="fa-field">
        <span>Address</span>
        <input value={v.address ?? ""} maxLength={300} onChange={(e) => set({ address: e.target.value })} />
      </label>
      <div className="fa-row3">
        <label className="fa-field">
          <span>Website</span>
          <input value={v.website ?? ""} maxLength={300} placeholder="https://" onChange={(e) => set({ website: e.target.value })} />
        </label>
        <label className="fa-field">
          <span>Contact email</span>
          <input type="email" value={v.contactEmail ?? ""} onChange={(e) => set({ contactEmail: e.target.value })} />
        </label>
        <label className="fa-field">
          <span>Registration / license number</span>
          <input value={v.registrationNumber ?? ""} maxLength={120} onChange={(e) => set({ registrationNumber: e.target.value })} />
        </label>
      </div>

      <div className="fa-row2">
        <div className="fa-field">
          <span>Logo</span>
          <div className="fa-sch-upload">
            <span className="fa-sch-logo">{v.logoUrl ? <img src={mediaUrl(v.logoUrl)} alt="" /> : <Icon name="building" size={22} />}</span>
            <label className="fa-btn fa-btn--outline fa-btn--sm">
              <Icon name="upload" size={13} /> {v.logoUrl ? "Replace" : "Upload logo"}
              <input type="file" hidden accept="image/*" onChange={(e) => upload("logo", e.target.files?.[0])} />
            </label>
          </div>
          {up?.kind === "logo" && <Progress value={up.pct} />}
        </div>
        <div className="fa-field">
          <span>Proof document (PDF)</span>
          <div className="fa-sch-upload">
            <span className="fa-sch-logo">
              <Icon name="file" size={20} />
            </span>
            {v.proofFileName ? <small className="fa-sch-file">{v.proofFileName}</small> : <small className="fa-muted">License, registration or accreditation — only Fockis reviewers see it.</small>}
            <label className="fa-btn fa-btn--outline fa-btn--sm">
              <Icon name="upload" size={13} /> {v.proofFileName ? "Replace" : "Upload PDF"}
              <input type="file" hidden accept="application/pdf" onChange={(e) => upload("proof", e.target.files?.[0])} />
            </label>
          </div>
          {up?.kind === "proof" && <Progress value={up.pct} />}
        </div>
      </div>

      <label className="fa-check">
        <input type="checkbox" checked={v.allowApplications !== false} onChange={(e) => set({ allowApplications: e.target.checked })} /> Let students apply online from your school page
      </label>
      {err && <p className="fa-error">{err}</p>}
    </div>
  );
}

/** /academy/schools/register — a school, university or business asks to join Fockis Academy. */
export default function RegisterSchool() {
  const session = useAcademySession();
  const navigate = useNavigate();
  const [v, setV] = useState<InstitutionDetails>(EMPTY_SCHOOL);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="Register your school" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (v.name.trim().length < 3) return setErr("Enter the name of your school.");
    if (v.slug.length < 3) return setErr("Choose your Fockis domain.");
    setBusy(true);
    setErr(null);
    try {
      const inst = await schoolsApi.register(v);
      navigate(`/academy/school/${inst._id}`, { replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send the registration.");
      setBusy(false);
    }
  }

  return (
    <div className="fa-root fa-page fa-page--soft">
      <div className="fa-container fa-narrow">
        <div className="fa-sch-reghead">
          <Link to="/academy/schools" className="fa-link">
            <Icon name="left" size={13} /> Schools on Fockis
          </Link>
          <h1>Register your school</h1>
          <p className="fa-muted">
            Schools, universities, training centers and businesses get a verified page, their own <b>.fockis.com</b> domain and Fockis logins for
            their students. Fockis Academy reviews every registration before it goes live.
          </p>
          <ol className="fa-sch-steps">
            <li>
              <b>1</b> Send your details
            </li>
            <li>
              <b>2</b> Fockis reviews &amp; approves
            </li>
            <li>
              <b>3</b> Add students &amp; publish classes
            </li>
          </ol>
        </div>
        <form className="fa-card fa-pad" onSubmit={submit}>
          <SchoolForm value={v} onChange={setV} />
          {err && <p className="fa-error">{err}</p>}
          <div className="fa-st-new__foot">
            <Link className="fa-btn fa-btn--outline" to="/academy/school">
              Cancel
            </Link>
            <button className="fa-btn fa-btn--primary" disabled={busy}>
              {busy ? "Sending…" : "Send for review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
