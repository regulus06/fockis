
import { useEffect, useRef, useState } from 'react';
import '../styles/CompanyCoverUpload.scss';

export type CompanyCoverUploadProps = {
  coverUrl?: string | null;
  onUpload: (file: File) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  loading?: boolean;
  uploading?: boolean;
  removing?: boolean;
  uploadProgress?: number | null;
  error?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
  maxFileSizeMB?: number;
  acceptedTypes?: string[];
  recommendedWidth?: number;
  recommendedHeight?: number;
};

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function CompanyCoverUpload({
  coverUrl,
  onUpload,
  onRemove,
  loading = false,
  uploading = false,
  removing = false,
  uploadProgress = null,
  error = null,
  disabled = false,
  readOnly = false,
  maxFileSizeMB = 8,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  recommendedWidth = 1600,
  recommendedHeight = 500,
}: CompanyCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [removeConfirmation, setRemoveConfirmation] = useState(false);

  const busy = loading || uploading || removing;
  const isDisabled = disabled || busy || readOnly;
  const displayUrl = previewUrl || coverUrl || null;

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) return;

    // A new server image means the parent has completed or replaced
    // the previous upload. Clear the temporary local selection.
    if (coverUrl && !uploading) {
      setSelectedFile(null);
    }
  }, [coverUrl, selectedFile, uploading]);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Unsupported image format. Accepted formats: ${acceptedTypes
        .map((type) => type.replace('image/', '').toUpperCase())
        .join(', ')}.`;
    }

    const maxBytes = maxFileSizeMB * 1024 * 1024;

    if (file.size > maxBytes) {
      return `The image must be smaller than ${maxFileSizeMB} MB.`;
    }

    if (file.size === 0) {
      return 'The selected image is empty.';
    }

    return null;
  };

  const handleFileSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    // Reset input so selecting the same file again triggers change.
    event.target.value = '';

    if (!file) return;

    setValidationError(null);

    const validationMessage = validateFile(file);

    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || isDisabled) return;

    setValidationError(null);

    try {
      await onUpload(selectedFile);
    } catch {
      setValidationError(
        'The cover image could not be uploaded. Please try again.',
      );
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setValidationError(null);
  };

  const handleRemove = async () => {
    if (!onRemove || isDisabled) return;

    try {
      await onRemove();
      setSelectedFile(null);
      setValidationError(null);
      setRemoveConfirmation(false);
    } catch {
      setValidationError(
        'The cover image could not be removed. Please try again.',
      );
    }
  };

  const progress =
    uploadProgress !== null && Number.isFinite(uploadProgress)
      ? Math.min(100, Math.max(0, uploadProgress))
      : null;

  return (
    <section
      className="company-cover-upload"
      aria-label="Company cover image"
      aria-busy={busy}
    >
      <header className="company-cover-upload__header">
        <div>
          <span className="company-cover-upload__eyebrow">
            COMPANY BRANDING
          </span>

          <h2>Company cover image</h2>

          <p>
            Add a cover image to give your employer profile a
            professional appearance.
          </p>
        </div>

        <span className="company-cover-upload__format-badge">
          JPG · PNG · WEBP
        </span>
      </header>

      <div className="company-cover-upload__preview">
        {displayUrl ? (
          <img
            className="company-cover-upload__image"
            src={displayUrl}
            alt="Company cover preview"
          />
        ) : (
          <div className="company-cover-upload__placeholder">
            <span
              className="company-cover-upload__placeholder-icon"
              aria-hidden="true"
            >
              ✦
            </span>

            <strong>Your company cover image</strong>
            <span>
              Upload a banner to personalize your employer profile.
            </span>
          </div>
        )}

        {!readOnly && !loading && (
          <button
            type="button"
            className="company-cover-upload__change-button"
            onClick={() => inputRef.current?.click()}
            disabled={isDisabled}
          >
            {displayUrl ? 'Change cover' : 'Choose image'}
          </button>
        )}

        {loading && (
          <div className="company-cover-upload__loading">
            Loading cover image...
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        className="company-cover-upload__file-input"
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelection}
        disabled={isDisabled}
        aria-label="Choose company cover image"
      />

      <div className="company-cover-upload__guidelines">
        <div>
          <strong>Recommended dimensions</strong>
          <span>
            {recommendedWidth} × {recommendedHeight} pixels
          </span>
        </div>

        <div>
          <strong>Maximum file size</strong>
          <span>{maxFileSizeMB} MB</span>
        </div>

        <div>
          <strong>Accepted formats</strong>
          <span>
            {acceptedTypes
              .map((type) => type.replace('image/', '').toUpperCase())
              .join(', ')}
          </span>
        </div>
      </div>

      {selectedFile && (
        <div className="company-cover-upload__selected-file">
          <div className="company-cover-upload__file-info">
            <span className="company-cover-upload__file-icon">
              <span aria-hidden="true">▧</span>
            </span>

            <div>
              <strong>{selectedFile.name}</strong>
              <span>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>

          {!readOnly && (
            <div className="company-cover-upload__file-actions">
              <button
                type="button"
                className="company-cover-upload__cancel-button"
                onClick={handleCancelSelection}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="button"
                className="company-cover-upload__save-button"
                onClick={handleUpload}
                disabled={isDisabled}
              >
                {uploading ? 'Uploading...' : 'Save cover image'}
              </button>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div className="company-cover-upload__progress">
          <div className="company-cover-upload__progress-heading">
            <span>Uploading cover image</span>
            {progress !== null && <strong>{Math.round(progress)}%</strong>}
          </div>

          <div
            className="company-cover-upload__progress-track"
            role="progressbar"
            aria-label="Cover image upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ?? undefined}
          >
            <span
              style={{
                width: progress === null ? '35%' : `${progress}%`,
              }}
            />
          </div>
        </div>
      )}

      {(error || validationError) && (
        <div
          className="company-cover-upload__error"
          role="alert"
        >
          {validationError || error}
        </div>
      )}

      {!readOnly && coverUrl && onRemove && !selectedFile && (
        <div className="company-cover-upload__remove-area">
          {!removeConfirmation ? (
            <button
              type="button"
              className="company-cover-upload__remove-button"
              onClick={() => setRemoveConfirmation(true)}
              disabled={isDisabled}
            >
              Remove cover image
            </button>
          ) : (
            <div className="company-cover-upload__confirmation">
              <span>Are you sure you want to remove this cover image?</span>

              <div>
                <button
                  type="button"
                  onClick={() => setRemoveConfirmation(false)}
                  disabled={isDisabled}
                >
                  Keep image
                </button>

                <button
                  type="button"
                  className="company-cover-upload__confirm-remove"
                  onClick={handleRemove}
                  disabled={isDisabled}
                >
                  {removing ? 'Removing...' : 'Confirm removal'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="company-cover-upload__security-note">
        Uploads must be validated by the server. Only authorized
        employer account members should be able to replace or remove
        company branding images.
      </p>
    </section>
  );
}

export default CompanyCoverUpload;
