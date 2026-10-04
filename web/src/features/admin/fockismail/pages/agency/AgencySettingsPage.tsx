import { useEffect, useState } from "react";
import type { AgencySettings, ServiceKey } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction } from "../../hooks/useMailchimp";
import { agencyApi } from "../../services/agencyApi";
import { plansApi } from "../../services/plansApi";
import { ChoiceCards } from "../../components/ChoiceCards";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Button, LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { SelectField, TextField, Toggle } from "../../components/ui/Field";
import { Skeleton } from "../../components/ui/Feedback";
import { SERVICE_INFO } from "../../utils/platformLabels";

export default function AgencySettingsPage() {
  const run = useAction();
  const settings = useAsync(() => agencyApi.getSettings(), []);
  const plans = useAsync(() => plansApi.listPlans(), []);
  const [form, setForm] = useState<AgencySettings | null>(null);
  useEffect(() => { if (settings.data) setForm(structuredClone(settings.data)); }, [settings.data]);
  if (!form) return <div className="fm-page"><Skeleton height={400} /></div>;
  const dirty = JSON.stringify(form) !== JSON.stringify(settings.data);
  const set = <K extends keyof AgencySettings>(k: K, v: AgencySettings[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="fm-page">
      <PageHeader title="Agency settings" description="Defaults for how your agency takes on and manages clients." actions={<Button variant="primary" icon="save" disabled={!dirty} onClick={async () => { const s = await run(() => agencyApi.saveSettings(form), "Agency settings saved."); if (s) settings.setData(s); }}>Save changes</Button>} />
      <div className="fm-grid fm-grid--two">
        <Panel title="Agency">
          <TextField label="Agency name" value={form.agencyName} onChange={(e) => set("agencyName", e.target.value)} />
          <TextField label="Support email" type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} hint="Shown to businesses on the request form confirmation." />
          <SelectField label="Default plan for new clients" value={form.defaultPlanId} onChange={(e) => set("defaultPlanId", e.target.value)} options={(plans.data ?? []).map((p) => ({ value: p.planId, label: p.planName }))} />
          <LinkButton to={MARKETING_ROUTES.request} icon="globe" variant="ghost">View public request form</LinkButton>
        </Panel>
        <Panel title="Workflow">
          <Toggle label="Require client approval before sending" description="Campaigns go to Approvals before they can be scheduled." checked={form.requireClientApproval} onChange={(v) => set("requireClientApproval", v)} />
          <Toggle label="Create onboarding tasks for new clients" description="Adds “Import contacts”, “Set up welcome automation”, and “Plan first campaign”." checked={form.autoCreateTasksOnConversion} onChange={(v) => set("autoCreateTasksOnConversion", v)} />
          <Toggle label="Notify me about new applications" checked={form.notifyOnNewApplication} onChange={(v) => set("notifyOnNewApplication", v)} />
          <Toggle label="Notify me when a client runs low on credits" checked={form.notifyOnLowCredits} onChange={(v) => set("notifyOnLowCredits", v)} />
        </Panel>
      </div>
      <Panel title="Default services">
        <ChoiceCards<ServiceKey> label="Turned on for every new client" columns={3} value={form.defaultServices} onChange={(v) => set("defaultServices", v)} choices={(Object.keys(SERVICE_INFO) as ServiceKey[]).map((s) => ({ value: s, label: SERVICE_INFO[s].label }))} />
      </Panel>
    </div>
  );
}
