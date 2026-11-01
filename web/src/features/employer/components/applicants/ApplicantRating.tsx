
import { useEffect, useMemo, useState } from 'react';
import '../styles/ApplicantRating.scss';

export type ApplicantRatingCategory =
  | 'technicalSkills'
  | 'communication'
  | 'experience'
  | 'problemSolving'
  | 'cultureFit';

export type ApplicantRatingValues = Record<
  ApplicantRatingCategory,
  number
>;

export type ApplicantRatingData = {
  id: string;
  applicantId: string;
  reviewerId: string;
  reviewerName: string;
  ratings: ApplicantRatingValues;
  feedback?: string;
  createdAt: string;
  updatedAt?: string;
};

export type ApplicantRatingProps = {
  applicantId: string;
  initialRating?: ApplicantRatingData | null;
  onSubmit: (
    rating: {
      applicantId: string;
      ratings: ApplicantRatingValues;
      feedback: string;
    },
  ) => Promise<void> | void;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
};

const RATING_CATEGORIES: {
  key: ApplicantRatingCategory;
  label: string;
  description: string;
}[] = [
  {
    key: 'technicalSkills',
    label: 'Technical skills',
    description: 'Relevant knowledge and job-specific abilities.',
  },
  {
    key: 'communication',
    label: 'Communication',
    description: 'Clarity, listening, and professional communication.',
  },
  {
    key: 'experience',
    label: 'Relevant experience',
    description: 'Experience related to the position.',
  },
  {
    key: 'problemSolving',
    label: 'Problem solving',
    description: 'Analytical thinking and handling challenges.',
  },
  {
    key: 'cultureFit',
    label: 'Role and team alignment',
    description: 'Alignment with the responsibilities and working environment.',
  },
];

const EMPTY_RATINGS: ApplicantRatingValues = {
  technicalSkills: 0,
  communication: 0,
  experience: 0,
  problemSolving: 0,
  cultureFit: 0,
};

function calculateAverage(ratings: ApplicantRatingValues): number {
  const values = Object.values(ratings);
  const completed = values.filter((value) => value > 0);

  if (completed.length === 0) return 0;

  return (
    completed.reduce((total, value) => total + value, 0) /
    completed.length
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ApplicantRating({
  applicantId,
  initialRating = null,
  onSubmit,
  loading = false,
  saving = false,
  error = null,
  disabled = false,
  readOnly = false,
}: ApplicantRatingProps) {
  const [ratings, setRatings] =
    useState<ApplicantRatingValues>(EMPTY_RATINGS);

  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (initialRating?.applicantId === applicantId) {
      setRatings(initialRating.ratings);
      setFeedback(initialRating.feedback ?? '');
    } else {
      setRatings(EMPTY_RATINGS);
      setFeedback('');
    }

    setFormError('');
  }, [applicantId, initialRating]);

  const average = useMemo(
    () => calculateAverage(ratings),
    [ratings],
  );

  const completedCategories = Object.values(ratings).filter(
    (value) => value > 0,
  ).length;

  const isDisabled = disabled || loading || saving || readOnly;

  const updateRating = (
    category: ApplicantRatingCategory,
    value: number,
  ) => {
    setRatings((previous) => ({
      ...previous,
      [category]: value,
    }));

    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (completedCategories !== RATING_CATEGORIES.length) {
      setFormError('Please rate all five evaluation categories.');
      return;
    }

    try {
      setFormError('');

      await onSubmit({
        applicantId,
        ratings,
        feedback: feedback.trim(),
      });
    } catch {
      setFormError('Unable to save the evaluation. Please try again.');
    }
  };

  if (loading) {
    return (
      <section
        className="applicant-rating"
        aria-label="Applicant rating"
        aria-busy="true"
      >
        <div className="applicant-rating__loading">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  return (
    <section
      className="applicant-rating"
      aria-label="Applicant evaluation"
      aria-busy={saving}
    >
      <div className="applicant-rating__header">
        <div>
          <h2>Candidate evaluation</h2>
          <p>Record structured feedback about this applicant.</p>
        </div>

        <span className="applicant-rating__private">
          Internal evaluation
        </span>
      </div>

      <div className="applicant-rating__summary">
        <div className="applicant-rating__score">
          <strong>
            {completedCategories > 0
              ? average.toFixed(1)
              : '—'}
          </strong>
          <span>Average score</span>
        </div>

        <div className="applicant-rating__progress">
          <div className="applicant-rating__progress-heading">
            <span>Evaluation progress</span>
            <strong>
              {completedCategories}/{RATING_CATEGORIES.length}
            </strong>
          </div>

          <div
            className="applicant-rating__progress-track"
            role="progressbar"
            aria-valuenow={completedCategories}
            aria-valuemin={0}
            aria-valuemax={RATING_CATEGORIES.length}
          >
            <span
              style={{
                width: `${(completedCategories / RATING_CATEGORIES.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="applicant-rating__categories">
          {RATING_CATEGORIES.map((category) => (
            <div
              className="applicant-rating__category"
              key={category.key}
            >
              <div className="applicant-rating__category-info">
                <h3>{category.label}</h3>
                <p>{category.description}</p>
              </div>

              <div
                className="applicant-rating__stars"
                role="group"
                aria-label={`Rate ${category.label}`}
              >
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const selected = ratings[category.key] >= value;

                  return (
                    <button
                      key={value}
                      type="button"
                      className={
                        selected
                          ? 'applicant-rating__star is-selected'
                          : 'applicant-rating__star'
                      }
                      onClick={() =>
                        updateRating(category.key, value)
                      }
                      disabled={isDisabled}
                      aria-label={`${value} out of 5`}
                      aria-pressed={ratings[category.key] === value}
                    >
                      ★
                    </button>
                  );
                })}
              </div>

              <span className="applicant-rating__category-score">
                {ratings[category.key] > 0
                  ? `${ratings[category.key]}/5`
                  : 'Not rated'}
              </span>
            </div>
          ))}
        </div>

        <div className="applicant-rating__feedback">
          <label htmlFor="applicant-rating-feedback">
            Evaluation feedback
          </label>

          <textarea
            id="applicant-rating-feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Add interview observations, strengths, areas to explore, or other job-related feedback..."
            rows={5}
            maxLength={3000}
            disabled={isDisabled}
          />

          <span>{feedback.length}/3000 characters</span>
        </div>

        {initialRating?.createdAt && (
          <p className="applicant-rating__updated">
            Last evaluation recorded: {formatDate(
              initialRating.updatedAt ?? initialRating.createdAt,
            )}
          </p>
        )}

        {(formError || error) && (
          <p className="applicant-rating__error" role="alert">
            {formError || error}
          </p>
        )}

        {!readOnly && (
          <div className="applicant-rating__footer">
            <p>Only authorized employer team members should access this evaluation.</p>

            <button
              type="submit"
              disabled={
                isDisabled ||
                completedCategories !== RATING_CATEGORIES.length
              }
            >
              {saving
                ? 'Saving evaluation...'
                : initialRating
                  ? 'Update evaluation'
                  : 'Save evaluation'}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

export default ApplicantRating;
