import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Business, BusinessType, IntegrationKey, MarketingGoal, ServiceKey } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { agencyApi, type NewBusinessInput } from "../../services/agencyApi";
import { plansApi } from "../../services/plansApi";
import { ChoiceCards } from "../../components/ChoiceCards";
import { BusinessMark } from "../../components/WorkspaceSwitcher";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Button, LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { ColorField, SelectField, TextArea, TextField } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { BUSINESS_TYPE_LABELS, GOAL_LABELS, INTEGRATION_LABELS, SERVICE_INFO } from "../../utils/platformLabels";
import { formatMoney, planCredits } from "../../utils/credits";
import { cx } from "../../utils/format";

const STEPS = ["Business information", "Branding", "Marketing goals", "Audience", "Integrations", "First campaign"] as const;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type FirstCampaign = "welcome" | "promotion" | "newsletter" | "later";

export default function ClientOnboardingPage() {
  const navigate = useNavigate();
  const run = useAction();
  const { switchBusiness } = useMarketingWorkspace();
  const plans = useAsync(() => plansApi.listPlans(), []);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState<NewBusinessInput>({
    name: "", type: "restaurant", description: "", website: "", phone: "", email: "", address: "", serviceArea: "",
    accent: "#1f5eff", logo: "", brandFonts: [], goals: [], services: ["email_marketing"], planId: "plan_starter", sizeHint: 500,
    ownerName: "", ownerEmail: "",
  });
  const [audienceSource, setAudienceSource] = useState<"import" | "fockis" | "form" | "none">("import");
  const [integrations, setIntegrations] = useState<IntegrationKey[]>(["fockis"]);
  const [firstCampaign, setFirstCampaign] = useState<FirstCampaign>("welcome");

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!input.name.trim()) e.name = "Enter the business name.";
      if (input.email && !EMAIL_RE.test(input.email)) e.email = "Enter a valid email address.";
      if (!input.ownerName.trim()) e.ownerName = "Who should own this workspace?";
      if (!EMAIL_RE.test(input.ownerEmail)) e.ownerEmail = "We'll send their invite here.";
    }
    if (step === 2 && input.goals.length === 0) e.goals = "Pick at least one goal.";
    return e;
  }, [step, input]);

  const next = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setTouched(false);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setSaving(true);
    const b = await run(() => agencyApi.createBusiness(input));
    setSaving(false);
    if (b) setCreated(b);
  };

  const set = <K extends keyof NewBusinessInput>(k: K, v: NewBusinessInput[K]) => setInput((x) => ({ ...x, [k]: v }));

  if (created) {
    const target = firstCampaign === "later" ? MARKETING_ROUTES.overview : `${MARKETING_ROUTES.compose}?type=${firstCampaign === "promotion" ? "product_promotion" : firstCampaign === "newsletter" ? "newsletter" : "welcome"}`;
    return (
      <div className="fm-page">
        <div className="fm-donecard">
          <BusinessMark business={created} size={64} />
          <h1>Your marketing workspace is ready.</h1>
          <p>{created.name} now has its own audience, campaigns, automations, and credit balance. We sent an owner invitation to {input.ownerEmail}.</p>
          <div className="fm-row fm-row--wrap fm-row--center">
            <Button variant="primary" icon="send" onClick={() => { switchBusiness(created.id); navigate(target); }}>{firstCampaign === "later" ? "Open workspace" : "Create the first campaign"}</Button>
            <LinkButton to={MARKETING_ROUTES.client(created.id)}>View client</LinkButton>
            <LinkButton to={MARKETING_ROUTES.clients} variant="ghost">Back to clients</LinkButton>
          </div>
          {audienceSource === "import" && <Notice>Next: import their contacts from <strong>Audience → Import contacts</strong>. A task was added for you.</Notice>}
        </div>
      </div>
    );
  }

  return (
    <div className="fm-page fm-onboarding">
      <PageHeader title="Add a client" description="Set up a marketing workspace for a business in six short steps." actions={<LinkButton to={MARKETING_ROUTES.clients} variant="ghost">Cancel</LinkButton>} />
      <ol className="fm-stepper" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={cx(i < step && "is-done", i === step && "is-current")} aria-current={i === step ? "step" : undefined}>
            <button type="button" disabled={i > step} onClick={() => setStep(i)}>
              <span className="fm-stepper__n">{i < step ? <Icon name="check" size={13} /> : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      <Panel title={STEPS[step]}>
        {step === 0 && (
          <div className="fm-formgrid">
            <TextField label="Business name" value={input.name} onChange={(e) => set("name", e.target.value)} error={touched ? errors.name : undefined} data-autofocus />
            <SelectField label="Business type" value={input.type} onChange={(e) => set("type", e.target.value as BusinessType)} options={Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
            <TextArea className="fm-span-full" label="What does the business do?" rows={2} value={input.description} onChange={(e) => set("description", e.target.value)} />
            <TextField label="Website" optional value={input.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
            <TextField label="Business email" optional type="email" value={input.email} onChange={(e) => set("email", e.target.value)} error={touched ? errors.email : undefined} />
            <TextField label="Phone" optional value={input.phone} onChange={(e) => set("phone", e.target.value)} />
            <TextField label="Service area" optional value={input.serviceArea} onChange={(e) => set("serviceArea", e.target.value)} placeholder="Columbus and nearby" />
            <TextField className="fm-span-full" label="Address" optional value={input.address} onChange={(e) => set("address", e.target.value)} />
            <TextField label="Owner's name" value={input.ownerName} onChange={(e) => set("ownerName", e.target.value)} error={touched ? errors.ownerName : undefined} />
            <TextField label="Owner's email" type="email" value={input.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} error={touched ? errors.ownerEmail : undefined} />
            <SelectField className="fm-span-full" label="Plan" value={input.planId} onChange={(e) => set("planId", e.target.value)} options={(plans.data ?? []).map((p) => ({ value: p.planId, label: `${p.planName} · ${planCredits(p, "email")} email / ${planCredits(p, "sms")} SMS credits · ${formatMoney(p.price)}` }))} hint="Sets their starting credits. You can change plans any time." />
          </div>
        )}
        {step === 1 && (
          <>
            <div className="fm-logoedit">
              <BusinessMark business={{ name: input.name || "New business", accent: input.accent, logo: input.logo }} size={64} />
              <label className="fm-btn fm-btn--secondary fm-btn--sm">
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) set("logo", URL.createObjectURL(f)); }} />
                Upload logo
              </label>
            </div>
            <p className="fm-field__hint">Previews locally. Permanent storage uses the Fockis upload service once the backend is connected.</p>
            <ColorField label="Main brand color" value={input.accent} onChange={(v) => set("accent", v)} />
            <TextField label="Brand fonts" optional value={input.brandFonts.join(", ")} onChange={(e) => set("brandFonts", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder="Playfair Display, Inter" />
          </>
        )}
        {step === 2 && (
          <>
            <ChoiceCards<MarketingGoal> label="What should marketing achieve?" value={input.goals} onChange={(v) => set("goals", v)} choices={(Object.keys(GOAL_LABELS) as MarketingGoal[]).map((g) => ({ value: g, label: GOAL_LABELS[g] }))} error={touched ? errors.goals : undefined} />
            <ChoiceCards<ServiceKey> label="Services Fockis will provide" value={input.services} onChange={(v) => set("services", v)} columns={2} choices={(Object.keys(SERVICE_INFO) as ServiceKey[]).map((s) => ({ value: s, label: SERVICE_INFO[s].label, description: SERVICE_INFO[s].description }))} />
          </>
        )}
        {step === 3 && (
          <>
            <ChoiceCards label="Where will their first contacts come from?" multiple={false} columns={2} value={[audienceSource]} onChange={(v) => setAudienceSource(v[0])} choices={[
              { value: "import", label: "Import a list", description: "Upload a CSV from their current tool or point-of-sale." },
              { value: "fockis", label: "Fockis followers & buyers", description: "People who follow or bought from them on Fockis." },
              { value: "form", label: "Start with a signup form", description: "Grow from zero with a form on their website or a landing page." },
              { value: "none", label: "Decide later", description: "Set up the audience after the workspace exists." },
            ]} />
            <TextField label="About how many customers do they have?" type="number" min={0} value={input.sizeHint} onChange={(e) => set("sizeHint", Number(e.target.value))} hint="A rough number is fine. It helps estimate credits." />
          </>
        )}
        {step === 4 && (
          <>
            <ChoiceCards<IntegrationKey> label="Which tools do they use?" value={integrations} onChange={setIntegrations} columns={2} choices={(Object.keys(INTEGRATION_LABELS) as IntegrationKey[]).map((k) => ({ value: k, label: INTEGRATION_LABELS[k].label, description: INTEGRATION_LABELS[k].description }))} />
            <Notice icon="lock">Connections are made later from Integrations, through each provider's own sign-in. Never collect passwords or API keys here.</Notice>
          </>
        )}
        {step === 5 && (
          <ChoiceCards label="What should the first campaign be?" multiple={false} columns={2} value={[firstCampaign]} onChange={(v) => setFirstCampaign(v[0])} choices={[
            { value: "welcome", label: "Welcome email", description: "Introduce the business to its list." },
            { value: "promotion", label: "Promotion", description: "Feature an offer, product, or service." },
            { value: "newsletter", label: "Newsletter", description: "Share news, events, and updates." },
            { value: "later", label: "Not yet", description: "Just create the workspace for now." },
          ]} />
        )}
      </Panel>

      <div className="fm-wizardfoot">
        <Button icon="chevronLeft" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        <Button variant="primary" iconRight={step < STEPS.length - 1 ? "chevronRight" : undefined} icon={step === STEPS.length - 1 ? "check" : undefined} loading={saving} onClick={next}>
          {step < STEPS.length - 1 ? "Continue" : "Create workspace"}
        </Button>
      </div>
    </div>
  );
}
