import React from "react";
import "./AdminTable.scss";

export interface AdminColumn<T> {
  key: keyof T | string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: AdminColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey: keyof T;
}

function AdminTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found.",
  rowKey,
}: AdminTableProps<T>) {
  if (loading) {
    return (
      <div className="admin-table-loading">
        Loading...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="admin-table-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.title}
                style={{ width: column.width }}
                className={column.align ?? "left"}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={String(row[rowKey])}>
              {columns.map((column) => (
                <td
                  key={column.title}
                  className={column.align ?? "left"}
                >
                  {column.render
                    ? column.render(row)
                    : String(row[column.key as keyof T] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminTable;