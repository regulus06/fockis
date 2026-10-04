import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { MarketingSettings, SendingDomain } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAudiences } from "../hooks/useAudience";
import { useAction, useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import { accountApi } from "../services/mailchimpApi";
import { MARKETING_API_URL, USE_MOCKS } from "../services/httpClient";
import { Badge } from "../components/ui/Badge";
import { Button, LinkButton } from "../components/ui/Button";
import { PageHeader, Panel } from "../components/ui/Layout";
import { SelectField, TextArea, TextField, Toggle } from "../components/ui/Field";
import { ErrorState, Notice, ProgressBar, Skeleton } from "../components/ui/Feedback";
import { ActionMenu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Overlay";
import { Icon, type IconName } from "../components/ui/Icon";
import { cx, formatDate, formatNumber } from "../utils/format";

type Section = "account" | "audience" | "email" | "sending" | "domains" | "tracking" | "notifications" | "integrations" | "security" | "billing";

const SECTIONS: Array<{ id: Section; label: string; icon: IconName }> = [
  { id: "account", label: "Account", icon: "users" },
  { id: "audience", label: "Audience", icon: "users" },
  { id: "email", label: "Email", icon: "mail" },
  { id: "sending", label: "Sending", icon: "send" },
  { id: "domains", label: "Domains", icon: "globe" },
  { id: "tracking", label: "Tracking", icon: "chart" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "integrations", label: "API & integrations", icon: "code" },
  { id: "security", label: "Security", icon: "lock" },
  { id: "billing", label: "Billing", icon: "receipt" },
];

const TIMEZONES = ["America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Asia/Tokyo"];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function RecordStatus({ status }: { status: SendingDomain["dkim"] }) {
  return <Badge tone={status === "valid" ? "green" : status === "pending" ? "amber" : "red"} dot>{status === "valid" ? "Valid" : status === "pending" ? "Pending" : "Missing"}</Badge>;
}

export default function MarketingSettingsPage() {
  const [params, setParams] = useSearchParams();
  const section = (params.get("section") as Section | null) ?? "account";
  const settings = useAsync(() => accountApi.settings(), []);
  const domains = useAsync(() => accountApi.domains(), []);
  const audiences = useAudiences();
  const run = useAction();
  const to = useMarketingPath();
  const { confirm, audienceId } = useMailchimp();
  const [form, setForm] = useState<MarketingSettings | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [dnsFor, setDnsFor] = useState<SendingDomain | null>(null);

  useEffect(() => {
    if (settings.data) setForm(structuredClone(settings.data));
  }, [settings.data]);

  const dirty = form && settings.data && JSON.stringify(form) !== JSON.stringify(settings.data);
  const set = <K extends keyof MarketingSettings>(k: K, v: MarketingSettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const emailError = form && (!EMAIL_RE.test(form.fromEmail) ? "fromEmail" : !EMAIL_RE.test(form.replyTo) ? "replyTo" : null);

  const save = async () => {
    if (!form || emailError) return;
    const saved = await run(() => accountApi.saveSettings(form), "Settings saved.");
    if (saved) settings.setData(saved);
  };

  const domainValid = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(newDomain.trim());

  return (
    <div className="fm-page">
      <PageHeader
        title="Settings"
        description="Defaults and controls for Fockis Marketing."
        actions={section !== "domains" && section !== "integrations" && section !== "billing" ? (
          <>
            {dirty && <Button variant="ghost" onClick={() => settings.data && setForm(structuredClone(settings.data))}>Discard</Button>}
            <Button variant="primary" icon="save" disabled={!dirty || Boolean(emailError)} onClick={save}>Save changes</Button>
          </>
        ) : undefined}
      />

      <div className="fm-settings">
        <nav className="fm-settings__nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className={cx(section === s.id && "is-active")} aria-current={section === s.id ? "page" : undefined} onClick={() => setParams({ section: s.id })}>
              <Icon name={s.icon} size={16} /> {s.label}
            </button>
          ))}
        </nav>

        <div className="fm-settings__body">
          {settings.error ? <ErrorState message={settings.error} onRetry={settings.reload} /> : !form ? <Skeleton height={360} /> : (
            <>
              {section === "account" && (
                <Panel title="Account">
                  <TextField label="Workspace name" value={form.accountName} onChange={(e) => set("accountName", e.target.value)} />
                  <TextField label="Company name" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} hint="Appears in email footers as required by anti-spam laws." />
                  <SelectField label="Time zone" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} options={TIMEZONES.map((t) => ({ value: t, label: t.replace("_", " ") }))} />
                </Panel>
              )}

              {section === "audience" && (
                <Panel title="Audience">
                  <SelectField label="Default audience" value={form.defaultAudienceId} onChange={(e) => set("defaultAudienceId", e.target.value)} options={(audiences.data ?? []).map((a) => ({ value: a.id, label: a.name }))} hint="New contacts and campaigns use this audience unless you pick another." />
                  <Toggle label="Double opt-in" description="New subscribers confirm by email before they're added." checked={form.doubleOptIn} onChange={(v) => set("doubleOptIn", v)} />
                </Panel>
              )}

              {section === "email" && (
                <Panel title="Email defaults">
                  <div className="fm-formgrid">
                    <TextField label="From name" value={form.fromName} onChange={(e) => set("fromName", e.target.value)} />
                    <TextField label="From email" type="email" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} error={emailError === "fromEmail" ? "Enter a valid email address." : undefined} />
                    <TextField className="fm-span-full" label="Reply-to" type="email" value={form.replyTo} onChange={(e) => set("replyTo", e.target.value)} error={emailError === "replyTo" ? "Enter a valid email address." : undefined} />
                  </div>
                  <TextArea label="Footer" rows={3} value={form.footer} onChange={(e) => set("footer", e.target.value)} hint="Include a physical mailing address." />
                  <h4 className="fm-subhead">Unsubscribe</h4>
                  <Toggle label="One-click unsubscribe" description="Adds the List-Unsubscribe header that Gmail and Yahoo require for bulk senders." checked={form.oneClickUnsubscribe} onChange={(v) => set("oneClickUnsubscribe", v)} />
                  <TextArea label="Unsubscribe confirmation message" rows={2} value={form.unsubscribeMessage} onChange={(e) => set("unsubscribeMessage", e.target.value)} />
                </Panel>
              )}

              {section === "sending" && (
                <Panel title="Sending">
                  <TextField label="Daily send limit" type="number" min={0} value={form.dailySendLimit} onChange={(e) => set("dailySendLimit", Number(e.target.value))} hint="Protects your sender reputation during big launches." />
                  <div className="fm-formgrid">
                    <TextField label="Send window starts" type="time" value={form.sendWindowStart} onChange={(e) => set("sendWindowStart", e.target.value)} />
                    <TextField label="Send window ends" type="time" value={form.sendWindowEnd} onChange={(e) => set("sendWindowEnd", e.target.value)} />
                  </div>
                  <Notice>Scheduled campaigns outside this window wait until it opens, in each contact's time zone.</Notice>
                </Panel>
              )}

              {section === "tracking" && (
                <Panel title="Tracking">
                  <Toggle label="Track opens" description="Uses a tracking pixel. Apple Mail Privacy Protection can inflate open counts." checked={form.trackOpens} onChange={(v) => set("trackOpens", v)} />
                  <Toggle label="Track clicks" description="Rewrites links through fockis.com to count clicks." checked={form.trackClicks} onChange={(v) => set("trackClicks", v)} />
                  <Toggle label="Track marketplace revenue" description="Attributes Fockis Marketplace orders to the email that led to them." checked={form.trackEcommerce} onChange={(v) => set("trackEcommerce", v)} />
                </Panel>
              )}

              {section === "notifications" && (
                <Panel title="Notifications">
                  <Toggle label="Campaign sent" description="Email me when a campaign finishes sending." checked={form.notifyOnSend} onChange={(v) => set("notifyOnSend", v)} />
                  <Toggle label="Weekly digest" description="A Monday summary of last week's results." checked={form.notifyWeeklyDigest} onChange={(v) => set("notifyWeeklyDigest", v)} />
                  <Toggle label="Unsubscribe spike" description="Alert me if unsubscribes jump above normal." checked={form.notifyOnUnsubscribeSpike} onChange={(v) => set("notifyOnUnsubscribeSpike", v)} />
                </Panel>
              )}

              {section === "security" && (
                <Panel title="Security">
                  <Toggle label="Require two-factor authentication" description="Everyone with marketing access must use 2FA on their Fockis account." checked={form.twoFactorRequired} onChange={(v) => set("twoFactorRequired", v)} />
                  <Notice>Roles and permissions follow your Fockis organization settings.</Notice>
                </Panel>
              )}

              {section === "billing" && (
                <Panel title="Billing">
                  <dl className="fm-deflist">
                    <div><dt>Plan</dt><dd>{form.plan}</dd></div>
                    <div><dt>Contacts</dt><dd>{formatNumber(48210)} of {formatNumber(form.monthlyContactLimit)}</dd></div>
                  </dl>
                  <ProgressBar value={(48210 / form.monthlyContactLimit) * 100} label="Contact usage" />
                  <div className="fm-row fm-mt-16">
                    <LinkButton to="/subscriptions/billing" icon="receipt">Manage billing</LinkButton>
                    <LinkButton to="/subscriptions/plans" variant="ghost">Compare plans</LinkButton>
                  </div>
                </Panel>
              )}

              {section === "domains" && (
                <Panel title="Sending domains" description="Verify domains you send from so inboxes trust your email." actions={<Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>Add domain</Button>} flush>
                  {domains.loading ? <Skeleton height={160} /> : (
                    <div className="fm-tablewrap">
                      <table className="fm-table">
                        <thead><tr><th scope="col">Domain</th><th scope="col">Verification</th><th scope="col">DKIM</th><th scope="col">SPF</th><th scope="col">DMARC</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
                        <tbody>{(domains.data ?? []).map((d) => (
                          <tr key={d.id}>
                            <td className="fm-table__primary"><strong>{d.domain}</strong><span className="fm-table__sub">Added {formatDate(d.addedAt)}</span></td>
                            <td><Badge tone={d.verified ? "green" : "amber"} dot>{d.verified ? "Verified" : "Unverified"}</Badge></td>
                            <td><RecordStatus status={d.dkim} /></td>
                            <td><RecordStatus status={d.spf} /></td>
                            <td><RecordStatus status={d.dmarc} /></td>
                            <td className="is-actions">
                              <ActionMenu label={`Actions for ${d.domain}`} items={[
                                { label: "View DNS records", icon: "code", onSelect: () => setDnsFor(d) },
                                { label: "Check verification", icon: "refresh", onSelect: async () => { if (await run(() => accountApi.verifyDomain(d.id), `Checked ${d.domain}.`)) domains.reload(); } },
                                { label: "Remove", icon: "trash", danger: true, separated: true, onSelect: async () => {
                                  if (!(await confirm({ title: `Remove ${d.domain}?`, body: "Campaigns from this domain will fail to send.", confirmLabel: "Remove domain", danger: true }))) return;
                                  if ((await run(() => accountApi.removeDomain(d.id), "Domain removed.")) !== undefined) domains.reload();
                                } },
                              ]} />
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              )}

              {section === "integrations" && (
                <>
                  <Panel title="Public frontend configuration" description="Safe to expose. Set as VITE_* variables in web/.env.">
                    <div className="fm-tablewrap"><table className="fm-table">
                      <thead><tr><th scope="col">Variable</th><th scope="col">Value in this build</th><th scope="col">Purpose</th></tr></thead>
                      <tbody>
                        <tr><td><code>VITE_MAILCHIMP_AUDIENCE_ID</code></td><td>{audienceId ? <code>{audienceId}</code> : <span className="fm-muted">Not set</span>}</td><td>Default Mailchimp audience</td></tr>
                        <tr><td><code>VITE_MARKETING_API_URL</code></td><td>{MARKETING_API_URL ? <code>{MARKETING_API_URL}</code> : <span className="fm-muted">Not set (demo mode)</span>}</td><td>Base URL of the marketing backend</td></tr>
                        <tr><td><code>VITE_MARKETING_USE_MOCKS</code></td><td>{USE_MOCKS ? "true" : "false"}</td><td>Force demo data even when a URL is set</td></tr>
                      </tbody>
                    </table></div>
                  </Panel>
                  <Panel title="Secret backend configuration" description="Never put these in the frontend or in any VITE_* variable. Vite bundles VITE_* values into public JavaScript.">
                    <ul className="fm-secrets">
                      {[
                        ["MAILCHIMP_API_KEY", "Mailchimp Marketing API key"],
                        ["MAILCHIMP_SERVER_PREFIX", "Mailchimp data center, e.g. us21"],
                        ["MANDRILL_API_KEY", "Transactional email (if using Mailchimp Transactional)"],
                        ["SMTP_PASSWORD", "SMTP relay password"],
                        ["STRIPE_SECRET_KEY", "Revenue attribution from payments"],
                        ["WEBHOOK_SIGNING_SECRET", "Signs outgoing marketing webhooks"],
                        ["DATABASE_URL", "Marketing data storage"],
                      ].map(([k, v]) => (
                        <li key={k}><Icon name="lock" size={14} /><code>{k}</code><span>{v}</span><Badge tone="red">Backend only</Badge></li>
                      ))}
                    </ul>
                  </Panel>
                  <p className="fm-small"><Link to={to("integrations")}>Manage connected apps</Link></p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={addOpen} title="Add sending domain" size="sm" onClose={() => setAddOpen(false)}
        footer={<><Button onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" disabled={!domainValid} onClick={async () => {
          const d = await run(() => accountApi.addDomain(newDomain.trim().toLowerCase()), "Domain added. Add the DNS records to verify it.");
          if (d) { setAddOpen(false); setNewDomain(""); domains.reload(); setDnsFor(d); }
        }}>Add domain</Button></>}
      >
        <TextField label="Domain" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="mail.yourbrand.com" error={newDomain && !domainValid ? "Enter a domain like mail.example.com." : undefined} data-autofocus />
      </Modal>

      <Modal open={Boolean(dnsFor)} title={`DNS records for ${dnsFor?.domain ?? ""}`} description="Add these at your DNS provider. Changes can take up to 48 hours." size="lg" onClose={() => setDnsFor(null)}>
        {dnsFor && (
          <div className="fm-tablewrap"><table className="fm-table">
            <thead><tr><th scope="col">Type</th><th scope="col">Host</th><th scope="col">Value</th><th scope="col">Status</th></tr></thead>
            <tbody>
              <tr><td>CNAME</td><td><code>fk1._domainkey.{dnsFor.domain}</code></td><td><code className="fm-break">dkim1.mail.fockis.com</code></td><td><RecordStatus status={dnsFor.dkim} /></td></tr>
              <tr><td>TXT</td><td><code>{dnsFor.domain}</code></td><td><code className="fm-break">v=spf1 include:spf.mail.fockis.com ~all</code></td><td><RecordStatus status={dnsFor.spf} /></td></tr>
              <tr><td>TXT</td><td><code>_dmarc.{dnsFor.domain}</code></td><td><code className="fm-break">v=DMARC1; p=none; rua=mailto:dmarc@{dnsFor.domain}</code></td><td><RecordStatus status={dnsFor.dmarc} /></td></tr>
            </tbody>
          </table></div>
        )}
        <Notice>Exact values come from your sending provider via the backend. These are example records.</Notice>
      </Modal>
    </div>
  );
}
