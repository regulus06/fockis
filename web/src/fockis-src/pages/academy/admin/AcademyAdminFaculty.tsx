import { useEffect, useState } from 'react';
import { getFaculty, createFaculty, updateFaculty, deleteFaculty, AcademyApiError, FacultyInput } from '../../../lib/academyApi';
import { FacultyMember } from '../../../types/academy';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminConfirmDialog from '../../../components/academy/admin/AdminConfirmDialog';
import { useAcademyToast } from '../../../lib/academyToastStore';

const EMPTY_FORM: FacultyInput = { name: '', dept: '', pos: '', edu: '', tag: '', bio: '', photoUrl: '' };

type FacultyRow = FacultyMember & { _id?: string };

export default function AcademyAdminFaculty() {
  const [faculty, setFaculty] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FacultyInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FacultyRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getFaculty()
      .then((data) => setFaculty(data as FacultyRow[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = faculty.filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.dept.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(f: FacultyRow) {
    setEditingId(f._id ?? null);
    setForm({ name: f.name, dept: f.dept, pos: f.pos, edu: f.edu, tag: f.tag, bio: '', photoUrl: '' });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateFaculty(editingId, form);
        showToast('Faculty member updated.');
      } else {
        await createFaculty(form);
        showToast('Faculty member added.');
      }
      setModalOpen(false);
      load();
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
      await deleteFaculty(deleteTarget._id);
      showToast('Faculty member removed.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to delete.');
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<FacultyRow>[] = [
    { key: 'name', label: 'Name', render: (f) => <strong>{f.name}</strong> },
    { key: 'pos', label: 'Position', render: (f) => f.pos },
    { key: 'dept', label: 'Department', render: (f) => f.dept },
    { key: 'tag', label: 'Focus', render: (f) => f.tag },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Faculty</h1><p>Manage the faculty directory.</p></div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ Add Faculty</button>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search faculty…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(f) => f._id ?? f.name} loading={loading} error={error}
        emptyMessage={search ? 'No faculty match your search.' : 'No faculty yet — add your first one.'} onRetry={load}
        renderActions={(f) => (
          <>
            <button className="admin-icon-btn" onClick={() => openEdit(f)}>Edit</button>
            <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(f)}>Delete</button>
          </>
        )}
      />
      <AdminModal open={modalOpen} title={editingId ? 'Edit Faculty' : 'Add Faculty'} onClose={() => setModalOpen(false)}>
        {formError && <div className="admin-login-error">{formError}</div>}
        <div className="form-grid">
          <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Position</label><input value={form.pos} onChange={(e) => setForm({ ...form, pos: e.target.value })} /></div>
          <div className="field"><label>Department</label><input value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} /></div>
          <div className="field"><label>Education</label><input value={form.edu} onChange={(e) => setForm({ ...form, edu: e.target.value })} /></div>
          <div className="field full"><label>Focus / Tag</label><input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} /></div>
          <div className="field full"><label>Bio (optional)</label><textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        </div>
        <div className="admin-modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Faculty'}</button>
        </div>
      </AdminModal>
      <AdminConfirmDialog open={!!deleteTarget} title="Remove Faculty Member" message={`Remove "${deleteTarget?.name}"?`} confirmLabel="Delete" danger busy={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
