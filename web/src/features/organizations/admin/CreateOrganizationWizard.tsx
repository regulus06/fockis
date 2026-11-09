/**
 * CreateOrganizationWizard.tsx
 * -----------------------------------------------------------------------------
 * /organizations/new — "Create an Organization", from the reference design.
 *
 *   Step 1  Details    name, category, searchable type, description, Fockis
 *                      domain with live availability (backend check)
 *   Step 2  Branding   logo and cover (upload or link), tagline, mission,
 *                      vision, website, contact e-mail and phone
 *   Step 3  Locations  optional: main location + any number of branches
 *   Step 4  Settings   who can join, discoverability, the tools this kind of
 *                      organization gets, review and create
 *
 * Creation: POST /organizations (the backend validates everything again and
 * its unique index guarantees the domain), then logo and cover uploads and
 * settings. Education is not offered: schools use Fockis Academy.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  CircleX,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import {
  FOCKIS_DOMAIN_SUFFIX_OPTIONS,
  createOrganization,
  updateOrganizationSettings,
  uploadOrganizationCover,
} from "../api/organizationsApi";
import { ChurchAuthError, getAuthToken } from "../api/organizationApi";
import { checkDomainAvailability, uploadOrganizationLogo } from "../api/dashboardApi";
import type { CreateOrganizationInput, OrganizationType } from "../types/organization.types";
import OrgAppShell from "../ui/OrgAppShell";
import { PLATFORM_CATEGORIES, modulesFor, termsFor, typesForCategory, type PlatformCategory } from "../ui/orgTerminology";
import { typeLabel } from "../ui/orgCategories";
import { Alert, EmptyState, errorMessage } from "../ui/orgUi";
import "../styles/CreateOrganizationWizard.scss";

type Step = 0 | 1 | 2 | 3;
const STEPS = ["Details", "Branding", "Locations", "Settings"] as const;
const SUFFIXES = FOCKIS_DOMAIN_SUFFIX_OPTIONS.filter((s) => s !== ".fockis.edu");
const PREFIX_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_LOGO = 5 * 1024 * 1024;
const MAX_COVER = 100 * 1024 * 1024;

interface LocationDraft {
  key: string;
  name: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

const newLocation = (name = ""): LocationDraft => ({
  key: Math.random().toString(36).slice(2),
  name,
  line1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  phone: "",
});

function suggestPrefix(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
}

function isHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DomainState = { status: "idle" | "checking" | "available" | "taken" | "invalid" | "error"; message?: string };

export default function CreateOrganizationWizard(): React.JSX.Element {
  const navigate = useNavigate();
  const signedIn = Boolean(getAuthToken());

  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* step 1 */
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlatformCategory | "">("");
  const [type, setType] = useState<OrganizationType | "">("");
  const [typeQuery, setTypeQuery] = useState("");
  const [description, setDescription] = useState("");
  const [prefix, setPrefix] = useState("");
  const [prefixTouched, setPrefixTouched] = useState(false);
  const [suffix, setSuffix] = useState<string>(".fockis.com");
  const [domainState, setDomainState] = useState<DomainState>({ status: "idle" });

  /* step 2 */
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  /* step 3 */
  const [hasLocations, setHasLocations] = useState(true);
  const [locations, setLocations] = useState<LocationDraft[]>([newLocation("Main location")]);
  const [mainKey, setMainKey] = useState<string>(() => "");

  /* step 4 */
  const [requireApproval, setRequireApproval] = useState(true);
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const logoInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!mainKey && locations[0]) setMainKey(locations[0].key);
  }, [locations, mainKey]);

  /* --------------------------------------------------------- derived */

  const types = useMemo(() => (category ? typesForCategory(category) : []), [category]);
  const filteredTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    return q ? types.filter((t) => t.label.toLowerCase().includes(q)) : types;
  }, [types, typeQuery]);
  const terms = termsFor(type || null);
  const modules = modulesFor(type || null);
  const categoryInfo = PLATFORM_CATEGORIES.find((c) => c.id === category);
  const CategoryIcon = categoryInfo?.icon ?? Building2;

  const normalizedPrefix = prefix.trim().toLowerCase();
  const domain = normalizedPrefix ? `${normalizedPrefix}${suffix}` : "";

  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : logoUrl.trim() || null), [logoFile, logoUrl]);
  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : coverUrl.trim() || null), [coverFile, coverUrl]);
  useEffect(() => () => void (logoFile && logoPreview && URL.revokeObjectURL(logoPreview)), [logoFile, logoPreview]);
  useEffect(() => () => void (coverFile && coverPreview && URL.revokeObjectURL(coverPreview)), [coverFile, coverPreview]);

  /* ---------------------------------------------- suggest the domain */

  useEffect(() => {
    if (!prefixTouched) setPrefix(suggestPrefix(name));
  }, [name, prefixTouched]);

  /* ------------------------------------------- live domain availability */

  useEffect(() => {
    if (!normalizedPrefix) {
      setDomainState({ status: "idle" });
      return;
    }
    if (normalizedPrefix.length < 2 || !PREFIX_PATTERN.test(normalizedPrefix)) {
      setDomainState({
        status: "invalid",
        message: "Use 2–63 lowercase letters, numbers or hyphens (not at the start or end).",
      });
      return;
    }
    const controller = new AbortController();
    setDomainState({ status: "checking" });
    const timer = window.setTimeout(() => {
      checkDomainAvailability(`${normalizedPrefix}${suffix}`, controller.signal)
        .then((r) => {
          if (controller.signal.aborted) return;
          if (r.valid === false) setDomainState({ status: "invalid", message: r.message ?? "This domain is not valid." });
          else setDomainState(r.available ? { status: "available" } : { status: "taken", message: "This domain is already taken." });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setDomainState({ status: "error", message: errorMessage(err, "Availability could not be checked. It will be checked again when you create.") });
        });
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedPrefix, suffix]);

  /* --------------------------------------------------------- validate */

  function validate(s: Step): string | null {
    if (s === 0) {
      if (!name.trim()) return "Enter the organization name.";
      if (name.trim().length < 2) return "The organization name is too short.";
      if (!category) return "Choose an organization category.";
      if (!type) return "Choose an organization type.";
      if (!normalizedPrefix) return "Choose your Fockis domain.";
      if (domainState.status === "invalid") return domainState.message ?? "This domain is not valid.";
      if (domainState.status === "taken") return "That Fockis domain is already taken. Try another one.";
      if (domainState.status === "checking") return "Still checking the domain — one moment.";
    }
    if (s === 1) {
      if (logoUrl.trim() && !isHttpUrl(logoUrl)) return "The logo link is not a valid web address.";
      if (coverUrl.trim() && !isHttpUrl(coverUrl)) return "The cover link is not a valid web address.";
      if (website.trim() && !isHttpUrl(website)) return "The website is not a valid web address.";
      if (email.trim() && !EMAIL.test(email.trim())) return "The contact e-mail is not valid.";
      if (tagline.length > 160) return "Keep the tagline under 160 characters.";
    }
    if (s === 2 && hasLocations) {
      const filled = locations.filter((l) => l.name.trim() || l.line1.trim() || l.city.trim() || l.country.trim());
      if (filled.length === 0) return "Add your main location, or choose “No physical location”.";
      for (const l of filled) {
        if (!l.name.trim()) return "Give every location a name.";
        if (!l.line1.trim() || !l.city.trim() || !l.country.trim()) return `Add the street, city and country for “${l.name || "this location"}”.`;
      }
    }
    if (s === 3 && !confirmed) return "Please confirm the information is correct.";
    return null;
  }

  function next() {
    const problem = validate(step);
    setError(problem);
    if (problem) return;
    setStep((s) => Math.min(3, s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1) as Step);
  }

  /* ------------------------------------------------------------ files */

  function pickFile(e: ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (kind === "logo") {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return setError("The logo must be a PNG, JPG, WebP or GIF image.");
      if (file.size > MAX_LOGO) return setError("The logo must be 5 MB or smaller.");
      setLogoFile(file);
      setLogoUrl("");
    } else {
      if (!/^(image|video)\//.test(file.type)) return setError("The cover must be a picture or a video.");
      if (file.size > MAX_COVER) return setError("The cover must be 100 MB or smaller.");
      setCoverFile(file);
      setCoverUrl("");
    }
    setError(null);
  }

  /* ----------------------------------------------------------- submit */

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 3) return next();
    for (const s of [0, 1, 2, 3] as Step[]) {
      const problem = validate(s);
      if (problem) {
        setStep(s);
        setError(problem);
        return;
      }
    }
    if (!type) return;

    const branchDrafts = hasLocations
      ? locations.filter((l) => l.name.trim() || l.line1.trim() || l.city.trim() || l.country.trim())
      : [];
    const mainExists = branchDrafts.some((l) => l.key === mainKey);
    // Matches CreateOrganizationBranchDto on the server (phone is a top-level field).
    const branches = branchDrafts.map((l, i) => ({
      name: l.name.trim(),
      isMainLocation: mainExists ? l.key === mainKey : i === 0,
      address: {
        line1: l.line1.trim(),
        city: l.city.trim(),
        state: l.state.trim() || undefined,
        postalCode: l.postalCode.trim() || undefined,
        country: l.country.trim(),
      },
      ...(l.phone.trim() ? { phone: l.phone.trim() } : {}),
    }));

    const payload: Omit<CreateOrganizationInput, "branches"> & { bannerUrl?: string; branches?: typeof branches } = {
      name: name.trim(),
      organizationType: type,
      domain,
      description: description.trim() || undefined,
      tagline: tagline.trim() || undefined,
      mission: mission.trim() || undefined,
      vision: vision.trim() || undefined,
      website: website.trim() || undefined,
      logoUrl: !logoFile && logoUrl.trim() ? logoUrl.trim() : undefined,
      bannerUrl: !coverFile && coverUrl.trim() ? coverUrl.trim() : undefined,
      contact: { email: email.trim() || undefined, phone: phone.trim() || undefined },
      branches: branches.length ? branches : undefined,
    };

    setSaving(true);
    setError(null);
    try {
      const created = (await createOrganization(payload as unknown as CreateOrganizationInput)) as unknown as { id?: string; _id?: string; organization?: { id?: string } };
      const id = String(created?.id ?? created?._id ?? created?.organization?.id ?? "");
      if (!id) throw new Error("The organization was created, but the server did not return its ID.");

      const notes: string[] = [];
      const follow: Promise<unknown>[] = [];
      if (logoFile) follow.push(uploadOrganizationLogo(id, logoFile).catch(() => notes.push("the logo")));
      if (coverFile) follow.push(uploadOrganizationCover(id, coverFile).catch(() => notes.push("the cover")));
      if (!requireApproval || !isDiscoverable) {
        follow.push(updateOrganizationSettings(id, { requireApproval, isDiscoverable }).catch(() => notes.push("the settings")));
      }
      await Promise.all(follow);

      navigate(`/organizations/${encodeURIComponent(id)}/admin`, {
        replace: true,
        state: notes.length
          ? { notice: `Your organization was created, but ${notes.join(" and ")} could not be saved. You can try again from Settings.` }
          : { notice: `${name.trim()} is ready at ${domain}.` },
      });
    } catch (err) {
      if (err instanceof ChurchAuthError) setError("Your session has ended. Sign in again to create the organization.");
      else {
        const msg = errorMessage(err, "The organization could not be created.");
        setError(msg);
        if (/domain/i.test(msg)) {
          setStep(0);
          setDomainState({ status: "taken", message: msg });
        }
      }
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------------------------------------------- render */

  if (!signedIn) {
    return (
      <OrgAppShell variant="platform">
        <div className="fo-card">
          <EmptyState icon={Building2} title="Sign in to create an organization" text="You become its owner with your Fockis account.">
            <Link to={"/login?returnTo=" + encodeURIComponent("/organizations/new")} className="fo-btn fo-btn--primary">
              Sign in
            </Link>
            <Link to="/organizations" className="fo-btn fo-btn--secondary">
              Back to Organizations
            </Link>
          </EmptyState>
        </div>
      </OrgAppShell>
    );
  }

  const setLocation = (key: string, patch: Partial<LocationDraft>) =>
    setLocations((list) => list.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <OrgAppShell variant="platform">
      <div className="fow">
        <ol className="fo-stepper" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? "is-active" : i < step ? "is-done" : ""} aria-current={i === step ? "step" : undefined}>
              <span className="fo-stepper__dot">{i < step ? <Check aria-hidden="true" /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        <header className="fow__head">
          <h1>Create an Organization</h1>
          <p>Build your professional space for your church, business, nonprofit, community, or association.</p>
        </header>

        <form className="fo-card fow__card" onSubmit={submit} noValidate>
          {error && <Alert>{error}</Alert>}

          {/* ======================================================= 1 */}
          {step === 0 && (
            <section aria-labelledby="fow-s1">
              <div className="fow__section-head">
                <h2 id="fow-s1">Organization Details</h2>
                <span className="fow__badge" aria-hidden="true">
                  <CategoryIcon />
                </span>
              </div>

              <label className="fo-field">
                <span>
                  Organization name <span className="fo-field__req">*</span>
                </span>
                <input className="fo-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} placeholder="Springfield Community Church" autoFocus />
              </label>

              <div className="fo-grid-2 fow__gap">
                <label className="fo-field">
                  <span>
                    Organization category <span className="fo-field__req">*</span>
                  </span>
                  <select
                    className="fo-select"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as PlatformCategory);
                      setType("");
                      setTypeQuery("");
                    }}
                  >
                    <option value="">Choose a category</option>
                    {PLATFORM_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {categoryInfo && <small>{categoryInfo.description}</small>}
                </label>

                <label className="fo-field">
                  <span>
                    Organization type <span className="fo-field__req">*</span>
                  </span>
                  <select className="fo-select" value={type} onChange={(e) => setType(e.target.value as OrganizationType)} disabled={!category}>
                    <option value="">{category ? "Choose a type" : "Choose a category first"}</option>
                    {filteredTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                    {type && !filteredTypes.some((t) => t.value === type) && <option value={type}>{typeLabel(type)}</option>}
                  </select>
                </label>
              </div>

              {category && types.length > 6 && (
                <label className="fo-field fow__gap">
                  <span>Search organization types</span>
                  <span className="fo-search">
                    <Search aria-hidden="true" />
                    <input className="fo-input" type="search" value={typeQuery} onChange={(e) => setTypeQuery(e.target.value)} placeholder="e.g. foundation, league, ministry" />
                  </span>
                  <small>
                    {filteredTypes.length} of {types.length} types
                  </small>
                </label>
              )}

              <label className="fo-field fow__gap">
                <span>Organization description</span>
                <textarea className="fo-textarea" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="What does your organization do, and who is it for?" />
              </label>

              <fieldset className="fow__domain">
                <legend>
                  Create your Fockis domain <span className="fo-field__req">*</span>
                </legend>
                <div className="fow__domain-row">
                  <input
                    className="fo-input"
                    value={prefix}
                    onChange={(e) => {
                      setPrefixTouched(true);
                      setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    maxLength={63}
                    aria-label="Domain name"
                    aria-invalid={domainState.status === "invalid" || domainState.status === "taken"}
                    placeholder="springfieldchurch"
                  />
                  <select className="fo-select fow__suffix" value={suffix} onChange={(e) => setSuffix(e.target.value)} aria-label="Domain ending">
                    {SUFFIXES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <span className={`fow__avail fow__avail--${domainState.status}`} role="status" aria-live="polite">
                    {domainState.status === "checking" && (
                      <>
                        <Loader2 className="fo-spin" aria-hidden="true" /> Checking…
                      </>
                    )}
                    {domainState.status === "available" && (
                      <>
                        <CircleCheck aria-hidden="true" /> Available
                      </>
                    )}
                    {(domainState.status === "taken" || domainState.status === "invalid") && (
                      <>
                        <CircleX aria-hidden="true" /> {domainState.status === "taken" ? "Taken" : "Invalid"}
                      </>
                    )}
                  </span>
                </div>
                <small className="fo-muted">
                  {domainState.message ?? (domain ? `Your address: ${domain} — it is permanent.` : "Your permanent Fockis address.")}
                </small>
              </fieldset>
            </section>
          )}

          {/* ======================================================= 2 */}
          {step === 1 && (
            <section aria-labelledby="fow-s2">
              <div className="fow__section-head">
                <h2 id="fow-s2">Branding</h2>
              </div>

              <div className="fow__brand">
                <div className="fow__logo">
                  <span className="fow__logo-box">{logoPreview ? <img src={logoPreview} alt="" /> : <CategoryIcon aria-hidden="true" />}</span>
                  <div className="fow__logo-actions">
                    <strong>Organization logo</strong>
                    <small className="fo-muted">Square PNG, JPG or WebP, up to 5 MB.</small>
                    <div className="fow__row">
                      <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" onClick={() => logoInput.current?.click()}>
                        <Upload aria-hidden="true" /> Upload logo
                      </button>
                      {(logoFile || logoUrl) && (
                        <button
                          type="button"
                          className="fo-btn fo-btn--ghost fo-btn--sm"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoUrl("");
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pickFile(e, "logo")} />
                    {!logoFile && <input className="fo-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="…or paste a logo link (https://)" />}
                  </div>
                </div>

                <div className="fow__cover" style={coverPreview && !coverFile?.type.startsWith("video/") ? { backgroundImage: `url("${coverPreview}")` } : undefined}>
                  {coverFile?.type.startsWith("video/") && coverPreview && <video src={coverPreview} muted autoPlay loop playsInline />}
                  {!coverPreview && (
                    <span className="fow__cover-empty">
                      <ImagePlus aria-hidden="true" /> Cover photo
                    </span>
                  )}
                  <div className="fow__cover-actions">
                    <button type="button" className="fo-btn fo-btn--light fo-btn--sm" onClick={() => coverInput.current?.click()}>
                      <Upload aria-hidden="true" /> {coverPreview ? "Change cover" : "Upload cover"}
                    </button>
                    {coverPreview && (
                      <button
                        type="button"
                        className="fo-btn fo-btn--light fo-btn--sm"
                        onClick={() => {
                          setCoverFile(null);
                          setCoverUrl("");
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input ref={coverInput} type="file" accept="image/*,video/*" hidden onChange={(e) => pickFile(e, "cover")} />
                </div>
              </div>
              {!coverFile && (
                <label className="fo-field fow__gap">
                  <span>Cover photo link (optional)</span>
                  <input className="fo-input" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
                </label>
              )}

              <label className="fo-field fow__gap">
                <span>Tagline</span>
                <input className="fo-input" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} placeholder="A Place to Worship, Grow, Serve and Belong" />
              </label>

              <div className="fo-grid-2 fow__gap">
                <label className="fo-field">
                  <span>Mission</span>
                  <textarea className="fo-textarea" value={mission} onChange={(e) => setMission(e.target.value)} maxLength={2000} />
                </label>
                <label className="fo-field">
                  <span>Vision</span>
                  <textarea className="fo-textarea" value={vision} onChange={(e) => setVision(e.target.value)} maxLength={2000} />
                </label>
              </div>

              <div className="fo-grid-3 fow__gap">
                <label className="fo-field">
                  <span>Website</span>
                  <input className="fo-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.example.org" inputMode="url" />
                </label>
                <label className="fo-field">
                  <span>Contact email</span>
                  <input className="fo-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@example.org" />
                </label>
                <label className="fo-field">
                  <span>Contact phone</span>
                  <input className="fo-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
                </label>
              </div>
            </section>
          )}

          {/* ======================================================= 3 */}
          {step === 2 && (
            <section aria-labelledby="fow-s3">
              <div className="fow__section-head">
                <h2 id="fow-s3">Locations &amp; Branches</h2>
              </div>

              <div className="fow__choice" role="radiogroup" aria-label="Locations">
                <label className={"fow__option" + (hasLocations ? " is-on" : "")}>
                  <input type="radio" checked={hasLocations} onChange={() => setHasLocations(true)} />
                  <MapPin aria-hidden="true" />
                  <span>
                    <strong>We have a physical location</strong>
                    <small>Add your main location and any branches.</small>
                  </span>
                </label>
                <label className={"fow__option" + (!hasLocations ? " is-on" : "")}>
                  <input type="radio" checked={!hasLocations} onChange={() => setHasLocations(false)} />
                  <Building2 aria-hidden="true" />
                  <span>
                    <strong>No physical location</strong>
                    <small>Online or mobile. You can add locations later.</small>
                  </span>
                </label>
              </div>

              {hasLocations && (
                <div className="fow__locations">
                  {locations.map((l, i) => (
                    <fieldset key={l.key} className="fow__location">
                      <legend>
                        {l.key === mainKey ? (
                          <span className="fo-badge">
                            <Star aria-hidden="true" size={13} /> Main location
                          </span>
                        ) : (
                          <span className="fo-badge fo-badge--muted">Branch {i + 1}</span>
                        )}
                      </legend>
                      <div className="fo-grid-2">
                        <label className="fo-field">
                          <span>Location name</span>
                          <input className="fo-input" value={l.name} onChange={(e) => setLocation(l.key, { name: e.target.value })} maxLength={150} placeholder={i === 0 ? "Main campus" : "Downtown branch"} />
                        </label>
                        <label className="fo-field">
                          <span>Street address</span>
                          <input className="fo-input" value={l.line1} onChange={(e) => setLocation(l.key, { line1: e.target.value })} maxLength={200} />
                        </label>
                      </div>
                      <div className="fo-grid-3 fow__gap">
                        <label className="fo-field">
                          <span>City</span>
                          <input className="fo-input" value={l.city} onChange={(e) => setLocation(l.key, { city: e.target.value })} maxLength={100} />
                        </label>
                        <label className="fo-field">
                          <span>State / region</span>
                          <input className="fo-input" value={l.state} onChange={(e) => setLocation(l.key, { state: e.target.value })} maxLength={100} />
                        </label>
                        <label className="fo-field">
                          <span>Postal code</span>
                          <input className="fo-input" value={l.postalCode} onChange={(e) => setLocation(l.key, { postalCode: e.target.value })} maxLength={30} />
                        </label>
                      </div>
                      <div className="fo-grid-2 fow__gap">
                        <label className="fo-field">
                          <span>Country</span>
                          <input className="fo-input" value={l.country} onChange={(e) => setLocation(l.key, { country: e.target.value })} maxLength={100} />
                        </label>
                        <label className="fo-field">
                          <span>Phone (optional)</span>
                          <input className="fo-input" type="tel" value={l.phone} onChange={(e) => setLocation(l.key, { phone: e.target.value })} maxLength={40} />
                        </label>
                      </div>
                      <div className="fow__row fow__gap">
                        {l.key !== mainKey && (
                          <button type="button" className="fo-btn fo-btn--ghost fo-btn--sm" onClick={() => setMainKey(l.key)}>
                            <Star aria-hidden="true" /> Make main location
                          </button>
                        )}
                        {locations.length > 1 && (
                          <button
                            type="button"
                            className="fo-btn fo-btn--danger fo-btn--sm"
                            onClick={() => {
                              setLocations((list) => list.filter((x) => x.key !== l.key));
                              if (l.key === mainKey) setMainKey("");
                            }}
                          >
                            <Trash2 aria-hidden="true" /> Remove
                          </button>
                        )}
                      </div>
                    </fieldset>
                  ))}
                  <button type="button" className="fo-btn fo-btn--secondary" onClick={() => setLocations((list) => [...list, newLocation()])}>
                    <Plus aria-hidden="true" /> Add another branch
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ======================================================= 4 */}
          {step === 3 && (
            <section aria-labelledby="fow-s4">
              <div className="fow__section-head">
                <h2 id="fow-s4">Settings &amp; Confirmation</h2>
              </div>

              <div className="fow__settings">
                <label className="fow__switch">
                  <input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} />
                  <span>
                    <strong>Approve new {terms.people.toLowerCase()}</strong>
                    <small>People who ask to join wait until an administrator approves them.</small>
                  </span>
                </label>
                <label className="fow__switch">
                  <input type="checkbox" checked={isDiscoverable} onChange={(e) => setIsDiscoverable(e.target.checked)} />
                  <span>
                    <strong>Show in Discover</strong>
                    <small>Your public page appears in Fockis Organizations search.</small>
                  </span>
                </label>
              </div>

              <div className="fow__review">
                <div className="fow__review-org">
                  <span className="fow__logo-box fow__logo-box--sm">{logoPreview ? <img src={logoPreview} alt="" /> : <CategoryIcon aria-hidden="true" />}</span>
                  <div>
                    <strong>{name || "Your organization"}</strong>
                    <span>
                      {categoryInfo?.label ?? ""} · {type ? typeLabel(type) : ""}
                    </span>
                    <span className="fow__domain-final">{domain}</span>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Contact</dt>
                    <dd>{[email, phone, website].filter((v) => v.trim()).join(" · ") || "Not added"}</dd>
                  </div>
                  <div>
                    <dt>Locations</dt>
                    <dd>
                      {hasLocations
                        ? `${locations.filter((l) => l.name.trim()).length} location${locations.filter((l) => l.name.trim()).length === 1 ? "" : "s"}`
                        : "No physical location"}
                    </dd>
                  </div>
                  <div>
                    <dt>People are called</dt>
                    <dd>
                      {terms.people} · {terms.departments} · {terms.groups}
                    </dd>
                  </div>
                </dl>
                {modules.length > 0 && (
                  <div className="fow__modules">
                    <strong>Tools for your kind of organization</strong>
                    <ul>
                      {modules.map((m) => (
                        <li key={m.id}>
                          <span className={"fo-badge" + (m.available ? " fo-badge--ok" : " fo-badge--muted")}>{m.available ? "Included" : "Coming soon"}</span>
                          <span>
                            <b>{m.label}</b> — {m.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <label className="fo-check fow__gap">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                I confirm this information is correct and I understand the Fockis domain is permanent.
              </label>
            </section>
          )}

          <div className="fow__actions">
            {step === 0 ? (
              <Link to="/organizations" className="fo-btn fo-btn--secondary">
                Cancel
              </Link>
            ) : (
              <button type="button" className="fo-btn fo-btn--secondary" onClick={back} disabled={saving}>
                <ArrowLeft aria-hidden="true" /> Back
              </button>
            )}
            {step < 3 ? (
              <button type="submit" className="fo-btn fo-btn--primary">
                Next: {STEPS[step + 1]} <ArrowRight aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" className="fo-btn fo-btn--primary" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="fo-spin" aria-hidden="true" /> Creating…
                  </>
                ) : (
                  <>
                    Create organization <Check aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </OrgAppShell>
  );
}
