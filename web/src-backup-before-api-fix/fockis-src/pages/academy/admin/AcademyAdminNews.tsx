import { useEffect, useState } from 'react';
import { getAllNewsForAdmin, createNews, updateNews, deleteNews, AcademyApiError, NewsInput } from '../../../lib/academyApi';
import { NewsItem } from '../../../types/academy';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import AdminModal from '../../../components/academy/admin/AdminModal';
import AdminConfirmDialog from '../../../components/academy/admin/AdminConfirmDialog';
import AdminStatusBadge from '../../../components/academy/admin/AdminStatusBadge';
import { useAcademyToast } from '../../../lib/academyToastStore';

const EMPTY_FORM: NewsInput = { tag: '', title: '', date: '', body: '', published: true };

export default function AcademyAdminNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState<NewsInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getAllNewsForAdmin()
      .then((data) => setNews(data as NewsItem[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = news.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.tag.toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(n: NewsItem) {
    setEditing(n);
    setForm({ tag: n.tag, title: n.title, date: n.date, body: n.body ?? '', published: n.published ?? true });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      if (editing?._id) {
        await updateNews(editing._id, form);
        showToast('Article updated.');
      } else {
        await createNews(form);
        showToast('Article published.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof AcademyApiError ? err.message : 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(n: NewsItem) {
    if (!n._id) return;
    try {
      await updateNews(n._id, { published: !n.published });
      showToast(n.published ? 'Article unpublished.' : 'Article published.');
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to update article.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      await deleteNews(deleteTarget._id);
      showToast('Article deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to delete article.');
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<NewsItem>[] = [
    { key: 'title', label: 'Title', render: (n) => <strong>{n.title}</strong> },
    { key: 'tag', label: 'Tag', render: (n) => n.tag },
    { key: 'date', label: 'Date', render: (n) => n.date },
    { key: 'status', label: 'Status', render: (n) => <AdminStatusBadge status={n.published ? 'published' : 'draft'} /> },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>News</h1><p>Manage campus news articles.</p></div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ Add Article</button>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search articles…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(n) => n._id ?? n.title} loading={loading} error={error}
        emptyMessage={search ? 'No articles match your search.' : 'No articles yet — publish your first one.'} onRetry={load}
        renderActions={(n) => (
          <>
            <button className="admin-icon-btn" onClick={() => togglePublished(n)}>{n.published ? 'Unpublish' : 'Publish'}</button>
            <button className="admin-icon-btn" onClick={() => openEdit(n)}>Edit</button>
            <button className="admin-icon-btn danger" onClick={() => setDeleteTarget(n)}>Delete</button>
          </>
        )}
      />
      <AdminModal open={modalOpen} title={editing ? 'Edit Article' : 'Add Article'} onClose={() => setModalOpen(false)}>
        {formError && <div className="admin-login-error">{formError}</div>}
        <div className="form-grid">
          <div className="field"><label>Tag</label><input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Academics" /></div>
          <div className="field"><label>Display Date</label><input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="Aug 4, 2026" /></div>
          <div className="field full"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field full"><label>Body (optional)</label><textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div className="field full">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published
            </label>
          </div>
        </div>
        <div className="admin-modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Publish Article'}</button>
        </div>
      </AdminModal>
      <AdminConfirmDialog open={!!deleteTarget} title="Delete Article" message={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" danger busy={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
