import { useEffect, useState } from "react";
import type { BillingSettings, CreditChannel } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { billingApi } from "../../services/billingApi";
import { plansApi } from "../../services/plansApi";
import { Button } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { SelectField, TextArea, TextField, Toggle } from "../../components/ui/Field";
import { Notice, Skeleton } from "../../components/ui/Feedback";
import { formatMoney } from "../../utils/credits";
import { formatNumber } from "../../utils/format";

export default function BillingSettingsPage() {
  const run = useAction();
  const { currentBusiness } = useMarketingWorkspace();
  const id = currentBusiness?.id ?? "";
  const settings = useAsync(() => billingApi.getSettings(id), [id]);
  const packages = useAsync(() => plansApi.listPackages(), []);
  const [form, setForm] = useState<BillingSettings | null>(null);
  useEffect(() => { if (settings.data) setForm(structuredClone(settings.data)); }, [settings.data]);
  if (!form) return <div className="fm-page"><Skeleton height={360} /></div>;
  const dirty = JSON.stringify(form) !== JSON.stringify(settings.data);
  const ar = form.autoRecharge;

  return (
    <div className="fm-page">
      <PageHeader title="Billing settings" description="Who gets invoices, and what happens when credits run low." actions={<Button variant="primary" icon="save" disabled={!dirty} onClick={async () => { const s = await run(() => billingApi.saveSettings(id, form), "Billing settings saved."); if (s) settings.setData(s); }}>Save changes</Button>} />
      <div className="fm-grid fm-grid--two">
        <Panel title="Invoice details">
          <TextField label="Billing email" type="email" value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} />
          <TextField label="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <TextField label="Tax ID" optional value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
          <TextArea label="Billing address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Panel>
        <Panel title="Credits">
          <Toggle label="Low-credit alerts" description="Email the billing contact when credits are running low." checked={form.lowCreditAlerts} onChange={(v) => setForm({ ...form, lowCreditAlerts: v })} />
          <Toggle label="Auto-recharge" description="Buy a package automatically when credits fall below a threshold." checked={ar.enabled} onChange={(v) => setForm({ ...form, autoRecharge: { ...ar, enabled: v } })} />
          {ar.enabled && (
            <>
              <SelectField label="Credit type" value={ar.channel} onChange={(e) => { const ch = e.target.value as CreditChannel; setForm({ ...form, autoRecharge: { ...ar, channel: ch, packageId: packages.data?.find((p) => p.channel === ch)?.packageId ?? ar.packageId } }); }} options={[{ value: "email", label: "Email credits" }, { value: "sms", label: "SMS credits" }]} />
              <TextField label="When remaining credits fall below" type="number" min={0} value={ar.threshold} onChange={(e) => setForm({ ...form, autoRecharge: { ...ar, threshold: Number(e.target.value) } })} />
              <SelectField label="Buy this package" value={ar.packageId} onChange={(e) => setForm({ ...form, autoRecharge: { ...ar, packageId: e.target.value } })} options={(packages.data ?? []).filter((p) => p.channel === ar.channel).map((p) => ({ value: p.packageId, label: `${formatNumber(p.credits)} credits · ${formatMoney(p.price, "price on checkout")}` }))} />
              <Notice>Auto-recharge charges your default card through Stripe. It runs on the backend, not in this browser.</Notice>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
