import { useEffect, useState } from 'react';
import { getAcademyUsers, updateUserRole, AcademyApiError, AcademyUser } from '../../../lib/academyApi';
import { useAcademyAdminAuth } from '../../../lib/academyAdminAuth';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';
import { useAcademyToast } from '../../../lib/academyToastStore';

const ROLES = ['student', 'instructor', 'advisor', 'admissions', 'employer', 'staff', 'administrator'];

export default function AcademyAdminUsers() {
  const [users, setUsers] = useState<AcademyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const currentUser = useAcademyAdminAuth((s) => s.user);
  const showToast = useAcademyToast((s) => s.showToast);

  function load() {
    setLoading(true);
    setError(false);
    getAcademyUsers()
      .then(setUsers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  async function handleRoleChange(u: AcademyUser, role: string) {
    setUpdatingId(u.id);
    try {
      await updateUserRole(u.id, role);
      showToast(`${u.name}'s role updated to ${role}.`);
      load();
    } catch (err) {
      showToast(err instanceof AcademyApiError ? err.message : 'Unable to update role.');
    } finally {
      setUpdatingId(null);
    }
  }

  const columns: AdminColumn<AcademyUser>[] = [
    { key: 'name', label: 'Name', render: (u) => <strong>{u.name}</strong> },
    { key: 'email', label: 'Email', render: (u) => u.email },
    {
      key: 'role', label: 'Role', render: (u) => (
        <select
          value={u.role}
          disabled={updatingId === u.id || u.id === currentUser?.id}
          onChange={(e) => handleRoleChange(u, e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13 }}
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Academy Users</h1><p>Manage staff, faculty, and administrator accounts. New accounts self-register at the admin login flow's sign-up (or via the API); this page manages roles for existing ones.</p></div>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(u) => u.id} loading={loading} error={error}
        emptyMessage={search ? 'No users match your search.' : 'No users yet.'} onRetry={load}
      />
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 14 }}>
        You can't change your own role from here — sign in as another administrator to do that, as a safeguard against accidental lockout.
      </p>
    </div>
  );
}
