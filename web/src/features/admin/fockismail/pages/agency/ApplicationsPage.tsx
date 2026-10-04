import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ApplicationStatus, MarketingApplication } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction } from "../../hooks/useMailchimp";
import { applicationsApi } from "../../services/applicationsApi";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Badge } from "../../components/ui/Badge";
import { Button, LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel, Toolbar } from "../../components/ui/Layout";
import { FilterSelect, SearchInput } from "../../components/ui/Field";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui/Feedback";
import { ActionMenu, type MenuItem } from "../../components/ui/Menu";
import { Tabs } from "../../components/ui/Tabs";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_TONES, BUDGET_LABELS, BUSINESS_TYPE_LABELS, REQUESTABLE_SERVICES, SERVICE_INFO } from "../../utils/platformLabels";
import { formatDate } from "../../utils/format";

type Tab = "all" | ApplicationStatus;
const TABS: Tab[] = ["all", "NEW", "UNDER_REVIEW", "MORE_INFORMATION_NEEDED", "APPROVED", "REJECTED", "CONVERTED_TO_CLIENT"];

export default function ApplicationsPage() {
  const run = useAction();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [service, setService] = useState("all");
  const [days, setDays] = useState("0");
  const all = useAsync(() => applicationsApi.getApplications({ search, businessType: type, service, days: Number(days) || undefined }), [search, type, service, days]);
  const list = (all.data ?? []).filter((a) => tab === "all" || a.status === tab);
  const count = (s: Tab) => (s === "all" ? all.data?.length : all.data?.filter((a) => a.status === s).length) ?? 0;

  const setStatus = async (a: MarketingApplication, status: ApplicationStatus, msg: string) => {
    if (await run(() => applicationsApi.updateApplicationStatus(a.id, status), msg)) all.reload();
  };

  const actions = (a: MarketingApplication): MenuItem[] => {
    const items: MenuItem[] = [
      { label: "View", icon: "eye", onSelect: () => navigate(MARKETING_ROUTES.application(a.id)) },
      { label: "Contact business", icon: "mail", onSelect: () => navigate(`${MARKETING_ROUTES.application(a.id)}#messages`) },
    ];
    if (a.status === "CONVERTED_TO_CLIENT") {
      if (a.convertedBusinessId) items.push({ label: "Open client", icon: "users", onSelect: () => navigate(MARKETING_ROUTES.client(a.convertedBusinessId ?? "")) });
      return items;
    }
    if (a.status === "NEW") items.push({ label: "Start review", icon: "form", onSelect: () => setStatus(a, "UNDER_REVIEW", `Reviewing ${a.business.name}.`) });
    if (a.status !== "MORE_INFORMATION_NEEDED" && a.status !== "REJECTED") items.push({ label: "Request information", icon: "help", onSelect: () => setStatus(a, "MORE_INFORMATION_NEEDED", "Marked as needing more information. Add your question on the application.") });
    if (a.status !== "APPROVED") items.push({ label: "Approve", icon: "check", onSelect: () => setStatus(a, "APPROVED", `Approved ${a.business.name}.`) });
    if (a.status === "APPROVED") items.push({ label: "Convert to client", icon: "plus", onSelect: () => navigate(`${MARKETING_ROUTES.application(a.id)}?convert=1`) });
    if (a.status !== "REJECTED") items.push({ label: "Reject", icon: "x", danger: true, separated: true, onSelect: () => setStatus(a, "REJECTED", `Rejected ${a.business.name}.`) });
    return items;
  };

  return (
    <div className="fm-page">
      <PageHeader title="Marketing applications" description="Businesses asking Fockis for marketing help. Review, approve, and turn them into client workspaces." actions={<LinkButton to={MARKETING_ROUTES.request} icon="globe">Open public request form</LinkButton>} />
      <Tabs<Tab> label="Application status" value={tab} onChange={setTab} items={TABS.map((s) => ({ id: s, label: s === "all" ? "All" : APPLICATION_STATUS_LABELS[s], count: count(s) }))} />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search business, contact, or reference" />
        <FilterSelect label="Business type" value={type} onChange={setType} options={[{ value: "all", label: "All business types" }, ...Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} />
        <FilterSelect label="Service" value={service} onChange={setService} options={[{ value: "all", label: "Any service" }, ...REQUESTABLE_SERVICES.map((s) => ({ value: s, label: SERVICE_INFO[s].label }))]} />
        <FilterSelect label="Submitted" value={days} onChange={setDays} options={[{ value: "0", label: "Any date" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }]} />
      </Toolbar>
      <Panel flush>
        {all.error ? <ErrorState message={all.error} onRetry={all.reload} /> : all.loading ? <SkeletonRows rows={6} cols={7} /> : list.length === 0 ? (
          <EmptyState icon="form" title="No applications here" body="New requests from /marketing/request appear in this list." action={<Button onClick={() => { setTab("all"); setSearch(""); setType("all"); setService("all"); setDays("0"); }}>Clear filters</Button>} />
        ) : (
          <div className="fm-tablewrap"><table className="fm-table">
            <thead><tr><th scope="col">Business</th><th scope="col">Contact</th><th scope="col">Type</th><th scope="col">Services</th><th scope="col">Budget</th><th scope="col">Status</th><th scope="col">Submitted</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
            <tbody>{list.map((a) => (
              <tr key={a.id}>
                <td className="fm-table__primary"><Link to={MARKETING_ROUTES.application(a.id)}>{a.business.name}</Link><span className="fm-table__sub">{a.reference}</span></td>
                <td>{a.contact.fullName}<span className="fm-table__sub">{a.contact.email}</span></td>
                <td>{BUSINESS_TYPE_LABELS[a.business.type]}</td>
                <td>{a.services.slice(0, 2).map((s) => SERVICE_INFO[s].label).join(", ")}{a.services.length > 2 && <span className="fm-muted"> +{a.services.length - 2}</span>}</td>
                <td>{BUDGET_LABELS[a.budget]}</td>
                <td><Badge tone={APPLICATION_STATUS_TONES[a.status]} dot>{APPLICATION_STATUS_LABELS[a.status]}</Badge></td>
                <td>{formatDate(a.createdAt)}</td>
                <td className="is-actions"><ActionMenu items={actions(a)} label={`Actions for ${a.business.name}`} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Panel>
    </div>
  );
}
