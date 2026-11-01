
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import '../styles/CompanyLogoUpload.scss';

export type CompanyLogoUploadProps = {
  logoUrl?: string | null;
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
  recommendedSize?: number;
};

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function CompanyLogoUpload({
  logoUrl,
  onUpload,
  onRemove,
  loading = false,
  uploading = false,
  removing = false,
  uploadProgress = null,
  error = null,
  disabled = false,
  readOnly = false,
  maxFileSizeMB = 5,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  recommendedSize = 512,
}: CompanyLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [removeConfirmation, setRemoveConfirmation] = useState(false);

  const busy = loading || uploading || removing;
  const isDisabled = disabled || busy || readOnly;
  const displayUrl = previewUrl || logoUrl || null;

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

  // Clear the temporary selection after the parent confirms that
  // the server has returned the newly saved logo URL.
  useEffect(() => {
    if (selectedFile && logoUrl && !uploading) {
      setSelectedFile(null);
    }
  }, [logoUrl, selectedFile, uploading]);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Unsupported image format. Accepted formats: ${acceptedTypes
        .map((type) => type.replace('image/', '').toUpperCase())
        .join(', ')}.`;
    }

    if (file.size === 0) {
      return 'The selected image is empty.';
    }

    if (file.size > maxFileSizeMB * 1024 * 1024) {
      return `Choose an image smaller than ${maxFileSizeMB} MB.`;
    }

    return null;
  };

  const handleFileSelection = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again later.
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
        'The company logo could not be uploaded. Please try again.',
      );
    }
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
        'The company logo could not be removed. Please try again.',
      );
    }
  };

  const progress =
    uploadProgress !== null && Number.isFinite(uploadProgress)
      ? Math.min(100, Math.max(0, uploadProgress))
      : null;

  return (
    <section
      className="company-logo-upload"
      aria-label="Company logo"
      aria-busy={busy}
    >
      <header className="company-logo-upload__header">
        <div>
          <span className="company-logo-upload__eyebrow">
            COMPANY BRANDING
          </span>

          <h2>Company logo</h2>

          <p>
            Upload your organization's logo. It may appear on your
            employer profile and job listings.
          </p>
        </div>

        <span className="company-logo-upload__format-badge">
          JPG · PNG · WEBP
        </span>
      </header>

      <div className="company-logo-upload__content">
        <div className="company-logo-upload__preview">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Company logo preview"
              className="company-logo-upload__image"
            />
          ) : (
            <div className="company-logo-upload__placeholder">
              <span aria-hidden="true">✦</span>
              <small>Company logo</small>
            </div>
          )}

          {loading && (
            <div className="company-logo-upload__loading-overlay">
              Loading...
            </div>
          )}
        </div>

        <div className="company-logo-upload__instructions">
          <h3>Upload your company logo</h3>

          <p>
            Use a clear square image with your company name or
            recognizable brand mark. A transparent PNG works well
            for most logos.
          </p>

          <div className="company-logo-upload__requirements">
            <div>
              <strong>Recommended size</strong>
              <span>
                {recommendedSize} × {recommendedSize} pixels
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

          {!readOnly && (
            <button
              type="button"
              className="company-logo-upload__choose-button"
              onClick={() => inputRef.current?.click()}
              disabled={isDisabled}
            >
              {displayUrl ? 'Choose a different logo' : 'Choose logo'}
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        className="company-logo-upload__file-input"
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelection}
        disabled={isDisabled}
        aria-label="Choose company logo image"
      />

      {selectedFile && (
        <div className="company-logo-upload__selected-file">
          <div className="company-logo-upload__file-info">
            <span className="company-logo-upload__file-icon" aria-hidden="true">
              ▧
            </span>

            <div>
              <strong>{selectedFile.name}</strong>
              <span>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>

          {!readOnly && (
            <div className="company-logo-upload__file-actions">
              <button
                type="button"
                className="company-logo-upload__cancel-button"
                onClick={() => {
                  setSelectedFile(null);
                  setValidationError(null);
                }}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="button"
                className="company-logo-upload__save-button"
                onClick={handleUpload}
                disabled={isDisabled}
              >
                {uploading ? 'Uploading...' : 'Save logo'}
              </button>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div className="company-logo-upload__progress">
          <div className="company-logo-upload__progress-heading">
            <span>Uploading company logo</span>
            {progress !== null && (
              <strong>{Math.round(progress)}%</strong>
            )}
          </div>

          <div
            className="company-logo-upload__progress-track"
            role="progressbar"
            aria-label="Logo upload progress"
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
        <div className="company-logo-upload__error" role="alert">
          {validationError || error}
        </div>
      )}

      {!readOnly && logoUrl && onRemove && !selectedFile && (
        <div className="company-logo-upload__remove-area">
          {!removeConfirmation ? (
            <button
              type="button"
              className="company-logo-upload__remove-button"
              onClick={() => setRemoveConfirmation(true)}
              disabled={isDisabled}
            >
              Remove company logo
            </button>
          ) : (
            <div className="company-logo-upload__confirmation">
              <span>Are you sure you want to remove this logo?</span>

              <div>
                <button
                  type="button"
                  onClick={() => setRemoveConfirmation(false)}
                  disabled={isDisabled}
                >
                  Keep logo
                </button>

                <button
                  type="button"
                  className="company-logo-upload__confirm-remove"
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

      <p className="company-logo-upload__security-note">
        The server must validate uploaded image content and authorize
        company members before changing or deleting the logo.
      </p>
    </section>
  );
}

export default CompanyLogoUpload;
