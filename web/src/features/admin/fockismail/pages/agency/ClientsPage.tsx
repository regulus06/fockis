import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Business, BusinessSummary } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction, useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { agencyApi } from "../../services/agencyApi";
import { BusinessMark } from "../../components/WorkspaceSwitcher";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Badge } from "../../components/ui/Badge";
import { Button, LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel, Toolbar } from "../../components/ui/Layout";
import { FilterSelect, SearchInput } from "../../components/ui/Field";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui/Feedback";
import { ActionMenu } from "../../components/ui/Menu";
import { BUSINESS_TYPE_LABELS } from "../../utils/platformLabels";
import type { Tone } from "../../utils/labels";
import { formatCurrency, formatNumber, formatPercent, timeAgo } from "../../utils/format";

const STATUS_TONE: Record<Business["status"], Tone> = { active: "green", onboarding: "blue", paused: "amber", archived: "neutral" };
const STATUS_LABEL: Record<Business["status"], string> = { active: "Active", onboarding: "Onboarding", paused: "Paused", archived: "Archived" };

export default function ClientsPage() {
  const navigate = useNavigate();
  const run = useAction();
  const { confirm } = useMailchimp();
  const { switchBusiness, refresh } = useMarketingWorkspace();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const clients = useAsync(async () => {
    const all = await agencyApi.getBusinesses();
    const list = all.filter((b) => !b.isAgencyOwner);
    const sums = await Promise.all(list.map((b) => agencyApi.getBusinessSummary(b.id)));
    return list.map((b, i) => ({ b, s: sums[i] }));
  }, []);

  const rows = useMemo(() => (clients.data ?? []).filter(({ b }) =>
    (status === "all" ? b.status !== "archived" : b.status === status) &&
    (type === "all" || b.type === type) &&
    b.name.toLowerCase().includes(search.toLowerCase()),
  ), [clients.data, search, type, status]);

  const open = (b: Business, path: string = MARKETING_ROUTES.overview) => {
    switchBusiness(b.id);
    navigate(path);
  };

  const actions = (b: Business) => [
    { label: "Open workspace", icon: "layout" as const, onSelect: () => open(b) },
    { label: "View reports", icon: "report" as const, onSelect: () => navigate(`${MARKETING_ROUTES.agencyReports}?client=${b.id}`) },
    { label: "Manage team", icon: "users" as const, onSelect: () => navigate(MARKETING_ROUTES.clientTeam(b.id)) },
    { label: "Edit client", icon: "edit" as const, onSelect: () => navigate(`${MARKETING_ROUTES.client(b.id)}?tab=profile`) },
    ...(b.status !== "archived" ? [{ label: "Archive client", icon: "archive" as const, danger: true, separated: true, onSelect: async () => {
      if (!(await confirm({ title: `Archive ${b.name}?`, body: "Their workspace disappears from the switcher. Data is kept and you can restore it later.", confirmLabel: "Archive client", danger: true }))) return;
      if (await run(() => agencyApi.archiveBusiness(b.id), `${b.name} archived.`)) { clients.reload(); refresh(); }
    } }] : [{ label: "Restore client", icon: "refresh" as const, onSelect: async () => {
      if (await run(() => agencyApi.updateBusiness(b.id, { status: "active" }), `${b.name} restored.`)) { clients.reload(); refresh(); }
    } }]),
  ];

  const summary = (s: BusinessSummary) => s;

  return (
    <div className="fm-page">
      <PageHeader
        title="Clients"
        description="Businesses you run marketing for. Each has its own workspace, audience, and credits."
        actions={<><LinkButton to={MARKETING_ROUTES.newClient} icon="layout">Create workspace</LinkButton><LinkButton to={MARKETING_ROUTES.newClient} variant="primary" icon="plus">Add client</LinkButton></>}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search clients" />
        <FilterSelect label="Business type" value={type} onChange={setType} options={[{ value: "all", label: "All business types" }, ...Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "Active and onboarding" }, { value: "active", label: "Active" }, { value: "onboarding", label: "Onboarding" }, { value: "paused", label: "Paused" }, { value: "archived", label: "Archived" }]} />
      </Toolbar>
      <Panel flush>
        {clients.error ? <ErrorState message={clients.error} onRetry={clients.reload} /> : clients.loading ? <SkeletonRows rows={7} cols={8} /> : rows.length === 0 ? (
          <EmptyState icon="users" title="No clients match" body="Add a client yourself, or convert an approved application." action={<Button onClick={() => { setSearch(""); setType("all"); setStatus("all"); }}>Clear filters</Button>} />
        ) : (
          <div className="fm-tablewrap"><table className="fm-table">
            <thead><tr><th scope="col">Business</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col" className="is-num">Contacts</th><th scope="col" className="is-num">Campaigns</th><th scope="col" className="is-num">Open rate</th><th scope="col" className="is-num">Click rate</th><th scope="col" className="is-num">Revenue</th><th scope="col">Last activity</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
            <tbody>{rows.map(({ b, s }) => {
              const x = summary(s);
              return (
                <tr key={b.id}>
                  <td className="fm-table__primary"><div className="fm-person"><BusinessMark business={b} size={30} /><div><Link to={MARKETING_ROUTES.client(b.id)}>{b.name}</Link><span className="fm-table__sub">{b.profile.serviceArea}</span></div></div></td>
                  <td>{BUSINESS_TYPE_LABELS[b.type]}</td>
                  <td><Badge tone={STATUS_TONE[b.status]} dot>{STATUS_LABEL[b.status]}</Badge></td>
                  <td className="is-num">{formatNumber(x.contacts)}</td>
                  <td className="is-num">{x.campaigns}</td>
                  <td className="is-num">{x.openRate ? formatPercent(x.openRate) : "—"}</td>
                  <td className="is-num">{x.clickRate ? formatPercent(x.clickRate) : "—"}</td>
                  <td className="is-num">{formatCurrency(x.revenue)}</td>
                  <td>{timeAgo(b.lastActivityAt)}</td>
                  <td className="is-actions"><div className="fm-row fm-row--tight"><Button size="sm" onClick={() => open(b)}>Open</Button><ActionMenu items={actions(b)} label={`Actions for ${b.name}`} /></div></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Panel>
    </div>
  );
}
