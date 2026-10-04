import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type {
  ApplicationDraft,
  ApplicationUpload,
  BudgetRange,
  BusinessType,
  ContactMethod,
  IntegrationKey,
  MarketingApplication,
  MarketingChannel,
  MarketingGoal,
  ServiceKey,
  Timeline,
} from "../../types/platform.types";
import { applicationsApi } from "../../services/applicationsApi";
import { useAction, useMailchimp } from "../../hooks/useMailchimp";
import { emptyApplicationDraft } from "../../data/applicationMockData";
import { ApplicationSummary, StatusTimeline, type SummarySectionKey } from "../../components/ApplicationSummary";
import { ChoiceCards } from "../../components/ChoiceCards";
import { Button } from "../../components/ui/Button";
import { ColorField, SelectField, TextArea, TextField } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import {
  BUDGET_LABELS,
  BUSINESS_TYPE_LABELS,
  CHANNEL_LABELS,
  CONTACT_METHOD_LABELS,
  GOAL_LABELS,
  INTEGRATION_LABELS,
  REQUESTABLE_SERVICES,
  SERVICE_INFO,
  TIMELINE_LABELS,
} from "../../utils/platformLabels";
import { cx, formatDateTime, uid } from "../../utils/format";

const STEPS: Array<{ title: string; question: string; help?: string; section: SummarySectionKey | "review" }> = [
  { title: "Business", question: "Tell us about your business.", help: "The basics help us understand who you are and where you work.", section: "business" },
  { title: "Contact", question: "Who should we talk to?", help: "We'll reach out to this person about your request.", section: "contact" },
  { title: "Goals", question: "What would you like to accomplish?", help: "Pick everything that matters. There are no wrong answers.", section: "goals" },
  { title: "Services", question: "Which marketing services are you interested in?", help: "Not sure? Pick what sounds useful and we'll recommend the rest.", section: "services" },
  { title: "Products", question: "What do you sell?", help: "Tell us about your products or services in your own words.", section: "products" },
  { title: "Customers", question: "Who is your ideal customer?", help: "Describe the people you most want to reach.", section: "customers" },
  { title: "Current marketing", question: "What marketing are you currently doing?", section: "marketing" },
  { title: "Branding", question: "Share your brand.", help: "Optional. Logos, colors, and photos help us match your look.", section: "branding" },
  { title: "Budget", question: "What's your monthly marketing budget?", help: "This helps us suggest the right plan. You can change it later.", section: "budget" },
  { title: "Timeline", question: "How soon would you like to get started?", section: "timeline" },
  { title: "Integrations", question: "Which tools do you already use?", help: "Just tell us what you use. You'll connect them securely later.", section: "integrations" },
  { title: "Review", question: "Review your request.", help: "Check everything below, then submit.", section: "review" },
];

const SECTION_STEP: Record<SummarySectionKey, number> = {
  business: 0, contact: 1, goals: 2, services: 3, products: 4, customers: 5, marketing: 6, branding: 7, budget: 8, timeline: 9, integrations: 10,
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_FILE_MB = 15;
const UPLOAD_KINDS: Array<{ kind: ApplicationUpload["kind"]; label: string; accept: string; hint: string }> = [
  { kind: "logo", label: "Logo", accept: "image/*,.svg,.pdf", hint: "PNG, SVG, or PDF" },
  { kind: "brand_guidelines", label: "Brand guidelines", accept: ".pdf,image/*", hint: "PDF if you have one" },
  { kind: "product_images", label: "Product images", accept: "image/*", hint: "A few of your best photos" },
  { kind: "business_photos", label: "Business photos", accept: "image/*", hint: "Your shop, team, or work" },
  { kind: "marketing_materials", label: "Marketing materials", accept: ".pdf,image/*", hint: "Flyers, menus, past ads" },
];

export default function MarketingRequestPage() {
  const run = useAction();
  const { toast, isMock } = useMailchimp();
  const [draft, setDraft] = useState<ApplicationDraft>(emptyApplicationDraft);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const [restored, setRestored] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<MarketingApplication | null>(null);
  const [viewing, setViewing] = useState(false);
  const formTop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = applicationsApi.loadDraft();
    if (saved) {
      setDraft({ ...emptyApplicationDraft(), ...saved.draft, branding: { ...saved.draft.branding, uploads: saved.draft.branding.uploads.map((u) => ({ ...u, previewUrl: undefined })) } });
      setStep(Math.min(saved.step, STEPS.length - 1));
      setMaxStep(Math.min(saved.step, STEPS.length - 1));
      setRestored(saved.savedAt);
    }
  }, []);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!draft.business.name.trim()) e.name = "Enter your business name.";
      if (!EMAIL_RE.test(draft.business.email)) e.email = "Enter an email we can reach your business at.";
      if (draft.business.description.trim().length < 10) e.description = "Tell us a little about what you do (a sentence is fine).";
    }
    if (step === 1) {
      if (!draft.contact.fullName.trim()) e.fullName = "Enter your name.";
      if (!EMAIL_RE.test(draft.contact.email)) e.contactEmail = "Enter a valid email address.";
      if (draft.contact.preferredMethod === "phone" && !draft.contact.phone.trim()) e.phone = "Add a phone number if you'd like a call.";
    }
    if (step === 2 && draft.goals.length === 0) e.goals = "Pick at least one goal.";
    if (step === 3 && draft.services.length === 0) e.services = "Pick at least one service, or choose “Campaign management” if you'd like us to decide.";
    return e;
  }, [step, draft]);

  const go = (n: number) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    setTouched(false);
    applicationsApi.saveDraft(draft, n);
    window.requestAnimationFrame(() => formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const next = () => {
    setTouched(true);
    if (Object.keys(errors).length) {
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>(".fm-request [aria-invalid='true'], .fm-request .fm-choices.has-error button")?.focus());
      return;
    }
    go(step + 1);
  };

  const saveDraft = () => {
    applicationsApi.saveDraft(draft, step);
    toast("Draft saved on this device. Come back any time to finish.", "success");
  };

  const submit = async () => {
    setSubmitting(true);
    const app = await run(() => applicationsApi.createApplication(draft));
    setSubmitting(false);
    if (app) {
      applicationsApi.clearDraft();
      setSubmitted(app);
      window.scrollTo({ top: 0 });
    }
  };

  const setB = <K extends keyof ApplicationDraft["business"]>(k: K, v: ApplicationDraft["business"][K]) => setDraft((d) => ({ ...d, business: { ...d.business, [k]: v } }));
  const setC = <K extends keyof ApplicationDraft["contact"]>(k: K, v: ApplicationDraft["contact"][K]) => setDraft((d) => ({ ...d, contact: { ...d.contact, [k]: v } }));
  const setP = <K extends keyof ApplicationDraft["products"]>(k: K, v: string) => setDraft((d) => ({ ...d, products: { ...d.products, [k]: v } }));
  const setT = <K extends keyof ApplicationDraft["targetCustomers"]>(k: K, v: ApplicationDraft["targetCustomers"][K]) => setDraft((d) => ({ ...d, targetCustomers: { ...d.targetCustomers, [k]: v } }));
  const setM = <K extends keyof ApplicationDraft["currentMarketing"]>(k: K, v: ApplicationDraft["currentMarketing"][K]) => setDraft((d) => ({ ...d, currentMarketing: { ...d.currentMarketing, [k]: v } }));
  const err = (k: string) => (touched ? errors[k] : undefined);

  const addFiles = (kind: ApplicationUpload["kind"], files: FileList | null) => {
    if (!files) return;
    const ok = Array.from(files).filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    if (ok.length < files.length) toast(`Files over ${MAX_FILE_MB} MB were skipped.`, "error");
    setDraft((d) => ({
      ...d,
      branding: {
        ...d.branding,
        uploads: [...d.branding.uploads, ...ok.map((f) => ({ id: uid("up"), kind, name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)), previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined }))],
      },
    }));
  };

  // ---------------------------------------------------------------------------
  // Success
  // ---------------------------------------------------------------------------
  if (submitted) {
    return (
      <RequestShell>
        <div className="fm-request__done">
          <span className="fm-request__doneicon"><Icon name="check" size={28} /></span>
          <h1>Thank you. Your marketing request has been submitted to Fockis.</h1>
          <p>Our marketing team will review it and contact you {submitted.contact.preferredMethod === "phone" ? "by phone" : submitted.contact.preferredMethod === "fockis_messages" ? "in Fockis Messages" : "by email"}, usually within two business days.</p>
          <dl className="fm-request__receipt">
            <div><dt>Application ID</dt><dd><code>{submitted.reference}</code></dd></div>
            <div><dt>Submitted</dt><dd>{formatDateTime(submitted.createdAt)}</dd></div>
            <div><dt>Status</dt><dd><span className="fm-badge fm-badge--violet"><span className="fm-badge__dot" />Under review</span></dd></div>
          </dl>
          <div className="fm-row fm-row--wrap fm-row--center">
            <Button variant="primary" icon="eye" onClick={() => setViewing((v) => !v)}>{viewing ? "Hide application" : "View application"}</Button>
            <Link className="fm-btn fm-btn--secondary fm-btn--md" to="/fockis-preview">Return to Fockis</Link>
            <a className="fm-btn fm-btn--ghost fm-btn--md" href={`mailto:marketing@fockis.com?subject=${encodeURIComponent(`Marketing request ${submitted.reference}`)}`}>Contact Fockis</a>
          </div>
          {isMock && <Notice>Demo mode: this request is stored in this browser session only. It appears in the agency's Applications list until you reload.</Notice>}
        </div>
        {viewing && (
          <section className="fm-request__card">
            <StatusTimeline app={submitted} />
            <ApplicationSummary app={submitted} />
          </section>
        )}
      </RequestShell>
    );
  }

  const s = STEPS[step];
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <RequestShell onSave={saveDraft}>
      <section className="fm-request__hero">
        <h1>Grow your business with Fockis Marketing</h1>
        <p>Tell us about your business and what you want to accomplish. Our marketing team will review your request and help create a strategy.</p>
        <ul className="fm-request__promises">
          <li><Icon name="clock" size={15} /> About 10 minutes</li>
          <li><Icon name="save" size={15} /> Save and finish later</li>
          <li><Icon name="lock" size={15} /> We never ask for passwords</li>
        </ul>
      </section>

      {restored && step < STEPS.length - 1 && (
        <Notice>
          We restored the draft you saved {formatDateTime(restored)}.{" "}
          <button type="button" className="fm-linkbtn" onClick={() => { applicationsApi.clearDraft(); setDraft(emptyApplicationDraft()); setStep(0); setMaxStep(0); setRestored(null); }}>Start over</button>
        </Notice>
      )}

      <div className="fm-request__layout" ref={formTop}>
        <nav className="fm-request__steps" aria-label="Application steps">
          <div className="fm-request__progress">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span className="fm-request__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Application progress"><span style={{ width: `${pct}%` }} /></span>
          </div>
          <ol>
            {STEPS.map((x, i) => (
              <li key={x.title} className={cx(i < step && "is-done", i === step && "is-current")}>
                <button type="button" disabled={i > maxStep} onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
                  <span className="fm-request__n">{i < step ? <Icon name="check" size={11} /> : i + 1}</span>
                  {x.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <form className="fm-request__card" onSubmit={(e) => { e.preventDefault(); if (step === STEPS.length - 1) submit(); else next(); }} noValidate>
          <header className="fm-request__q">
            <h2>{s.question}</h2>
            {s.help && <p>{s.help}</p>}
          </header>

          {step === 0 && (
            <div className="fm-formgrid">
              <TextField label="Business name" value={draft.business.name} onChange={(e) => setB("name", e.target.value)} error={err("name")} autoComplete="organization" />
              <SelectField label="Business type" value={draft.business.type} onChange={(e) => setB("type", e.target.value as BusinessType)} options={Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
              <TextField label="Business email" type="email" value={draft.business.email} onChange={(e) => setB("email", e.target.value)} error={err("email")} autoComplete="email" inputMode="email" />
              <TextField label="Business phone" optional type="tel" value={draft.business.phone} onChange={(e) => setB("phone", e.target.value)} autoComplete="tel" inputMode="tel" />
              <TextField label="Website" optional type="url" value={draft.business.website} onChange={(e) => setB("website", e.target.value)} placeholder="https://" inputMode="url" />
              <TextField label="Service area" optional value={draft.business.serviceArea} onChange={(e) => setB("serviceArea", e.target.value)} placeholder="Where are your customers?" />
              <TextField className="fm-span-full" label="Address" optional value={draft.business.address} onChange={(e) => setB("address", e.target.value)} autoComplete="street-address" />
              <TextArea className="fm-span-full" label="Business description" rows={3} value={draft.business.description} onChange={(e) => setB("description", e.target.value)} error={err("description")} hint="What do you do, and what makes you different?" />
            </div>
          )}

          {step === 1 && (
            <>
              <div className="fm-formgrid">
                <TextField label="Full name" value={draft.contact.fullName} onChange={(e) => setC("fullName", e.target.value)} error={err("fullName")} autoComplete="name" />
                <TextField label="Job title" optional value={draft.contact.jobTitle} onChange={(e) => setC("jobTitle", e.target.value)} placeholder="Owner, manager…" />
                <TextField label="Email" type="email" value={draft.contact.email} onChange={(e) => setC("email", e.target.value)} error={err("contactEmail")} autoComplete="email" inputMode="email" />
                <TextField label="Phone" optional={draft.contact.preferredMethod !== "phone"} type="tel" value={draft.contact.phone} onChange={(e) => setC("phone", e.target.value)} error={err("phone")} autoComplete="tel" inputMode="tel" />
              </div>
              <ChoiceCards<ContactMethod> label="How should we contact you?" multiple={false} value={[draft.contact.preferredMethod]} onChange={(v) => setC("preferredMethod", v[0])} choices={(Object.keys(CONTACT_METHOD_LABELS) as ContactMethod[]).map((m) => ({ value: m, label: CONTACT_METHOD_LABELS[m] }))} />
            </>
          )}

          {step === 2 && (
            <>
              <ChoiceCards<MarketingGoal> label="Your goals" value={draft.goals} onChange={(v) => setDraft({ ...draft, goals: v })} error={err("goals")} choices={(Object.keys(GOAL_LABELS) as MarketingGoal[]).map((g) => ({ value: g, label: GOAL_LABELS[g] }))} />
              <TextArea label="Tell us more about what you want to accomplish." optional rows={3} value={draft.goalsDetail} onChange={(e) => setDraft({ ...draft, goalsDetail: e.target.value })} placeholder="For example: fill weekday appointments, or get 50 new email subscribers a month." />
            </>
          )}

          {step === 3 && (
            <ChoiceCards<ServiceKey> label="Services" columns={2} value={draft.services} onChange={(v) => setDraft({ ...draft, services: v })} error={err("services")} choices={REQUESTABLE_SERVICES.map((k) => ({ value: k, label: SERVICE_INFO[k].label, description: SERVICE_INFO[k].description }))} />
          )}

          {step === 4 && (
            <div className="fm-formgrid">
              <TextArea label="Main products" optional rows={2} value={draft.products.mainProducts} onChange={(e) => setP("mainProducts", e.target.value)} />
              <TextArea label="Main services" optional rows={2} value={draft.products.mainServices} onChange={(e) => setP("mainServices", e.target.value)} />
              <TextField label="Best-selling products or services" optional value={draft.products.bestSellers} onChange={(e) => setP("bestSellers", e.target.value)} />
              <TextField label="New products or services" optional value={draft.products.newOfferings} onChange={(e) => setP("newOfferings", e.target.value)} />
              <TextField label="Current promotions" optional value={draft.products.currentPromotions} onChange={(e) => setP("currentPromotions", e.target.value)} />
              <TextField label="Average customer purchase" optional value={draft.products.averagePurchase} onChange={(e) => setP("averagePurchase", e.target.value)} placeholder="$25" />
              <TextArea className="fm-span-full" label="What makes you better than competitors?" optional rows={2} value={draft.products.advantages} onChange={(e) => setP("advantages", e.target.value)} />
              <TextArea className="fm-span-full" label="Anything else?" optional rows={2} value={draft.products.notes} onChange={(e) => setP("notes", e.target.value)} />
            </div>
          )}

          {step === 5 && (
            <>
              <TextArea label="Who is your ideal customer?" rows={3} value={draft.targetCustomers.idealCustomer} onChange={(e) => setT("idealCustomer", e.target.value)} placeholder="For example: busy parents within 5 miles who want a quick, friendly haircut." />
              <div className="fm-formgrid">
                <TextField label="Age range" optional value={draft.targetCustomers.ageRange} onChange={(e) => setT("ageRange", e.target.value)} placeholder="25–45" />
                <TextField label="Location" optional value={draft.targetCustomers.location} onChange={(e) => setT("location", e.target.value)} />
                <TextField label="Customer type" optional value={draft.targetCustomers.customerType} onChange={(e) => setT("customerType", e.target.value)} placeholder="Students, homeowners, small businesses…" />
                <TextField label="Interests" optional value={draft.targetCustomers.interests} onChange={(e) => setT("interests", e.target.value)} />
              </div>
              <ChoiceCards<"b2b" | "b2c" | "both"> label="Do you sell to people or businesses?" multiple={false} value={[draft.targetCustomers.market]} onChange={(v) => setT("market", v[0])} choices={[
                { value: "b2c", label: "People (B2C)", description: "Individual customers" },
                { value: "b2b", label: "Businesses (B2B)", description: "Other companies" },
                { value: "both", label: "Both" },
              ]} />
              <TextArea label="Additional information" optional rows={2} value={draft.targetCustomers.additional} onChange={(e) => setT("additional", e.target.value)} />
            </>
          )}

          {step === 6 && (
            <>
              <ChoiceCards<MarketingChannel> label="What you're doing now" columns={4} value={draft.currentMarketing.channels} onChange={(v) => setM("channels", v.includes("none") && !draft.currentMarketing.channels.includes("none") ? ["none"] : v.filter((x) => x !== "none" || v.length === 1))} choices={(Object.keys(CHANNEL_LABELS) as MarketingChannel[]).map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))} />
              <TextArea label="What has worked well?" optional rows={2} value={draft.currentMarketing.whatWorked} onChange={(e) => setM("whatWorked", e.target.value)} />
              <TextArea label="What has not worked?" optional rows={2} value={draft.currentMarketing.whatDidNot} onChange={(e) => setM("whatDidNot", e.target.value)} />
              <ChoiceCards<"yes" | "no" | "not_sure"> label="Are you currently working with another marketing agency?" multiple={false} value={[draft.currentMarketing.hasAgency]} onChange={(v) => setM("hasAgency", v[0])} choices={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "not_sure", label: "Not sure" }]} />
            </>
          )}

          {step === 7 && (
            <>
              <div className="fm-field">
                <span className="fm-field__label">Brand colors <span className="fm-field__optional">Optional</span></span>
                <div className="fm-formgrid">
                  {draft.branding.colors.map((c, i) => (
                    <ColorField key={i} label={`Color ${i + 1}`} value={c} onChange={(v) => setDraft({ ...draft, branding: { ...draft.branding, colors: draft.branding.colors.map((x, j) => (j === i ? v : x)) } })} />
                  ))}
                </div>
                <div className="fm-row">
                  {draft.branding.colors.length < 4 && <Button size="sm" icon="plus" onClick={() => setDraft({ ...draft, branding: { ...draft.branding, colors: [...draft.branding.colors, "#1f5eff"] } })}>Add a color</Button>}
                  {draft.branding.colors.length > 0 && <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, branding: { ...draft.branding, colors: draft.branding.colors.slice(0, -1) } })}>Remove last</Button>}
                </div>
              </div>
              <TextField label="Brand fonts" optional value={draft.branding.fonts} onChange={(e) => setDraft({ ...draft, branding: { ...draft.branding, fonts: e.target.value } })} placeholder="If you know them" />
              <div className="fm-uploads">
                {UPLOAD_KINDS.map((u) => {
                  const files = draft.branding.uploads.filter((x) => x.kind === u.kind);
                  return (
                    <div key={u.kind} className="fm-upload">
                      <label className="fm-upload__drop">
                        <input type="file" multiple={u.kind !== "logo"} accept={u.accept} onChange={(e) => { addFiles(u.kind, e.target.files); e.target.value = ""; }} />
                        <Icon name="upload" size={18} />
                        <strong>{u.label}</strong>
                        <small>{u.hint}</small>
                      </label>
                      {files.length > 0 && (
                        <ul>
                          {files.map((f) => (
                            <li key={f.id}>
                              {f.previewUrl ? <img src={f.previewUrl} alt="" /> : <Icon name="doc" size={16} />}
                              <span>{f.name}</span>
                              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setDraft({ ...draft, branding: { ...draft.branding, uploads: draft.branding.uploads.filter((x) => x.id !== f.id) } })}><Icon name="x" size={13} /></button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
              <Notice>Files are attached to your request once Fockis's upload service is connected. For now, file names are included so our team can follow up.</Notice>
            </>
          )}

          {step === 8 && (
            <>
              <ChoiceCards<BudgetRange> label="Monthly budget" multiple={false} columns={2} value={[draft.budget]} onChange={(v) => setDraft({ ...draft, budget: v[0] })} choices={(Object.keys(BUDGET_LABELS) as BudgetRange[]).map((b) => ({ value: b, label: BUDGET_LABELS[b] }))} />
              <TextField label="How much do you currently spend on advertising?" optional value={draft.currentAdSpend} onChange={(e) => setDraft({ ...draft, currentAdSpend: e.target.value })} placeholder="$0, $200/month, not sure…" />
            </>
          )}

          {step === 9 && (
            <ChoiceCards<Timeline> label="Start date" multiple={false} columns={2} value={[draft.timeline]} onChange={(v) => setDraft({ ...draft, timeline: v[0] })} choices={(Object.keys(TIMELINE_LABELS) as Timeline[]).map((t) => ({ value: t, label: TIMELINE_LABELS[t] }))} />
          )}

          {step === 10 && (
            <>
              <ChoiceCards<IntegrationKey> label="Tools you use" columns={2} value={draft.integrations} onChange={(v) => setDraft({ ...draft, integrations: v })} choices={(Object.keys(INTEGRATION_LABELS) as IntegrationKey[]).map((k) => ({ value: k, label: INTEGRATION_LABELS[k].label, description: INTEGRATION_LABELS[k].description }))} />
              <Notice icon="lock"><strong>Never share passwords or API keys here.</strong> If we work together, you'll connect each tool through its own secure sign-in.</Notice>
            </>
          )}

          {step === 11 && <ApplicationSummary app={draft} onEdit={(k) => go(SECTION_STEP[k])} />}

          <footer className="fm-request__foot">
            <Button icon="chevronLeft" disabled={step === 0} onClick={() => go(step - 1)}>Back</Button>
            <span className="fm-toolbar__spacer" />
            <Button variant="ghost" icon="save" onClick={saveDraft}>Save draft</Button>
            {step < STEPS.length - 1 ? (
              <Button type="submit" variant="primary" iconRight="chevronRight">{step === STEPS.length - 2 ? "Review" : "Continue"}</Button>
            ) : (
              <Button type="submit" variant="primary" icon="send" loading={submitting}>Submit application</Button>
            )}
          </footer>
        </form>
      </div>
    </RequestShell>
  );
}

/** Standalone public chrome (no marketing sidebar). */
function RequestShell({ children, onSave }: { children: React.ReactNode; onSave?: () => void }) {
  return (
    <div className="fm-theme fm-request">
      <header className="fm-request__top">
        <Link to="/fockis-preview" className="fm-request__brand"><span className="fm-logo fm-logo--sm" aria-hidden>F</span> Fockis Marketing</Link>
        {onSave && <Button size="sm" variant="ghost" icon="save" onClick={onSave}>Save draft</Button>}
      </header>
      <main className="fm-request__main">{children}</main>
      <footer className="fm-request__legal">Fockis reviews every request personally. We'll only use your details to respond to this request.</footer>
    </div>
  );
}
