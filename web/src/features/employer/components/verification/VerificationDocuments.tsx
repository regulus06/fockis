
import { useId, useRef, useState, type ChangeEvent } from 'react';
import EmployerStatusBadge from './EmployerStatusBadge';
import '../styles/VerificationDocuments.scss';

export type VerificationDocumentStatus =
  | 'not_submitted'
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'expired';

export type VerificationDocumentType =
  | 'business_registration'
  | 'tax_document'
  | 'proof_of_address'
  | 'identity_document'
  | 'other';

export interface VerificationDocumentItem {
  id: string;
  name: string;
  type: VerificationDocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt?: string;
  expiresAt?: string;
  status: VerificationDocumentStatus;
  reviewMessage?: string;
  canDownload?: boolean;
}

export interface VerificationDocumentUpload {
  type: VerificationDocumentType;
  file: File;
}

export interface VerificationDocumentsProps {
  documents: VerificationDocumentItem[];
  onUpload: (
    upload: VerificationDocumentUpload,
  ) => void | Promise<void>;
  onDownload?: (
    document: VerificationDocumentItem,
  ) => void | Promise<void>;
  onRequestRemoval?: (
    document: VerificationDocumentItem,
  ) => void | Promise<void>;
  loading?: boolean;
  uploading?: boolean;
  removingDocumentId?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  successMessage?: string | null;
  acceptedFileTypes?: string[];
  maxFileSizeMB?: number;
  allowedDocumentTypes?: VerificationDocumentType[];
  title?: string;
  description?: string;
  showUploadForm?: boolean;
}

const DOCUMENT_TYPES: {
  value: VerificationDocumentType;
  label: string;
  description: string;
}[] = [
  {
    value: 'business_registration',
    label: 'Business registration',
    description: 'Certificate of incorporation or business registration.',
  },
  {
    value: 'tax_document',
    label: 'Tax document',
    description: 'Business tax registration or tax identification document.',
  },
  {
    value: 'proof_of_address',
    label: 'Proof of business address',
    description: 'A recent business utility bill or official address record.',
  },
  {
    value: 'identity_document',
    label: 'Identity document',
    description: 'An authorized representative identity document, if required.',
  },
  {
    value: 'other',
    label: 'Other supporting document',
    description: 'Another document requested by the verification team.',
  },
];

const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const STATUS_LABELS: Record<VerificationDocumentStatus, string> = {
  not_submitted: 'Not submitted',
  pending: 'Pending',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
};

const STATUS_TONES: Record<
  VerificationDocumentStatus,
  'neutral' | 'warning' | 'success' | 'danger' | 'info'
> = {
  not_submitted: 'neutral',
  pending: 'warning',
  under_review: 'info',
  verified: 'success',
  rejected: 'danger',
  expired: 'danger',
};

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value?: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function VerificationDocuments({
  documents,
  onUpload,
  onDownload,
  onRequestRemoval,
  loading = false,
  uploading = false,
  removingDocumentId = null,
  disabled = false,
  readOnly = false,
  error = null,
  successMessage = null,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSizeMB = 10,
  allowedDocumentTypes,
  title = 'Verification documents',
  description = 'Upload the documents required to verify your business.',
  showUploadForm = true,
}: VerificationDocumentsProps) {
  const inputId = useId();
  const typeId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [documentType, setDocumentType] =
    useState<VerificationDocumentType>('business_registration');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [uploadingLocally, setUploadingLocally] = useState(false);

  const busy = loading || uploading || uploadingLocally;
  const isDisabled = disabled || readOnly || busy;
  const maxBytes = maxFileSizeMB * 1024 * 1024;

  const availableTypes = DOCUMENT_TYPES.filter(
    (item) =>
      !allowedDocumentTypes ||
      allowedDocumentTypes.includes(item.value),
  );

  const acceptedAttribute = acceptedFileTypes
    .map((type) => {
      if (type.startsWith('.')) return type;
      if (type === 'image/jpeg') return '.jpg,.jpeg';
      if (type === 'image/png') return '.png';
      if (type === 'image/webp') return '.webp';
      if (type === 'application/pdf') return '.pdf';
      return type;
    })
    .join(',');

  const validateFile = (file: File): string | null => {
    if (!acceptedFileTypes.includes(file.type)) {
      return 'This file type is not accepted. Choose a supported PDF or image file.';
    }

    if (file.size <= 0) {
      return 'The selected file is empty.';
    }

    if (file.size > maxBytes) {
      return `The file exceeds the ${maxFileSizeMB} MB size limit.`;
    }

    return null;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setLocalError(null);
    setLocalSuccess(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateFile(file);

    if (validationError) {
      setSelectedFile(null);
      setLocalError(validationError);
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (isDisabled || !selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    if (!availableTypes.some((item) => item.value === documentType)) {
      setLocalError('Choose a valid document category.');
      return;
    }

    setUploadingLocally(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      await onUpload({
        type: documentType,
        file: selectedFile,
      });

      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setLocalSuccess('Your document was submitted successfully.');
    } catch (exception) {
      setLocalError(
        exception instanceof Error
          ? exception.message
          : 'The document could not be uploaded. Please try again.',
      );
    } finally {
      setUploadingLocally(false);
    }
  };

  const handleDownload = async (document: VerificationDocumentItem) => {
    if (!onDownload || isDisabled || !document.canDownload) return;

    try {
      await onDownload(document);
    } catch {
      setLocalError('The document could not be downloaded.');
    }
  };

  const handleRemovalRequest = async (
    document: VerificationDocumentItem,
  ) => {
    if (!onRequestRemoval || isDisabled) return;

    const confirmed = window.confirm(
      `Request removal of "${document.fileName}"?`,
    );

    if (!confirmed) return;

    setLocalError(null);
    setLocalSuccess(null);

    try {
      await onRequestRemoval(document);
      setLocalSuccess('The document removal request was submitted.');
    } catch (exception) {
      setLocalError(
        exception instanceof Error
          ? exception.message
          : 'The removal request could not be submitted.',
      );
    }
  };

  if (loading) {
    return (
      <section
        className="verification-documents verification-documents--loading"
        aria-label={title}
        aria-busy="true"
      >
        <div className="verification-documents__skeleton verification-documents__skeleton--heading" />
        <div className="verification-documents__skeleton verification-documents__skeleton--upload" />
        <div className="verification-documents__skeleton verification-documents__skeleton--row" />
        <div className="verification-documents__skeleton verification-documents__skeleton--row" />
        <span className="verification-documents__sr-only">
          Loading verification documents
        </span>
      </section>
    );
  }

  return (
    <section className="verification-documents" aria-label={title}>
      <header className="verification-documents__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="verification-documents__count">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
        </span>
      </header>

      {showUploadForm && !readOnly && (
        <div className="verification-documents__upload">
          <div className="verification-documents__upload-heading">
            <div>
              <h3>Submit a document</h3>
              <p>
                Upload a clear, readable copy of the requested document.
              </p>
            </div>
            <span className="verification-documents__upload-icon" aria-hidden="true">
              ↑
            </span>
          </div>

          <div className="verification-documents__field">
            <label htmlFor={typeId}>Document category</label>
            <select
              id={typeId}
              value={documentType}
              onChange={(event) =>
                setDocumentType(
                  event.target.value as VerificationDocumentType,
                )
              }
              disabled={isDisabled || availableTypes.length === 0}
            >
              {availableTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <small>
              {availableTypes.find((item) => item.value === documentType)
                ?.description}
            </small>
          </div>

          <div className="verification-documents__field">
            <label htmlFor={inputId}>Choose file</label>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={acceptedAttribute}
              onChange={handleFileChange}
              disabled={isDisabled}
            />
            <small>
              Maximum file size: {maxFileSizeMB} MB. Accepted formats:{' '}
              {acceptedFileTypes.join(', ')}.
            </small>
          </div>

          {selectedFile && (
            <div className="verification-documents__selected-file">
              <span aria-hidden="true">📄</span>
              <div>
                <strong>{selectedFile.name}</strong>
                <small>{formatFileSize(selectedFile.size)}</small>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                disabled={isDisabled}
                aria-label="Remove selected file"
              >
                ×
              </button>
            </div>
          )}

          <button
            type="button"
            className="verification-documents__upload-button"
            onClick={handleUpload}
            disabled={isDisabled || !selectedFile || availableTypes.length === 0}
          >
            {busy ? 'Uploading document…' : 'Upload document'}
          </button>
        </div>
      )}

      <div className="verification-documents__list-heading">
        <h3>Submitted documents</h3>
        <span>{documents.length} total</span>
      </div>

      {documents.length === 0 ? (
        <div className="verification-documents__empty">
          <span aria-hidden="true">📁</span>
          <strong>No documents submitted</strong>
          <p>
            Documents you submit for business verification will appear here.
          </p>
        </div>
      ) : (
        <div className="verification-documents__list">
          {documents.map((document) => (
            <article
              className="verification-documents__document"
              key={document.id}
            >
              <div className="verification-documents__file-icon" aria-hidden="true">
                {document.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}
              </div>

              <div className="verification-documents__document-info">
                <strong>{document.name}</strong>
                <span>{document.fileName}</span>
                <small>
                  {formatFileSize(document.fileSize)}
                  {' · '}
                  Uploaded {formatDate(document.uploadedAt)}
                  {document.expiresAt
                    ? ` · Expires ${formatDate(document.expiresAt)}`
                    : ''}
                </small>

                {document.reviewMessage && (
                  <p className="verification-documents__review-message">
                    {document.reviewMessage}
                  </p>
                )}
              </div>

              <div className="verification-documents__document-actions">
                <EmployerStatusBadge
                  status={document.status}
                  label={STATUS_LABELS[document.status]}
                  tone={STATUS_TONES[document.status]}
                />

                {document.canDownload && onDownload && (
                  <button
                    type="button"
                    onClick={() => handleDownload(document)}
                    disabled={isDisabled}
                  >
                    Download
                  </button>
                )}

                {onRequestRemoval && document.status !== 'verified' && (
                  <button
                    type="button"
                    className="verification-documents__remove"
                    onClick={() => handleRemovalRequest(document)}
                    disabled={isDisabled || removingDocumentId === document.id}
                  >
                    {removingDocumentId === document.id
                      ? 'Requesting…'
                      : 'Request removal'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {(localError || error) && (
        <div className="verification-documents__message verification-documents__message--error" role="alert">
          {localError || error}
        </div>
      )}

      {(localSuccess || successMessage) && (
        <div className="verification-documents__message verification-documents__message--success" role="status">
          {localSuccess || successMessage}
        </div>
      )}

      <div className="verification-documents__security">
        <strong>Document privacy</strong>
        <p>
          Verification documents should only be accessible to authorized
          verification personnel. Do not share public file URLs for sensitive
          business or identity documents.
        </p>
      </div>
    </section>
  );
}

export default VerificationDocuments;
