import { useState } from "react";
import type { ABTest, ABTestVariable, ABVariant } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMailchimp } from "../hooks/useMailchimp";
import { analyticsApi } from "../services/analyticsApi";
import { Badge, DemoBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader, Panel } from "../components/ui/Layout";
import { RangeField, SelectField, TextField } from "../components/ui/Field";
import { EmptyState, ErrorState, Notice, SkeletonCards } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Overlay";
import { cx, formatCurrency, formatNumber, formatPercent } from "../utils/format";

const VARIABLE_LABELS: Record<ABTestVariable, string> = { subject: "Subject line", from_name: "From name", send_time: "Send time", content: "Email content" };
const METRIC_LABELS: Record<ABTest["winnerMetric"], string> = { open_rate: "Open rate", click_rate: "Click rate", conversion_rate: "Conversion rate", revenue: "Revenue" };

/**
 * Two-proportion z-test. Only describes whether the observed difference is
 * likely noise. It never picks a winner: that's the backend's job, using the
 * real send data and the test's stopping rules.
 */
function significance(a: ABVariant, b: ABVariant, metric: "openRate" | "clickRate"): { z: number; significant: boolean } {
  const n1 = a.recipients;
  const n2 = b.recipients;
  if (!n1 || !n2) return { z: 0, significant: false };
  const p1 = a[metric] / 100;
  const p2 = b[metric] / 100;
  const p = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  const z = se ? (p2 - p1) / se : 0;
  return { z, significant: Math.abs(z) >= 1.96 };
}

function VariantColumn({ v, leading }: { v: ABVariant; leading: boolean }) {
  return (
    <div className={cx("fm-variant", leading && "is-leading")}>
      <span className="fm-variant__key">{v.key}</span>
      <p className="fm-variant__value">{v.value}</p>
      <dl>
        <div><dt>Recipients</dt><dd>{formatNumber(v.recipients)}</dd></div>
        <div><dt>Open rate</dt><dd>{v.recipients ? formatPercent(v.openRate) : "—"}</dd></div>
        <div><dt>Click rate</dt><dd>{v.recipients ? formatPercent(v.clickRate) : "—"}</dd></div>
        <div><dt>Conversion</dt><dd>{v.recipients ? formatPercent(v.conversionRate) : "—"}</dd></div>
        <div><dt>Revenue</dt><dd>{v.recipients ? formatCurrency(v.revenue) : "—"}</dd></div>
      </dl>
    </div>
  );
}

export default function ABTestingPage() {
  const tests = useAsync(() => analyticsApi.abTests(), []);
  const run = useAction();
  const { isMock } = useMailchimp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [variable, setVariable] = useState<ABTestVariable>("subject");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [size, setSize] = useState(20);
  const [metric, setMetric] = useState<ABTest["winnerMetric"]>("open_rate");

  const placeholder = variable === "send_time" ? ["Tuesday 9:00 AM", "Thursday 7:00 PM"] : variable === "from_name" ? ["Fockis", "Ama from Fockis"] : variable === "content" ? ["Template: Bold modern", "Template: Clean minimal"] : ["Premium is 30% off", "Your Fockis, without limits"];

  return (
    <div className="fm-page">
      <PageHeader title="A/B testing" description="Send two versions to a slice of your audience, then send the better one to everyone else." actions={<Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Create test</Button>} />
      {isMock && (
        <Notice tone="warning">
          These results are demo data. The significance note below is a quick statistical check, not a decision. Winners are only shown when the backend declares one from real sends.
        </Notice>
      )}

      {tests.error ? <ErrorState message={tests.error} onRetry={tests.reload} /> : tests.loading ? <SkeletonCards count={3} height={260} /> : !tests.data?.length ? (
        <EmptyState icon="flask" title="No tests yet" body="Test a subject line, sender, send time, or design." action={<Button variant="primary" onClick={() => setOpen(true)}>Create test</Button>} />
      ) : (
        <div className="fm-stack">
          {tests.data.map((t) => {
            const [va, vb] = t.variants;
            const key = t.winnerMetric === "click_rate" ? "clickRate" : "openRate";
            const sig = significance(va, vb, key);
            const hasData = va.recipients > 0 && vb.recipients > 0;
            const declared = t.declaredWinner;
            return (
              <Panel
                key={t.id}
                title={t.name}
                description={`Testing ${VARIABLE_LABELS[t.variable].toLowerCase()} · ${t.testSizePct}% of audience · decided by ${METRIC_LABELS[t.winnerMetric].toLowerCase()}`}
                actions={<>{isMock && <DemoBadge />}<Badge tone={t.status === "running" ? "blue" : t.status === "completed" ? "green" : "neutral"} dot>{t.status === "running" ? "Running" : t.status === "completed" ? "Completed" : "Draft"}</Badge></>}
              >
                <div className="fm-variants">
                  <VariantColumn v={va} leading={declared === "A"} />
                  <span className="fm-variants__vs" aria-hidden>vs</span>
                  <VariantColumn v={vb} leading={declared === "B"} />
                </div>
                {declared ? (
                  <Notice tone="success">Variant {declared} was declared the winner by the sending system.</Notice>
                ) : !hasData ? (
                  <Notice>Results appear once the test sends.</Notice>
                ) : (
                  <Notice>
                    No winner declared. On {METRIC_LABELS[t.winnerMetric].toLowerCase()}, the gap between A and B {sig.significant ? "would be unlikely to be chance (95% level)" : "could still be chance"} (z = {sig.z.toFixed(2)}).
                    {isMock && " Based on demo numbers."}
                  </Notice>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <Modal open={open} title="Create A/B test" size="md" onClose={() => setOpen(false)}
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" disabled={!name.trim() || !a.trim() || !b.trim()} onClick={async () => {
          const empty = { recipients: 0, openRate: 0, clickRate: 0, conversionRate: 0, revenue: 0 };
          const created = await run(() => analyticsApi.createAbTest({ name: name.trim(), variable, testSizePct: size, winnerMetric: metric, variants: [{ key: "A", label: "Variant A", value: a.trim(), ...empty }, { key: "B", label: "Variant B", value: b.trim(), ...empty }] }), "Test saved as a draft.");
          if (created) { setOpen(false); setName(""); setA(""); setB(""); tests.reload(); }
        }}>Save test</Button></>}
      >
        <TextField label="Test name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Holiday subject line test" data-autofocus />
        <SelectField label="What are you testing?" value={variable} onChange={(e) => setVariable(e.target.value as ABTestVariable)} options={(Object.keys(VARIABLE_LABELS) as ABTestVariable[]).map((v) => ({ value: v, label: VARIABLE_LABELS[v] }))} />
        <div className="fm-formgrid">
          <TextField label="Variant A" value={a} onChange={(e) => setA(e.target.value)} placeholder={placeholder[0]} />
          <TextField label="Variant B" value={b} onChange={(e) => setB(e.target.value)} placeholder={placeholder[1]} />
        </div>
        <RangeField label="Test group size" value={size} min={10} max={50} step={5} unit="%" onChange={setSize} />
        <p className="fm-field__hint">{size / 2}% get A, {size / 2}% get B, and {100 - size}% get the winner.</p>
        <SelectField label="Decide the winner by" value={metric} onChange={(e) => setMetric(e.target.value as ABTest["winnerMetric"])} options={(Object.keys(METRIC_LABELS) as ABTest["winnerMetric"][]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))} />
      </Modal>
    </div>
  );
}
