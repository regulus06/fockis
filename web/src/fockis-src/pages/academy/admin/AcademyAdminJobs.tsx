import { useEffect, useState } from 'react';
import { getJobs, createJob, updateJob, deleteJob, getJobApplications, AcademyApiError, JobInput } from '../../../lib/academyApi';
import { JobListing, JobType } from '../../../types/academy';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminConfirmDialog from '../../../components/academy/admin/AdminConfirmDialog';
import AdminStatusBadge from '../../../components/academy/admin/AdminStatusBadge';
import { AdminLoading, AdminEmpty } from '../../../components/academy/admin/AdminStates';
import { useAcademyToast } from '../../../lib/academyToastStore';

const TYPES: JobType[] = ['job', 'internship', 'apprenticeship'];
const EMPTY_FORM: JobInput = { title: '', company: '', loc: '', pay: '', type: 'job', desc: '', active: true };

interface JobApplicant { _id: string; applicantName: string; applicantEmail?: string; status: string; createdAt: string; }

export default function AcademyAdminJobs() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobListing | null>(null);
  const [form, setForm] = useState<JobInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobListing | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [applicantsJob, setApplicantsJob] = useState<JobListing | null>(null);
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getJobs()
      .then(setJobs)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = jobs.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(j: JobListing) {
    setEditing(j);
    setForm({ title: j.title, company: j.company, loc: j.loc, pay: j.pay, type: j.type, desc: j.desc, active: true });
    setFormError(null);
    setModalOpen(true);
  }
  function openApplicants(j: JobListing) {
    if (!j._id) return;
    setApplicantsJob(j);
    setApplicantsLoading(true);
    getJobApplications(j._id)
      .then((data) => setApplicants(data as JobApplicant[]))
      .catch(() => setApplicants([]))
      .finally(() => setApplicantsLoading(false));
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      if (editing?._id) {
        await updateJob(editing._id, form);
        showToast('Job updated.');
      } else {
        await createJob(form);
        showToast('Job posted.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof AcademyApiError ? err.message : 'Failed to save job.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      await deleteJob(deleteTarget._id);
      showToast('Job listing deactivated.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to remove job.');
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<JobListing>[] = [
    { key: 'title', label: 'Title', render: (j) => <strong>{j.title}</strong> },
    { key: 'company', label: 'Company', render: (j) => j.company },
    { key: 'type', label: 'Type', render: (j) => <AdminStatusBadge status={j.type} /> },
    { key: 'loc', label: 'Location', render: (j) => j.loc },
    { key: 'pay', label: 'Pay', render: (j) => j.pay },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Careers / Jobs</h1><p>Manage the job board and view applicants.</p></div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ Post Job</button>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(j) => j._id ?? j.title} loading={loading} error={error}
        emptyMessage={search ? 'No jobs match your search.' : 'No jobs yet — post your first listing.'} onRetry={load}
        renderActions={(j) => (
          <>
            <button className="admin-icon-btn" onClick={() => openApplicants(j)}>Applicants</button>
            <button className="admin-icon-btn" onClick={() => openEdit(j)}>Edit</button>
            <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(j)}>Remove</button>
          </>
        )}
      />
      <AdminModal open={modalOpen} title={editing ? 'Edit Job' : 'Post a Job'} onClose={() => setModalOpen(false)}>
        {formError && <div className="admin-login-error">{formError}</div>}
        <div className="form-grid">
          <div className="field full"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Company</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="field"><label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as JobType })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field"><label>Location</label><input value={form.loc} onChange={(e) => setForm({ ...form, loc: e.target.value })} /></div>
          <div className="field"><label>Pay</label><input value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })} placeholder="$22–$28/hr" /></div>
          <div className="field full"><label>Description</label><textarea rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
        </div>
        <div className="admin-modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Post Job'}</button>
        </div>
      </AdminModal>

      <AdminModal open={!!applicantsJob} title={`Applicants — ${applicantsJob?.title ?? ''}`} onClose={() => setApplicantsJob(null)}>
        {applicantsLoading ? (
          <AdminLoading label="Loading applicants…" />
        ) : applicants.length === 0 ? (
          <AdminEmpty label="No applications for this job yet." />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Applicant</th><th>Email</th><th>Status</th><th>Applied</th></tr></thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a._id}>
                    <td>{a.applicantName}</td>
                    <td>{a.applicantEmail ?? '—'}</td>
                    <td><AdminStatusBadge status={a.status} /></td>
                    <td className="mono">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setApplicantsJob(null)}>Close</button>
        </div>
      </AdminModal>

      <AdminConfirmDialog open={!!deleteTarget} title="Remove Job Listing" message={`Deactivate "${deleteTarget?.title}"? Its application history is kept.`} confirmLabel="Deactivate" danger busy={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
