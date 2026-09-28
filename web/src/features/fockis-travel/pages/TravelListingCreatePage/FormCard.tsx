import { ReactNode } from 'react';

/**
 * The repeated white "card" wrapper every form section on this page uses
 * (background: #fff, 1px line border, 16px radius, 24px padding).
 */
export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--line, rgba(15,27,43,0.12))',
        borderRadius: 16,
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}
