import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type {
  CampaignDraftInput,
  CampaignType,
  FockisBehaviorFilter,
  SendingDomain,
} from "../types/mailchimp.types";
import { useAction, useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import { useAudiences, useSegments, useTags } from "../hooks/useAudience";
import { campaignsApi } from "../services/campaignsApi";
import { templatesApi } from "../services/templatesApi";
import { accountApi } from "../services/mailchimpApi";
import { creditsApi } from "../services/creditsApi";
import { useMarketingWorkspace } from "../hooks/useMarketingWorkspace";
import { CreditGate } from "../components/CreditMeter";
import { PurchaseCreditsModal } from "../components/PurchaseCreditsModal";
import type { CreditCheck } from "../types/platform.types";
import { EmailBuilder } from "../components/EmailBuilder";
import { Button } from "../components/ui/Button";
import { PageHeader, Panel } from "../components/ui/Layout";
import { SelectField, TextArea, TextField } from "../components/ui/Field";
import { Notice, Skeleton } from "../components/ui/Feedback";
import { Icon, type IconName } from "../components/ui/Icon";
import { TagChip } from "../components/ui/Badge";
import { Modal } from "../components/ui/Overlay";
import {
  CAMPAIGN_TYPE_DESCRIPTIONS,
  CAMPAIGN_TYPE_LABELS,
  FOCKIS_AUDIENCE_LABELS,
  FOCKIS_BEHAVIOR_LABELS,
} from "../utils/labels";
import { cloneDocument, createDocument } from "../utils/emailBlocks";
import { cx, formatNumber } from "../utils/format";

type Step = "type" | "setup" | "design" | "review";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "type", label: "Campaign type" },
  { id: "setup", label: "Setup" },
  { id: "design", label: "Design" },
  { id: "review", label: "Review & send" },
];

const TYPE_ICONS: Record<CampaignType, IconName> = {
  regular: "mail", automated: "zap", ab_test: "flask", plain_text: "text",
  product_promotion: "bag", newsletter: "doc", announcement: "bell", event: "calendar",
  welcome: "sparkle", abandoned_cart: "cart", winback: "refresh", transactional: "receipt",
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function starterDocument(type: CampaignType) {
  switch (type) {
    case "plain_text":
      return createDocument(["text", "text", "footer"]);
    case "product_promotion":
    case "abandoned_cart":
      return createDocument(["logo", "heading", "text", "product_grid", "coupon", "button", "footer"]);
    case "event":
      return createDocument(["logo", "image", "heading", "text", "countdown", "button", "footer"]);
    case "newsletter":
      return createDocument(["logo", "heading", "image", "text", "columns", "button", "divider", "social", "footer"]);
    default:
      return createDocument(["logo", "heading", "text", "button", "footer"]);
  }
}

function emptyDraft(type: CampaignType, defaults: { fromName: string; fromEmail: string; replyTo: string; audienceId: string }): CampaignDraftInput {
  return {
    name: "",
    description: "",
    type,
    fromName: defaults.fromName,
    fromEmail: defaults.fromEmail,
    replyTo: defaults.replyTo,
    subject: "",
    previewText: "",
    audienceId: defaults.audienceId,
    segmentId: "",
    tagIds: [],
    fockisFilters: [],
    content: starterDocument(type),
  };
}

export default function EmailCampaignComposer() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const to = useMarketingPath();
  const run = useAction();
  const { confirm, isMock } = useMailchimp();
  const audiences = useAudiences();
  const segments = useSegments();
  const tags = useTags();

  const editingId = params.get("campaign");
  const step = (params.get("step") as Step | null) ?? (editingId ? "setup" : "type");
  const [campaignId, setCampaignId] = useState<string | null>(editingId);
  const [draft, setDraft] = useState<CampaignDraftInput | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domains, setDomains] = useState<SendingDomain[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [builderKey, setBuilderKey] = useState(0);
  const { currentBusiness } = useMarketingWorkspace();
  const [creditCheck, setCreditCheck] = useState<CreditCheck | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [creditNonce, setCreditNonce] = useState(0);

  // Load an existing campaign, a template, or settings-based defaults.
  useEffect(() => {
    let live = true;
    (async () => {
      const settings = await accountApi.settings();
      const defaults = { fromName: settings.fromName, fromEmail: settings.fromEmail, replyTo: settings.replyTo, audienceId: settings.defaultAudienceId };
      setDomains(await accountApi.domains());
      if (editingId) {
        try {
          const c = await campaignsApi.get(editingId);
          if (!live) return;
          setDraft({
            name: c.name, description: c.description ?? "", type: c.type, fromName: c.fromName, fromEmail: c.fromEmail,
            replyTo: c.replyTo, subject: c.subject, previewText: c.previewText ?? "", audienceId: c.audienceId,
            segmentId: c.segmentId ?? "", tagIds: c.tagIds, fockisFilters: c.fockisFilters ?? [],
            content: c.content ?? starterDocument(c.type),
          });
        } catch {
          if (live) setDraft(emptyDraft("regular", defaults));
        }
        return;
      }
      const templateId = params.get("template");
      const type = (params.get("type") as CampaignType | null) ?? "regular";
      const base = emptyDraft(type, defaults);
      if (templateId) {
        try {
          const t = await templatesApi.get(templateId);
          base.content = cloneDocument(t.document);
          base.name = t.name;
        } catch {
          /* fall back to starter */
        }
      }
      if (live) setDraft(base);
    })();
    return () => {
      live = false;
    };
    // Load once per campaign being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const setStep = (s: Step) => {
    const next = new URLSearchParams(params);
    next.set("step", s);
    if (campaignId) next.set("campaign", campaignId);
    setParams(next);
    window.scrollTo({ top: 0 });
  };

  const update = <K extends keyof CampaignDraftInput>(key: K, value: CampaignDraftInput[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const errors = useMemo(() => {
    const e: Partial<Record<keyof CampaignDraftInput, string>> = {};
    if (!draft) return e;
    if (!draft.name.trim()) e.name = "Give the campaign a name only your team will see.";
    if (!draft.fromName.trim()) e.fromName = "Enter the name people will see in their inbox.";
    if (!EMAIL_RE.test(draft.fromEmail)) e.fromEmail = "Enter a valid email address.";
    if (!EMAIL_RE.test(draft.replyTo)) e.replyTo = "Enter a valid email address.";
    if (!draft.subject.trim()) e.subject = "Add a subject line.";
    if (!draft.audienceId) e.audienceId = "Choose who receives this campaign.";
    return e;
  }, [draft]);
  const setupValid = Object.keys(errors).length === 0;

  const persist = async (): Promise<string | null> => {
    if (!draft) return null;
    setSaving(true);
    const result = campaignId
      ? await run(() => campaignsApi.update(campaignId, draft))
      : await run(() => campaignsApi.create(draft));
    setSaving(false);
    if (!result) return null;
    setCampaignId(result.id);
    return result.id;
  };

  const audience = audiences.data?.find((a) => a.id === draft?.audienceId);
  const segment = segments.data?.find((s) => s.id === draft?.segmentId);
  const recipients = segment?.contactCount ?? audience?.contactCount ?? 0;
  const fromDomain = draft?.fromEmail.split("@")[1] ?? "";
  const domain = domains.find((d) => d.domain === fromDomain);

  const checklist = draft
    ? [
        { ok: setupValid, label: "Setup is complete", detail: setupValid ? `${draft.fromName} <${draft.fromEmail}>` : "Fix the highlighted fields in Setup.", step: "setup" as Step },
        { ok: draft.subject.length > 0 && draft.subject.length <= 60, warn: draft.subject.length > 60, label: "Subject line length", detail: draft.subject.length > 60 ? `${draft.subject.length} characters. Many inboxes cut off after 60.` : `${draft.subject.length} characters`, step: "setup" as Step },
        { ok: draft.previewText.length > 0, warn: !draft.previewText, label: "Preview text", detail: draft.previewText || "Add preview text to improve open rates.", step: "setup" as Step },
        { ok: draft.content.blocks.length > 0, label: "Email has content", detail: `${draft.content.blocks.length} blocks`, step: "design" as Step },
        { ok: draft.content.blocks.some((b) => b.type === "footer"), label: "Unsubscribe footer", detail: draft.content.blocks.some((b) => b.type === "footer") ? "Included" : "Add a Footer block. It's required by anti-spam laws.", step: "design" as Step },
        { ok: Boolean(domain?.verified), warn: !domain, label: "Sending domain", detail: domain ? (domain.verified ? `${domain.domain} is verified` : `${domain.domain} is not verified yet`) : `${fromDomain || "Domain"} isn't set up in Settings → Domains`, step: "setup" as Step },
      ]
    : [];
  // Credits: 1 email credit per recipient. The backend re-checks and deducts on send.
  useEffect(() => {
    if (step !== "review" || !currentBusiness) return;
    let live = true;
    creditsApi.check(currentBusiness.id, "email", recipients).then((c) => live && setCreditCheck(c)).catch(() => live && setCreditCheck(null));
    return () => {
      live = false;
    };
  }, [step, currentBusiness, recipients, creditNonce]);

  const blocking = [
    ...checklist.filter((c) => !c.ok && !c.warn),
    ...(creditCheck && !creditCheck.sufficient ? [{ label: "Email credits" }] : []),
  ];

  const sendNow = async () => {
    const ok = await confirm({
      title: "Send this campaign now?",
      body: `It goes to about ${formatNumber(recipients)} contacts${isMock ? " (demo mode: nothing is actually sent)" : ""}. You can't unsend an email.`,
      confirmLabel: "Send now",
    });
    if (!ok) return;
    const id = await persist();
    if (!id) return;
    const sent = await run(() => campaignsApi.sendNow(id), "Your campaign is sending.");
    if (sent) navigate(to(`campaigns/${id}`));
  };

  const schedule = async () => {
    const id = await persist();
    if (!id) return;
    const res = await run(() => campaignsApi.schedule(id, new Date(scheduleAt).toISOString()), "Campaign scheduled.");
    if (res) navigate(to(`campaigns/${id}`));
  };

  if (!draft) {
    return (
      <div className="fm-page">
        <Skeleton width={280} height={30} />
        <Skeleton height={420} className="fm-mt-16" />
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className={cx("fm-page fm-composer", step === "design" && "is-design")}>
      <PageHeader
        title={editingId ? `Edit “${draft.name || "campaign"}”` : "Create campaign"}
        description={step === "design" ? undefined : "Build and send an email in four steps."}
        actions={
          <>
            <Link to={to("campaigns")} className="fm-btn fm-btn--ghost fm-btn--md">Cancel</Link>
            {step !== "type" && <Button icon="save" loading={saving} disabled={!draft.name.trim()} onClick={async () => { if (await persist()) setTouched(false); }}>Save draft</Button>}
          </>
        }
      />

      <ol className="fm-stepper" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.id} className={cx(i < stepIndex && "is-done", i === stepIndex && "is-current")} aria-current={i === stepIndex ? "step" : undefined}>
            <button type="button" onClick={() => (i <= stepIndex || (setupValid && campaignId) ? setStep(s.id) : undefined)} disabled={i > stepIndex && !(setupValid && campaignId)}>
              <span className="fm-stepper__n">{i < stepIndex ? <Icon name="check" size={13} /> : i + 1}</span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {step === "type" && (
        <>
          <div className="fm-typegrid" role="radiogroup" aria-label="Campaign type">
            {(Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={draft.type === t}
                className={cx("fm-typecard", draft.type === t && "is-active")}
                onClick={() => setDraft((d) => (d ? { ...d, type: t, content: campaignId ? d.content : starterDocument(t) } : d))}
              >
                <span className="fm-typecard__icon"><Icon name={TYPE_ICONS[t]} /></span>
                <strong>{CAMPAIGN_TYPE_LABELS[t]}</strong>
                <span>{CAMPAIGN_TYPE_DESCRIPTIONS[t]}</span>
              </button>
            ))}
          </div>
          {draft.type === "ab_test" && <Notice>After setup, configure your variants on the <Link to={to("ab-testing")}>A/B testing</Link> page.</Notice>}
          {draft.type === "automated" && <Notice>Automated emails send from a trigger. You can also build them in <Link to={to("automations")}>Automations</Link>.</Notice>}
          <div className="fm-wizardfoot">
            <span />
            <Button variant="primary" iconRight="chevronRight" onClick={() => setStep("setup")}>Continue to setup</Button>
          </div>
        </>
      )}

      {step === "setup" && (
        <>
          <div className="fm-grid fm-grid--main">
            <Panel title="Campaign details" className="fm-span-2">
              <div className="fm-formgrid">
                <TextField label="Campaign name" value={draft.name} onChange={(e) => update("name", e.target.value)} error={touched ? errors.name : undefined} placeholder="Fall marketplace picks" />
                <TextField label="Internal description" optional value={draft.description} onChange={(e) => update("description", e.target.value)} placeholder="Notes for your team" />
                <TextField label="From name" value={draft.fromName} onChange={(e) => update("fromName", e.target.value)} error={touched ? errors.fromName : undefined} />
                <TextField label="From email" type="email" value={draft.fromEmail} onChange={(e) => update("fromEmail", e.target.value)} error={touched ? errors.fromEmail : undefined} />
                <TextField label="Reply-to email" type="email" value={draft.replyTo} onChange={(e) => update("replyTo", e.target.value)} error={touched ? errors.replyTo : undefined} />
                <span />
                <TextField
                  className="fm-span-full"
                  label="Subject"
                  value={draft.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  error={touched ? errors.subject : undefined}
                  hint={`${draft.subject.length}/60 characters recommended. Use *|FNAME|* to personalize.`}
                  maxLength={150}
                />
                <TextField className="fm-span-full" label="Preview text" optional value={draft.previewText} onChange={(e) => update("previewText", e.target.value)} hint="Shown after the subject in most inboxes." maxLength={150} />
              </div>
            </Panel>

            <Panel title="Recipients">
              <SelectField
                label="Audience"
                value={draft.audienceId}
                onChange={(e) => update("audienceId", e.target.value)}
                error={touched ? errors.audienceId : undefined}
                options={(audiences.data ?? []).map((a) => ({ value: a.id, label: a.fockisType ? `${a.name} · ${FOCKIS_AUDIENCE_LABELS[a.fockisType]}` : a.name }))}
              />
              <SelectField label="Segment" optional value={draft.segmentId} onChange={(e) => update("segmentId", e.target.value)} options={[{ value: "", label: "Entire audience" }, ...(segments.data ?? []).map((s) => ({ value: s.id, label: `${s.name} (${formatNumber(s.contactCount)})` }))]} />
              <div className="fm-field">
                <span className="fm-field__label">Tags <span className="fm-field__optional">Optional</span></span>
                <div className="fm-chipset">
                  {(tags.data ?? []).map((t) => {
                    const on = draft.tagIds.includes(t.id);
                    return (
                      <button key={t.id} type="button" className={cx("fm-chiptoggle", on && "is-on")} aria-pressed={on} onClick={() => update("tagIds", on ? draft.tagIds.filter((x) => x !== t.id) : [...draft.tagIds, t.id])}>
                        <TagChip name={t.name} color={t.color} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="fm-field">
                <span className="fm-field__label">Fockis activity filters <span className="fm-field__optional">Optional</span></span>
                <div className="fm-chipset">
                  {(Object.keys(FOCKIS_BEHAVIOR_LABELS) as FockisBehaviorFilter[]).map((f) => {
                    const on = draft.fockisFilters.includes(f);
                    return (
                      <button key={f} type="button" className={cx("fm-chiptoggle fm-chiptoggle--text", on && "is-on")} aria-pressed={on} onClick={() => update("fockisFilters", on ? draft.fockisFilters.filter((x) => x !== f) : [...draft.fockisFilters, f])}>
                        {on && <Icon name="check" size={12} />} {FOCKIS_BEHAVIOR_LABELS[f]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="fm-recipients">
                <Icon name="users" size={16} />
                About <strong>{formatNumber(recipients)}</strong> recipients{draft.fockisFilters.length ? " before activity filters" : ""}
              </p>
            </Panel>
          </div>
          <div className="fm-wizardfoot">
            <Button icon="chevronLeft" onClick={() => setStep("type")}>Back</Button>
            <Button
              variant="primary"
              iconRight="chevronRight"
              loading={saving}
              onClick={async () => {
                setTouched(true);
                if (!setupValid) return;
                if (await persist()) setStep("design");
              }}
            >
              Save and design email
            </Button>
          </div>
        </>
      )}

      {step === "design" && (
        <>
          <EmailBuilder
            key={builderKey}
            initial={draft.content}
            campaignId={campaignId ?? undefined}
            subject={draft.subject}
            previewText={draft.previewText}
            fromName={draft.fromName}
            onChange={(content) => setDraft((d) => (d ? { ...d, content } : d))}
            onSave={async (content) => {
              if (!campaignId) return;
              await run(() => campaignsApi.update(campaignId, { content }), "Design saved.");
            }}
          />
          <div className="fm-wizardfoot">
            <Button icon="chevronLeft" onClick={() => { setBuilderKey((k) => k + 1); setStep("setup"); }}>Back to setup</Button>
            <Button variant="primary" iconRight="chevronRight" loading={saving} onClick={async () => { if (await persist()) setStep("review"); }}>
              Review campaign
            </Button>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          <div className="fm-grid fm-grid--main">
            <Panel title="Pre-send checklist" className="fm-span-2">
              <ul className="fm-checklist">
                {checklist.map((c) => (
                  <li key={c.label} className={c.ok ? "is-ok" : c.warn ? "is-warn" : "is-bad"}>
                    <Icon name={c.ok ? "check" : "alert"} size={16} />
                    <div>
                      <strong>{c.label}</strong>
                      <p>{c.detail}</p>
                    </div>
                    {!c.ok && <Button size="sm" variant="ghost" onClick={() => setStep(c.step)}>Fix</Button>}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Summary">
              <dl className="fm-deflist">
                <div><dt>Type</dt><dd>{CAMPAIGN_TYPE_LABELS[draft.type]}</dd></div>
                <div><dt>Subject</dt><dd>{draft.subject}</dd></div>
                <div><dt>Audience</dt><dd>{audience?.name ?? "—"}</dd></div>
                <div><dt>Segment</dt><dd>{segment?.name ?? "Entire audience"}</dd></div>
                <div><dt>Recipients</dt><dd>About {formatNumber(recipients)}</dd></div>
              </dl>
              {creditCheck ? (
                <CreditGate check={creditCheck} onBuy={() => setBuyOpen(true)} onEditAudience={() => setStep("setup")} />
              ) : (
                <Skeleton height={64} />
              )}
              {blocking.length > 0 && <Notice tone="warning">Fix {blocking.length} item{blocking.length === 1 ? "" : "s"} before sending.</Notice>}
              <div className="fm-stack fm-mt-16">
                <Button variant="primary" icon="send" disabled={blocking.length > 0} onClick={sendNow}>Send now</Button>
                <Button icon="calendar" disabled={blocking.length > 0} onClick={() => setScheduleOpen(true)}>Schedule</Button>
                <Button icon="mail" variant="ghost" onClick={() => setStep("design")}>Send a test from the builder</Button>
              </div>
            </Panel>
          </div>
          <div className="fm-wizardfoot">
            <Button icon="chevronLeft" onClick={() => setStep("design")}>Back to design</Button>
            <span />
          </div>
        </>
      )}

      {currentBusiness && (
        <PurchaseCreditsModal
          open={buyOpen}
          businessId={currentBusiness.id}
          businessName={currentBusiness.name}
          initialChannel="email"
          minimumCredits={creditCheck?.shortfall ?? 0}
          onClose={() => setBuyOpen(false)}
          onPurchased={() => setCreditNonce((n) => n + 1)}
        />
      )}

      <Modal
        open={scheduleOpen}
        title="Schedule campaign"
        size="sm"
        onClose={() => setScheduleOpen(false)}
        footer={
          <>
            <Button onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!scheduleAt || new Date(scheduleAt).getTime() < Date.now()} onClick={schedule}>Schedule</Button>
          </>
        }
      >
        <TextField label="Send date and time" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} hint="Uses your browser's time zone." data-autofocus />
        <TextArea label="Note for your team" optional rows={2} placeholder="Why this time?" />
      </Modal>
    </div>
  );
}
