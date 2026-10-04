import { useState } from "react";
import type { LandingPage, LandingPageSection, LandingPageStatus } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMailchimp } from "../hooks/useMailchimp";
import { contentApi } from "../services/contentApi";
import { LandingPagePreview } from "../components/LandingPagePreview";
import { Badge } from "../components/ui/Badge";
import { Button, IconButton } from "../components/ui/Button";
import { PageHeader, Panel, Toolbar } from "../components/ui/Layout";
import { ColorField, SearchInput, TextArea, TextField } from "../components/ui/Field";
import { EmptyState, ErrorState, SkeletonRows } from "../components/ui/Feedback";
import { ActionMenu, type MenuItem } from "../components/ui/Menu";
import { Modal } from "../components/ui/Overlay";
import { Segmented, Tabs } from "../components/ui/Tabs";
import { Icon } from "../components/ui/Icon";
import type { Tone } from "../utils/labels";
import { formatDate, formatNumber, formatPercent, rate, uid } from "../utils/format";

type TabId = "all" | LandingPageStatus;
const STATUS_TONE: Record<LandingPageStatus, Tone> = { draft: "neutral", published: "green", archived: "amber" };
const SECTION_LABELS: Record<LandingPageSection["kind"], string> = { hero: "Hero", features: "Features", form: "Signup form", testimonial: "Testimonial", cta: "Call to action", products: "Products" };

export default function LandingPagesPage() {
  const pages = useAsync(() => contentApi.landingPages(), []);
  const run = useAction();
  const { confirm } = useMailchimp();
  const [tab, setTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LandingPage | null>(null);
  const [previewing, setPreviewing] = useState<LandingPage | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const data = pages.data ?? [];
  const list = data.filter((p) => (tab === "all" || p.status === tab) && p.name.toLowerCase().includes(search.toLowerCase()));
  const count = (s: LandingPageStatus) => data.filter((p) => p.status === s).length;

  const setStatus = async (p: LandingPage, status: LandingPageStatus, msg: string) => {
    if (await run(() => contentApi.setLandingStatus(p.id, status), msg)) pages.reload();
  };

  const actions = (p: LandingPage): MenuItem[] => [
    { label: "Edit", icon: "edit", onSelect: () => setEditing(structuredClone(p)) },
    { label: "Preview", icon: "eye", onSelect: () => setPreviewing(p) },
    p.status === "published"
      ? { label: "Unpublish", icon: "pause", onSelect: () => setStatus(p, "draft", `Unpublished “${p.name}”.`) }
      : { label: "Publish", icon: "globe", onSelect: () => setStatus(p, "published", `Published at fockis.com/p/${p.slug}.`) },
    { label: "Duplicate", icon: "copy", onSelect: async () => { if (await run(() => contentApi.duplicateLandingPage(p.id), `Duplicated “${p.name}”.`)) pages.reload(); } },
    ...(p.status !== "archived" ? [{ label: "Archive", icon: "archive" as const, separated: true, onSelect: () => setStatus(p, "archived", `Archived “${p.name}”.`) }] : []),
    { label: "Delete", icon: "trash", danger: true, onSelect: async () => {
      if (!(await confirm({ title: `Delete “${p.name}”?`, body: "Its URL will stop working.", confirmLabel: "Delete page", danger: true }))) return;
      if ((await run(() => contentApi.deleteLandingPage(p.id), "Page deleted.")) !== undefined) pages.reload();
    } },
  ];

  const editSection = (id: string, patch: Partial<LandingPageSection>) =>
    setEditing((e) => e && { ...e, sections: e.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  return (
    <div className="fm-page">
      <PageHeader title="Landing pages" description="Simple pages that turn visitors into subscribers and customers." actions={<Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>Create page</Button>} />
      <Tabs<TabId> label="Page status" value={tab} onChange={setTab} items={[{ id: "all", label: "All", count: data.length }, { id: "draft", label: "Drafts", count: count("draft") }, { id: "published", label: "Published", count: count("published") }, { id: "archived", label: "Archived", count: count("archived") }]} />
      <Toolbar><SearchInput value={search} onChange={setSearch} placeholder="Search pages" /></Toolbar>
      <Panel flush>
        {pages.error ? <ErrorState message={pages.error} onRetry={pages.reload} /> : pages.loading ? <SkeletonRows rows={5} cols={6} /> : list.length === 0 ? (
          <EmptyState icon="globe" title="No pages here" body="Create a page for a launch, offer, or waitlist." action={<Button variant="primary" onClick={() => setNewOpen(true)}>Create page</Button>} />
        ) : (
          <div className="fm-tablewrap">
            <table className="fm-table">
              <thead><tr><th scope="col">Page</th><th scope="col">Status</th><th scope="col" className="is-num">Visits</th><th scope="col" className="is-num">Signups</th><th scope="col" className="is-num">Conversion</th><th scope="col">Updated</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td className="fm-table__primary"><button type="button" className="fm-linkbtn" onClick={() => setEditing(structuredClone(p))}>{p.name}</button><span className="fm-table__sub">fockis.com/p/{p.slug}</span></td>
                    <td><Badge tone={STATUS_TONE[p.status]} dot>{p.status[0].toUpperCase() + p.status.slice(1)}</Badge></td>
                    <td className="is-num">{formatNumber(p.visits)}</td>
                    <td className="is-num">{formatNumber(p.signups)}</td>
                    <td className="is-num">{p.visits ? formatPercent(rate(p.signups, p.visits)) : "—"}</td>
                    <td>{formatDate(p.updatedAt)}</td>
                    <td className="is-actions"><ActionMenu items={actions(p)} label={`Actions for ${p.name}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal open={Boolean(previewing)} title={previewing?.name ?? ""} size="xl" onClose={() => setPreviewing(null)}>
        {previewing && <LandingPagePreview page={previewing} />}
      </Modal>

      <Modal
        open={Boolean(editing)}
        title={editing ? `Edit “${editing.name}”` : ""}
        size="xl"
        onClose={() => setEditing(null)}
        footer={editing && (
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={async () => { const s = await run(() => contentApi.saveLandingPage(editing), "Page saved."); if (s) { pages.reload(); setEditing(null); } }}>Save draft</Button>
            <Button variant="primary" icon="globe" onClick={async () => { const s = await run(() => contentApi.saveLandingPage({ ...editing, status: "published" }), `Published at fockis.com/p/${editing.slug}.`); if (s) { pages.reload(); setEditing(null); } }}>Save and publish</Button>
          </>
        )}
      >
        {editing && (
          <div className="fm-lpbuilder">
            <div className="fm-lpbuilder__controls">
              <TextField label="Page name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <TextField label="URL" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} hint={`fockis.com/p/${editing.slug}`} />
              <ColorField label="Accent color" value={editing.accent} onChange={(v) => setEditing({ ...editing, accent: v })} />
              <h4 className="fm-subhead">Sections</h4>
              {editing.sections.map((s, i) => (
                <details key={s.id} className="fm-eb-group" open={i === 0}>
                  <summary>{SECTION_LABELS[s.kind]}</summary>
                  <TextField label="Heading" value={s.heading} onChange={(e) => editSection(s.id, { heading: e.target.value })} />
                  <TextArea label="Body" rows={2} value={s.body} onChange={(e) => editSection(s.id, { body: e.target.value })} />
                  <TextField label="Button label" optional value={s.buttonLabel} onChange={(e) => editSection(s.id, { buttonLabel: e.target.value })} />
                  <div className="fm-row fm-row--tight">
                    <IconButton icon="arrowUp" label="Move up" disabled={i === 0} onClick={() => { const l = [...editing.sections]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; setEditing({ ...editing, sections: l }); }} />
                    <IconButton icon="arrowDown" label="Move down" disabled={i === editing.sections.length - 1} onClick={() => { const l = [...editing.sections]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; setEditing({ ...editing, sections: l }); }} />
                    <IconButton icon="trash" label="Remove section" disabled={editing.sections.length === 1} onClick={() => setEditing({ ...editing, sections: editing.sections.filter((x) => x.id !== s.id) })} />
                  </div>
                </details>
              ))}
              <ActionMenu trigger="button" buttonLabel="Add section" items={(Object.keys(SECTION_LABELS) as LandingPageSection["kind"][]).map((k) => ({ label: SECTION_LABELS[k], onSelect: () => setEditing({ ...editing, sections: [...editing.sections, { id: uid("sec"), kind: k, heading: SECTION_LABELS[k], body: "", buttonLabel: k === "form" ? "Sign up" : k === "cta" ? "Get started" : "" }] }) }))} />
            </div>
            <div className="fm-lpbuilder__preview">
              <Segmented label="Preview device" value={device} onChange={setDevice} options={[{ id: "desktop", label: "Desktop", icon: <Icon name="monitor" size={14} /> }, { id: "mobile", label: "Mobile", icon: <Icon name="smartphone" size={14} /> }]} />
              <div className={device === "mobile" ? "fm-lpframe is-mobile" : "fm-lpframe"}><LandingPagePreview page={editing} /></div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={newOpen} title="Create landing page" size="sm" onClose={() => setNewOpen(false)}
        footer={<><Button onClick={() => setNewOpen(false)}>Cancel</Button><Button variant="primary" disabled={!newName.trim()} onClick={async () => {
          const p = await run(() => contentApi.createLandingPage(newName.trim()), "Page created.");
          if (p) { setNewOpen(false); setNewName(""); pages.reload(); setEditing(p); }
        }}>Create page</Button></>}
      >
        <TextField label="Page name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Holiday gift guide" data-autofocus />
      </Modal>
    </div>
  );
}
