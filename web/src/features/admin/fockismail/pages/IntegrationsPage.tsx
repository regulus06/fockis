import { useState } from "react";
import { Link } from "react-router-dom";
import type { IntegrationCategory, MarketingIntegration } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import { accountApi } from "../services/mailchimpApi";
import { IntegrationCard } from "../components/IntegrationCard";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/Layout";
import { EmptyState, ErrorState, Notice, SkeletonCards } from "../components/ui/Feedback";
import { Drawer } from "../components/ui/Overlay";
import { Tabs } from "../components/ui/Tabs";
import { TextField, Toggle } from "../components/ui/Field";

type Cat = "all" | IntegrationCategory;
const CAT_LABELS: Record<IntegrationCategory, string> = { fockis: "Fockis", email: "Email", payments: "Payments", social: "Social", commerce: "Commerce", developer: "Developer" };

export default function IntegrationsPage() {
  const list = useAsync(() => accountApi.integrations(), []);
  const run = useAction();
  const to = useMarketingPath();
  const { confirm, audienceId, isMock } = useMailchimp();
  const [cat, setCat] = useState<Cat>("all");
  const [config, setConfig] = useState<MarketingIntegration | null>(null);
  const [syncTags, setSyncTags] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");

  const data = (list.data ?? []).filter((i) => cat === "all" || i.category === cat);

  const connect = async (i: MarketingIntegration) => {
    // Real flow: the backend starts OAuth or asks for a key it stores server-side.
    if (await run(() => accountApi.setIntegrationConnected(i.id, true), isMock ? `${i.name} connected (demo).` : `${i.name} connected.`)) list.reload();
  };
  const disconnect = async (i: MarketingIntegration) => {
    if (!(await confirm({ title: `Disconnect ${i.name}?`, body: "Syncing stops right away. Data already in Fockis stays.", confirmLabel: "Disconnect", danger: true }))) return;
    if (await run(() => accountApi.setIntegrationConnected(i.id, false), `${i.name} disconnected.`)) list.reload();
  };

  return (
    <div className="fm-page">
      <PageHeader title="Integrations" description="Connect the tools that feed your audience, revenue, and channels." />
      <Notice>
        Secret keys never touch this page. Connecting sends you through the provider's sign-in, and the Fockis backend stores credentials securely.
      </Notice>
      <Tabs<Cat> label="Category" value={cat} onChange={setCat} variant="pill" items={[{ id: "all", label: "All" }, ...(Object.keys(CAT_LABELS) as IntegrationCategory[]).map((c) => ({ id: c as Cat, label: CAT_LABELS[c] }))]} />
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <SkeletonCards count={6} height={200} /> : data.length === 0 ? (
        <EmptyState icon="plug" title="Nothing in this category" body="Choose another category." />
      ) : (
        <div className="fm-grid fm-grid--cards">
          {data.map((i) => <IntegrationCard key={i.id} integration={i} onConnect={() => connect(i)} onDisconnect={() => disconnect(i)} onConfigure={() => setConfig(i)} />)}
        </div>
      )}

      <Drawer open={Boolean(config)} title={config ? `Configure ${config.name}` : ""} onClose={() => setConfig(null)} footer={<Button variant="primary" onClick={() => { setConfig(null); run(async () => true, "Settings saved."); }}>Save</Button>}>
        {config?.id === "int_mailchimp" && (
          <>
            <TextField label="Audience ID (public)" value={audienceId || "Not set"} readOnly hint="From VITE_MAILCHIMP_AUDIENCE_ID. Audience IDs aren't secret." />
            <TextField label="API key" value="Stored on the Fockis backend" readOnly disabled hint="Mailchimp API keys must never be placed in VITE_* variables." />
            <Toggle label="Sync tags both ways" checked={syncTags} onChange={setSyncTags} />
            <p className="fm-small"><Link to={to("legacy")}>Open the classic Mailchimp panel</Link></p>
          </>
        )}
        {config?.id === "int_webhooks" || config?.category === "developer" ? (
          <>
            <TextField label="Endpoint URL" type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/hooks/fockis" />
            <Notice>Fockis signs each request. The signing secret is shown once by the backend and never stored in the browser.</Notice>
          </>
        ) : config && config.id !== "int_mailchimp" ? (
          <>
            <Toggle label="Sync automatically" description="Pull new data every 15 minutes." checked={syncTags} onChange={setSyncTags} />
            <p className="fm-muted fm-small">Account: {config.connectedAccount}</p>
          </>
        ) : null}
      </Drawer>
    </div>
  );
}
