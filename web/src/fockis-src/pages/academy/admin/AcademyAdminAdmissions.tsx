import { useEffect, useState } from 'react';
import { getApplications, updateApplicationStatus, AcademyApiError } from '../../../lib/academyApi';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminStatusBadge from '../../../components/academy/admin/AdminStatusBadge';
import { useAcademyToast } from '../../../lib/academyToastStore';

interface Application {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  programId?: { name?: string; slug?: string } | string;
  startTerm?: string;
  applicantType: string;
  status: string;
  createdAt: string;
}

const STATUSES = ['submitted', 'under_review', 'accepted', 'denied', 'enrolled'];

export default function AcademyAdminAdmissions() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewing, setViewing] = useState<Application | null>(null);
  const [updating, setUpdating] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getApplications()
      .then((data) => setApplications(data as Application[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = applications.filter((a) => {
    const matchesSearch = `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleStatusChange(id: string, status: string) {
    setUpdating(true);
    try {
      await updateApplicationStatus(id, status);
      showToast('Application status updated.');
      setViewing((v) => (v ? { ...v, status } : v));
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to update status.');
    } finally {
      setUpdating(false);
    }
  }

  function programName(a: Application): string {
    if (typeof a.programId === 'object' && a.programId) return a.programId.name ?? 'Unknown program';
    return typeof a.programId === 'string' ? a.programId : 'Unknown program';
  }

  const columns: AdminColumn<Application>[] = [
    { key: 'name', label: 'Applicant', render: (a) => <strong>{a.firstName} {a.lastName}</strong> },
    { key: 'program', label: 'Program', render: (a) => programName(a) },
    { key: 'type', label: 'Applicant Type', render: (a) => a.applicantType?.replace(/_/g, ' ') },
    { key: 'status', label: 'Status', render: (a) => <AdminStatusBadge status={a.status} /> },
    { key: 'date', label: 'Submitted', render: (a) => new Date(a.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Admissions</h1><p>Review and process student applications.</p></div>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search applicants…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="admin-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(a) => a._id} loading={loading} error={error}
        emptyMessage={search || statusFilter !== 'all' ? 'No applications match your filters.' : 'No applications yet.'} onRetry={load}
        renderActions={(a) => <button className="admin-icon-btn" onClick={() => setViewing(a)}>View</button>}
      />
      <AdminModal open={!!viewing} title={viewing ? `${viewing.firstName} ${viewing.lastName}` : ''} subtitle={viewing ? `Applied for ${programName(viewing)}` : ''} onClose={() => setViewing(null)}>
        {viewing && (
          <>
            <div className="form-grid" style={{ marginBottom: 20 }}>
              <div className="field"><label>Email</label><p style={{ fontSize: 14 }}>{viewing.email}</p></div>
              <div className="field"><label>Phone</label><p style={{ fontSize: 14 }}>{viewing.phone}</p></div>
              <div className="field"><label>Applicant Type</label><p style={{ fontSize: 14 }}>{viewing.applicantType?.replace(/_/g, ' ')}</p></div>
              <div className="field"><label>Start Term</label><p style={{ fontSize: 14 }}>{viewing.startTerm ?? '—'}</p></div>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={viewing.status} disabled={updating} onChange={(e) => handleStatusChange(viewing._id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>Close</button>
            </div>
          </>
        )}
      </AdminModal>
    </div>
  );
}
