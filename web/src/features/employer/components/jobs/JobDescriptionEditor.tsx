
import { useMemo, useState } from 'react';
import '../styles/JobDescriptionEditor.scss';

export type JobDescriptionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void | Promise<void>;
  loading?: boolean;
  saving?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  successMessage?: string | null;
  minLength?: number;
  maxLength?: number;
  showPreview?: boolean;
  showGuidance?: boolean;
  showSaveButton?: boolean;
  saveLabel?: string;
  emptyMessage?: string;
};

type DescriptionSection = {
  title: string;
  content: string[];
};

function parseDescription(value: string): DescriptionSection[] {
  const normalized = value.replace(/\r\n/g, '\n').trim();

  if (!normalized) return [];

  const lines = normalized.split('\n');
  const sections: DescriptionSection[] = [];
  let currentTitle = 'Job description';
  let currentContent: string[] = [];

  const flush = () => {
    const content = currentContent
      .map((line) => line.trim())
      .filter(Boolean);

    if (content.length > 0) {
      sections.push({
        title: currentTitle,
        content,
      });
    }

    currentContent = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);

    if (heading) {
      flush();
      currentTitle = heading[1].trim();
      continue;
    }

    currentContent.push(line);
  }

  flush();

  return sections;
}

function DescriptionSkeleton() {
  return (
    <div
      className="job-description-editor job-description-editor--skeleton"
      aria-label="Loading job description"
      aria-busy="true"
    >
      <span className="job-description-editor__skeleton-heading" />
      <span className="job-description-editor__skeleton-line" />
      <span className="job-description-editor__skeleton-line" />
      <span className="job-description-editor__skeleton-line job-description-editor__skeleton-line--short" />
      <span className="job-description-editor__skeleton-block" />
    </div>
  );
}

export function JobDescriptionEditor({
  value,
  onChange,
  onSave,
  loading = false,
  saving = false,
  disabled = false,
  readOnly = false,
  error = null,
  successMessage = null,
  minLength = 100,
  maxLength = 10000,
  showPreview = true,
  showGuidance = true,
  showSaveButton = true,
  saveLabel = 'Save description',
  emptyMessage = 'Write a clear description of the role, responsibilities, and qualifications.',
}: JobDescriptionEditorProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const characterCount = value.length;
  const wordCount = useMemo(() => {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [value]);

  const sections = useMemo(() => parseDescription(value), [value]);

  const canEdit = !disabled && !readOnly && !loading;
  const isBelowMinimum =
    characterCount > 0 && characterCount < minLength;
  const isAboveMaximum = characterCount > maxLength;

  const handleChange = (nextValue: string) => {
    if (!canEdit) return;

    if (nextValue.length > maxLength) {
      setLocalError(`The description cannot exceed ${maxLength.toLocaleString()} characters.`);
      return;
    }

    setLocalError(null);
    setSaveError(null);
    onChange(nextValue);
  };

  const validate = (): boolean => {
    const trimmed = value.trim();

    if (!trimmed) {
      setLocalError('Enter a job description before saving.');
      return false;
    }

    if (trimmed.length < minLength) {
      setLocalError(
        `The description must contain at least ${minLength.toLocaleString()} characters.`,
      );
      return false;
    }

    if (trimmed.length > maxLength) {
      setLocalError(
        `The description cannot exceed ${maxLength.toLocaleString()} characters.`,
      );
      return false;
    }

    setLocalError(null);
    return true;
  };

  const handleSave = async () => {
    if (!onSave || !canEdit || saving || !validate()) return;

    setSaveError(null);

    try {
      await onSave(value.trim());
    } catch (saveException) {
      setSaveError(
        saveException instanceof Error
          ? saveException.message
          : 'Unable to save the job description. Please try again.',
      );
    }
  };

  if (loading) return <DescriptionSkeleton />;

  return (
    <section
      className="job-description-editor"
      aria-label="Job description editor"
      aria-busy={saving}
    >
      <header className="job-description-editor__header">
        <div>
          <span className="job-description-editor__eyebrow">
            JOB DETAILS
          </span>
          <h2>Job description</h2>
          <p>
            Explain the role, responsibilities, requirements, and what
            candidates can expect.
          </p>
        </div>

        {showPreview && (
          <div
            className="job-description-editor__mode-switch"
            role="group"
            aria-label="Description view"
          >
            <button
              type="button"
              className={!previewMode ? 'is-active' : ''}
              onClick={() => setPreviewMode(false)}
              aria-pressed={!previewMode}
            >
              Edit
            </button>
            <button
              type="button"
              className={previewMode ? 'is-active' : ''}
              onClick={() => setPreviewMode(true)}
              aria-pressed={previewMode}
            >
              Preview
            </button>
          </div>
        )}
      </header>

      {showGuidance && !previewMode && (
        <aside className="job-description-editor__guidance">
          <strong>Writing a strong job description</strong>
          <ul>
            <li>Start with a short explanation of the position.</li>
            <li>Describe the main responsibilities and daily tasks.</li>
            <li>List the qualifications and experience required.</li>
            <li>Explain the benefits and opportunities honestly.</li>
            <li>Use clear, inclusive, job-related language.</li>
          </ul>
        </aside>
      )}

      {previewMode ? (
        <div className="job-description-editor__preview">
          {sections.length === 0 ? (
            <div className="job-description-editor__preview-empty">
              {emptyMessage}
            </div>
          ) : (
            sections.map((section, index) => (
              <section
                className="job-description-editor__preview-section"
                key={`${section.title}-${index}`}
              >
                {section.title !== 'Job description' && (
                  <h3>{section.title}</h3>
                )}

                {section.content.map((line, lineIndex) => {
                  const bullet = line.match(/^[-*]\s+(.+)$/);
                  const numbered = line.match(/^\d+[.)]\s+(.+)$/);

                  if (bullet || numbered) {
                    return (
                      <p
                        className="job-description-editor__preview-list-item"
                        key={`${index}-${lineIndex}`}
                      >
                        <span aria-hidden="true">
                          {bullet ? '•' : '–'}
                        </span>
                        {bullet?.[1] ?? numbered?.[1]}
                      </p>
                    );
                  }

                  return (
                    <p key={`${index}-${lineIndex}`}>
                      {line}
                    </p>
                  );
                })}
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="job-description-editor__writing-area">
          <label
            className="job-description-editor__visually-hidden"
            htmlFor="employer-job-description"
          >
            Job description
          </label>

          <textarea
            id="employer-job-description"
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            placeholder={
              'Describe the position...\n\nResponsibilities:\n- Explain the main duties\n\nQualifications:\n- List the required skills and experience'
            }
            maxLength={maxLength}
            minLength={minLength}
            rows={14}
            disabled={!canEdit}
            readOnly={readOnly}
            aria-invalid={Boolean(localError || error || isAboveMaximum)}
            aria-describedby="job-description-help job-description-count"
          />

          <div className="job-description-editor__writing-footer">
            <span id="job-description-help">
              Plain text is supported. Use headings beginning with # and
              bullet points beginning with - or *.
            </span>
            <span
              id="job-description-count"
              className={
                isBelowMinimum || isAboveMaximum
                  ? 'job-description-editor__count job-description-editor__count--warning'
                  : 'job-description-editor__count'
              }
              aria-live="polite"
            >
              {characterCount.toLocaleString()} / {maxLength.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="job-description-editor__stats">
        <span>
          <strong>{wordCount.toLocaleString()}</strong> words
        </span>
        <span>
          <strong>{characterCount.toLocaleString()}</strong> characters
        </span>
        {isBelowMinimum && (
          <span className="job-description-editor__minimum-warning">
            At least {minLength.toLocaleString()} characters recommended
          </span>
        )}
      </div>

      {(error || localError || saveError) && (
        <div className="job-description-editor__error" role="alert">
          {saveError || localError || error}
        </div>
      )}

      {successMessage && (
        <div className="job-description-editor__success" role="status">
          {successMessage}
        </div>
      )}

      {!readOnly && showSaveButton && onSave && (
        <footer className="job-description-editor__footer">
          <span>
            {isBelowMinimum
              ? 'Add more detail before saving.'
              : 'Your description will be saved with this job listing.'}
          </span>

          <button
            type="button"
            onClick={handleSave}
            disabled={
              !canEdit ||
              saving ||
              !value.trim() ||
              isBelowMinimum ||
              isAboveMaximum
            }
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        </footer>
      )}

      {readOnly && (
        <p className="job-description-editor__readonly">
          This job description is read-only.
        </p>
      )}
    </section>
  );
}

export default JobDescriptionEditor;
