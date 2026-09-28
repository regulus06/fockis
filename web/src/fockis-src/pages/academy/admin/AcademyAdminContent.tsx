import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getContentSections, getContent, createContentItem, updateContentItem, deleteContentItem,
  AcademyApiError, ContentItem, ContentItemInput,
} from '../../../lib/academyApi';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminConfirmDialog from '../../../components/academy/admin/AdminConfirmDialog';
import { useAcademyToast } from '../../../lib/academyToastStore';

// The known section keys from the seed data, so the dropdown is populated
// even before any items exist yet for a given one. getContentSections()
// (distinct query) adds any custom sections a manager has since created.
const KNOWN_SECTIONS = [
  'home-why-us', 'learning-features', 'about-pillars', 'about-facts', 'about-leadership',
  'academics-categories', 'admissions-steps', 'admissions-faq', 'tuition-rates',
  'financial-aid-options', 'student-life-items', 'career-services', 'employer-benefits',
  'library-resources', 'calendar-milestones',
];

function metaToRows(meta?: Record<string, string>): { key: string; value: string }[] {
  return meta ? Object.entries(meta).map(([key, value]) => ({ key, value })) : [];
}
function rowsToMeta(rows: { key: string; value: string }[]): Record<string, string> {
  const meta: Record<string, string> = {};
  rows.forEach((r) => { if (r.key) meta[r.key] = r.value; });
  return meta;
}

export default function AcademyAdminContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sections, setSections] = useState<string[]>(KNOWN_SECTIONS);
  const [activeSection, setActiveSection] = useState(searchParams.get('section') ?? KNOWN_SECTIONS[0]);
  const [newSectionName, setNewSectionName] = useState('');

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<{ title: string; description: string; order: number }>({ title: '', description: '', order: 0 });
  const [metaRows, setMetaRows] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  useEffect(() => {
    getContentSections()
      .then((known) => setSections([...new Set([...KNOWN_SECTIONS, ...known])].sort()))
      .catch(() => {});
  }, []);

  function loadItems(section: string) {
    setLoading(true);
    setError(false);
    getContent(section)
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => loadItems(activeSection), [activeSection]);

  function handleSectionChange(section: string) {
    setActiveSection(section);
    setSearchParams({ section });
  }

  function handleAddSection() {
    const slug = newSectionName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug) return;
    setSections((s) => [...new Set([...s, slug])].sort());
    handleSectionChange(slug);
    setNewSectionName('');
  }

  function openCreate() {
    setEditing(null);
    setForm({ title: '', description: '', order: items.length });
    setMetaRows([]);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(item: ContentItem) {
    setEditing(item);
    setForm({ title: item.title, description: item.description ?? '', order: item.order });
    setMetaRows(metaToRows(item.meta));
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    const dto: ContentItemInput = { section: activeSection, title: form.title, description: form.description || undefined, order: form.order, meta: rowsToMeta(metaRows) };
    try {
      if (editing?._id) {
        await updateContentItem(editing._id, dto);
        showToast('Content item updated.');
      } else {
        await createContentItem(dto);
        showToast('Content item added.');
      }
      setModalOpen(false);
      loadItems(activeSection);
    } catch (err) {
      setFormError(err instanceof AcademyApiError ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      await deleteContentItem(deleteTarget._id);
      showToast('Content item deleted.');
      setDeleteTarget(null);
      loadItems(activeSection);
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to delete.');
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<ContentItem>[] = [
    { key: 'order', label: '#', width: '50px', render: (i) => i.order },
    { key: 'title', label: 'Title', render: (i) => <strong>{i.title}</strong> },
    { key: 'description', label: 'Description', render: (i) => i.description ?? '—' },
    { key: 'meta', label: 'Meta', render: (i) => (i.meta && Object.keys(i.meta).length ? Object.entries(i.meta).map(([k, v]) => `${k}: ${v}`).join(', ') : '—') },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Content Sections</h1><p>Manage every editorial card list across the public site — leadership bios, admissions steps, FAQ, tuition rates, and more.</p></div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ Add Item</button>
      </div>

      <div className="admin-toolbar">
        <select className="admin-filter-select" value={activeSection} onChange={(e) => handleSectionChange(e.target.value)}>
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="New section key…" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} style={{ padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13.5, width: 180 }} />
        <button className="btn btn-outline btn-sm" onClick={handleAddSection} type="button">+ New Section</button>
      </div>

      <AdminTable
        columns={columns} rows={items} rowKey={(i) => i._id ?? i.title} loading={loading} error={error}
        emptyMessage={`No items in "${activeSection}" yet.`} onRetry={() => loadItems(activeSection)}
        renderActions={(i) => (
          <>
            <button className="admin-icon-btn" onClick={() => openEdit(i)}>Edit</button>
            <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(i)}>Delete</button>
          </>
        )}
      />

      <AdminModal open={modalOpen} title={editing ? 'Edit Content Item' : 'Add Content Item'} subtitle={`Section: ${activeSection}`} onClose={() => setModalOpen(false)}>
        {formError && <div className="admin-login-error">{formError}</div>}
        <div className="form-grid">
          <div className="field full"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field full"><label>Description (optional)</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field"><label>Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></div>
        </div>

        <h3 style={{ fontSize: 14, marginTop: 20, marginBottom: 10 }}>Meta (optional key/value extras — e.g. initials, date, price)</h3>
        {metaRows.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input placeholder="key" value={row.key} onChange={(e) => setMetaRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)))} />
            <input placeholder="value" value={row.value} onChange={(e) => setMetaRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))} />
            <button className="admin-icon-btn danger" type="button" onClick={() => setMetaRows((rows) => rows.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" type="button" onClick={() => setMetaRows((rows) => [...rows, { key: '', value: '' }])}>+ Add Meta Field</button>

        <div className="admin-modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}</button>
        </div>
      </AdminModal>

      <AdminConfirmDialog open={!!deleteTarget} title="Delete Content Item" message={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" danger busy={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
