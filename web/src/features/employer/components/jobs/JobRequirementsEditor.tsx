
import { useState, type FormEvent } from 'react';
import '../styles/JobRequirementsEditor.scss';

export type JobRequirementCategory =
  | 'skills'
  | 'experience'
  | 'education'
  | 'certification'
  | 'language'
  | 'technical'
  | 'other';

export type JobRequirementType = 'required' | 'preferred';

export type JobRequirement = {
  id: string;
  title: string;
  description?: string;
  category: JobRequirementCategory;
  type: JobRequirementType;
  essential: boolean;
};

export type JobRequirementsEditorProps = {
  requirements: JobRequirement[];
  onChange: (requirements: JobRequirement[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  successMessage?: string | null;
  maxRequirements?: number;
  maxTitleLength?: number;
  maxDescriptionLength?: number;
  emptyMessage?: string;
};

type RequirementFormValues = {
  title: string;
  description: string;
  category: JobRequirementCategory;
  type: JobRequirementType;
  essential: boolean;
};

const CATEGORIES: {
  value: JobRequirementCategory;
  label: string;
  description: string;
}[] = [
  {
    value: 'skills',
    label: 'Skills',
    description: 'Role-specific abilities and competencies.',
  },
  {
    value: 'experience',
    label: 'Experience',
    description: 'Relevant work or practical experience.',
  },
  {
    value: 'education',
    label: 'Education',
    description: 'Degrees, coursework, or educational background.',
  },
  {
    value: 'certification',
    label: 'Certifications',
    description: 'Professional licenses or industry certifications.',
  },
  {
    value: 'language',
    label: 'Languages',
    description: 'Languages and job-related proficiency levels.',
  },
  {
    value: 'technical',
    label: 'Technical',
    description: 'Tools, systems, software, and technical knowledge.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Additional job-related qualifications.',
  },
];

const EMPTY_FORM: RequirementFormValues = {
  title: '',
  description: '',
  category: 'skills',
  type: 'required',
  essential: true,
};

function createRequirementId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `requirement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function RequirementSkeleton() {
  return (
    <div
      className="job-requirements-editor job-requirements-editor--skeleton"
      aria-label="Loading job requirements"
      aria-busy="true"
    >
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function JobRequirementsEditor({
  requirements,
  onChange,
  disabled = false,
  readOnly = false,
  error = null,
  successMessage = null,
  maxRequirements = 40,
  maxTitleLength = 120,
  maxDescriptionLength = 500,
  emptyMessage = 'Add the qualifications candidates should have for this position.',
}: JobRequirementsEditorProps) {
  const [form, setForm] = useState<RequirementFormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = !disabled && !readOnly;
  const isEditing = editingId !== null;
  const atLimit = requirements.length >= maxRequirements;

  const requiredCount = requirements.filter(
    (item) => item.type === 'required',
  ).length;

  const preferredCount = requirements.filter(
    (item) => item.type === 'preferred',
  ).length;

  const groupedRequirements = CATEGORIES.map((category) => ({
    ...category,
    items: requirements.filter(
      (item) => item.category === category.value,
    ),
  })).filter((group) => group.items.length > 0);

  const updateForm = <K extends keyof RequirementFormValues>(
    key: K,
    value: RequirementFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError(null);
  };

  const openAddForm = () => {
    if (!canEdit || atLimit) return;

    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (requirement: JobRequirement) => {
    if (!canEdit) return;

    setForm({
      title: requirement.title,
      description: requirement.description ?? '',
      category: requirement.category,
      type: requirement.type,
      essential: requirement.essential,
    });

    setEditingId(requirement.id);
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEdit) return;

    const title = normalizeText(form.title);
    const description = form.description.trim();

    if (!title) {
      setFormError('Enter a requirement.');
      return;
    }

    if (title.length > maxTitleLength) {
      setFormError(
        `Requirements cannot exceed ${maxTitleLength} characters.`,
      );
      return;
    }

    if (description.length > maxDescriptionLength) {
      setFormError(
        `Descriptions cannot exceed ${maxDescriptionLength} characters.`,
      );
      return;
    }

    const duplicate = requirements.some(
      (item) =>
        item.id !== editingId &&
        item.title.trim().toLowerCase() === title.toLowerCase() &&
        item.category === form.category &&
        item.type === form.type,
    );

    if (duplicate) {
      setFormError(
        'This requirement already exists in this category and type.',
      );
      return;
    }

    const updatedRequirement: JobRequirement = {
      id: editingId ?? createRequirementId(),
      title,
      description,
      category: form.category,
      type: form.type,
      essential: form.type === 'required' && form.essential,
    };

    if (editingId) {
      onChange(
        requirements.map((item) =>
          item.id === editingId ? updatedRequirement : item,
        ),
      );
    } else {
      if (atLimit) {
        setFormError(
          `You can add up to ${maxRequirements} requirements.`,
        );
        return;
      }

      onChange([...requirements, updatedRequirement]);
    }

    closeForm();
  };

  const handleDelete = (requirement: JobRequirement) => {
    if (!canEdit) return;

    const confirmed = window.confirm(
      `Remove "${requirement.title}" from this job's requirements?`,
    );

    if (!confirmed) return;

    onChange(
      requirements.filter((item) => item.id !== requirement.id),
    );

    if (editingId === requirement.id) {
      closeForm();
    }
  };

  const handleToggleType = (
    requirement: JobRequirement,
    nextType: JobRequirementType,
  ) => {
    if (!canEdit || requirement.type === nextType) return;

    onChange(
      requirements.map((item) =>
        item.id === requirement.id
          ? {
              ...item,
              type: nextType,
              essential:
                nextType === 'required' ? item.essential : false,
            }
          : item,
      ),
    );
  };

  return (
    <section
      className="job-requirements-editor"
      aria-label="Job requirements editor"
      aria-busy={disabled}
    >
      <header className="job-requirements-editor__header">
        <div>
          <span className="job-requirements-editor__eyebrow">
            CANDIDATE QUALIFICATIONS
          </span>
          <h2>Job requirements</h2>
          <p>
            Explain the qualifications candidates need or that would make
            them stronger applicants.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="job-requirements-editor__add-button"
            onClick={openAddForm}
            disabled={atLimit}
          >
            <span aria-hidden="true">+</span>
            Add requirement
          </button>
        )}
      </header>

      <div className="job-requirements-editor__summary">
        <div>
          <strong>{requirements.length}</strong>
          <span>Total requirements</span>
        </div>
        <div>
          <strong>{requiredCount}</strong>
          <span>Required</span>
        </div>
        <div>
          <strong>{preferredCount}</strong>
          <span>Preferred</span>
        </div>
      </div>

      {error && (
        <div
          className="job-requirements-editor__message job-requirements-editor__message--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="job-requirements-editor__message job-requirements-editor__message--success"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {showForm && canEdit && (
        <form
          className="job-requirements-editor__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="job-requirements-editor__form-heading">
            <div>
              <h3>{isEditing ? 'Edit requirement' : 'Add a requirement'}</h3>
              <p>
                Keep qualifications clear, relevant, and specific to the role.
              </p>
            </div>

            <button
              type="button"
              className="job-requirements-editor__close"
              onClick={closeForm}
              aria-label="Close requirement form"
            >
              ×
            </button>
          </div>

          <div className="job-requirements-editor__field">
            <label htmlFor="job-requirement-title">
              Requirement <span aria-hidden="true">*</span>
            </label>
            <input
              id="job-requirement-title"
              type="text"
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              maxLength={maxTitleLength}
              placeholder="e.g. Experience with React and TypeScript"
              required
              autoComplete="off"
              disabled={disabled}
            />
            <small>
              {form.title.length}/{maxTitleLength}
            </small>
          </div>

          <div className="job-requirements-editor__form-grid">
            <div className="job-requirements-editor__field">
              <label htmlFor="job-requirement-category">Category</label>
              <select
                id="job-requirement-category"
                value={form.category}
                onChange={(event) =>
                  updateForm(
                    'category',
                    event.target.value as JobRequirementCategory,
                  )
                }
                disabled={disabled}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <small>
                {
                  CATEGORIES.find(
                    (item) => item.value === form.category,
                  )?.description
                }
              </small>
            </div>

            <div className="job-requirements-editor__field">
              <label htmlFor="job-requirement-type">Requirement type</label>
              <select
                id="job-requirement-type"
                value={form.type}
                onChange={(event) =>
                  updateForm(
                    'type',
                    event.target.value as JobRequirementType,
                  )
                }
                disabled={disabled}
              >
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
              </select>
              <small>
                Required qualifications are expected; preferred
                qualifications are additional advantages.
              </small>
            </div>
          </div>

          <div className="job-requirements-editor__field">
            <label htmlFor="job-requirement-description">
              Additional details <span className="optional">(optional)</span>
            </label>
            <textarea
              id="job-requirement-description"
              value={form.description}
              onChange={(event) =>
                updateForm('description', event.target.value)
              }
              maxLength={maxDescriptionLength}
              rows={3}
              placeholder="Add details about the expected experience or proficiency..."
              disabled={disabled}
            />
            <small>
              {form.description.length}/{maxDescriptionLength}
            </small>
          </div>

          {form.type === 'required' && (
            <label className="job-requirements-editor__essential">
              <input
                type="checkbox"
                checked={form.essential}
                onChange={(event) =>
                  updateForm('essential', event.target.checked)
                }
                disabled={disabled}
              />
              <span>
                <strong>Essential qualification</strong>
                <small>
                  Identify this as a core requirement for the position.
                </small>
              </span>
            </label>
          )}

          {formError && (
            <p className="job-requirements-editor__form-error" role="alert">
              {formError}
            </p>
          )}

          <div className="job-requirements-editor__form-actions">
            <button
              type="button"
              className="job-requirements-editor__cancel"
              onClick={closeForm}
              disabled={disabled}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="job-requirements-editor__save"
              disabled={disabled}
            >
              {isEditing ? 'Save changes' : 'Add requirement'}
            </button>
          </div>
        </form>
      )}

      {requirements.length === 0 ? (
        <div className="job-requirements-editor__empty">
          <span aria-hidden="true">✓</span>
          <h3>No requirements added yet</h3>
          <p>{emptyMessage}</p>
          {canEdit && (
            <button
              type="button"
              onClick={openAddForm}
              disabled={atLimit}
            >
              Add your first requirement
            </button>
          )}
        </div>
      ) : (
        <div className="job-requirements-editor__groups">
          {groupedRequirements.map((group) => (
            <section
              className="job-requirements-editor__group"
              key={group.value}
              aria-label={`${group.label} requirements`}
            >
              <div className="job-requirements-editor__group-heading">
                <h3>{group.label}</h3>
                <span>{group.items.length}</span>
              </div>

              <div className="job-requirements-editor__list">
                {group.items.map((requirement) => (
                  <article
                    className="job-requirements-editor__item"
                    key={requirement.id}
                  >
                    <div className="job-requirements-editor__item-icon">
                      <span aria-hidden="true">
                        {requirement.category === 'education'
                          ? '▤'
                          : requirement.category === 'certification'
                            ? '✧'
                            : requirement.category === 'language'
                              ? '文'
                              : requirement.category === 'experience'
                                ? '◷'
                                : '✓'}
                      </span>
                    </div>

                    <div className="job-requirements-editor__item-content">
                      <div className="job-requirements-editor__item-title">
                        <h4>{requirement.title}</h4>
                        <span
                          className={`job-requirements-editor__type job-requirements-editor__type--${requirement.type}`}
                        >
                          {requirement.type === 'required'
                            ? 'Required'
                            : 'Preferred'}
                        </span>
                        {requirement.essential && (
                          <span className="job-requirements-editor__essential-badge">
                            Essential
                          </span>
                        )}
                      </div>

                      {requirement.description && (
                        <p>{requirement.description}</p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="job-requirements-editor__item-actions">
                        <select
                          aria-label={`Requirement type for ${requirement.title}`}
                          value={requirement.type}
                          onChange={(event) =>
                            handleToggleType(
                              requirement,
                              event.target.value as JobRequirementType,
                            )
                          }
                        >
                          <option value="required">Required</option>
                          <option value="preferred">Preferred</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => openEditForm(requirement)}
                          aria-label={`Edit ${requirement.title}`}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="job-requirements-editor__delete"
                          onClick={() => handleDelete(requirement)}
                          aria-label={`Remove ${requirement.title}`}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {atLimit && canEdit && (
        <p className="job-requirements-editor__limit">
          You've reached the maximum of {maxRequirements} requirements.
        </p>
      )}

      {readOnly && (
        <p className="job-requirements-editor__readonly">
          This requirements list is read-only.
        </p>
      )}
    </section>
  );
}

export default JobRequirementsEditor;
