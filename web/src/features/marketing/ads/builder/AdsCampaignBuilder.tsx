/* ============================================================================

   FOCKIS ADS — MULTISTEP CAMPAIGN BUILDER



   Goal → Creative → Placements → Audience → Budget → Review.



   Uses only existing endpoints:

     POST  /marketing/ads/upload           (media)

     POST  /marketing/campaigns            (create, always DRAFT on server)

     PATCH /marketing/campaigns/:id        (edit)

     POST  /marketing/campaigns/:id/submit (send to moderation)



   Nothing here activates a campaign. Activation happens only when a

   reviewer approves it on the server.

============================================================================ */



import {

  useEffect,

  useId,

  useMemo,

  useRef,

  useState,

  type KeyboardEvent,

  type ReactNode,

} from "react";

import { Link, useNavigate } from "react-router-dom";

import {

  AlertTriangle,

  ArrowLeft,

  ArrowRight,

  Check,

  Clapperboard,

  Image as ImageIcon,

  LayoutGrid,

  Loader2,

  Megaphone,

  Rocket,

  ShoppingBag,

  Sparkles,

  TrendingUp,

  Upload,

  X,

  type LucideIcon,

} from "lucide-react";



import { buildFockisUrl } from "../../../../config/fockisConfig";

import {

  createCampaign,

  submitCampaign,

  updateCampaign,

} from "../../services/campaignApi";

import { uploadAdMedia } from "../../services/marketingApi";

import type {

  CreateCampaignPayload,

  UpdateCampaignPayload,

} from "../../types/marketingTypes";



import { adsPaths, formatMoney } from "../adsModel";

import { adsErrorMessage } from "../useAdsData";

import { isVideoUrl } from "../AdsTiles";



import {

  CTA_LABELS,

  DESCRIPTION_MAX,

  HEADLINE_MAX,

  OBJECTIVES,

  PLACEMENTS,

  STEPS,

  addTag,

  toPayload,

  validateAll,

  validateStep,

  type AdFormat,

  type BuilderState,

  type CallToAction,

  type Errors,

  type Objective,

  type Placement,

} from "./builderModel";



import "./AdsCampaignBuilder.scss";



const OBJECTIVE_ICONS: Record<Objective, LucideIcon> = {

  BRAND_AWARENESS: Megaphone,

  ENGAGEMENT: Sparkles,

  WEBSITE_TRAFFIC: TrendingUp,

  PRODUCT_SALES: ShoppingBag,

  APP_INSTALL: Rocket,

};



const FORMAT_OPTIONS: { id: AdFormat; label: string; icon: LucideIcon; hint: string }[] = [

  { id: "IMAGE", label: "Image", icon: ImageIcon, hint: "JPG, PNG or WebP" },

  { id: "VIDEO", label: "Video", icon: Clapperboard, hint: "MP4, WebM or MOV" },

  { id: "CAROUSEL", label: "Carousel", icon: LayoutGrid, hint: "Cover image shown first" },

];



interface Props {

  mode: "create" | "edit";

  initial: BuilderState;

  campaignId?: string;

  /* Edit mode: only DRAFT/REJECTED campaigns can be submitted. */

  canSubmit?: boolean;

}



/* ============================================================================

   SMALL FIELD HELPERS

============================================================================ */



function Field({

  label,

  hint,

  error,

  children,

  htmlFor,

  counter,

}: {

  label: string;

  hint?: string;

  error?: string;

  children: ReactNode;

  htmlFor: string;

  counter?: string;

}) {

  return (

    <div className={`fk-ab-field${error ? " has-error" : ""}`}>

      <div className="fk-ab-field__top">

        <label htmlFor={htmlFor}>{label}</label>

        {counter && <span className="fk-ab-field__counter">{counter}</span>}

      </div>

      {children}

      {error ? (

        <p className="fk-ab-field__error" id={`${htmlFor}-error`} role="alert">

          {error}

        </p>

      ) : hint ? (

        <p className="fk-ab-field__hint" id={`${htmlFor}-hint`}>

          {hint}

        </p>

      ) : null}

    </div>

  );

}



function describedBy(id: string, error?: string, hint?: string) {

  if (error) return `${id}-error`;

  if (hint) return `${id}-hint`;



  return undefined;

}



function TagInput({

  id,

  values,

  onChange,

  placeholder,

}: {

  id: string;

  values: string[];

  onChange: (next: string[]) => void;

  placeholder: string;

}) {

  const [draft, setDraft] = useState("");



  function commit() {

    if (draft.trim()) {

      onChange(addTag(values, draft));

      setDraft("");

    }

  }



  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {

    if (event.key === "Enter" || event.key === ",") {

      event.preventDefault();

      commit();

    } else if (event.key === "Backspace" && !draft && values.length) {

      onChange(values.slice(0, -1));

    }

  }



  return (

    <div className="fk-ab-tags">

      {values.map((value) => (

        <span key={value} className="fk-ab-tag">

          {value}

          <button type="button" onClick={() => onChange(values.filter((v) => v !== value))} aria-label={`Remove ${value}`}>

            <X size={12} aria-hidden="true" />

          </button>

        </span>

      ))}

      <input

        id={id}

        value={draft}

        onChange={(event) => setDraft(event.target.value)}

        onKeyDown={onKeyDown}

        onBlur={commit}

        placeholder={values.length ? "" : placeholder}

      />

    </div>

  );

}



/* ============================================================================

   MEDIA UPLOADER

============================================================================ */



function MediaUploader({

  label,

  accept,

  value,

  onChange,

  error,

  kind,

}: {

  label: string;

  accept: string;

  value: string;

  onChange: (url: string) => void;

  error?: string;

  kind: "image" | "video" | "any";

}) {

  const inputId = useId();

  const [uploading, setUploading] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const [dragging, setDragging] = useState(false);

  const [showUrl, setShowUrl] = useState(false);



  useEffect(() => {

    return () => {

      if (localPreview) URL.revokeObjectURL(localPreview);

    };

  }, [localPreview]);



  async function handleFile(file: File | undefined) {

    if (!file) return;



    if (kind === "image" && !file.type.startsWith("image/")) {

      setUploadError("Choose an image file (JPG, PNG or WebP).");

      return;

    }



    if (kind === "video" && !file.type.startsWith("video/")) {

      setUploadError("Choose a video file (MP4, WebM or MOV).");

      return;

    }



    setUploadError(null);

    setUploading(true);

    setLocalPreview(URL.createObjectURL(file));



    try {

      const result = await uploadAdMedia(file);

      const url = result.mediaUrl || result.url || result.fileUrl;



      if (!url) throw new Error("The upload finished without a file link.");



      onChange(url);

    } catch (err) {

      setUploadError(adsErrorMessage(err, "Upload failed."));

      setLocalPreview(null);

    } finally {

      setUploading(false);

    }

  }



  const shown = localPreview ?? (value ? buildFockisUrl(value) : "");

  const showVideo = kind === "video" || (shown && isVideoUrl(shown));



  return (

    <div className={`fk-ab-upload${error || uploadError ? " has-error" : ""}`}>

      <span className="fk-ab-upload__label">{label}</span>



      <label

        htmlFor={inputId}

        className={`fk-ab-drop${dragging ? " is-dragging" : ""}${shown ? " has-media" : ""}`}

        onDragOver={(event) => {

          event.preventDefault();

          setDragging(true);

        }}

        onDragLeave={() => setDragging(false)}

        onDrop={(event) => {

          event.preventDefault();

          setDragging(false);

          void handleFile(event.dataTransfer.files?.[0]);

        }}

      >

        {shown ? (

          showVideo ? (

            <video src={shown} muted playsInline controls={!uploading} preload="metadata" />

          ) : (

            <img src={shown} alt="" />

          )

        ) : (

          <span className="fk-ab-drop__empty">

            <Upload size={22} aria-hidden="true" />

            <strong>Drop a file or browse</strong>

            <small>{accept.split(",").map((item) => item.split("/").pop() ?? item).join(", ").toUpperCase()} · up to 50 MB</small>

          </span>

        )}



        {uploading && (

          <span className="fk-ab-drop__busy" role="status">

            <Loader2 size={20} aria-hidden="true" className="fk-ab-spin" /> Uploading…

          </span>

        )}

      </label>



      <input

        id={inputId}

        type="file"

        accept={accept}

        className="fk-ab-sr"

        onChange={(event) => {

          void handleFile(event.target.files?.[0]);

          event.target.value = "";

        }}

      />



      <div className="fk-ab-upload__row">

        {shown && !uploading && (

          <label htmlFor={inputId} className="fk-ab-textbtn">

            Replace

          </label>

        )}

        {value && !uploading && (

          <button

            type="button"

            className="fk-ab-textbtn"

            onClick={() => {

              onChange("");

              setLocalPreview(null);

            }}

          >

            Remove

          </button>

        )}

        <button type="button" className="fk-ab-textbtn" onClick={() => setShowUrl((v) => !v)} aria-expanded={showUrl}>

          {showUrl ? "Hide link field" : "Use a link instead"}

        </button>

      </div>



      {showUrl && (

        <input

          className="fk-ab-input"

          type="url"

          inputMode="url"

          placeholder="https\://"

          value={value}

          onChange={(event) => {

            setLocalPreview(null);

            onChange(event.target.value);

          }}

          aria-label={`${label} link`}

        />

      )}



      {(uploadError || error) && (

        <p className="fk-ab-field__error" role="alert">

          {uploadError || error}

        </p>

      )}

    </div>

  );

}



/* ============================================================================

   PREVIEW

============================================================================ */



function AdPreview({ state }: { state: BuilderState }) {

  const vertical = state.placements.includes("WAVES") || state.placements.includes("STORY");

  const src = state.mediaUrl ? buildFockisUrl(state.mediaUrl) : "";

  const poster = state.thumbnailUrl ? buildFockisUrl(state.thumbnailUrl) : undefined;

  const cta = state.callToAction

    ? CTA_LABELS[state.callToAction]

    : OBJECTIVES.find((o) => o.id === state.objective)

      ? CTA_LABELS[OBJECTIVES.find((o) => o.id === state.objective)!.cta]

      : "Learn more";



  return (

    <figure className={`fk-ab-preview${vertical ? " is-vertical" : ""}`} aria-label="Ad preview">

      <div className="fk-ab-preview__head">

        <span className="fk-ab-preview__avatar" aria-hidden="true">

          {(state.appName || state.name || "A").trim().charAt(0).toUpperCase()}

        </span>

        <span className="fk-ab-preview__who">

          <strong>{state.appName || state.name || "Your business"}</strong>

          <small>Sponsored</small>

        </span>

      </div>

      <div className="fk-ab-preview__media">

        {src ? (

          state.adFormat === "VIDEO" || isVideoUrl(src) ? (

            <video src={src} poster={poster} muted playsInline loop autoPlay preload="metadata" />

          ) : (

            <img src={src} alt="" />

          )

        ) : (

          <span className="fk-ab-preview__placeholder">

            {state.adFormat === "VIDEO" ? <Clapperboard size={28} aria-hidden="true" /> : <ImageIcon size={28} aria-hidden="true" />}

            Your {state.adFormat === "VIDEO" ? "video" : "image"} appears here

          </span>

        )}

      </div>

      <figcaption className="fk-ab-preview__body">

        <strong>{state.headline || "Your headline"}</strong>

        {state.description && <p>{state.description}</p>}

        <span className="fk-ab-preview__cta">{cta}</span>

      </figcaption>

    </figure>

  );

}



/* ============================================================================

   BUILDER

============================================================================ */



export default function AdsCampaignBuilder({ mode, initial, campaignId, canSubmit = true }: Props) {

  const navigate = useNavigate();

  const [state, setState] = useState<BuilderState>(initial);

  const [stepIndex, setStepIndex] = useState(0);

  const [errors, setErrors] = useState<Errors>({});

  /* Existing campaigns are already complete, so every step is reachable. */

  const [visited, setVisited] = useState(mode === "edit" ? STEPS.length - 1 : 0);

  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const ids = useId();



  const step = STEPS[stepIndex];



  function set<K extends keyof BuilderState>(key: K, value: BuilderState[K]) {

    setState((current) => ({ ...current, [key]: value }));

    setErrors((current) => {

      if (!(key in current) && !(key === "mediaUrl" && current.media)) return current;



      const next = { ...current };

      delete next[key];

      if (key === "mediaUrl") delete next.media;



      return next;

    });

  }



  /* Move focus to the step heading when the step changes (not on mount). */

  const shownStep = useRef(stepIndex);



  useEffect(() => {

    if (shownStep.current !== stepIndex) {

      shownStep.current = stepIndex;

      headingRef.current?.focus();

    }

  }, [stepIndex]);



  function goTo(index: number) {

    setErrors({});

    setStepIndex(index);

    setVisited((v) => Math.max(v, index));

    window.scrollTo({ top: 0, behavior: "smooth" });

  }



  function next() {

    const stepErrors = validateStep(step.id, state);



    if (Object.keys(stepErrors).length) {

      setErrors(stepErrors);

      return;

    }



    goTo(Math.min(STEPS.length - 1, stepIndex + 1));

  }



  async function save(intent: "draft" | "submit") {

    const invalid = validateAll(state);



    if (invalid) {

      setStepIndex(STEPS.findIndex((s) => s.id === invalid.step));

      setErrors(invalid.errors);

      return;

    }



    setSaving(intent);

    setSaveError(null);



    const payload = toPayload(state);

    let id = campaignId;



    try {

      if (mode === "create") {

        const created = (await createCampaign(payload as unknown as CreateCampaignPayload)) as unknown as Record<string, unknown>;

        const newId = created?._id ?? created?.id;



        if (newId == null) throw new Error("The campaign was saved but the server did not return its ID.");



        id = String(newId);

      } else if (id) {

        await updateCampaign(id, payload as unknown as UpdateCampaignPayload);

      }

    } catch (err) {

      setSaveError(adsErrorMessage(err, "The campaign could not be saved."));

      setSaving(null);

      return;

    }



    if (intent === "submit" && id) {

      try {

        await submitCampaign(id);

      } catch (err) {

        setSaving(null);

        setSaveError(

          `Saved as a draft, but it could not be submitted: ${adsErrorMessage(err, "unknown error")}`,

        );

        navigate(adsPaths.campaign(id), { replace: mode === "create" });

        return;

      }

    }



    setSaving(null);



    if (id) {

      navigate(adsPaths.campaign(id), { replace: mode === "create" });

    }

  }



  const objective = OBJECTIVES.find((o) => o.id === state.objective);

  const daily = Number(state.dailyBudget);

  const total = Number(state.totalBudget);

  const estimatedDays = daily > 0 && total > 0 ? Math.max(1, Math.floor(total / daily)) : null;



  const reviewRows = useMemo(

    () => [

      { label: "Goal", value: objective?.title ?? "—", step: 0 },

      { label: "Name", value: state.name || "—", step: 0 },

      { label: "Format", value: FORMAT_OPTIONS.find((f) => f.id === state.adFormat)?.label ?? "—", step: 1 },

      { label: "Headline", value: state.headline || "—", step: 1 },

      { label: "Button", value: state.callToAction ? CTA_LABELS[state.callToAction] : objective ? `${CTA_LABELS[objective.cta]} (default)` : "—", step: 1 },

      {

        label: "Placements",

        value: state.placements.map((p) => PLACEMENTS.find((x) => x.id === p)?.title ?? p).join(", ") || "—",

        step: 2,

      },

      {

        label: "Audience",

        value:

          [

            state.locations.length ? state.locations.join(", ") : "All locations",

            state.minimumAge || state.maximumAge ? `Ages ${state.minimumAge || "13"}–${state.maximumAge || "100"}` : "All ages 13+",

            state.interests.length ? `Interests: ${state.interests.join(", ")}` : null,

          ]

            .filter(Boolean)

            .join(" · "),

        step: 3,

      },

      {

        label: "Budget",

        value:

          daily > 0 && total > 0 ? `${formatMoney(daily)} per day · ${formatMoney(total)} total` : "—",

        step: 4,

      },

      {

        label: "Schedule",

        value: `${state.startDate || "—"}${state.endDate ? ` → ${state.endDate}` : " · no end date"}`,

        step: 4,

      },

    ],

    [state, objective, daily, total],

  );



  const fid = (name: string) => `${ids}-${name}`;



  return (

    <div className="fk-ab">

      {/* STEPPER */}



      <nav className="fk-ab-stepper" aria-label="Campaign steps">

        <ol>

          {STEPS.map((item, index) => {

            const done = index < stepIndex;

            const current = index === stepIndex;

            const reachable = index <= visited;



            return (

              <li key={item.id} className={`${done ? "is-done" : ""}${current ? " is-current" : ""}`}>

                <button

                  type="button"

                  onClick={() => reachable && goTo(index)}

                  disabled={!reachable}

                  aria-current={current ? "step" : undefined}

                >

                  <span className="fk-ab-stepper__dot">{done ? <Check size={14} aria-hidden="true" /> : index + 1}</span>

                  <span className="fk-ab-stepper__label">{item.label}</span>

                </button>

              </li>

            );

          })}

        </ol>

        <p className="fk-ab-stepper__mobile">

          Step {stepIndex + 1} of {STEPS.length} · {step.label}

        </p>

      </nav>



      <div className="fk-ab-layout">

        <section className="fk-ab-panel" aria-labelledby={fid("title")}>

          <h2 id={fid("title")} ref={headingRef} tabIndex={-1}>

            {step.id === "goal" && "What do you want to achieve?"}

            {step.id === "creative" && "Create your ad"}

            {step.id === "placements" && "Where should it appear?"}

            {step.id === "audience" && "Who should see it?"}

            {step.id === "budget" && "Budget and schedule"}

            {step.id === "review" && "Review and save"}

          </h2>



          {saveError && (

            <div className="fk-ab-alert" role="alert">

              <AlertTriangle size={18} aria-hidden="true" />

              <span>{saveError}</span>

            </div>

          )}



          {/* GOAL */}



          {step.id === "goal" && (

            <>

              <div className="fk-ab-choices" role="radiogroup" aria-label="Campaign goal">

                {OBJECTIVES.map((option) => {

                  const Icon = OBJECTIVE_ICONS[option.id];

                  const checked = state.objective === option.id;



                  return (

                    <button

                      key={option.id}

                      type="button"

                      role="radio"

                      aria-checked={checked}

                      className={`fk-ab-choice${checked ? " is-selected" : ""}`}

                      onClick={() => set("objective", option.id)}

                    >

                      <span className="fk-ab-choice__icon">

                        <Icon size={20} aria-hidden="true" />

                      </span>

                      <strong>{option.title}</strong>

                      <span>{option.text}</span>

                      {checked && <Check size={18} aria-hidden="true" className="fk-ab-choice__check" />}

                    </button>

                  );

                })}

              </div>

              {errors.objective && (

                <p className="fk-ab-field__error" role="alert">

                  {errors.objective}

                </p>

              )}



              <Field

                label="Campaign name"

                htmlFor={fid("name")}

                hint="Only you see this name."

                error={errors.name}

                counter={`${state.name.length}/120`}

              >

                <input

                  id={fid("name")}

                  className="fk-ab-input"

                  value={state.name}

                  maxLength={120}

                  onChange={(event) => set("name", event.target.value)}

                  placeholder="e.g. Summer collection launch"

                  aria-invalid={Boolean(errors.name)}

                  aria-describedby={describedBy(fid("name"), errors.name, "x")}

                />

              </Field>

            </>

          )}



          {/* CREATIVE */}



          {step.id === "creative" && (

            <>

              <div className="fk-ab-segment" role="radiogroup" aria-label="Ad format">

                {FORMAT_OPTIONS.map((option) => {

                  const Icon = option.icon;

                  const checked = state.adFormat === option.id;

                  const blocked = option.id !== "VIDEO" && state.placements.includes("WAVES");



                  return (

                    <button

                      key={option.id}

                      type="button"

                      role="radio"

                      aria-checked={checked}

                      className={`fk-ab-segment__item${checked ? " is-selected" : ""}`}

                      onClick={() => {

                        if (option.id !== state.adFormat) {

                          setState((current) => ({

                            ...current,

                            adFormat: option.id,

                            mediaUrl: "",

                            thumbnailUrl: "",

                            placements: blocked ? current.placements.filter((p) => p !== "WAVES") : current.placements,

                          }));

                        }

                      }}

                      title={blocked ? "Choosing this removes Waves, which only shows video." : undefined}

                    >

                      <Icon size={18} aria-hidden="true" />

                      <span>

                        <strong>{option.label}</strong>

                        <small>{option.hint}</small>

                      </span>

                    </button>

                  );

                })}

              </div>



              <MediaUploader

                label={state.adFormat === "VIDEO" ? "Video" : state.adFormat === "CAROUSEL" ? "Cover image" : "Image"}

                accept={state.adFormat === "VIDEO" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}

                kind={state.adFormat === "VIDEO" ? "video" : "image"}

                value={state.mediaUrl}

                onChange={(url) => set("mediaUrl", url)}

                error={errors.media}

              />



              {state.adFormat === "VIDEO" && (

                <MediaUploader

                  label="Cover image (optional)"

                  accept="image/jpeg,image/png,image/webp"

                  kind="image"

                  value={state.thumbnailUrl}

                  onChange={(url) => set("thumbnailUrl", url)}

                  error={errors.thumbnailUrl}

                />

              )}



              <Field

                label="Headline"

                htmlFor={fid("headline")}

                error={errors.headline}

                counter={`${state.headline.length}/${HEADLINE_MAX}`}

              >

                <input

                  id={fid("headline")}

                  className="fk-ab-input"

                  value={state.headline}

                  maxLength={HEADLINE_MAX}

                  onChange={(event) => set("headline", event.target.value)}

                  aria-invalid={Boolean(errors.headline)}

                  aria-describedby={describedBy(fid("headline"), errors.headline)}

                />

              </Field>



              <Field

                label="Description (optional)"

                htmlFor={fid("description")}

                error={errors.description}

                counter={`${state.description.length}/${DESCRIPTION_MAX}`}

              >

                <textarea

                  id={fid("description")}

                  className="fk-ab-input fk-ab-textarea"

                  value={state.description}

                  maxLength={DESCRIPTION_MAX}

                  rows={3}

                  onChange={(event) => set("description", event.target.value)}

                  aria-invalid={Boolean(errors.description)}

                />

              </Field>



              <Field label="Button" htmlFor={fid("cta")} hint={objective ? `Default for ${objective.title.toLowerCase()}: ${CTA_LABELS[objective.cta]}` : undefined}>

                <select

                  id={fid("cta")}

                  className="fk-ab-input"

                  value={state.callToAction}

                  onChange={(event) => set("callToAction", event.target.value as CallToAction | "")}

                >

                  <option value="">Use the default for my goal</option>

                  {(Object.keys(CTA_LABELS) as CallToAction[]).map((key) => (

                    <option key={key} value={key}>

                      {CTA_LABELS[key]}

                    </option>

                  ))}

                </select>

              </Field>



              {state.objective === "APP_INSTALL" && (

                <fieldset className="fk-ab-fieldset">

                  <legend>App details</legend>

                  <div className="fk-ab-grid">

                    <Field label="App name" htmlFor={fid("appName")} error={errors.appName}>

                      <input id={fid("appName")} className="fk-ab-input" value={state.appName} maxLength={150} onChange={(e) => set("appName", e.target.value)} aria-invalid={Boolean(errors.appName)} />

                    </Field>

                    <Field label="App icon link (optional)" htmlFor={fid("appIcon")} error={errors.appIconUrl}>

                      <input id={fid("appIcon")} className="fk-ab-input" type="url" placeholder="https\://" value={state.appIconUrl} onChange={(e) => set("appIconUrl", e.target.value)} aria-invalid={Boolean(errors.appIconUrl)} />

                    </Field>

                    <Field label="App Store link" htmlFor={fid("ios")} error={errors.appStoreUrl}>

                      <input id={fid("ios")} className="fk-ab-input" type="url" placeholder="https\://apps.apple.com/…" value={state.appStoreUrl} onChange={(e) => set("appStoreUrl", e.target.value)} aria-invalid={Boolean(errors.appStoreUrl)} />

                    </Field>

                    <Field label="Google Play link" htmlFor={fid("android")} error={errors.googlePlayUrl}>

                      <input id={fid("android")} className="fk-ab-input" type="url" placeholder="https\://play.google.com/…" value={state.googlePlayUrl} onChange={(e) => set("googlePlayUrl", e.target.value)} aria-invalid={Boolean(errors.googlePlayUrl)} />

                    </Field>

                  </div>

                </fieldset>

              )}

            </>

          )}



          {/* PLACEMENTS */}



          {step.id === "placements" && (

            <>

              <div className="fk-ab-choices fk-ab-choices--two" role="group" aria-label="Placements">

                {PLACEMENTS.map((option) => {

                  const checked = state.placements.includes(option.id);

                  const disabled = Boolean(option.videoOnly) && state.adFormat !== "VIDEO";



                  return (

                    <button

                      key={option.id}

                      type="button"

                      role="checkbox"

                      aria-checked={checked}

                      aria-disabled={disabled}

                      className={`fk-ab-choice${checked ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}

                      onClick={() => {

                        if (disabled) return;



                        set(

                          "placements",

                          checked

                            ? state.placements.filter((p) => p !== option.id)

                            : ([...state.placements, option.id] as Placement[]),

                        );

                      }}

                    >

                      <strong>{option.title}</strong>

                      <span>{option.text}</span>

                      {disabled && <span className="fk-ab-choice__note">Needs a video creative</span>}

                      <span className={`fk-ab-check${checked ? " is-on" : ""}`} aria-hidden="true">

                        {checked && <Check size={14} />}

                      </span>

                    </button>

                  );

                })}

              </div>

              {errors.placements && (

                <p className="fk-ab-field__error" role="alert">

                  {errors.placements}

                </p>

              )}

              <p className="fk-ab-note">Every placement shows a clear “Sponsored” label. How often ads appear is set by Fockis, not by advertisers.</p>

            </>

          )}



          {/* AUDIENCE */}



          {step.id === "audience" && (

            <>

              <Field label="Locations" htmlFor={fid("loc")} hint="Countries, regions or cities. Leave empty to reach everyone.">

                <TagInput id={fid("loc")} values={state.locations} onChange={(v) => set("locations", v)} placeholder="Type a place and press Enter" />

              </Field>

              <Field label="Interests" htmlFor={fid("int")} hint="Optional. Topics your audience cares about.">

                <TagInput id={fid("int")} values={state.interests} onChange={(v) => set("interests", v)} placeholder="e.g. running, sneakers" />

              </Field>

              <div className="fk-ab-grid">

                <Field label="Minimum age" htmlFor={fid("minAge")} error={errors.minimumAge}>

                  <input id={fid("minAge")} className="fk-ab-input" type="number" inputMode="numeric" min={13} max={100} placeholder="13" value={state.minimumAge} onChange={(e) => set("minimumAge", e.target.value)} aria-invalid={Boolean(errors.minimumAge)} />

                </Field>

                <Field label="Maximum age" htmlFor={fid("maxAge")} error={errors.maximumAge}>

                  <input id={fid("maxAge")} className="fk-ab-input" type="number" inputMode="numeric" min={13} max={100} placeholder="100" value={state.maximumAge} onChange={(e) => set("maximumAge", e.target.value)} aria-invalid={Boolean(errors.maximumAge)} />

                </Field>

              </div>

              <p className="fk-ab-note">Ads are never shown to people under 13.</p>

            </>

          )}



          {/* BUDGET */}



          {step.id === "budget" && (

            <>

              <div className="fk-ab-grid">

                <Field label="Daily budget (USD)" htmlFor={fid("daily")} error={errors.dailyBudget}>

                  <input id={fid("daily")} className="fk-ab-input" type="number" inputMode="decimal" min={0.01} step="0.01" placeholder="20.00" value={state.dailyBudget} onChange={(e) => set("dailyBudget", e.target.value)} aria-invalid={Boolean(errors.dailyBudget)} />

                </Field>

                <Field label="Total budget (USD)" htmlFor={fid("total")} error={errors.totalBudget}>

                  <input id={fid("total")} className="fk-ab-input" type="number" inputMode="decimal" min={0.01} step="0.01" placeholder="300.00" value={state.totalBudget} onChange={(e) => set("totalBudget", e.target.value)} aria-invalid={Boolean(errors.totalBudget)} />

                </Field>

                <Field label="Start date" htmlFor={fid("start")} error={errors.startDate}>

                  <input id={fid("start")} className="fk-ab-input" type="date" value={state.startDate} onChange={(e) => set("startDate", e.target.value)} aria-invalid={Boolean(errors.startDate)} />

                </Field>

                <Field label="End date (optional)" htmlFor={fid("end")} error={errors.endDate} hint="Without an end date the campaign runs until the total budget is spent.">

                  <input id={fid("end")} className="fk-ab-input" type="date" value={state.endDate} min={state.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} aria-invalid={Boolean(errors.endDate)} />

                </Field>

              </div>

              {estimatedDays !== null && (

                <p className="fk-ab-note">

                  At {formatMoney(daily)} a day, a {formatMoney(total)} budget covers at least {estimatedDays} {estimatedDays === 1 ? "day" : "days"} of full delivery. Delivery stops once the total budget is spent.

                </p>

              )}

            </>

          )}



          {/* REVIEW */}



          {step.id === "review" && (

            <>

              <dl className="fk-ab-review">

                {reviewRows.map((row) => (

                  <div key={row.label}>

                    <dt>{row.label}</dt>

                    <dd>{row.value}</dd>

                    <button type="button" className="fk-ab-textbtn" onClick={() => goTo(row.step)}>

                      Edit<span className="fk-ab-sr"> {row.label.toLowerCase()}</span>

                    </button>

                  </div>

                ))}

              </dl>

              <p className="fk-ab-note">

                {canSubmit

                  ? "Submitting sends the campaign to Fockis review. It starts delivering only after it is approved, on its start date."

                  : "Saving keeps the campaign’s current status."}

              </p>

            </>

          )}



          {/* FOOTER */}



          <div className="fk-ab-footer">

            {stepIndex > 0 ? (

              <button type="button" className="fk-ads-btn fk-ads-btn--ghost" onClick={() => goTo(stepIndex - 1)} disabled={saving !== null}>

                <ArrowLeft size={16} aria-hidden="true" /> Back

              </button>

            ) : (

              <Link to={mode === "edit" && campaignId ? adsPaths.campaign(campaignId) : adsPaths.overview} className="fk-ads-btn fk-ads-btn--ghost">

                Cancel

              </Link>

            )}



            <div className="fk-ab-footer__right">

              {step.id === "review" ? (

                <>

                  <button type="button" className="fk-ads-btn fk-ads-btn--ghost" onClick={() => void save("draft")} disabled={saving !== null} aria-busy={saving === "draft"}>

                    {saving === "draft" ? "Saving…" : mode === "edit" ? "Save changes" : "Save as draft"}

                  </button>

                  {canSubmit && (

                    <button type="button" className="fk-ads-btn fk-ads-btn--primary" onClick={() => void save("submit")} disabled={saving !== null} aria-busy={saving === "submit"}>

                      {saving === "submit" ? "Submitting…" : "Submit for review"}

                    </button>

                  )}

                </>

              ) : (

                <button type="button" className="fk-ads-btn fk-ads-btn--primary" onClick={next}>

                  Continue <ArrowRight size={16} aria-hidden="true" />

                </button>

              )}

            </div>

          </div>

        </section>



        <aside className="fk-ab-side" aria-label="Preview">

          <span className="fk-ab-side__label">Preview</span>

          <AdPreview state={state} />

          <p className="fk-ab-side__note">Approximate preview. Final layout depends on the placement and device.</p>

        </aside>

      </div>

    </div>

  );

}
