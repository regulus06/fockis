import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';

export function AdminCommandSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const users = useAdminStore((s) => s.users);
  const navigate = useNavigate();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return users
      .filter((u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.id.includes(q))
      .slice(0, 6);
  }, [query, users]);

  return (
    <div className="fk-menu-wrap" style={{ width: 320 }}>
      <div className="fk-search">
        <span>⌘K</span>
        <input
          placeholder="Search users, orders, cases…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="fk-menu" style={{ minWidth: 320 }}>
          {results.map((u) => (
            <button
              key={u.id}
              className="fk-menu__item"
              onMouseDown={() => navigate(`/admin/users/${u.id}`)}
            >
              <span className="fk-avatar" style={{ width: 22, height: 22, fontSize: 9.5 }}>
                {u.name.slice(0, 2).toUpperCase()}
              </span>
              {u.name} <span className="mono" style={{ color: 'var(--fk-text-tertiary)' }}>· {u.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
