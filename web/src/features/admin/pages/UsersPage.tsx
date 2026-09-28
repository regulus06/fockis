import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminDataTable, type AdminTableColumn } from '../components/AdminDataTable';
import { UserFilters } from '../components/UserFilters';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { UserActionsMenu } from '../components/UserActionsMenu';
import { AdminErrorState } from '../components/AdminStates';
import { useAdminSessionStore } from '../store/adminSessionStore';

const PAGE_SIZE = 10;

export function UsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [role, setRole] = useState('ALL');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const switchToken = useAdminSessionStore((s) => s.switchToken);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi.getUsers({ search, status: status as any, role: role as any, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [search, status, role, page, switchToken]);

  function patchUser(updated: PlatformUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  const columns: AdminTableColumn<PlatformUser>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: (u) => u.name,
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="fk-avatar">{u.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 500 }}>{u.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--fk-text-tertiary)' }}>@{u.username}</div>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'role', header: 'Role', render: (u) => u.role },
    { key: 'status', header: 'Status', sortable: true, sortValue: (u) => u.status, render: (u) => <AdminStatusBadge status={u.status} /> },
    { key: 'verified', header: 'Verification', render: (u) => (u.verified ? '✅ Verified' : '—') },
    {
      key: 'createdAt', header: 'Created', sortable: true, sortValue: (u) => u.createdAt,
      render: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: 'lastLogin', header: 'Last Login',
      render: (u) => (u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'),
    },
    {
      key: 'flags', header: 'Flags',
      render: (u) => u.flags.length > 0
        ? <span className="fk-badge fk-badge--warning">{u.flags.length}</span>
        : '—',
    },
    {
      key: 'actions', header: '',
      render: (u) => <UserActionsMenu user={u} onUpdated={patchUser} />,
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader title="Users" description="Manage platform member, seller, creator, and agent accounts." />

      {error ? (
        <AdminErrorState message={error} onRetry={() => setPage((p) => p)} />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          loading={loading}
          emptyTitle="No users match these filters"
          onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
          toolbar={
            <UserFilters
              search={search}
              onSearch={(v) => { setSearch(v); setPage(1); }}
              status={status}
              onStatus={(v) => { setStatus(v); setPage(1); }}
              role={role}
              onRole={(v) => { setRole(v); setPage(1); }}
            />
          }
          footer={
            <>
              <span>{total} users · page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="fk-btn fk-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <button className="fk-btn fk-btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </>
          }
        />
      )}
    </div>
  );
}
