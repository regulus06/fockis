import type { ReactNode } from 'react';
import { useState } from 'react';
import { AdminEmptyState, AdminLoadingState } from './AdminStates';

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
}

interface AdminDataTableProps<T> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle,
  emptyDescription,
  onRowClick,
  toolbar,
  footer,
}: AdminDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...rows];
  const activeCol = columns.find((c) => c.key === sortKey);
  if (activeCol?.sortValue) {
    sorted.sort((a, b) => {
      const av = activeCol.sortValue!(a);
      const bv = activeCol.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  function toggleSort(col: AdminTableColumn<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  }

  return (
    <div className="fk-table-wrap">
      {toolbar && <div className="fk-table__toolbar">{toolbar}</div>}
      {loading ? (
        <AdminLoadingState label="Loading records…" />
      ) : rows.length === 0 ? (
        <AdminEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <table className="fk-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} onClick={() => toggleSort(col)}>
                  {col.header}
                  {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'fk-row-clickable' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {footer && <div className="fk-table__pagination">{footer}</div>}
    </div>
  );
}
