import { useEffect, useState } from 'react';
import { getEvents, createEvent, updateEvent, deleteEvent, AcademyApiError, EventInput } from '../../../lib/academyApi';
import { CampusEvent } from '../../../types/academy';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminConfirmDialog from '../../../components/academy/admin/AdminConfirmDialog';
import { useAcademyToast } from '../../../lib/academyToastStore';

const EMPTY_FORM: EventInput = { date: '', d: '', m: '', title: '', loc: '' };

function deriveDM(dateStr: string): { d: string; m: string } {
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return { d: '', m: '' };
  return { d: String(dt.getDate()).padStart(2, '0'), m: dt.toLocaleString('en-US', { month: 'short' }).toUpperCase() };
}

export default function AcademyAdminEvents() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [showPast, setShowPast] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CampusEvent | null>(null);
  const [form, setForm] = useState<EventInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampusEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getEvents(showPast)
      .then(setEvents)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, [showPast]);

  const filtered = events.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()) || e.loc.toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(e: CampusEvent) {
    setEditing(e);
    setForm({ date: e.date ? e.date.slice(0, 10) : '', d: e.d, m: e.m, title: e.title, loc: e.loc });
    setFormError(null);
    setModalOpen(true);
  }

  function handleDateChange(dateStr: string) {
    const { d, m } = deriveDM(dateStr);
    setForm((f) => ({ ...f, date: dateStr, d: d || f.d, m: m || f.m }));
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      if (editing?._id) {
        await updateEvent(editing._id, form);
        showToast('Event updated.');
      } else {
        await createEvent(form);
        showToast('Event created.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof AcademyApiError ? err.message : 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      await deleteEvent(deleteTarget._id);
      showToast('Event deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to delete event.');
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<CampusEvent>[] = [
    { key: 'date', label: 'Date', render: (e) => <span className="mono">{e.m} {e.d}</span> },
    { key: 'title', label: 'Event', render: (e) => <strong>{e.title}</strong> },
    { key: 'loc', label: 'Location', render: (e) => e.loc },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Events</h1><p>Manage campus events shown on the Home page and Career Center.</p></div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ Add Event</button>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Include past events
        </label>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(e) => e._id ?? e.title} loading={loading} error={error}
        emptyMessage={search ? 'No events match your search.' : 'No events yet — add your first one.'} onRetry={load}
        renderActions={(e) => (
          <>
            <button className="admin-icon-btn" onClick={() => openEdit(e)}>Edit</button>
            <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(e)}>Delete</button>
          </>
        )}
      />
      <AdminModal open={modalOpen} title={editing ? 'Edit Event' : 'Add Event'} onClose={() => setModalOpen(false)}>
        {formError && <div className="admin-login-error">{formError}</div>}
        <div className="form-grid">
          <div className="field full"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Date</label><input type="date" value={form.date} onChange={(e) => handleDateChange(e.target.value)} /></div>
          <div className="field"><label>Location / Time</label><input value={form.loc} onChange={(e) => setForm({ ...form, loc: e.target.value })} placeholder="Student Union, 12:00 PM" /></div>
        </div>
        <div className="admin-modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Event'}</button>
        </div>
      </AdminModal>
      <AdminConfirmDialog open={!!deleteTarget} title="Delete Event" message={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" danger busy={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
