import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ApplicationMessage, ApplicationStatus } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction, useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { applicationsApi } from "../../services/applicationsApi";
import { plansApi } from "../../services/plansApi";
import { ApplicationSummary, StatusTimeline } from "../../components/ApplicationSummary";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Badge } from "../../components/ui/Badge";
import { Button, LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { SelectField, TextArea } from "../../components/ui/Field";
import { EmptyState, Notice, Skeleton } from "../../components/ui/Feedback";
import { Modal } from "../../components/ui/Overlay";
import { Segmented } from "../../components/ui/Tabs";
import { Icon } from "../../components/ui/Icon";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
  BUSINESS_TYPE_LABELS,
  CONTACT_METHOD_LABELS,
  GOAL_LABELS,
  SERVICE_INFO,
} from "../../utils/platformLabels";
import { formatMoney, planCredits } from "../../utils/credits";
import { cx, formatDateTime } from "../../utils/format";

type Thread = "client_visible" | "internal";

export default function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const run = useAction();
  const { confirm } = useMailchimp();
  const { switchBusiness } = useMarketingWorkspace();
  const app = useAsync(() => applicationsApi.getApplication(applicationId ?? ""), [applicationId]);
  const plans = useAsync(() => plansApi.listPlans(), []);
  const [thread, setThread] = useState<Thread>("client_visible");
  const [kind, setKind] = useState<ApplicationMessage["kind"]>("message");
  const [body, setBody] = useState("");
  const [convertOpen, setConvertOpen] = useState(params.get("convert") === "1");
  const [planId, setPlanId] = useState("plan_starter");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#messages") document.getElementById("messages")?.scrollIntoView({ behavior: "smooth" });
  }, [app.data]);

  if (app.error) return <div className="fm-page"><EmptyState icon="form" title="Application not found" body={app.error} action={<LinkButton to={MARKETING_ROUTES.applications}>Back to applications</LinkButton>} /></div>;
  if (!app.data) return <div className="fm-page"><Skeleton width={320} height={30} /><Skeleton height={420} className="fm-mt-16" /></div>;

  const a = app.data;
  const converted = a.status === "CONVERTED_TO_CLIENT";

  const setStatus = async (status: ApplicationStatus, msg: string, note?: string) => {
    const next = await run(() => applicationsApi.updateApplicationStatus(a.id, status, note), msg);
    if (next) app.setData(next);
  };

  const post = async () => {
    if (!body.trim()) return;
    const next = await run(() => applicationsApi.addMessage(a.id, { visibility: thread, kind: thread === "internal" ? "note" : kind, author: "Elince M.", body: body.trim() }), thread === "internal" ? "Note saved. Only your team can see it." : "Message sent to the business.");
    if (next) {
      app.setData(next);
      setBody("");
    }
  };

  const requestInfo = async () => {
    if (!body.trim() || thread !== "client_visible") {
      setThread("client_visible");
      setKind("question");
      document.getElementById("messages")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    await post();
    await setStatus("MORE_INFORMATION_NEEDED", "Asked the business for more information.");
  };

  const convert = async () => {
    setConverting(true);
    const res = await run(() => applicationsApi.convertToClient(a.id, planId), `${a.business.name} is now a client. Their workspace is ready.`);
    setConverting(false);
    if (res) {
      setConvertOpen(false);
      setParams({});
      app.setData(res.application);
      switchBusiness(res.business.id);
      navigate(MARKETING_ROUTES.client(res.business.id));
    }
  };

  const messages = a.messages.filter((m) => m.visibility === thread);

  return (
    <div className="fm-page">
      <nav className="fm-breadcrumb" aria-label="Breadcrumb">
        <Link to={MARKETING_ROUTES.applications}>Applications</Link>
        <Icon name="chevronRight" size={14} />
        <span aria-current="page">{a.business.name}</span>
      </nav>

      <PageHeader
        title={a.business.name}
        description={`${BUSINESS_TYPE_LABELS[a.business.type]} · ${a.reference} · submitted ${formatDateTime(a.createdAt)}`}
        actions={
          converted ? (
            a.convertedBusinessId && <LinkButton to={MARKETING_ROUTES.client(a.convertedBusinessId)} variant="primary" icon="users">Open client</LinkButton>
          ) : (
            <>
              {a.status === "NEW" && <Button icon="form" onClick={() => setStatus("UNDER_REVIEW", "Marked as under review.")}>Start review</Button>}
              <Button icon="help" onClick={requestInfo}>Request more information</Button>
              {a.status !== "REJECTED" && (
                <Button variant="danger" icon="x" onClick={async () => {
                  if (await confirm({ title: `Reject ${a.business.name}?`, body: "You can still message them afterwards. Consider explaining why.", confirmLabel: "Reject application", danger: true })) setStatus("REJECTED", "Application rejected.");
                }}>Reject</Button>
              )}
              {a.status !== "APPROVED" ? (
                <Button variant="primary" icon="check" onClick={() => setStatus("APPROVED", `Approved ${a.business.name}. You can now create their workspace.`)}>Approve</Button>
              ) : (
                <Button variant="primary" icon="plus" onClick={() => setConvertOpen(true)}>Create client workspace</Button>
              )}
            </>
          )
        }
      >
        <div className="fm-mt-8"><Badge tone={APPLICATION_STATUS_TONES[a.status]} dot>{APPLICATION_STATUS_LABELS[a.status]}</Badge></div>
      </PageHeader>

      <Panel><StatusTimeline app={a} /></Panel>

      <div className="fm-grid fm-grid--main">
        <div className="fm-span-2 fm-stack">
          <Panel title="Application"><ApplicationSummary app={a} /></Panel>
        </div>

        <div className="fm-stack">
          <Panel title="Contact">
            <dl className="fm-deflist">
              <div><dt>Name</dt><dd>{a.contact.fullName}</dd></div>
              <div><dt>Email</dt><dd><a href={`mailto:${a.contact.email}`}>{a.contact.email}</a></dd></div>
              <div><dt>Phone</dt><dd>{a.contact.phone ? <a href={`tel:${a.contact.phone}`}>{a.contact.phone}</a> : "—"}</dd></div>
              <div><dt>Prefers</dt><dd>{CONTACT_METHOD_LABELS[a.contact.preferredMethod]}</dd></div>
            </dl>
            <Button icon="mail" onClick={() => { setThread("client_visible"); document.getElementById("messages")?.scrollIntoView({ behavior: "smooth" }); }}>Contact business</Button>
          </Panel>

          <Panel title="Communication" description="Client-visible messages are shared with the business. Internal notes are for your team only.">
            <div id="messages" />
            <Segmented<Thread> label="Thread" value={thread} onChange={setThread} options={[
              { id: "client_visible", label: `Messages (${a.messages.filter((m) => m.visibility === "client_visible").length})`, icon: <Icon name="message" size={14} /> },
              { id: "internal", label: `Internal notes (${a.messages.filter((m) => m.visibility === "internal").length})`, icon: <Icon name="lock" size={14} /> },
            ]} />
            <ul className={cx("fm-thread", thread === "internal" && "is-internal")}>
              {messages.length === 0 && <li className="fm-muted fm-small">{thread === "internal" ? "No internal notes yet." : "No messages yet. Questions you send appear here and to the business."}</li>}
              {messages.map((m) => (
                <li key={m.id} className={`is-${m.kind}`}>
                  <header><strong>{m.author}</strong><span>{m.kind === "question" ? "Question" : m.kind === "response" ? "Response" : m.kind === "note" ? "Note" : "Message"}</span><time>{formatDateTime(m.at)}</time></header>
                  <p>{m.body}</p>
                </li>
              ))}
            </ul>
            {thread === "client_visible" && (
              <Segmented<ApplicationMessage["kind"]> label="Message type" value={kind} onChange={setKind} options={[{ id: "message", label: "Message" }, { id: "question", label: "Question" }, { id: "response", label: "Log their reply" }]} />
            )}
            <TextArea label={thread === "internal" ? "Add an internal note" : kind === "response" ? "Paste the business's reply" : "Write to the business"} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            {thread === "client_visible" && <Notice>Delivery to the business (email or Fockis Messages) needs the backend. Messages are saved here for now.</Notice>}
            <div className="fm-row fm-row--end"><Button variant="primary" icon={thread === "internal" ? "lock" : "send"} disabled={!body.trim()} onClick={post}>{thread === "internal" ? "Save note" : "Send"}</Button></div>
          </Panel>
        </div>
      </div>

      <Modal
        open={convertOpen && !converted}
        title="Create a Fockis Marketing workspace for this business?"
        onClose={() => { setConvertOpen(false); setParams({}); }}
        size="md"
        footer={<><Button onClick={() => { setConvertOpen(false); setParams({}); }}>Cancel</Button><Button variant="primary" loading={converting} disabled={a.status !== "APPROVED"} onClick={convert}>Create workspace</Button></>}
      >
        {a.status !== "APPROVED" && <Notice tone="warning">Approve the application first.</Notice>}
        <dl className="fm-deflist">
          <div><dt>Business name</dt><dd>{a.business.name}</dd></div>
          <div><dt>Business type</dt><dd>{BUSINESS_TYPE_LABELS[a.business.type]}</dd></div>
          <div><dt>Requested services</dt><dd>{a.services.map((s) => SERVICE_INFO[s].label).join(", ") || "—"}</dd></div>
          <div><dt>Marketing goals</dt><dd>{a.goals.map((g) => GOAL_LABELS[g]).join(", ") || "—"}</dd></div>
        </dl>
        <SelectField
          label="Starting plan"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          options={(plans.data ?? []).map((p) => ({ value: p.planId, label: `${p.planName} · ${planCredits(p, "email")} email / ${planCredits(p, "sms")} SMS · ${formatMoney(p.price)}` }))}
          hint="Sets their starting credit balance. You can change it later."
        />
        <Notice>This creates the business, its marketing workspace, a credit balance, and an owner invite for {a.contact.fullName}.</Notice>
      </Modal>
    </div>
  );
}
