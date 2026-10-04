import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Journey } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction } from "../hooks/useMailchimp";
import { automationApi } from "../services/automationApi";
import { JourneyBuilder } from "../components/JourneyBuilder";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/Layout";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Overlay";
import { TextField } from "../components/ui/Field";
import { AUTOMATION_STATUS_TONES } from "../utils/labels";
import { cx, formatNumber, formatPercent, rate, timeAgo } from "../utils/format";

export default function JourneysPage() {
  const journeys = useAsync(() => automationApi.journeys(), []);
  const run = useAction();
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState<Journey | null>(null);
  const [dirty, setDirty] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const activeId = params.get("id") ?? journeys.data?.[0]?.id;

  useEffect(() => {
    const j = journeys.data?.find((x) => x.id === activeId);
    setDraft(j ? structuredClone(j) : null);
    setDirty(false);
  }, [activeId, journeys.data]);

  const save = async (patch: Partial<Journey> = {}, message = "Journey saved.") => {
    if (!draft) return;
    const saved = await run(() => automationApi.saveJourney({ ...draft, ...patch }), message);
    if (saved) {
      setDraft(saved);
      setDirty(false);
      journeys.setData((list) => list?.map((j) => (j.id === saved.id ? saved : j)));
    }
  };

  return (
    <div className="fm-page fm-journeys">
      <PageHeader
        title="Customer journeys"
        description="Map multi-step experiences that react to what people do on Fockis."
        actions={<Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>New journey</Button>}
      />

      {journeys.error ? (
        <ErrorState message={journeys.error} onRetry={journeys.reload} />
      ) : journeys.loading ? (
        <Skeleton height={480} />
      ) : !journeys.data?.length ? (
        <EmptyState icon="route" title="No journeys yet" body="Start with a trigger like “User signs up,” then add emails, waits, and conditions." action={<Button variant="primary" onClick={() => setNewOpen(true)}>New journey</Button>} />
      ) : (
        <div className="fm-journeys__layout">
          <nav className="fm-journeylist" aria-label="Journeys">
            {journeys.data.map((j) => (
              <button key={j.id} type="button" className={cx(j.id === activeId && "is-active")} aria-current={j.id === activeId ? "true" : undefined} onClick={() => setParams({ id: j.id })}>
                <strong>{j.name}</strong>
                <span className="fm-row">
                  <Badge tone={AUTOMATION_STATUS_TONES[j.status]} dot>{j.status === "active" ? "Active" : j.status === "paused" ? "Paused" : "Draft"}</Badge>
                  <small>{formatNumber(j.entered)} entered</small>
                </span>
              </button>
            ))}
          </nav>

          {draft && (
            <section className="fm-journeys__main" aria-label={draft.name}>
              <div className="fm-journeys__bar">
                <div>
                  <input className="fm-titleinput" value={draft.name} aria-label="Journey name" onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setDirty(true); }} />
                  <p className="fm-muted fm-small">
                    {formatNumber(draft.entered)} entered · {formatPercent(rate(draft.completed, draft.entered))} completed · edited {timeAgo(draft.updatedAt)}
                  </p>
                </div>
                <div className="fm-row fm-row--tight">
                  {draft.status === "active" ? (
                    <Button icon="pause" onClick={() => save({ status: "paused" }, "Journey paused. Contacts already inside wait where they are.")}>Pause</Button>
                  ) : (
                    <Button icon="play" onClick={() => save({ status: "active" }, "Journey is live.")}>Turn on</Button>
                  )}
                  <Button variant="primary" icon="save" disabled={!dirty} onClick={() => save()}>Save</Button>
                </div>
              </div>
              <JourneyBuilder journey={draft} onChange={(j) => { setDraft(j); setDirty(true); }} />
            </section>
          )}
        </div>
      )}

      <Modal open={newOpen} title="New journey" size="sm" onClose={() => setNewOpen(false)}
        footer={<><Button onClick={() => setNewOpen(false)}>Cancel</Button><Button variant="primary" disabled={!newName.trim()} onClick={async () => {
          const j = await run(() => automationApi.createJourney(newName.trim()), "Journey created.");
          if (j) { setNewOpen(false); setNewName(""); journeys.reload(); setParams({ id: j.id }); }
        }}>Create journey</Button></>}
      >
        <TextField label="Journey name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Creator onboarding" data-autofocus />
      </Modal>
    </div>
  );
}
