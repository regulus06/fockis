/**
 * CatalogManager.tsx — Event Settings → Manage (types, categories, locations)
 * and Quick Actions → Event Templates.
 * -----------------------------------------------------------------------------
 * Create, rename, archive and restore items. Archived items stay on the
 * events that use them but are no longer offered in the form. Saved with
 * PUT /events/organization/:id/catalog (event managers only).
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Layers, MapPin, Pencil, Plus, Save, Tag, LayoutTemplate, X, Check } from "lucide-react";

import { errorMessage } from "../ui/orgUi";
import RichTextEditor from "./RichTextEditor";
import {
  orgEventsApi,
  type CatalogItem,
  type CatalogKind,
  type CatalogLocation,
  type CatalogTemplate,
  type EventCatalog,
} from "./orgEventsApi";

const TABS: { id: CatalogKind; label: string; icon: typeof Tag; hint: string }[] = [
  { id: "categories", label: "Event Categories", icon: Tag, hint: "Group events for reports and filters (e.g. Worship, Outreach, Youth)." },
  { id: "types", label: "Event Types", icon: Layers, hint: "Shown in the Type field and the All Events table." },
  { id: "locations", label: "Event Locations", icon: MapPin, hint: "Rooms and venues offered in the Location field." },
  { id: "templates", label: "Event Templates", icon: LayoutTemplate, hint: "Start a new event from saved details. Dates are always chosen fresh." },
];

type AnyItem = CatalogItem & Partial<CatalogLocation> & Partial<CatalogTemplate>;

// Temporary ids for unsaved items; the server names them from the item name.
const newId = () => `new-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function blankTemplate(): CatalogTemplate {
  return {
    id: newId(),
    name: "",
    archived: false,
    title: "",
    eventType: "",
    orgCategory: "",
    description: "",
    durationMinutes: 90,
    locationName: "",
    address: "",
    format: "in_person",
    requireRsvp: false,
    showOnPublicPage: true,
  };
}

export default function CatalogManager({
  organizationId,
  catalog,
  initial,
  onClose,
  onSaved,
  onUseTemplate,
}: {
  organizationId: string;
  catalog: EventCatalog;
  initial: CatalogKind;
  onClose: () => void;
  onSaved: (next: EventCatalog) => void;
  onUseTemplate: (t: CatalogTemplate) => void;
}) {
  const [tab, setTab] = useState<CatalogKind>(initial);
  const [items, setItems] = useState<AnyItem[]>(() => catalog[initial] as AnyItem[]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(catalog[tab] as AnyItem[]);
    setDirty(false);
    setEditing(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visible = useMemo(() => items.filter((i) => showArchived || !i.archived), [items, showArchived]);
  const archivedCount = items.filter((i) => i.archived).length;
  const meta = TABS.find((t) => t.id === tab)!;

  function change(id: string, patch: Partial<AnyItem>) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setDirty(true);
  }

  function add() {
    if (tab === "templates") {
      const t = blankTemplate();
      setItems((list) => [t, ...list]);
      setEditing(t.id);
      setDirty(true);
      return;
    }
    const n = name.trim();
    if (!n) return;
    if (items.some((i) => i.name.toLowerCase() === n.toLowerCase())) {
      setError(`"${n}" already exists.`);
      return;
    }
    const item: AnyItem = tab === "locations" ? { id: newId(), name: n, archived: false, address: address.trim() } : { id: newId(), name: n, archived: false };
    setItems((list) => [...list, item]);
    setName("");
    setAddress("");
    setError(null);
    setDirty(true);
  }

  async function save(): Promise<EventCatalog | null> {
    setSaving(true);
    setError(null);
    try {
      // New ids are created on the server from the names (types and categories keep stable ids).
      const payload = items.map((i) => (i.id.startsWith("new-") ? { ...i, id: "" } : i));
      const next = await orgEventsApi.saveCatalog(organizationId, { [tab]: payload } as Partial<EventCatalog>);
      onSaved(next);
      setItems(next[tab] as AnyItem[]);
      setDirty(false);
      setEditing(null);
      return next;
    } catch (err) {
      setError(errorMessage(err, "Could not save."));
      return null;
    } finally {
      setSaving(false);
    }
  }

  const typeName = (id?: string) => catalog.types.find((t) => t.id === id)?.name ?? "";

  return (
    <div className="oe-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="oe-modal__box oe-catalog" role="dialog" aria-modal="true" aria-labelledby="oe-catalog-title">
        <header className="oe-modal__head">
          <h2 id="oe-catalog-title">Event Settings</h2>
          <button type="button" className="oe-icon-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>

        <nav className="oe-catalog__tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "is-on" : ""}
              onClick={() => {
                if (dirty && !window.confirm("Discard unsaved changes?")) return;
                setTab(t.id);
              }}
            >
              <t.icon aria-hidden="true" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="oe-modal__body">
          <p className="oe-muted">{meta.hint}</p>
          {error && <div className="oe-alert oe-alert--error">{error}</div>}

          {tab !== "templates" ? (
            <form
              className="oe-catalog__add"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <input value={name} maxLength={60} placeholder={tab === "locations" ? "Location name (e.g. Main Sanctuary)" : `New ${tab === "categories" ? "category" : "type"} name`} onChange={(e) => setName(e.target.value)} />
              {tab === "locations" && <input value={address} maxLength={200} placeholder="Address (optional)" onChange={(e) => setAddress(e.target.value)} />}
              <button type="submit" className="oe-btn oe-btn--outline oe-btn--sm" disabled={!name.trim()}>
                <Plus aria-hidden="true" /> Add
              </button>
            </form>
          ) : (
            <button type="button" className="oe-btn oe-btn--outline oe-btn--sm" onClick={add}>
              <Plus aria-hidden="true" /> New template
            </button>
          )}

          <ul className="oe-catalog__list">
            {visible.length === 0 && <li className="oe-empty">{tab === "templates" ? "No templates yet. Create one here or use “Save as template” in the event form." : "Nothing here yet."}</li>}
            {visible.map((i) => (
              <li key={i.id} className={i.archived ? "is-archived" : ""}>
                {editing === i.id ? (
                  tab === "templates" ? (
                    <TemplateEditor t={i as CatalogTemplate} catalog={catalog} onChange={(patch) => change(i.id, patch)} onDone={() => setEditing(null)} />
                  ) : (
                    <div className="oe-catalog__edit">
                      <input autoFocus value={i.name} maxLength={60} onChange={(e) => change(i.id, { name: e.target.value })} aria-label="Name" />
                      {tab === "locations" && <input value={i.address ?? ""} maxLength={200} placeholder="Address" onChange={(e) => change(i.id, { address: e.target.value })} aria-label="Address" />}
                      <button type="button" className="oe-icon-btn" aria-label="Done" onClick={() => setEditing(null)}>
                        <Check />
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    <div className="oe-catalog__name">
                      <strong>{i.name}</strong>
                      {tab === "locations" && i.address && <small>{i.address}</small>}
                      {tab === "templates" && (
                        <small>
                          {[typeName(i.eventType), i.format === "online" ? "Online" : i.format === "hybrid" ? "In person & online" : i.locationName || "In person", `${i.durationMinutes ?? 60} min`].filter(Boolean).join(" · ")}
                        </small>
                      )}
                      {i.archived && <span className="oe-pill">Archived</span>}
                    </div>
                    <div className="oe-catalog__actions">
                      {tab === "templates" && !i.archived && (
                        <button
                          type="button"
                          className="oe-btn oe-btn--primary oe-btn--sm"
                          disabled={dirty}
                          title={dirty ? "Save your changes first" : undefined}
                          onClick={() => {
                            onUseTemplate(i as CatalogTemplate);
                            onClose();
                          }}
                        >
                          Use
                        </button>
                      )}
                      <button type="button" className="oe-icon-btn" aria-label={`Edit ${i.name}`} onClick={() => setEditing(i.id)}>
                        <Pencil />
                      </button>
                      <button type="button" className="oe-icon-btn" aria-label={i.archived ? `Restore ${i.name}` : `Archive ${i.name}`} title={i.archived ? "Restore" : "Archive"} onClick={() => change(i.id, { archived: !i.archived })}>
                        {i.archived ? <ArchiveRestore /> : <Archive />}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {archivedCount > 0 && (
            <button type="button" className="oe-btn oe-btn--link" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </button>
          )}
        </div>

        <footer className="oe-modal__foot">
          <button type="button" className="oe-btn oe-btn--ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="oe-btn oe-btn--primary" disabled={!dirty || saving} onClick={save}>
            <Save aria-hidden="true" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function TemplateEditor({ t, catalog, onChange, onDone }: { t: CatalogTemplate; catalog: EventCatalog; onChange: (p: Partial<CatalogTemplate>) => void; onDone: () => void }) {
  return (
    <div className="oe-tpl">
      <div className="oe-grid">
        <label className="oe-field">
          <span>Template name</span>
          <input value={t.name} maxLength={60} placeholder="e.g. Sunday Service" onChange={(e) => onChange({ name: e.target.value })} />
        </label>
        <label className="oe-field">
          <span>Event title</span>
          <input value={t.title} maxLength={140} onChange={(e) => onChange({ title: e.target.value })} />
        </label>
        <label className="oe-field">
          <span>Type</span>
          <select value={t.eventType} onChange={(e) => onChange({ eventType: e.target.value })}>
            <option value="">—</option>
            {catalog.types.filter((x) => !x.archived).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="oe-field">
          <span>Duration (minutes)</span>
          <input type="number" min={15} max={10080} value={t.durationMinutes} onChange={(e) => onChange({ durationMinutes: Math.max(15, Number(e.target.value) || 60) })} />
        </label>
        <label className="oe-field">
          <span>Format</span>
          <select value={t.format} onChange={(e) => onChange({ format: e.target.value as CatalogTemplate["format"] })}>
            <option value="in_person">In person</option>
            <option value="online">Online only</option>
            <option value="hybrid">In person &amp; online</option>
          </select>
        </label>
        <label className="oe-field">
          <span>Location</span>
          <input value={t.locationName} maxLength={140} disabled={t.format === "online"} onChange={(e) => onChange({ locationName: e.target.value })} />
        </label>
      </div>
      <div className="oe-field">
        <span>Description</span>
        <RichTextEditor value={t.description} onChange={(html) => onChange({ description: html })} />
      </div>
      <div className="oe-tpl__row">
        <label className="oe-check">
          <input type="checkbox" checked={t.requireRsvp} onChange={(e) => onChange({ requireRsvp: e.target.checked })} />
          <span>Require RSVP</span>
        </label>
        <label className="oe-check">
          <input type="checkbox" checked={t.showOnPublicPage} onChange={(e) => onChange({ showOnPublicPage: e.target.checked })} />
          <span>Show on Public Page</span>
        </label>
        <button type="button" className="oe-btn oe-btn--outline oe-btn--sm" onClick={onDone}>
          Done
        </button>
      </div>
      <small className="oe-muted">Meeting links are not saved in templates — paste the link for each event.</small>
    </div>
  );
}
