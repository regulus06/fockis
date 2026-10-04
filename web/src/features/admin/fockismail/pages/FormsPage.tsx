import { useEffect, useState } from "react";
import type { FormDisplay, FormField, FormFieldType, SignupForm } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAudiences } from "../hooks/useAudience";
import { useAction, useMailchimp } from "../hooks/useMailchimp";
import { contentApi } from "../services/contentApi";
import { Button, IconButton } from "../components/ui/Button";
import { PageHeader, Panel } from "../components/ui/Layout";
import { Checkbox, SelectField, TextArea, TextField } from "../components/ui/Field";
import { EmptyState, ErrorState, Notice, Skeleton } from "../components/ui/Feedback";
import { ActionMenu } from "../components/ui/Menu";
import { Segmented, Tabs } from "../components/ui/Tabs";
import { Modal } from "../components/ui/Overlay";
import { Icon } from "../components/ui/Icon";
import { FORM_FIELD_LABELS } from "../utils/labels";
import { cx, formatNumber, formatPercent, uid } from "../utils/format";

const DISPLAY_LABELS: Record<FormDisplay, string> = { embed: "Embedded", popup: "Popup", inline: "Inline", landing: "Landing page form" };
const HAS_OPTIONS: FormFieldType[] = ["dropdown", "radio"];

function embedCode(form: SignupForm): string {
  const attrs = `data-form="${form.id}" data-display="${form.display}"`;
  if (form.display === "popup") {
    return `<!-- Fockis popup form: ${form.name} -->\n<script async src="https://forms.fockis.com/v1/embed.js" ${attrs} data-trigger="exit-intent" data-delay="5"></script>`;
  }
  if (form.display === "landing") {
    return `<!-- Use on a Fockis landing page or any page -->\n<a href="https://fockis.com/f/${form.id}">${form.submitLabel}</a>`;
  }
  return `<!-- Fockis ${form.display} form: ${form.name} -->\n<div id="fockis-form-${form.id}"></div>\n<script async src="https://forms.fockis.com/v1/embed.js" ${attrs} data-target="#fockis-form-${form.id}"></script>`;
}

function FieldPreview({ f }: { f: FormField }) {
  const label = <span className="fm-fp__label">{f.label}{f.required && <span aria-hidden> *</span>}</span>;
  switch (f.type) {
    case "checkbox":
    case "consent":
      return <label className="fm-fp fm-fp--check"><input type="checkbox" disabled /> <span>{f.label}</span></label>;
    case "dropdown":
      return <label className="fm-fp">{label}<select disabled><option>{f.options[0] ?? "Choose…"}</option></select></label>;
    case "radio":
      return <fieldset className="fm-fp">{label}{f.options.map((o) => <label key={o} className="fm-fp--check"><input type="radio" disabled name={f.id} /> {o}</label>)}</fieldset>;
    case "address":
      return <label className="fm-fp">{label}<input disabled placeholder="Street, city, postal code" /></label>;
    case "birthday":
      return <label className="fm-fp">{label}<input disabled placeholder="MM / DD" /></label>;
    default:
      return <label className="fm-fp">{label}<input disabled placeholder={f.placeholder} /></label>;
  }
}

export default function FormsPage() {
  const forms = useAsync(() => contentApi.forms(), []);
  const audiences = useAudiences();
  const run = useAction();
  const { confirm, toast } = useMailchimp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<SignupForm | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<"build" | "code">("build");
  const [dirty, setDirty] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!forms.data?.length) return;
    const id = activeId ?? forms.data[0].id;
    const f = forms.data.find((x) => x.id === id) ?? forms.data[0];
    setActiveId(f.id);
    setForm(structuredClone(f));
    setDirty(false);
  }, [activeId, forms.data]);

  const edit = (patch: Partial<SignupForm>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setDirty(true);
  };
  const editField = (id: string, patch: Partial<FormField>) => form && edit({ fields: form.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const moveField = (i: number, d: -1 | 1) => {
    if (!form) return;
    const list = [...form.fields];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    edit({ fields: list });
  };

  const hasEmail = form?.fields.some((f) => f.type === "email");

  return (
    <div className="fm-page">
      <PageHeader title="Forms" description="Signup forms that add people straight to a Fockis audience." actions={<Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>Create form</Button>} />

      {forms.error ? <ErrorState message={forms.error} onRetry={forms.reload} /> : forms.loading ? <Skeleton height={480} /> : !forms.data?.length ? (
        <EmptyState icon="form" title="No forms yet" body="Create a form to grow your audience from your site, a popup, or a landing page." action={<Button variant="primary" onClick={() => setNewOpen(true)}>Create form</Button>} />
      ) : form && (
        <div className="fm-split">
          <nav className="fm-journeylist" aria-label="Forms">
            {forms.data.map((f) => (
              <button key={f.id} type="button" className={cx(f.id === activeId && "is-active")} onClick={() => setActiveId(f.id)}>
                <strong>{f.name}</strong>
                <small>{DISPLAY_LABELS[f.display]} · {formatNumber(f.submissions)} signups · {formatPercent(f.conversionRate)}</small>
              </button>
            ))}
          </nav>

          <div className="fm-stack">
            <div className="fm-journeys__bar">
              <input className="fm-titleinput" aria-label="Form name" value={form.name} onChange={(e) => edit({ name: e.target.value })} />
              <div className="fm-row fm-row--tight">
                <ActionMenu label="Form actions" items={[{ label: "Delete form", icon: "trash", danger: true, onSelect: async () => {
                  if (!(await confirm({ title: `Delete “${form.name}”?`, body: "Sites using its embed code will stop collecting signups.", confirmLabel: "Delete form", danger: true }))) return;
                  if ((await run(() => contentApi.deleteForm(form.id), "Form deleted.")) !== undefined) { setActiveId(null); forms.reload(); }
                } }]} />
                <Button variant="primary" icon="save" disabled={!dirty} onClick={async () => {
                  const saved = await run(() => contentApi.saveForm(form), "Form saved.");
                  if (saved) { setDirty(false); forms.setData((l) => l?.map((x) => (x.id === saved.id ? saved : x))); }
                }}>Save</Button>
              </div>
            </div>

            <Tabs label="Form editor" value={tab} onChange={setTab} items={[{ id: "build", label: "Build" }, { id: "code", label: "Get code" }]} />

            {tab === "build" ? (
              <div className="fm-grid fm-grid--builder">
                <Panel title="Settings & fields">
                  <SelectField label="Audience" value={form.audienceId} onChange={(e) => edit({ audienceId: e.target.value })} options={(audiences.data ?? []).map((a) => ({ value: a.id, label: a.name }))} />
                  <SelectField label="Display" value={form.display} onChange={(e) => edit({ display: e.target.value as FormDisplay })} options={(Object.keys(DISPLAY_LABELS) as FormDisplay[]).map((d) => ({ value: d, label: DISPLAY_LABELS[d] }))} />
                  <TextField label="Title" value={form.title} onChange={(e) => edit({ title: e.target.value })} />
                  <TextArea label="Description" rows={2} value={form.description} onChange={(e) => edit({ description: e.target.value })} />
                  <TextField label="Button label" value={form.submitLabel} onChange={(e) => edit({ submitLabel: e.target.value })} />
                  {!hasEmail && <Notice tone="warning">Add an Email field. Forms can't add contacts without one.</Notice>}
                  <h4 className="fm-subhead">Fields</h4>
                  <ol className="fm-fieldlist">
                    {form.fields.map((f, i) => (
                      <li key={f.id}>
                        <details>
                          <summary>
                            <Icon name="form" size={14} />
                            <span>{f.label || FORM_FIELD_LABELS[f.type]}</span>
                            {f.required && <small>Required</small>}
                          </summary>
                          <TextField label="Label" value={f.label} onChange={(e) => editField(f.id, { label: e.target.value })} />
                          {!["checkbox", "consent", "radio"].includes(f.type) && <TextField label="Placeholder" value={f.placeholder} onChange={(e) => editField(f.id, { placeholder: e.target.value })} />}
                          {HAS_OPTIONS.includes(f.type) && <TextArea label="Options" rows={3} hint="One per line." value={f.options.join("\n")} onChange={(e) => editField(f.id, { options: e.target.value.split("\n") })} />}
                          <Checkbox label="Required" checked={f.required} onChange={(v) => editField(f.id, { required: v })} />
                        </details>
                        <div className="fm-row fm-row--tight">
                          <IconButton icon="arrowUp" label="Move up" disabled={i === 0} onClick={() => moveField(i, -1)} />
                          <IconButton icon="arrowDown" label="Move down" disabled={i === form.fields.length - 1} onClick={() => moveField(i, 1)} />
                          <IconButton icon="trash" label={`Remove ${f.label}`} onClick={() => edit({ fields: form.fields.filter((x) => x.id !== f.id) })} />
                        </div>
                      </li>
                    ))}
                  </ol>
                  <ActionMenu
                    trigger="button"
                    buttonLabel="Add field"
                    items={(Object.keys(FORM_FIELD_LABELS) as FormFieldType[]).map((t) => ({
                      label: FORM_FIELD_LABELS[t],
                      onSelect: () => edit({ fields: [...form.fields, { id: uid("fld"), type: t, label: t === "consent" ? "I agree to receive marketing emails from Fockis." : FORM_FIELD_LABELS[t], placeholder: "", required: t === "email" || t === "consent", options: HAS_OPTIONS.includes(t) ? ["Option 1", "Option 2"] : [] }] }),
                    }))}
                  />
                </Panel>

                <Panel title="Preview" actions={<Segmented label="Preview device" value={device} onChange={setDevice} options={[{ id: "desktop", label: "Desktop", icon: <Icon name="monitor" size={14} /> }, { id: "mobile", label: "Mobile", icon: <Icon name="smartphone" size={14} /> }]} />}>
                  <div className={cx("fm-formpreview", `is-${device}`, `is-${form.display}`)}>
                    <div className="fm-formpreview__page">
                      {form.display === "popup" && <div className="fm-formpreview__scrim" aria-hidden />}
                      <form className="fm-formcard" onSubmit={(e) => { e.preventDefault(); toast("Preview only. Submissions are collected once the form is embedded.", "info"); }}>
                        <h3>{form.title}</h3>
                        <p>{form.description}</p>
                        {form.fields.map((f) => <FieldPreview key={f.id} f={f} />)}
                        <button type="submit" className="fm-formcard__submit">{form.submitLabel}</button>
                      </form>
                    </div>
                  </div>
                </Panel>
              </div>
            ) : (
              <Panel title={`${DISPLAY_LABELS[form.display]} code`} description="Paste this into your site. It loads the form from Fockis and contains no secrets.">
                <Segmented label="Display" value={form.display} onChange={(d) => edit({ display: d })} options={(Object.keys(DISPLAY_LABELS) as FormDisplay[]).map((d) => ({ id: d, label: DISPLAY_LABELS[d] }))} />
                <pre className="fm-code"><code>{embedCode(form)}</code></pre>
                <div className="fm-row">
                  <Button icon="copy" onClick={async () => {
                    try { await navigator.clipboard.writeText(embedCode(form)); toast("Code copied.", "success"); } catch { toast("Couldn't copy. Select the code and copy it manually.", "error"); }
                  }}>Copy code</Button>
                </div>
                <Notice>Backend needed: <code>forms.fockis.com/v1/embed.js</code> and a public submit endpoint that writes to the audience. Save the form before copying the code.</Notice>
              </Panel>
            )}
          </div>
        </div>
      )}

      <Modal open={newOpen} title="Create form" size="sm" onClose={() => setNewOpen(false)}
        footer={<><Button onClick={() => setNewOpen(false)}>Cancel</Button><Button variant="primary" disabled={!newName.trim()} onClick={async () => {
          const f = await run(() => contentApi.createForm(newName.trim(), audiences.data?.[0]?.id ?? "aud_all"), "Form created.");
          if (f) { setNewOpen(false); setNewName(""); forms.reload(); setActiveId(f.id); }
        }}>Create form</Button></>}
      >
        <TextField label="Form name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Footer newsletter signup" data-autofocus />
      </Modal>
    </div>
  );
}
