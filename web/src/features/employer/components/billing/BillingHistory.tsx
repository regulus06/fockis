
import { useMemo, useState } from 'react';
import '../styles/BillingHistory.scss';

export type BillingInvoiceStatus =
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'failed'
  | 'refunded'
  | 'void';

export type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  currency: string;
  status: BillingInvoiceStatus;
  issuedAt: string;
  dueDate?: string | null;
  paidAt?: string | null;
};

export type BillingHistoryProps = {
  invoices: BillingInvoice[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onDownloadInvoice?: (invoice: BillingInvoice) => void | Promise<void>;
  downloadingInvoiceId?: string | null;
  downloadError?: string | null;
  disabled?: boolean;
  pageSize?: number;
  emptyMessage?: string;
};

const STATUS_LABELS: Record<BillingInvoiceStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  overdue: 'Overdue',
  failed: 'Failed',
  refunded: 'Refunded',
  void: 'Void',
};

const STATUS_OPTIONS: {
  value: 'all' | BillingInvoiceStatus;
  label: string;
}[] = [
  { value: 'all', label: 'All invoices' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'void', label: 'Void' },
];

function formatAmount(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) {
    return 'Amount unavailable';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function BillingHistory({
  invoices,
  loading = false,
  error = null,
  onRetry,
  onDownloadInvoice,
  downloadingInvoiceId = null,
  downloadError = null,
  disabled = false,
  pageSize = 10,
  emptyMessage = 'Your billing history will appear here when invoices are available.',
}: BillingHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<
    'all' | BillingInvoiceStatus
  >('all');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredInvoices = useMemo(() => {
    const query = normalize(search);

    return invoices
      .filter((invoice) => {
        const matchesStatus =
          statusFilter === 'all' || invoice.status === statusFilter;

        const matchesSearch =
          !query ||
          [
            invoice.invoiceNumber,
            invoice.description,
            invoice.status,
          ].some((value) => normalize(value).includes(query));

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const first = new Date(a.issuedAt).getTime();
        const second = new Date(b.issuedAt).getTime();

        return (
          (Number.isNaN(second) ? 0 : second) -
          (Number.isNaN(first) ? 0 : first)
        );
      });
  }, [invoices, statusFilter, search]);

  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / safePageSize),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleInvoices = filteredInvoices.slice(
    (currentPage - 1) * safePageSize,
    currentPage * safePageSize,
  );

  const paidCount = invoices.filter(
    (invoice) => invoice.status === 'paid',
  ).length;

  const pendingCount = invoices.filter(
    (invoice) => invoice.status === 'pending',
  ).length;

  const outstandingCount = invoices.filter(
    (invoice) =>
      invoice.status === 'overdue' || invoice.status === 'failed',
  ).length;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilter = (value: 'all' | BillingInvoiceStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <section
      className="billing-history"
      aria-label="Billing history"
      aria-busy={loading}
    >
      <header className="billing-history__header">
        <div>
          <h2>Billing history</h2>
          <p>Review invoices and download your billing records.</p>
        </div>

        <span className="billing-history__count">
          {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
        </span>
      </header>

      <div className="billing-history__summary">
        <article className="billing-history__summary-card">
          <span className="billing-history__summary-icon billing-history__summary-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
          </span>
          <div>
            <span>Invoices</span>
            <strong>{invoices.length}</strong>
          </div>
        </article>

        <article className="billing-history__summary-card">
          <span className="billing-history__summary-icon billing-history__summary-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div>
            <span>Paid invoices</span>
            <strong>{paidCount}</strong>
          </div>
        </article>

        <article className="billing-history__summary-card">
          <span className="billing-history__summary-icon billing-history__summary-icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
        </article>

        <article className="billing-history__summary-card">
          <span className="billing-history__summary-icon billing-history__summary-icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3 2.8 20h18.4L12 3Z" />
              <path d="M12 9v5m0 3h.01" />
            </svg>
          </span>
          <div>
            <span>Needs attention</span>
            <strong>{outstandingCount}</strong>
          </div>
        </article>
      </div>

      <div className="billing-history__toolbar">
        <div className="billing-history__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" />
          </svg>

          <input
            type="search"
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search invoice number or description..."
            aria-label="Search invoices"
            disabled={loading || disabled}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            handleFilter(
              event.target.value as 'all' | BillingInvoiceStatus,
            )
          }
          aria-label="Filter invoices by status"
          disabled={loading || disabled}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="billing-history__error" role="alert">
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={loading || disabled}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {downloadError && (
        <div className="billing-history__download-error" role="alert">
          {downloadError}
        </div>
      )}

      <div className="billing-history__table-wrap">
        <table className="billing-history__table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Description</th>
              <th>Issued</th>
              <th>Due date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Document</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={`billing-loading-${index}`}>
                  <td colSpan={7}>
                    <div className="billing-history__skeleton" />
                  </td>
                </tr>
              ))
            ) : visibleInvoices.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="billing-history__empty">
                    <span className="billing-history__empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
                        <path d="M9 9h6M9 13h6" />
                      </svg>
                    </span>
                    <h3>No invoices found</h3>
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <strong className="billing-history__invoice-number">
                      {invoice.invoiceNumber}
                    </strong>
                  </td>

                  <td>
                    <span className="billing-history__description">
                      {invoice.description}
                    </span>
                  </td>

                  <td>{formatDate(invoice.issuedAt)}</td>

                  <td>{formatDate(invoice.dueDate)}</td>

                  <td>
                    <strong className="billing-history__amount">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`billing-history__status billing-history__status--${invoice.status}`}
                    >
                      <span />
                      {STATUS_LABELS[invoice.status]}
                    </span>
                  </td>

                  <td>
                    {onDownloadInvoice ? (
                      <button
                        type="button"
                        className="billing-history__download"
                        onClick={() => onDownloadInvoice(invoice)}
                        disabled={
                          disabled ||
                          downloadingInvoiceId === invoice.id
                        }
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3" />
                        </svg>
                        {downloadingInvoiceId === invoice.id
                          ? 'Preparing...'
                          : 'Download'}
                      </button>
                    ) : (
                      <span className="billing-history__unavailable">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredInvoices.length > 0 && (
        <footer className="billing-history__footer">
          <span>
            Showing {(currentPage - 1) * safePageSize + 1}–
            {Math.min(currentPage * safePageSize, filteredInvoices.length)} of{' '}
            {filteredInvoices.length} invoices
          </span>

          <div className="billing-history__pagination">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              ←
            </button>

            <span>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}

export default BillingHistory;
