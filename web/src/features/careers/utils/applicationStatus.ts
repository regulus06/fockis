import type { ApplicationStatus } from '../types';

/** Job-seeker wording for application statuses (the employer sees New / Reviewed / Shortlisted). */
export type SeekerStage = 'submitted' | 'review' | 'interview' | 'offer' | 'rejected';

export const STAGE_OF: Record<ApplicationStatus, SeekerStage> = {
  applied: 'submitted',
  viewed: 'review',
  shortlisted: 'review',
  interview: 'interview',
  offer: 'offer',
  rejected: 'rejected',
};

export const STAGE_LABELS: Record<SeekerStage, string> = {
  submitted: 'Submitted',
  review: 'Under Review',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Not selected',
};

export const STAGE_TONES: Record<SeekerStage, 'info' | 'warning' | 'violet' | 'success' | 'danger'> = {
  submitted: 'info',
  review: 'warning',
  interview: 'violet',
  offer: 'success',
  rejected: 'danger',
};

export const STAGE_ORDER: SeekerStage[] = ['submitted', 'review', 'interview', 'offer'];
