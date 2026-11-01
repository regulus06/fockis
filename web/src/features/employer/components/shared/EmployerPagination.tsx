import { ChevronLeft, ChevronRight } from 'lucide-react';
import ui from '../../styles/EmployerShared.module.scss';

export interface EmployerPaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  noun?: string;
  onPageChange: (page: number) => void;
}

function pageList(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, 2, page - 1, page, page + 1, pages - 1, pages].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((value, index) => {
    if (index && value - sorted[index - 1] > 1) out.push('…');
    out.push(value);
  });
  return out;
}

export function EmployerPagination({ page, pages, total, limit, noun = 'results', onPageChange }: EmployerPaginationProps) {
  if (total === 0) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <nav className={ui.pagination} aria-label="Pagination">
      <span>
        Showing {start}–{end} of {total} {noun}
      </span>
      {pages > 1 && (
        <div className={ui.pageButtons}>
          <button type="button" className={ui.pageBtn} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft size={15} />
          </button>
          {pageList(page, pages).map((item, index) =>
            item === '…' ? (
              <span key={`gap-${index}`} className={ui.pageBtn} aria-hidden="true" style={{ display: 'grid', placeItems: 'center', cursor: 'default' }}>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={ui.pageBtn}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ),
          )}
          <button type="button" className={ui.pageBtn} onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </nav>
  );
}

export default EmployerPagination;
