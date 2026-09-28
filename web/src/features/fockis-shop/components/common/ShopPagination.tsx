interface ShopPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ShopPagination({ page, totalPages, onPageChange }: ShopPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <nav className="shop-pagination" aria-label="Pagination">
      <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        ← Prev
      </button>
      <div className="shop-pagination-pages mono">
        {pages.map((p, i) => (
          <span key={p}>
            {i > 0 && pages[i - 1] !== p - 1 && <span className="ellipsis">…</span>}
            <button
              type="button"
              className={p === page ? 'active' : undefined}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          </span>
        ))}
      </div>
      <button type="button" className="btn btn-outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}
