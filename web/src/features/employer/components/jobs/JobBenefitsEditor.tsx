
import { useState, type FormEvent } from 'react';
import '../styles/JobBenefitsEditor.scss';

export type JobBenefitCategory =
  | 'health'
  | 'financial'
  | 'time_off'
  | 'workplace'
  | 'career'
  | 'family'
  | 'wellness'
  | 'other';

export type JobBenefit = {
  id: string;
  title: string;
  description?: string;
  category: JobBenefitCategory;
  available: boolean;
};

export type JobBenefitsEditorProps = {
  benefits: JobBenefit[];
  onChange: (benefits: JobBenefit[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  successMessage?: string | null;
  maxBenefits?: number;
  maxTitleLength?: number;
  maxDescriptionLength?: number;
  emptyMessage?: string;
};

type BenefitFormValues = {
  title: string;
  description: string;
  category: JobBenefitCategory;
  available: boolean;
};

const CATEGORIES: {
  value: JobBenefitCategory;
  label: string;
  description: string;
}[] = [
  {
    value: 'health',
    label: 'Health',
    description: 'Medical, dental, vision, and healthcare benefits.',
  },
  {
    value: 'financial',
    label: 'Financial',
    description: 'Retirement, bonuses, and financial assistance.',
  },
  {
    value: 'time_off',
    label: 'Time off',
    description: 'Vacation, holidays, and paid leave.',
  },
  {
    value: 'workplace',
    label: 'Workplace',
    description: 'Remote work, flexible schedules, and equipment.',
  },
  {
    value: 'career',
    label: 'Career development',
    description: 'Training, education, and professional growth.',
  },
  {
    value: 'family',
    label: 'Family',
    description: 'Parental leave and family support.',
  },
  {
    value: 'wellness',
    label: 'Wellness',
    description: 'Wellness programs and employee assistance.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Additional benefits offered by the employer.',
  },
];

const EMPTY_FORM: BenefitFormValues = {
  title: '',
  description: '',
  category: 'health',
  available: true,
};

function createBenefitId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `benefit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function JobBenefitsEditor({
  benefits,
  onChange,
  disabled = false,
  readOnly = false,
  error = null,
  successMessage = null,
  maxBenefits = 30,
  maxTitleLength = 100,
  maxDescriptionLength = 500,
  emptyMessage = 'No benefits have been added to this job yet.',
}: JobBenefitsEditorProps) {
  const [form, setForm] = useState<BenefitFormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const canEdit = !disabled && !readOnly;
  const isEditing = editingId !== null;
  const atLimit = benefits.length >= maxBenefits;

  const groupedBenefits = CATEGORIES.map((category) => ({
    ...category,
    items: benefits.filter(
      (benefit) => benefit.category === category.value,
    ),
  })).filter((group) => group.items.length > 0);

  const activeCount = benefits.filter((benefit) => benefit.available).length;

  const updateForm = <K extends keyof BenefitFormValues>(
    key: K,
    value: BenefitFormValues[K],
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

  const openEditForm = (benefit: JobBenefit) => {
    if (!canEdit) return;

    setForm({
      title: benefit.title,
      description: benefit.description ?? '',
      category: benefit.category,
      available: benefit.available,
    });
    setEditingId(benefit.id);
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
      setFormError('Enter a benefit name.');
      return;
    }

    if (title.length > maxTitleLength) {
      setFormError(`Benefit names cannot exceed ${maxTitleLength} characters.`);
      return;
    }

    if (description.length > maxDescriptionLength) {
      setFormError(
        `Descriptions cannot exceed ${maxDescriptionLength} characters.`,
      );
      return;
    }

    const duplicate = benefits.some(
      (benefit) =>
        benefit.id !== editingId &&
        benefit.title.trim().toLowerCase() === title.toLowerCase() &&
        benefit.category === form.category,
    );

    if (duplicate) {
      setFormError('This benefit already exists in this category.');
      return;
    }

    const updatedBenefit: JobBenefit = {
      id: editingId ?? createBenefitId(),
      title,
      description,
      category: form.category,
      available: form.available,
    };

    if (editingId) {
      onChange(
        benefits.map((benefit) =>
          benefit.id === editingId ? updatedBenefit : benefit,
        ),
      );
    } else {
      if (atLimit) {
        setFormError(`You can add up to ${maxBenefits} benefits.`);
        return;
      }

      onChange([...benefits, updatedBenefit]);
    }

    closeForm();
  };

  const handleToggle = (benefit: JobBenefit) => {
    if (!canEdit) return;

    onChange(
      benefits.map((item) =>
        item.id === benefit.id
          ? { ...item, available: !item.available }
          : item,
      ),
    );
  };

  const handleDelete = (benefit: JobBenefit) => {
    if (!canEdit) return;

    const confirmed = window.confirm(
      `Remove "${benefit.title}" from this job's benefits?`,
    );

    if (!confirmed) return;

    onChange(benefits.filter((item) => item.id !== benefit.id));

    if (editingId === benefit.id) {
      closeForm();
    }
  };

  return (
    <section
      className="job-benefits-editor"
      aria-label="Job benefits editor"
      aria-busy={disabled}
    >
      <header className="job-benefits-editor__header">
        <div>
          <span className="job-benefits-editor__eyebrow">
            JOB DETAILS
          </span>
          <h2>Benefits and perks</h2>
          <p>
            Highlight the benefits candidates can expect from this position.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="job-benefits-editor__add-button"
            onClick={openAddForm}
            disabled={atLimit}
          >
            <span aria-hidden="true">+</span>
            Add benefit
          </button>
        )}
      </header>

      <div className="job-benefits-editor__summary">
        <div>
          <strong>{benefits.length}</strong>
          <span>Total benefits</span>
        </div>
        <div>
          <strong>{activeCount}</strong>
          <span>Currently offered</span>
        </div>
        <div>
          <strong>{benefits.length - activeCount}</strong>
          <span>Disabled</span>
        </div>
      </div>

      {error && (
        <div className="job-benefits-editor__message job-benefits-editor__message--error" role="alert">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="job-benefits-editor__message job-benefits-editor__message--success" role="status">
          {successMessage}
        </div>
      )}

      {showForm && canEdit && (
        <form
          className="job-benefits-editor__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="job-benefits-editor__form-heading">
            <div>
              <h3>{isEditing ? 'Edit benefit' : 'Add a benefit'}</h3>
              <p>
                Provide accurate information about what this job offers.
              </p>
            </div>
            <button
              type="button"
              className="job-benefits-editor__close"
              onClick={closeForm}
              aria-label="Close benefit form"
            >
              ×
            </button>
          </div>

          <div className="job-benefits-editor__field">
            <label htmlFor="job-benefit-title">
              Benefit name <span aria-hidden="true">*</span>
            </label>
            <input
              id="job-benefit-title"
              type="text"
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              maxLength={maxTitleLength}
              placeholder="e.g. Health insurance"
              required
              autoComplete="off"
              disabled={disabled}
            />
            <small>
              {form.title.length}/{maxTitleLength}
            </small>
          </div>

          <div className="job-benefits-editor__field">
            <label htmlFor="job-benefit-category">Category</label>
            <select
              id="job-benefit-category"
              value={form.category}
              onChange={(event) =>
                updateForm(
                  'category',
                  event.target.value as JobBenefitCategory,
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
              {CATEGORIES.find((item) => item.value === form.category)?.description}
            </small>
          </div>

          <div className="job-benefits-editor__field">
            <label htmlFor="job-benefit-description">
              Description <span className="optional">(optional)</span>
            </label>
            <textarea
              id="job-benefit-description"
              value={form.description}
              onChange={(event) =>
                updateForm('description', event.target.value)
              }
              maxLength={maxDescriptionLength}
              rows={3}
              placeholder="Explain what this benefit includes..."
              disabled={disabled}
            />
            <small>
              {form.description.length}/{maxDescriptionLength}
            </small>
          </div>

          <label className="job-benefits-editor__availability">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) =>
                updateForm('available', event.target.checked)
              }
              disabled={disabled}
            />
            <span>
              <strong>Currently offered</strong>
              <small>
                Show this benefit as available to candidates.
              </small>
            </span>
          </label>

          {formError && (
            <p className="job-benefits-editor__form-error" role="alert">
              {formError}
            </p>
          )}

          <div className="job-benefits-editor__form-actions">
            <button
              type="button"
              className="job-benefits-editor__cancel"
              onClick={closeForm}
              disabled={disabled}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="job-benefits-editor__save"
              disabled={disabled}
            >
              {isEditing ? 'Save changes' : 'Add benefit'}
            </button>
          </div>
        </form>
      )}

      {benefits.length === 0 ? (
        <div className="job-benefits-editor__empty">
          <span aria-hidden="true">✦</span>
          <h3>No benefits added yet</h3>
          <p>{emptyMessage}</p>
          {canEdit && (
            <button
              type="button"
              onClick={openAddForm}
              disabled={atLimit}
            >
              Add your first benefit
            </button>
          )}
        </div>
      ) : (
        <div className="job-benefits-editor__groups">
          {groupedBenefits.map((group) => (
            <section
              className="job-benefits-editor__group"
              key={group.value}
              aria-label={`${group.label} benefits`}
            >
              <div className="job-benefits-editor__group-heading">
                <h3>{group.label}</h3>
                <span>{group.items.length}</span>
              </div>

              <div className="job-benefits-editor__list">
                {group.items.map((benefit) => (
                  <article
                    className={[
                      'job-benefits-editor__item',
                      !benefit.available &&
                        'job-benefits-editor__item--disabled',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={benefit.id}
                  >
                    <div className="job-benefits-editor__item-indicator">
                      <span aria-hidden="true">✓</span>
                    </div>

                    <div className="job-benefits-editor__item-content">
                      <div className="job-benefits-editor__item-title">
                        <h4>{benefit.title}</h4>
                        {!benefit.available && (
                          <span className="job-benefits-editor__unavailable">
                            Not offered
                          </span>
                        )}
                      </div>

                      {benefit.description && (
                        <p>{benefit.description}</p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="job-benefits-editor__item-actions">
                        <button
                          type="button"
                          onClick={() => handleToggle(benefit)}
                          aria-label={
                            benefit.available
                              ? `Disable ${benefit.title}`
                              : `Enable ${benefit.title}`
                          }
                          title={
                            benefit.available
                              ? 'Mark as not offered'
                              : 'Mark as offered'
                          }
                        >
                          {benefit.available ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(benefit)}
                          aria-label={`Edit ${benefit.title}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="job-benefits-editor__delete"
                          onClick={() => handleDelete(benefit)}
                          aria-label={`Remove ${benefit.title}`}
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
        <p className="job-benefits-editor__limit">
          You've reached the maximum of {maxBenefits} benefits.
        </p>
      )}

      {readOnly && (
        <p className="job-benefits-editor__readonly">
          This benefits list is read-only.
        </p>
      )}
    </section>
  );
}

export default JobBenefitsEditor;
