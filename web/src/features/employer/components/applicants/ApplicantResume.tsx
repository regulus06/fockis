
import '../styles/ApplicantResume.scss';

export type ApplicantResumeData = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  previewUrl?: string | null;
  downloadAvailable?: boolean;
};

export type ApplicantResumeProps = {
  resume: ApplicantResumeData | null;
  loading?: boolean;
  downloading?: boolean;
  error?: string | null;
  onView?: (resume: ApplicantResumeData) => void;
  onDownload?: (resume: ApplicantResumeData) => void;
  disabled?: boolean;
};

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Unknown size';
  }

  if (bytes === 0) return '0 Bytes';

  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 2,
  )} ${units[index]}`;
}

function formatDate(value: string): string {
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

function getFileExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toUpperCase();

  return extension && extension !== fileName.toUpperCase()
    ? extension
    : 'FILE';
}

function isPdf(fileType: string, fileName: string): boolean {
  return (
    fileType.toLowerCase() === 'application/pdf' ||
    fileName.toLowerCase().endsWith('.pdf')
  );
}

export function ApplicantResume({
  resume,
  loading = false,
  downloading = false,
  error = null,
  onView,
  onDownload,
  disabled = false,
}: ApplicantResumeProps) {
  const isDisabled = disabled || loading || downloading;

  if (loading) {
    return (
      <section
        className="applicant-resume"
        aria-label="Applicant resume"
        aria-busy="true"
      >
        <div className="applicant-resume__loading">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="applicant-resume applicant-resume--message"
        aria-label="Applicant resume"
        role="alert"
      >
        <h2>Unable to load resume</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!resume) {
    return (
      <section
        className="applicant-resume"
        aria-label="Applicant resume"
      >
        <div className="applicant-resume__header">
          <div>
            <h2>Applicant resume</h2>
            <p>Review the candidate's submitted resume.</p>
          </div>
        </div>

        <div className="applicant-resume__empty">
          <span className="applicant-resume__empty-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
              <path d="M14 3v5h5M9 13h6M9 17h6" />
            </svg>
          </span>

          <h3>No resume available</h3>
          <p>
            This applicant has not provided a resume, or the document
            is currently unavailable.
          </p>
        </div>
      </section>
    );
  }

  const extension = getFileExtension(resume.fileName);
  const pdf = isPdf(resume.fileType, resume.fileName);

  return (
    <section
      className="applicant-resume"
      aria-label="Applicant resume"
      aria-busy={downloading}
    >
      <div className="applicant-resume__header">
        <div>
          <h2>Applicant resume</h2>
          <p>Review the candidate's submitted document.</p>
        </div>

        <span className="applicant-resume__secure">
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
          Private document
        </span>
      </div>

      <article className="applicant-resume__file">
        <div
          className={`applicant-resume__file-icon applicant-resume__file-icon--${extension.toLowerCase()}`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
          </svg>
          <span>{extension}</span>
        </div>

        <div className="applicant-resume__file-info">
          <h3 title={resume.fileName}>{resume.fileName}</h3>

          <div className="applicant-resume__metadata">
            <span>{formatFileSize(resume.fileSize)}</span>
            <span>{resume.fileType || extension}</span>
          </div>

          <span className="applicant-resume__uploaded">
            Uploaded {formatDate(resume.uploadedAt)}
          </span>
        </div>
      </article>

      <div className="applicant-resume__actions">
        {onView && (
          <button
            type="button"
            className="applicant-resume__view"
            onClick={() => onView(resume)}
            disabled={isDisabled}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View resume
          </button>
        )}

        {onDownload && resume.downloadAvailable !== false && (
          <button
            type="button"
            className="applicant-resume__download"
            onClick={() => onDownload(resume)}
            disabled={isDisabled}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3" />
            </svg>
            {downloading ? 'Preparing download...' : 'Download'}
          </button>
        )}
      </div>

      {pdf && resume.previewUrl && (
        <div className="applicant-resume__preview">
          <div className="applicant-resume__preview-header">
            <h3>Document preview</h3>
            <span>PDF</span>
          </div>

          <iframe
            title={`Resume preview: ${resume.fileName}`}
            src={resume.previewUrl}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <div className="applicant-resume__notice">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M12 3 3 20h18L12 3Z" />
          <path d="M12 9v5m0 3h.01" />
        </svg>

        <p>
          Applicant documents are confidential. Only access or share
          resumes when authorized to do so.
        </p>
      </div>
    </section>
  );
}

export default ApplicantResume;
