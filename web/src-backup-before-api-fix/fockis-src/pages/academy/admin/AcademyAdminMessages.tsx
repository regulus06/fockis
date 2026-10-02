import { useEffect, useState } from 'react';
import { getContactMessages, updateContactMessageStatus, deleteContactMessage, AcademyApiError } from '../../../lib/academyApi';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminConfirmDialog from '../../../components/academy/admin/AdminConfirmDialog';
import AdminStatusBadge from '../../../components/academy/admin/AdminStatusBadge';
import { useAcademyToast } from '../../../lib/academyToastStore';

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  createdAt: string;
}

export default function AcademyAdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewing, setViewing] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getContactMessages()
      .then((data) => setMessages(data as ContactMessage[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = messages.filter((m) => {
    const matchesSearch = `${m.name} ${m.subject} ${m.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function openView(m: ContactMessage) {
    setViewing(m);
    if (m.status === 'new') {
      try {
        await updateContactMessageStatus(m._id, 'in_progress');
        load();
      } catch {
        /* non-critical — viewing still works even if the status update fails */
      }
    }
  }

  async function handleStatusChange(id: string, status: ContactMessage['status']) {
    try {
      await updateContactMessageStatus(id, status);
      showToast('Message status updated.');
      setViewing((v) => (v ? { ...v, status } : v));
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to update message.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContactMessage(deleteTarget._id);
      showToast('Message deleted.');
      setDeleteTarget(null);
      setViewing(null);
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to delete message.');
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<ContactMessage>[] = [
    { key: 'name', label: 'From', render: (m) => <strong>{m.name}</strong> },
    { key: 'subject', label: 'Subject', render: (m) => m.subject },
    { key: 'status', label: 'Status', render: (m) => <AdminStatusBadge status={m.status} /> },
    { key: 'date', label: 'Received', render: (m) => new Date(m.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Contact Messages</h1><p>Messages submitted through the public contact form.</p></div>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search messages…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="admin-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(m) => m._id} loading={loading} error={error}
        emptyMessage={search || statusFilter !== 'all' ? 'No messages match your filters.' : 'No messages yet.'} onRetry={load}
        renderActions={(m) => (
          <>
            <button className="admin-icon-btn" onClick={() => openView(m)}>View</button>
            <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(m)}>Delete</button>
          </>
        )}
      />
      <AdminModal open={!!viewing} title={viewing?.subject ?? ''} subtitle={viewing ? `From ${viewing.name} · ${viewing.email} · ${viewing.phone}` : ''} onClose={() => setViewing(null)}>
        {viewing && (
          <>
            <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{viewing.message}</p>
            <div className="field" style={{ marginTop: 20 }}>
              <label>Status</label>
              <select value={viewing.status} onChange={(e) => handleStatusChange(viewing._id, e.target.value as ContactMessage['status'])}>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="admin-modal-actions">
              <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(viewing)}>Delete</button>
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>Close</button>
            </div>
          </>
        )}
      </AdminModal>
      <AdminConfirmDialog open={!!deleteTarget} title="Delete Message" message={`Delete the message from "${deleteTarget?.name}"?`} confirmLabel="Delete" danger busy={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
