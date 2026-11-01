import { Badge } from '../../employer/components/shared/EmployerStatusBadge';
import { STAGE_LABELS, STAGE_OF, STAGE_TONES } from '../utils/applicationStatus';
import type { ApplicationStatus } from '../types';

export function ApplicationStageBadge({ status }: { status: ApplicationStatus }) {
  const stage = STAGE_OF[status] ?? 'submitted';
  return <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>;
}

export default ApplicationStageBadge;
