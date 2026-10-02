import { useEffect, useState } from 'react';
import {
  getPrograms, createProgram, updateProgram, deleteProgram,
  getCurriculum, AcademyApiError, ProgramInput,
} from '../../../lib/academyApi';
import { Program, CurriculumRow, ProgramCategory } from '../../../types/academy';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminConfirmDialog from '../../../components/academy/admin/AdminConfirmDialog';
import { useAcademyToast } from '../../../lib/academyToastStore';

const CATEGORIES: ProgramCategory[] = ['technology', 'business', 'healthcare', 'trades'];
const ICONS: Program['icon'][] = ['shield', 'server', 'code', 'briefcase', 'health', 'wrench', 'media'];

const EMPTY_FORM: ProgramInput = { slug: '', name: '', cat: 'technology', level: '', desc: '', icon: 'shield', curriculum: [] };

export default function AcademyAdminPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getPrograms()
      .then(setPrograms)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = programs.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  async function openCreate() {
    setEditingSlug(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  async function openEdit(p: Program) {
    setEditingSlug(p.id);
    setFormError(null);
    setModalOpen(true);
    try {
      const curriculum = await getCurriculum(p.id);
      setForm({ slug: p.id, name: p.name, cat: p.cat, level: p.level, desc: p.desc, icon: p.icon, curriculum });
    } catch {
      setForm({ slug: p.id, name: p.name, cat: p.cat, level: p.level, desc: p.desc, icon: p.icon, curriculum: [] });
    }
  }

  function updateCurriculumRow(i: number, field: keyof CurriculumRow, value: string) {
    setForm((f) => ({ ...f, curriculum: f.curriculum.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)) }));
  }
  function addCurriculumRow() {
    setForm((f) => ({ ...f, curriculum: [...f.curriculum, { code: '', name: '', credits: '' }] }));
  }
  function removeCurriculumRow(i: number) {
    setForm((f) => ({ ...f, curriculum: f.curriculum.filter((_, idx) => idx !== i) }));
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      if (editingSlug) {
        await updateProgram(editingSlug, form);
        showToast('Program updated.');
      } else {
        await createProgram(form);
        showToast('Program created.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof AcademyApiError ? err.message : 'Failed to save program.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProgram(deleteTarget.id);
      showToast('Program deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to delete program.');
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<Program>[] = [
    { key: 'name', label: 'Program', render: (p) => <strong>{p.name}</strong> },
    { key: 'slug', label: 'Slug', render: (p) => <span className="mono">{p.id}</span> },
    { key: 'cat', label: 'Category', render: (p) => p.cat },
    { key: 'level', label: 'Level', render: (p) => p.level },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Programs</h1>
          <p>Manage academic programs and their curricula.</p>
        </div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ Add Program</button>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <input placeholder="Search programs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => p.id}
        loading={loading}
        error={error}
        emptyMessage={search ? 'No programs match your search.' : 'No programs yet — add your first one.'}
        onRetry={load}
        renderActions={(p) => (
          <>
            <button className="admin-icon-btn" onClick={() => openEdit(p)}>Edit</button>
            <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(p)}>Delete</button>
          </>
        )}
      />

      <AdminModal open={modalOpen} title={editingSlug ? 'Edit Program' : 'Add Program'} onClose={() => setModalOpen(false)}>
        {formError && <div className="admin-login-error">{formError}</div>}
        <div className="form-grid">
          <div className="field">
            <label>Slug</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editingSlug} placeholder="cyber" />
          </div>
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value as ProgramCategory })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Icon</label>
            <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value as Program['icon'] })}>
              {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="field full">
            <label>Level</label>
            <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Associate & Bachelor's" />
          </div>
          <div className="field full">
            <label>Description</label>
            <textarea rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          </div>
        </div>

        <h3 style={{ fontSize: 14, marginTop: 20, marginBottom: 10 }}>Curriculum</h3>
        {form.curriculum.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.6fr auto', gap: 8, marginBottom: 8 }}>
            <input placeholder="Code" value={row.code} onChange={(e) => updateCurriculumRow(i, 'code', e.target.value)} />
            <input placeholder="Course name" value={row.name} onChange={(e) => updateCurriculumRow(i, 'name', e.target.value)} />
            <input placeholder="Credits" value={row.credits} onChange={(e) => updateCurriculumRow(i, 'credits', e.target.value)} />
            <button className="admin-icon-btn danger" onClick={() => removeCurriculumRow(i)} type="button">✕</button>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" onClick={addCurriculumRow} type="button">+ Add Course Row</button>

        <div className="admin-modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editingSlug ? 'Save Changes' : 'Create Program'}
          </button>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={!!deleteTarget}
        title="Delete Program"
        message={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
