
import { useState } from 'react';
import '../styles/ApplicantNotes.scss';

export type ApplicantNote = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
};

export type ApplicantNotesProps = {
  notes: ApplicantNote[];
  currentUserId: string;
  loading?: boolean;
  saving?: boolean;
  deletingNoteId?: string | null;
  error?: string | null;
  onAdd: (content: string) => Promise<void> | void;
  onDelete: (note: ApplicantNote) => Promise<void> | void;
  canDelete?: (note: ApplicantNote) => boolean;
  disabled?: boolean;
  maxLength?: number;
};

const DEFAULT_MAX_LENGTH = 2000;

function formatNoteDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function ApplicantNotes({
  notes,
  currentUserId,
  loading = false,
  saving = false,
  deletingNoteId = null,
  error = null,
  onAdd,
  onDelete,
  canDelete,
  disabled = false,
  maxLength = DEFAULT_MAX_LENGTH,
}: ApplicantNotesProps) {
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] =
    useState<ApplicantNote | null>(null);

  const isDisabled = disabled || loading;
  const trimmedContent = content.trim();

  const sortedNotes = [...notes].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedContent) {
      setFormError('Please enter a note before saving.');
      return;
    }

    if (trimmedContent.length > maxLength) {
      setFormError(`Notes cannot exceed ${maxLength} characters.`);
      return;
    }

    setFormError('');

    try {
      await onAdd(trimmedContent);
      setContent('');
    } catch {
      setFormError('Unable to save your note. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    try {
      await onDelete(pendingDelete);
      setPendingDelete(null);
    } catch {
      setFormError('Unable to delete this note. Please try again.');
      setPendingDelete(null);
    }
  };

  const canRemove = (note: ApplicantNote) =>
    canDelete
      ? canDelete(note)
      : note.authorId === currentUserId;

  return (
    <section
      className="applicant-notes"
      aria-label="Applicant internal notes"
      aria-busy={loading || saving}
    >
      <div className="applicant-notes__header">
        <div>
          <div className="applicant-notes__title-row">
            <h2>Internal notes</h2>
            <span className="applicant-notes__private-badge">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Private
            </span>
          </div>

          <p>Share recruitment observations with your authorized team.</p>
        </div>

        <span className="applicant-notes__count">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      <div className="applicant-notes__notice">
        <span aria-hidden="true">ⓘ</span>
        These notes are intended for internal recruitment use and should
        not contain passwords, financial details, or unnecessary sensitive
        personal information.
      </div>

      <form
        className="applicant-notes__form"
        onSubmit={handleSubmit}
      >
        <label htmlFor="applicant-internal-note">
          Add a recruitment note
        </label>

        <textarea
          id="applicant-internal-note"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setFormError('');
          }}
          placeholder="Write an internal note about this applicant..."
          maxLength={maxLength}
          rows={4}
          disabled={isDisabled || saving}
        />

        <div className="applicant-notes__form-footer">
          <span>
            {content.length}/{maxLength} characters
          </span>

          <button
            type="submit"
            disabled={
              isDisabled ||
              saving ||
              !trimmedContent ||
              trimmedContent.length > maxLength
            }
          >
            {saving ? 'Saving...' : 'Add note'}
          </button>
        </div>

        {formError && (
          <p className="applicant-notes__error" role="alert">
            {formError}
          </p>
        )}

        {error && (
          <p className="applicant-notes__error" role="alert">
            {error}
          </p>
        )}
      </form>

      <div className="applicant-notes__list">
        <div className="applicant-notes__list-heading">
          <h3>Activity and notes</h3>
        </div>

        {loading ? (
          <div
            className="applicant-notes__loading"
            aria-label="Loading notes"
          >
            <span />
            <span />
            <span />
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="applicant-notes__empty">
            <span aria-hidden="true">✎</span>
            <h3>No notes yet</h3>
            <p>
              Add the first internal recruitment note for this applicant.
            </p>
          </div>
        ) : (
          sortedNotes.map((note) => (
            <article
              className="applicant-notes__item"
              key={note.id}
            >
              <div className="applicant-notes__avatar">
                {getInitials(note.authorName) || '?'}
              </div>

              <div className="applicant-notes__body">
                <div className="applicant-notes__item-header">
                  <div>
                    <strong>{note.authorName}</strong>
                    <time dateTime={note.createdAt}>
                      {formatNoteDate(note.createdAt)}
                    </time>
                  </div>

                  {canRemove(note) && (
                    <button
                      type="button"
                      className="applicant-notes__delete"
                      onClick={() => setPendingDelete(note)}
                      disabled={
                        isDisabled ||
                        deletingNoteId === note.id
                      }
                      aria-label={`Delete note by ${note.authorName}`}
                    >
                      {deletingNoteId === note.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </button>
                  )}
                </div>

                <p>{note.content}</p>

                {note.updatedAt && (
                  <span className="applicant-notes__edited">
                    Edited {formatNoteDate(note.updatedAt)}
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {pendingDelete && (
        <div
          className="applicant-notes__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingDelete(null);
            }
          }}
        >
          <div
            className="applicant-notes__confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-note-title"
          >
            <h3 id="delete-note-title">Delete this note?</h3>
            <p>
              This action cannot be undone. The note will be removed from
              this applicant's internal recruitment history.
            </p>

            <div>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deletingNoteId === pendingDelete.id}
              >
                Cancel
              </button>

              <button
                type="button"
                className="applicant-notes__confirm-delete"
                onClick={handleDelete}
                disabled={deletingNoteId === pendingDelete.id}
              >
                {deletingNoteId === pendingDelete.id
                  ? 'Deleting...'
                  : 'Delete note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ApplicantNotes;
