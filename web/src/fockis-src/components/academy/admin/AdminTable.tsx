import { ReactNode } from 'react';
import { AdminLoading, AdminEmpty, AdminError } from './AdminStates';

export interface AdminColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  width?: string;
}

interface Props<T> {
  columns: AdminColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading: boolean;
  error: boolean;
  errorMessage?: string;
  emptyMessage: string;
  onRetry?: () => void;
  renderActions?: (row: T) => ReactNode;
}

export default function AdminTable<T,>({ columns, rows, rowKey, loading, error, errorMessage, emptyMessage, onRetry, renderActions }: Props<T>) {
  return (
    <div className="admin-table-wrap">
      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError label={errorMessage ?? "Couldn't load this data. Please try again."} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <AdminEmpty label={emptyMessage} />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                  {c.label}
                </th>
              ))}
              {renderActions && <th style={{ width: 140, textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render(row)}</td>
                ))}
                {renderActions && <td><div className="admin-row-actions">{renderActions(row)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
