import { useEffect, useState } from "react";
import { useMarketingWorkspace } from "../hooks/useMarketingWorkspace";
import { useAudiences } from "../hooks/useAudience";
import { creditsApi } from "../services/creditsApi";
import { CreditGate } from "../components/CreditMeter";
import { PurchaseCreditsModal } from "../components/PurchaseCreditsModal";
import { smsSegments } from "../utils/credits";
import type { CreditCheck } from "../types/platform.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMarketingPath } from "../hooks/useMailchimp";
import { channelsApi } from "../services/channelsApi";
import { Badge, DemoBadge } from "../components/ui/Badge";
import { Button, LinkButton } from "../components/ui/Button";
import { PageHeader, Panel, Stat, StatStrip } from "../components/ui/Layout";
import { SelectField, TextArea, TextField, Toggle } from "../components/ui/Field";
import { EmptyState, ErrorState, Notice, SkeletonRows } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Overlay";
import { Tabs } from "../components/ui/Tabs";
import { AnalyticsChart } from "../components/AnalyticsChart";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_TONES } from "../utils/labels";
import { formatDate, formatNumber, formatPercent, rate } from "../utils/format";
import { dayLabels } from "../data/mailchimpMockData";

type Section = "campaigns" | "subscribers" | "templates" | "automations" | "reports" | "settings";

const SMS_TEMPLATES = [
  { name: "Flash sale", body: "Fockis: {{sale_name}} ends tonight. Shop: {{link}} Reply STOP to opt out." },
  { name: "Order shipped", body: "Your Fockis order {{order_id}} is on its way: {{tracking_link}}" },
  { name: "Seller live", body: "Your Fockis store is live. Share it: {{store_link}}" },
  { name: "Event reminder", body: "{{event_name}} starts in 1 hour on Fockis Live: {{link}}" },
];


export default function SMSMarketingPage() {
  const sms = useAsync(() => channelsApi.smsCampaigns(), []);
  const run = useAction();
  const to = useMarketingPath();
  const [section, setSection] = useState<Section>("campaigns");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState("");
  const [settings, setSettings] = useState({ quietHours: true, stopKeyword: true, doubleOptIn: true });
  const seg = smsSegments(message);
  const { currentBusiness } = useMarketingWorkspace();
  const audiences = useAudiences();
  const [audienceId, setAudienceId] = useState("");
  const [buyOpen, setBuyOpen] = useState(false);
  const [creditNonce, setCreditNonce] = useState(0);
  const [check, setCheck] = useState<CreditCheck | null>(null);
  // Demo assumption: ~30% of an audience has opted in to SMS. The backend supplies real counts.
  const smsAudience = audiences.data?.find((a) => a.id === (audienceId || audiences.data?.[0]?.id));
  const smsRecipients = Math.round((smsAudience?.contactCount ?? 0) * 0.3);
  const requiredCredits = smsRecipients * Math.max(1, seg.parts);

  useEffect(() => {
    if (!open || !currentBusiness || !message) {
      setCheck(null);
      return;
    }
    let live = true;
    const t = window.setTimeout(() => {
      creditsApi.check(currentBusiness.id, "sms", requiredCredits).then((c) => live && setCheck(c)).catch(() => undefined);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [open, currentBusiness, requiredCredits, message, creditNonce]);
  const hasStop = /reply stop/i.test(message);

  return (
    <div className="fm-page">
      <PageHeader title="SMS marketing" description="Short, timely texts for people who opted in to SMS." actions={<Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Create SMS campaign</Button>} />
      <Notice tone="warning">
        No SMS provider is connected, so nothing here sends real texts. This is the interface only. A backend SMS integration (for example, a carrier-approved provider with 10DLC registration) is required. <LinkButton to={to("integrations")} size="sm" variant="ghost">View integrations</LinkButton>
      </Notice>

      <Tabs<Section> label="SMS sections" value={section} onChange={setSection} items={[
        { id: "campaigns", label: "Campaigns" }, { id: "subscribers", label: "Subscribers" }, { id: "templates", label: "Templates" },
        { id: "automations", label: "Automations" }, { id: "reports", label: "Reports" }, { id: "settings", label: "Settings" },
      ]} />

      {section === "campaigns" && (
        <Panel flush>
          {sms.error ? <ErrorState message={sms.error} onRetry={sms.reload} /> : sms.loading ? <SkeletonRows rows={3} cols={5} /> : !sms.data?.length ? (
            <EmptyState icon="message" title="No SMS campaigns" body="Create a text for a flash sale or event reminder." />
          ) : (
            <div className="fm-tablewrap"><table className="fm-table">
              <thead><tr><th scope="col">Campaign</th><th scope="col">Status</th><th scope="col" className="is-num">Recipients</th><th scope="col" className="is-num">Delivered</th><th scope="col" className="is-num">Click rate</th><th scope="col">Scheduled</th></tr></thead>
              <tbody>{sms.data.map((c) => (
                <tr key={c.id}>
                  <td className="fm-table__primary"><strong>{c.name}</strong><span className="fm-table__sub">{c.message}</span></td>
                  <td><Badge tone={CAMPAIGN_STATUS_TONES[c.status]} dot>{CAMPAIGN_STATUS_LABELS[c.status]}</Badge></td>
                  <td className="is-num">{formatNumber(c.recipients)}</td>
                  <td className="is-num">{formatNumber(c.delivered)}</td>
                  <td className="is-num">{c.delivered ? formatPercent(rate(c.clicks, c.delivered)) : "—"}</td>
                  <td>{formatDate(c.scheduledAt)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
      )}

      {section === "subscribers" && (
        <>
          <StatStrip>
            <Stat label="SMS subscribers" value="6,210" sub={<DemoBadge />} />
            <Stat label="Opted in this month" value="+412" />
            <Stat label="Opted out (STOP)" value="38" />
          </StatStrip>
          <Panel title="How people subscribe">
            <ul className="fm-plainlist">
              <li>SMS consent checkbox on Fockis signup forms</li>
              <li>Text keyword “FOCKIS” to your short code (requires provider)</li>
              <li>Checkout opt-in on Fockis Marketplace</li>
            </ul>
          </Panel>
        </>
      )}

      {section === "templates" && (
        <div className="fm-grid fm-grid--cards">
          {SMS_TEMPLATES.map((t) => (
            <Panel key={t.name} title={t.name}>
              <p className="fm-smsbubble">{t.body}</p>
              <Button size="sm" onClick={() => { setMessage(t.body); setName(t.name); setOpen(true); }}>Use template</Button>
            </Panel>
          ))}
        </div>
      )}

      {section === "automations" && (
        <Panel title="SMS steps in automations">
          <p className="fm-muted">Add “Send SMS” steps to any journey. Current journeys with SMS steps:</p>
          <ul className="fm-plainlist"><li>Seller activation: “Send congrats SMS”</li></ul>
          <LinkButton to={to("journeys")} icon="route">Open journeys</LinkButton>
        </Panel>
      )}

      {section === "reports" && (
        <Panel title="Clicks from SMS" description="Last 14 days" actions={<DemoBadge />}>
          <AnalyticsChart title="SMS clicks" series={[{ name: "Clicks", points: dayLabels(14).map((label, i) => ({ label, value: [40, 52, 38, 61, 70, 44, 812, 120, 66, 58, 49, 72, 63, 55][i] })) }]} type="bar" />
        </Panel>
      )}

      {section === "settings" && (
        <Panel title="SMS settings">
          <TextField label="Sender ID or number" placeholder="Assigned by your SMS provider" disabled hint="Available after an SMS provider is connected." />
          <Toggle label="Quiet hours" description="Don't send between 9 PM and 8 AM in the contact's time zone." checked={settings.quietHours} onChange={(v) => setSettings({ ...settings, quietHours: v })} />
          <Toggle label="Append STOP instructions" description="Adds “Reply STOP to opt out” when a message doesn't include it." checked={settings.stopKeyword} onChange={(v) => setSettings({ ...settings, stopKeyword: v })} />
          <Toggle label="Double opt-in" description="Confirm by text before someone is subscribed." checked={settings.doubleOptIn} onChange={(v) => setSettings({ ...settings, doubleOptIn: v })} />
        </Panel>
      )}

      {currentBusiness && (
        <PurchaseCreditsModal open={buyOpen} businessId={currentBusiness.id} businessName={currentBusiness.name} initialChannel="sms" minimumCredits={check?.shortfall ?? 0} onClose={() => setBuyOpen(false)} onPurchased={() => setCreditNonce((n) => n + 1)} />
      )}

      <Modal open={open} title="Create SMS campaign" size="md" onClose={() => setOpen(false)}
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" disabled={!name.trim() || !message.trim() || Boolean(when && check && !check.sufficient)} onClick={async () => {
          const c = await run(() => channelsApi.createSms(name.trim(), message, when ? new Date(when).toISOString() : undefined), when ? "SMS scheduled (UI only, nothing will send)." : "SMS saved as a draft.");
          if (c) { setOpen(false); setName(""); setMessage(""); setWhen(""); sms.reload(); setSection("campaigns"); }
        }}>{when ? "Schedule" : "Save draft"}</Button></>}
      >
        <TextField label="Campaign name" value={name} onChange={(e) => setName(e.target.value)} data-autofocus />
        <TextArea label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} hint={`${seg.chars} characters · ${seg.parts} SMS segment${seg.parts === 1 ? "" : "s"}${seg.unicode ? " · emoji/accents reduce the limit to 70" : ""}`} />
        {!hasStop && message && <Notice tone="warning">Add “Reply STOP to opt out”. Carriers require it for marketing texts.</Notice>}
        <SelectField
          label="Send to"
          value={audienceId || audiences.data?.[0]?.id || ""}
          data-sms-audience
          onChange={(e) => setAudienceId(e.target.value)}
          options={(audiences.data ?? []).map((a) => ({ value: a.id, label: `${a.name} (about ${formatNumber(Math.round(a.contactCount * 0.3))} SMS subscribers)` }))}
          hint={`${formatNumber(smsRecipients)} recipients × ${Math.max(1, seg.parts)} segment${seg.parts > 1 ? "s" : ""} = ${formatNumber(requiredCredits)} SMS credits`}
        />
        <TextField label="Schedule" optional type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        {check && message && <CreditGate check={check} onBuy={() => setBuyOpen(true)} onEditAudience={() => document.querySelector<HTMLSelectElement>("[data-sms-audience]")?.focus()} />}
        {message && <div className="fm-phone"><p className="fm-smsbubble">{message}</p></div>}
      </Modal>
    </div>
  );
}
