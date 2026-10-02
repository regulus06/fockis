import { useEffect, useState } from 'react';
import { getStudents, createStudent, updateStudent, deleteStudent, AcademyApiError, StudentInput } from '../../../lib/academyApi';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminConfirmDialog from '../../../components/academy/admin/AdminConfirmDialog';
import { useAcademyToast } from '../../../lib/academyToastStore';

interface StudentRow { _id: string; slug?: string; name: string; email?: string; gpa: number; creditsCompleted: number; attendancePct: number; }

const EMPTY_FORM: StudentInput = { slug: '', name: '', email: '', gpa: 0, creditsCompleted: 0, attendancePct: 0 };

export default function AcademyAdminStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<StudentInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getStudents()
      .then((data) => setStudents(data as StudentRow[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.email ?? '').toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(s: StudentRow) {
    setEditing(s);
    setForm({ slug: s.slug, name: s.name, email: s.email, gpa: s.gpa, creditsCompleted: s.creditsCompleted, attendancePct: s.attendancePct });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateStudent(editing.slug ?? editing._id, form);
        showToast('Student updated.');
      } else {
        await createStudent(form);
        showToast('Student added.');
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
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.slug ?? deleteTarget._id);
      showToast('Student removed.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to delete.');
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<StudentRow>[] = [
    { key: 'name', label: 'Name', render: (s) => <strong>{s.name}</strong> },
    { key: 'email', label: 'Email', render: (s) => s.email ?? '—' },
    { key: 'gpa', label: 'GPA', render: (s) => s.gpa.toFixed(1) },
    { key: 'credits', label: 'Credits', render: (s) => s.creditsCompleted },
    { key: 'attendance', label: 'Attendance', render: (s) => `${s.attendancePct}%` },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Students</h1><p>Manage student profiles and academic stats.</p></div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ Add Student</button>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(s) => s._id} loading={loading} error={error}
        emptyMessage={search ? 'No students match your search.' : 'No students yet — add your first one.'} onRetry={load}
        renderActions={(s) => (
          <>
            <button className="admin-icon-btn" onClick={() => openEdit(s)}>Edit</button>
            <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(s)}>Delete</button>
          </>
        )}
      />
      <AdminModal open={modalOpen} title={editing ? 'Edit Student' : 'Add Student'} onClose={() => setModalOpen(false)}>
        {formError && <div className="admin-login-error">{formError}</div>}
        <div className="form-grid">
          <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Slug (unique id)</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editing} placeholder="e.g. alex-morgan" /></div>
          <div className="field full"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label>GPA</label><input type="number" step="0.1" min={0} max={4} value={form.gpa} onChange={(e) => setForm({ ...form, gpa: Number(e.target.value) })} /></div>
          <div className="field"><label>Credits Completed</label><input type="number" min={0} value={form.creditsCompleted} onChange={(e) => setForm({ ...form, creditsCompleted: Number(e.target.value) })} /></div>
          <div className="field"><label>Attendance %</label><input type="number" min={0} max={100} value={form.attendancePct} onChange={(e) => setForm({ ...form, attendancePct: Number(e.target.value) })} /></div>
        </div>
        <div className="admin-modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Student'}</button>
        </div>
      </AdminModal>
      <AdminConfirmDialog open={!!deleteTarget} title="Remove Student" message={`Remove "${deleteTarget?.name}"? Their enrollments will also be removed.`} confirmLabel="Delete" danger busy={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
