import { useState } from "react";
import type { CreditChannel, TransactionType } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { transactionsApi } from "../../services/transactionsApi";
import { TransactionTable } from "../../components/TransactionTable";
import { Button } from "../../components/ui/Button";
import { PageHeader, Panel, Toolbar } from "../../components/ui/Layout";
import { FilterSelect } from "../../components/ui/Field";
import { ErrorState, SkeletonRows } from "../../components/ui/Feedback";
import { TRANSACTION_TYPE_LABELS } from "../../utils/platformLabels";
import { downloadText } from "../../utils/format";

export default function TransactionsPage() {
  const { currentBusiness } = useMarketingWorkspace();
  const id = currentBusiness?.id ?? "";
  const [channel, setChannel] = useState<"all" | CreditChannel>("all");
  const [type, setType] = useState<"all" | TransactionType>("all");
  const [days, setDays] = useState("0");
  const txns = useAsync(() => transactionsApi.list(id, { channel, type, days: Number(days) || undefined }), [id, channel, type, days]);
  const rows = txns.data ?? [];

  return (
    <div className="fm-page">
      <PageHeader title="Transactions" description="Every credit added or used in this workspace." actions={<Button icon="download" disabled={!rows.length} onClick={() => downloadText("credit-transactions.csv", ["date,type,description,channel,credits,status", ...rows.map((t) => [t.createdAt, t.type, `"${t.description}"`, t.channel, t.credits, t.status].join(","))].join("\n"), "text/csv")}>Export CSV</Button>} />
      <Toolbar>
        <FilterSelect label="Channel" value={channel} onChange={(v) => setChannel(v as "all" | CreditChannel)} options={[{ value: "all", label: "Email and SMS" }, { value: "email", label: "Email" }, { value: "sms", label: "SMS" }]} />
        <FilterSelect label="Type" value={type} onChange={(v) => setType(v as "all" | TransactionType)} options={[{ value: "all", label: "All types" }, ...Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} />
        <FilterSelect label="Date" value={days} onChange={setDays} options={[{ value: "0", label: "Any date" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }]} />
      </Toolbar>
      <Panel flush>{txns.error ? <ErrorState message={txns.error} onRetry={txns.reload} /> : txns.loading ? <SkeletonRows rows={8} cols={6} /> : <TransactionTable rows={rows} />}</Panel>
    </div>
  );
}
