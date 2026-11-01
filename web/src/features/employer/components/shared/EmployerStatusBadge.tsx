import ui from '../../styles/EmployerShared.module.scss';
import {
  APPLICATION_STATUS_LABELS,
  JOB_STATUS_LABELS,
  JOB_TYPE_LABELS,
} from '../../utils/employerConstants';
import type { ApplicationStatus, EmployerJobStatus, EmployerJobType, InterviewStatus } from '../../types';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'orange' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  success: ui.badgeSuccess,
  warning: ui.badgeWarning,
  danger: ui.badgeDanger,
  info: ui.badgeInfo,
  violet: ui.badgeViolet,
  orange: ui.badgeOrange,
  neutral: ui.badgeNeutral,
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={TONE_CLASS[tone]}>{children}</span>;
}

const JOB_STATUS_TONE: Record<EmployerJobStatus, Tone> = {
  active: 'success',
  pending_approval: 'warning',
  paused: 'neutral',
  expired: 'danger',
};

const APPLICATION_TONE: Record<ApplicationStatus, Tone> = {
  applied: 'info',
  viewed: 'neutral',
  shortlisted: 'violet',
  interview: 'warning',
  offer: 'success',
  rejected: 'danger',
};

const JOB_TYPE_TONE: Record<EmployerJobType, Tone> = {
  job: 'orange',
  internship: 'violet',
  coop: 'warning',
};

const INTERVIEW_TONE: Record<InterviewStatus, Tone> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

export const JobStatusBadge = ({ status }: { status: EmployerJobStatus }) => (
  <Badge tone={JOB_STATUS_TONE[status] ?? 'neutral'}>{JOB_STATUS_LABELS[status] ?? status}</Badge>
);

export const ApplicationStatusBadge = ({ status }: { status: ApplicationStatus }) => (
  <Badge tone={APPLICATION_TONE[status] ?? 'neutral'}>{APPLICATION_STATUS_LABELS[status] ?? status}</Badge>
);

export const JobTypeBadge = ({ type }: { type: EmployerJobType }) => (
  <Badge tone={JOB_TYPE_TONE[type] ?? 'neutral'}>{JOB_TYPE_LABELS[type] ?? type}</Badge>
);

export const InterviewStatusBadge = ({ status }: { status: InterviewStatus }) => (
  <Badge tone={INTERVIEW_TONE[status] ?? 'neutral'}>{status[0].toUpperCase() + status.slice(1)}</Badge>
);

/** @deprecated kept for older imports; prefer the specific badges above. */
export const EmployerStatusBadge = Badge;
export default Badge;
