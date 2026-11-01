
import { useState } from 'react';
import '../styles/EmployerJobActions.scss';

export type EmployerJobActionStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'closed'
  | 'rejected';

export type EmployerJobActionItem = {
  id: string;
  title: string;
  status: EmployerJobActionStatus;
  isActive: boolean;
  isApproved?: boolean;
};

export type EmployerJobActionsProps = {
  job: EmployerJobActionItem;
  onView?: (job: EmployerJobActionItem) => void;
  onViewApplicants?: (job: EmployerJobActionItem) => void;
  onEdit?: (job: EmployerJobActionItem) => void;
  onToggleActive?: (
    job: EmployerJobActionItem,
    nextIsActive: boolean,
  ) => void | Promise<void>;
  onDuplicate?: (job: EmployerJobActionItem) => void | Promise<void>;
  onDelete?: (job: EmployerJobActionItem) => void | Promise<void>;
  loading?: boolean;
  actionLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  compact?: boolean;
  showLabels?: boolean;
};

type PendingAction = 'pause' | 'publish' | 'delete' | null;

export function EmployerJobActions({
  job,
  onView,
  onViewApplicants,
  onEdit,
  onToggleActive,
  onDuplicate,
  onDelete,
  loading = false,
  actionLoading = false,
  disabled = false,
  readOnly = false,
  error = null,
  compact = false,
  showLabels = true,
}: EmployerJobActionsProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canModify = !disabled && !readOnly && !loading && !actionLoading;
  const canView = !disabled && !loading;
  const isPublished = job.isActive && job.isApproved === true;
  const isPendingApproval = job.isActive && job.isApproved === false;
  const isClosed = !job.isActive || job.status === 'closed';

  const runToggleActive = async (nextIsActive: boolean) => {
    if (!onToggleActive || !canModify) return;

    setActionError(null);

    try {
      await onToggleActive(job, nextIsActive);
      setPendingAction(null);
      setMenuOpen(false);
    } catch (callbackError) {
      setActionError(
        callbackError instanceof Error
          ? callbackError.message
          : 'Unable to update this job. Please try again.',
      );
    }
  };

  const runDelete = async () => {
    if (!onDelete || !canModify) return;

    setActionError(null);

    try {
      await onDelete(job);
      setPendingAction(null);
      setMenuOpen(false);
    } catch (callbackError) {
      setActionError(
        callbackError instanceof Error
          ? callbackError.message
          : 'Unable to delete this job. Please try again.',
      );
    }
  };

  const runDuplicate = async () => {
    if (!onDuplicate || !canModify) return;

    setActionError(null);

    try {
      await onDuplicate(job);
      setMenuOpen(false);
    } catch (callbackError) {
      setActionError(
        callbackError instanceof Error
          ? callbackError.message
          : 'Unable to duplicate this job. Please try again.',
      );
    }
  };

  const handleAction = (action: PendingAction) => {
    setActionError(null);
    setMenuOpen(false);
    setPendingAction(action);
  };

  const closeConfirmation = () => {
    if (!actionLoading) setPendingAction(null);
  };

  if (loading) {
    return (
      <div
        className="employer-job-actions employer-job-actions--loading"
        aria-label="Loading job actions"
        aria-busy="true"
      >
        <span />
        <span />
      </div>
    );
  }

  return (
    <div
      className={[
        'employer-job-actions',
        compact && 'employer-job-actions--compact',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="employer-job-actions__toolbar">
        {onView && (
          <button
            type="button"
            className="employer-job-actions__button employer-job-actions__button--secondary"
            onClick={() => onView(job)}
            disabled={!canView}
          >
            <span aria-hidden="true">↗</span>
            {showLabels && 'View'}
          </button>
        )}

        {onViewApplicants && (
          <button
            type="button"
            className="employer-job-actions__button employer-job-actions__button--secondary"
            onClick={() => onViewApplicants(job)}
            disabled={!canView}
          >
            <span aria-hidden="true">♙</span>
            {showLabels && 'Applicants'}
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            className="employer-job-actions__button employer-job-actions__button--secondary"
            onClick={() => onEdit(job)}
            disabled={!canModify}
          >
            <span aria-hidden="true">✎</span>
            {showLabels && 'Edit'}
          </button>
        )}

        {(onToggleActive || onDuplicate || onDelete) && (
          <div className="employer-job-actions__menu-wrap">
            <button
              type="button"
              className="employer-job-actions__button employer-job-actions__button--menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((current) => !current)}
              disabled={!canModify}
              aria-label="More job actions"
            >
              <span aria-hidden="true">•••</span>
              {showLabels && 'More'}
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="employer-job-actions__menu-backdrop"
                  aria-label="Close job actions menu"
                  onClick={() => setMenuOpen(false)}
                />

                <div
                  className="employer-job-actions__menu"
                  role="menu"
                  aria-label={`Actions for ${job.title}`}
                >
                  {onToggleActive && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() =>
                        handleAction(isClosed ? 'publish' : 'pause')
                      }
                      disabled={!canModify || isPendingApproval}
                    >
                      <span aria-hidden="true">
                        {isClosed ? '▶' : 'Ⅱ'}
                      </span>
                      {isClosed ? 'Activate job' : 'Pause job'}
                    </button>
                  )}

                  {onDuplicate && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={runDuplicate}
                      disabled={!canModify}
                    >
                      <span aria-hidden="true">▣</span>
                      Duplicate job
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      className="employer-job-actions__menu-danger"
                      onClick={() => handleAction('delete')}
                      disabled={!canModify}
                    >
                      <span aria-hidden="true">⌫</span>
                      Delete job
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {(error || actionError) && (
        <div className="employer-job-actions__error" role="alert">
          {actionError || error}
        </div>
      )}

      {isPendingApproval && (
        <p className="employer-job-actions__notice">
          This job is awaiting approval. Activation is controlled by the
          employer review process.
        </p>
      )}

      {pendingAction && (
        <div
          className="employer-job-actions__dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !actionLoading
            ) {
              closeConfirmation();
            }
          }}
        >
          <div
            className="employer-job-actions__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="employer-job-action-title"
            aria-describedby="employer-job-action-description"
          >
            <h3 id="employer-job-action-title">
              {pendingAction === 'delete'
                ? 'Delete this job?'
                : pendingAction === 'pause'
                  ? 'Pause this job?'
                  : 'Activate this job?'}
            </h3>

            <p id="employer-job-action-description">
              {pendingAction === 'delete'
                ? `You are about to delete "${job.title}". This may remove the job from your employer workspace.`
                : pendingAction === 'pause'
                  ? `Pausing "${job.title}" may stop new applications from being accepted.`
                  : `You are requesting activation for "${job.title}". The server must still enforce its approval rules.`}
            </p>

            <div className="employer-job-actions__dialog-buttons">
              <button
                type="button"
                className="employer-job-actions__button employer-job-actions__button--secondary"
                onClick={closeConfirmation}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={[
                  'employer-job-actions__button',
                  pendingAction === 'delete'
                    ? 'employer-job-actions__button--danger'
                    : 'employer-job-actions__button--primary',
                ].join(' ')}
                onClick={() => {
                  if (pendingAction === 'delete') {
                    void runDelete();
                  } else {
                    void runToggleActive(pendingAction === 'publish');
                  }
                }}
                disabled={!canModify}
              >
                {actionLoading
                  ? 'Processing…'
                  : pendingAction === 'delete'
                    ? 'Delete job'
                    : pendingAction === 'pause'
                      ? 'Pause job'
                      : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployerJobActions;
