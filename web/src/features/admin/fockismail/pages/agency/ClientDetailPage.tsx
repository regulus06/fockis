import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Business, BusinessType, CreditChannel, MarketingGoal, ServiceKey, ServiceStatus } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction } from "../../hooks/useMailchimp";
import { useMarketingWorkspace, useViewer } from "../../hooks/useMarketingWorkspace";
import { agencyApi } from "../../services/agencyApi";
import { creditsApi } from "../../services/creditsApi";
import { plansApi } from "../../services/plansApi";
import { BusinessMark } from "../../components/WorkspaceSwitcher";
import { CreditAlert, CreditMeter } from "../../components/CreditMeter";
import { PurchaseCreditsModal } from "../../components/PurchaseCreditsModal";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Badge } from "../../components/ui/Badge";
import { Button, LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel, Stat, StatStrip } from "../../components/ui/Layout";
import { ColorField, FilterSelect, SelectField, TextArea, TextField, Toggle } from "../../components/ui/Field";
import { EmptyState, Notice, Skeleton } from "../../components/ui/Feedback";
import { Modal } from "../../components/ui/Overlay";
import { Tabs } from "../../components/ui/Tabs";
import { Icon, type IconName } from "../../components/ui/Icon";
import { BUSINESS_TYPE_LABELS, GOAL_LABELS, SERVICE_INFO, SERVICE_STATUS_LABELS, SERVICE_STATUS_TONES } from "../../utils/platformLabels";
import { creditThresholds } from "../../data/billingMockData";
import { formatMoney } from "../../utils/credits";
import { cx, formatCurrency, formatDate, formatNumber, formatPercent } from "../../utils/format";

type Tab = "overview" | "profile" | "services" | "credits";

const SECTIONS: Array<{ label: string; path: string; icon: IconName }> = [
  { label: "Overview", path: "/marketing/mailchimp", icon: "home" },
  { label: "Customers", path: "/marketing/mailchimp/audience", icon: "users" },
  { label: "Campaigns", path: "/marketing/mailchimp/campaigns", icon: "send" },
  { label: "Automations", path: "/marketing/mailchimp/automations", icon: "zap" },
  { label: "Journeys", path: "/marketing/mailchimp/journeys", icon: "route" },
  { label: "Templates", path: "/marketing/mailchimp/templates", icon: "layout" },
  { label: "Forms", path: "/marketing/mailchimp/forms", icon: "form" },
  { label: "Reports", path: "/marketing/mailchimp/reports", icon: "report" },
  { label: "Analytics", path: "/marketing/mailchimp/analytics", icon: "chart" },
  { label: "Billing & credits", path: "/marketing/billing", icon: "receipt" },
  { label: "Settings", path: "/marketing/mailchimp/settings", icon: "settings" },
];

const TIMEZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Africa/Lagos", "Africa/Accra"];
const CURRENCIES = ["USD", "CAD", "GBP", "EUR", "NGN", "GHS", "KES"];

export default function ClientDetailPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab | null) ?? "overview";
  const navigate = useNavigate();
  const run = useAction();
  const { can } = useViewer();
  const { switchBusiness, refresh } = useMarketingWorkspace();
  const business = useAsync(() => agencyApi.getBusiness(clientId), [clientId]);
  const summary = useAsync(() => agencyApi.getBusinessSummary(clientId), [clientId]);
  const balance = useAsync(() => creditsApi.getBalance(clientId), [clientId]);
  const plans = useAsync(() => plansApi.listAllPlans(), []);
  const [form, setForm] = useState<Business | null>(null);
  const [buy, setBuy] = useState<CreditChannel | null>(null);
  const [adjust, setAdjust] = useState<{ channel: CreditChannel; credits: string; reason: string } | null>(null);
  const [custom, setCustom] = useState<{ name: string; email: string; sms: string; price: string } | null>(null);

  useEffect(() => {
    if (business.data) setForm(structuredClone(business.data));
  }, [business.data]);

  if (business.error) return <div className="fm-page"><EmptyState icon="users" title="Client not found" body={business.error} action={<LinkButton to={MARKETING_ROUTES.clients}>Back to clients</LinkButton>} /></div>;
  if (!business.data || !form) return <div className="fm-page"><Skeleton width={300} height={32} /><Skeleton height={300} className="fm-mt-16" /></div>;

  const b = business.data;
  const s = summary.data;
  const plan = plans.data?.find((p) => p.planId === (balance.data?.planId ?? b.planId));
  const dirty = JSON.stringify(form) !== JSON.stringify(b);
  const go = (path: string) => {
    switchBusiness(b.id);
    navigate(path);
  };
  const setProfile = <K extends keyof Business["profile"]>(k: K, v: Business["profile"][K]) => setForm({ ...form, profile: { ...form.profile, [k]: v } });

  const saveProfile = async () => {
    const next = await run(() => agencyApi.updateBusiness(b.id, form), "Business profile saved.");
    if (next) {
      business.setData(next);
      refresh();
    }
  };

  return (
    <div className="fm-page">
      <nav className="fm-breadcrumb" aria-label="Breadcrumb">
        <Link to={MARKETING_ROUTES.clients}>Clients</Link><Icon name="chevronRight" size={14} /><span aria-current="page">{b.name}</span>
      </nav>
      <PageHeader
        title={b.name}
        description={`${BUSINESS_TYPE_LABELS[b.type]} · client since ${formatDate(b.createdAt)}`}
        actions={<><LinkButton to={MARKETING_ROUTES.clientTeam(b.id)} icon="users">Manage team</LinkButton><Button variant="primary" icon="layout" onClick={() => go(MARKETING_ROUTES.overview)}>Open workspace</Button></>}
      >
        <div className="fm-row fm-row--wrap fm-mt-8">
          <BusinessMark business={b} size={28} />
          <Badge tone={b.status === "active" ? "green" : b.status === "onboarding" ? "blue" : "amber"} dot>{b.status[0].toUpperCase() + b.status.slice(1)}</Badge>
          {plan && <Badge tone="violet">{plan.planName}</Badge>}
        </div>
      </PageHeader>

      <Tabs<Tab> label="Client" value={tab} onChange={(t) => setParams({ tab: t })} items={[{ id: "overview", label: "Overview" }, { id: "profile", label: "Business profile" }, { id: "services", label: "Services" }, { id: "credits", label: "Plan & credits" }]} />

      {tab === "overview" && (
        <>
          <StatStrip>
            <Stat label="Customers" value={s ? formatNumber(s.contacts) : "—"} />
            <Stat label="Campaigns" value={s ? s.campaigns : "—"} sub={s ? `${s.activeCampaigns} scheduled` : undefined} />
            <Stat label="Open rate" value={s?.openRate ? formatPercent(s.openRate) : "—"} />
            <Stat label="Click rate" value={s?.clickRate ? formatPercent(s.clickRate) : "—"} />
            <Stat label="Revenue" value={s ? formatCurrency(s.revenue) : "—"} />
          </StatStrip>
          {balance.data && (
            <>
              <CreditAlert balance={balance.data} channel="email" thresholds={creditThresholds} onBuy={() => setBuy("email")} />
              <CreditAlert balance={balance.data} channel="sms" thresholds={creditThresholds} onBuy={() => setBuy("sms")} />
            </>
          )}
          <Panel title="Workspace" description={`Opening a section switches the workspace to ${b.name}.`}>
            <div className="fm-sectiongrid">
              {SECTIONS.map((x) => (
                <button key={x.label} type="button" className="fm-sectiontile" onClick={() => go(x.path)}>
                  <Icon name={x.icon} />
                  <span>{x.label}</span>
                </button>
              ))}
              <button type="button" className="fm-sectiontile" onClick={() => navigate(MARKETING_ROUTES.clientTeam(b.id))}><Icon name="users" /><span>Team</span></button>
            </div>
          </Panel>
          <Panel title="About">
            <dl className="fm-deflist">
              <div><dt>Description</dt><dd>{b.profile.description || "—"}</dd></div>
              <div><dt>Goals</dt><dd>{b.profile.goals.map((g) => GOAL_LABELS[g]).join(", ") || "—"}</dd></div>
              <div><dt>Website</dt><dd>{b.profile.website ? <a href={b.profile.website} target="_blank" rel="noreferrer">{b.profile.website}</a> : "—"}</dd></div>
              <div><dt>Default sender</dt><dd>{b.profile.defaultSenderName} &lt;{b.profile.defaultSenderEmail}&gt;</dd></div>
            </dl>
          </Panel>
        </>
      )}

      {tab === "profile" && (
        <>
          <div className="fm-grid fm-grid--two">
            <Panel title="Business">
              <div className="fm-logoedit">
                <BusinessMark business={form} size={56} />
                <label className="fm-btn fm-btn--secondary fm-btn--sm">
                  <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, logo: URL.createObjectURL(f) }); }} />
                  Upload logo
                </label>
                {form.logo && <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, logo: "" })}>Remove</Button>}
              </div>
              <p className="fm-field__hint">Logos preview locally. Saving permanently needs the Fockis upload service.</p>
              <TextField label="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <SelectField label="Business type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as BusinessType })} options={Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
              <TextArea label="Description" rows={3} value={form.profile.description} onChange={(e) => setProfile("description", e.target.value)} />
              <div className="fm-formgrid">
                <TextField label="Website" value={form.profile.website} onChange={(e) => setProfile("website", e.target.value)} />
                <TextField label="Phone" value={form.profile.phone} onChange={(e) => setProfile("phone", e.target.value)} />
                <TextField label="Email" type="email" value={form.profile.email} onChange={(e) => setProfile("email", e.target.value)} />
                <TextField label="Service area" value={form.profile.serviceArea} onChange={(e) => setProfile("serviceArea", e.target.value)} />
                <TextField className="fm-span-full" label="Address" value={form.profile.address} onChange={(e) => setProfile("address", e.target.value)} />
                <SelectField label="Time zone" value={form.profile.timezone} onChange={(e) => setProfile("timezone", e.target.value)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
                <SelectField label="Currency" value={form.profile.currency} onChange={(e) => setProfile("currency", e.target.value)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
              </div>
            </Panel>
            <div className="fm-stack">
              <Panel title="Brand">
                <div className="fm-formgrid">
                  {form.profile.brandColors.map((c, i) => (
                    <ColorField key={i} label={`Brand color ${i + 1}`} value={c} onChange={(v) => setProfile("brandColors", form.profile.brandColors.map((x, j) => (j === i ? v : x)))} />
                  ))}
                </div>
                <div className="fm-row">
                  {form.profile.brandColors.length < 4 && <Button size="sm" icon="plus" onClick={() => setProfile("brandColors", [...form.profile.brandColors, "#64748b"])}>Add color</Button>}
                  {form.profile.brandColors.length > 1 && <Button size="sm" variant="ghost" onClick={() => setProfile("brandColors", form.profile.brandColors.slice(0, -1))}>Remove last</Button>}
                </div>
                <TextField label="Brand fonts" value={form.profile.brandFonts.join(", ")} onChange={(e) => setProfile("brandFonts", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} hint="Separate with commas." />
                <div className="fm-formgrid">
                  <TextField label="Instagram" value={form.profile.social.instagram ?? ""} onChange={(e) => setProfile("social", { ...form.profile.social, instagram: e.target.value })} />
                  <TextField label="Facebook" value={form.profile.social.facebook ?? ""} onChange={(e) => setProfile("social", { ...form.profile.social, facebook: e.target.value })} />
                  <TextField label="TikTok" value={form.profile.social.tiktok ?? ""} onChange={(e) => setProfile("social", { ...form.profile.social, tiktok: e.target.value })} />
                  <TextField label="Fockis page" value={form.profile.social.fockis ?? ""} onChange={(e) => setProfile("social", { ...form.profile.social, fockis: e.target.value })} />
                </div>
              </Panel>
              <Panel title="Email defaults">
                <TextField label="Default sender name" value={form.profile.defaultSenderName} onChange={(e) => setProfile("defaultSenderName", e.target.value)} />
                <TextField label="Default sender email" type="email" value={form.profile.defaultSenderEmail} onChange={(e) => setProfile("defaultSenderEmail", e.target.value)} />
                <TextField label="Reply-to email" type="email" value={form.profile.replyToEmail} onChange={(e) => setProfile("replyToEmail", e.target.value)} />
              </Panel>
            </div>
          </div>
          <Panel title="Marketing goals">
            <div className="fm-chipset">
              {(Object.keys(GOAL_LABELS) as MarketingGoal[]).map((g) => {
                const on = form.profile.goals.includes(g);
                return <button key={g} type="button" aria-pressed={on} className={cx("fm-chiptoggle fm-chiptoggle--text", on && "is-on")} onClick={() => setProfile("goals", on ? form.profile.goals.filter((x) => x !== g) : [...form.profile.goals, g])}>{on && <Icon name="check" size={12} />} {GOAL_LABELS[g]}</button>;
              })}
            </div>
          </Panel>
          <Panel title="Business hours" flush>
            <div className="fm-tablewrap"><table className="fm-table">
              <thead><tr><th scope="col">Day</th><th scope="col">Open</th><th scope="col">Close</th><th scope="col">Closed</th></tr></thead>
              <tbody>{form.profile.hours.map((h, i) => (
                <tr key={h.day}>
                  <th scope="row">{h.day}</th>
                  <td><input className="fm-input" type="time" aria-label={`${h.day} open`} value={h.open} disabled={h.closed} onChange={(e) => setProfile("hours", form.profile.hours.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} /></td>
                  <td><input className="fm-input" type="time" aria-label={`${h.day} close`} value={h.close} disabled={h.closed} onChange={(e) => setProfile("hours", form.profile.hours.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} /></td>
                  <td><Toggle label={`Closed on ${h.day}`} checked={h.closed} onChange={(v) => setProfile("hours", form.profile.hours.map((x, j) => (j === i ? { ...x, closed: v } : x)))} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          </Panel>
          <div className="fm-wizardfoot">
            <Button variant="ghost" disabled={!dirty} onClick={() => setForm(structuredClone(b))}>Discard changes</Button>
            <Button variant="primary" icon="save" disabled={!dirty || !form.name.trim()} onClick={saveProfile}>Save profile</Button>
          </div>
        </>
      )}

      {tab === "services" && (
        <Panel title="Agency services" description="What the Fockis team is doing for this client." flush>
          <ul className="fm-servicelist">
            {(Object.keys(SERVICE_INFO) as ServiceKey[]).map((key) => (
              <li key={key}>
                <div>
                  <strong>{SERVICE_INFO[key].label}</strong>
                  <p>{SERVICE_INFO[key].description}</p>
                </div>
                <Badge tone={SERVICE_STATUS_TONES[b.services[key]]} dot>{SERVICE_STATUS_LABELS[b.services[key]]}</Badge>
                <FilterSelect label={`${SERVICE_INFO[key].label} status`} value={b.services[key]} onChange={async (v) => {
                  const next = await run(() => agencyApi.setService(b.id, key, v as ServiceStatus), `${SERVICE_INFO[key].label}: ${SERVICE_STATUS_LABELS[v as ServiceStatus].toLowerCase()}.`);
                  if (next) business.setData(next);
                }} options={(Object.keys(SERVICE_STATUS_LABELS) as ServiceStatus[]).map((x) => ({ value: x, label: SERVICE_STATUS_LABELS[x] }))} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === "credits" && (
        <>
          {!balance.data ? <Skeleton height={200} /> : (
            <div className="fm-grid fm-grid--two">
              <Panel title="Email credits"><CreditMeter balance={balance.data} channel="email" thresholds={creditThresholds} /><CreditAlert balance={balance.data} channel="email" thresholds={creditThresholds} onBuy={() => setBuy("email")} /></Panel>
              <Panel title="SMS credits"><CreditMeter balance={balance.data} channel="sms" thresholds={creditThresholds} /><CreditAlert balance={balance.data} channel="sms" thresholds={creditThresholds} onBuy={() => setBuy("sms")} /></Panel>
            </div>
          )}
          <Panel title="Plan" actions={<Button size="sm" onClick={() => go(MARKETING_ROUTES.plans)}>Change plan</Button>}>
            {plan ? (
              <dl className="fm-deflist">
                <div><dt>Plan</dt><dd>{plan.planName} <Badge>{plan.kind.replace("_", " ")}</Badge></dd></div>
                <div><dt>Price</dt><dd>{formatMoney(plan.price)} / {plan.billingCycle}</dd></div>
                <div><dt>Renews</dt><dd>{balance.data ? formatDate(balance.data.renewalDate) : "—"}</dd></div>
                <div><dt>Billing status</dt><dd>{balance.data?.billingStatus.replace("_", " ") ?? "—"}</dd></div>
              </dl>
            ) : <Skeleton height={80} />}
          </Panel>
          {can("billing.manage_client_credits") ? (
            <Panel title="Agency controls" description="Adjustments are recorded in the client's credit ledger.">
              <div className="fm-row fm-row--wrap">
                <Button icon="plus" onClick={() => setBuy("email")}>Buy credits for client</Button>
                <Button icon="edit" onClick={() => setAdjust({ channel: "email", credits: "", reason: "" })}>Adjust credits</Button>
                <Button icon="star" onClick={() => setCustom({ name: `${b.name} custom plan`, email: "20000", sms: "2000", price: "" })}>Create custom plan</Button>
              </div>
            </Panel>
          ) : <Notice>You don't have permission to manage this client's credits.</Notice>}
        </>
      )}

      <PurchaseCreditsModal open={Boolean(buy)} businessId={b.id} businessName={b.name} initialChannel={buy ?? "email"} onClose={() => setBuy(null)} onPurchased={balance.reload} />

      <Modal open={Boolean(adjust)} title="Adjust credits" description={`For ${b.name}. Use negative numbers to remove credits.`} size="sm" onClose={() => setAdjust(null)}
        footer={adjust && <><Button onClick={() => setAdjust(null)}>Cancel</Button><Button variant="primary" disabled={!Number(adjust.credits) || !adjust.reason.trim()} onClick={async () => {
          const res = await run(() => creditsApi.adjust(b.id, adjust.channel, Math.round(Number(adjust.credits)), adjust.reason.trim()), "Credits adjusted.");
          if (res) { setAdjust(null); balance.setData(res); }
        }}>Apply adjustment</Button></>}
      >
        {adjust && (
          <>
            <SelectField label="Credit type" value={adjust.channel} onChange={(e) => setAdjust({ ...adjust, channel: e.target.value as CreditChannel })} options={[{ value: "email", label: "Email credits" }, { value: "sms", label: "SMS credits" }]} />
            <TextField label="Credits" type="number" value={adjust.credits} onChange={(e) => setAdjust({ ...adjust, credits: e.target.value })} placeholder="500 or -200" />
            <TextField label="Reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} placeholder="Goodwill credit for delayed launch" hint="Shown in the client's transaction history." />
          </>
        )}
      </Modal>

      <Modal open={Boolean(custom)} title="Create custom plan" description={`A plan only ${b.name} can use.`} size="sm" onClose={() => setCustom(null)}
        footer={custom && <><Button onClick={() => setCustom(null)}>Cancel</Button><Button variant="primary" disabled={!custom.name.trim() || !Number(custom.email)} onClick={async () => {
          const p = await run(() => plansApi.createCustomPlan(b.id, { planName: custom.name.trim(), emailCredits: Number(custom.email), smsCredits: Number(custom.sms) || 0, priceDollars: custom.price ? Number(custom.price) : null }), "Custom plan created. Switch the client to it from Plans.");
          if (p) { setCustom(null); plans.reload(); }
        }}>Create plan</Button></>}
      >
        {custom && (
          <>
            <TextField label="Plan name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <div className="fm-formgrid">
              <TextField label="Email credits / month" type="number" value={custom.email} onChange={(e) => setCustom({ ...custom, email: e.target.value })} />
              <TextField label="SMS credits / month" type="number" value={custom.sms} onChange={(e) => setCustom({ ...custom, sms: e.target.value })} />
            </div>
            <TextField label="Monthly price (USD)" optional type="number" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} hint="Leave blank to set pricing in Stripe later." />
          </>
        )}
      </Modal>
    </div>
  );
}
