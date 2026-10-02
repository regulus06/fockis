import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import type { AttendanceRecord } from '../../types';
import '../../styles/components/attendance.scss';

const TONE: Record<AttendanceRecord['status'], 'success' | 'warning' | 'neutral' | 'danger'> = {
  present: 'success',
  host: 'success',
  co_host: 'success',
  late: 'warning',
  left_early: 'warning',
  absent: 'neutral',
};

const LABEL: Record<AttendanceRecord['status'], string> = {
  present: 'Present',
  host: 'Host',
  co_host: 'Co-host',
  late: 'Late',
  left_early: 'Left early',
  absent: 'Absent',
};

export function AttendanceRow({ record }: { record: AttendanceRecord }) {
  return (
    <div className="fm-attendance-row">
      <Avatar name={record.userName} size="md" />
      <div className="fm-attendance-row__info">
        <span className="fm-attendance-row__name">{record.userName}</span>
        <Badge tone={TONE[record.status]}>{LABEL[record.status]}</Badge>
      </div>
      <div className="fm-attendance-row__time">
        {record.joinedAt ? (
          <>
            <span>{record.joinedAt}{record.leftAt ? ` – ${record.leftAt}` : ''}</span>
            {record.minutesPresent && <span className="fm-attendance-row__minutes mono">{record.minutesPresent} min</span>}
          </>
        ) : (
          <span className="fm-attendance-row__absent">Did not join</span>
        )}
      </div>
    </div>
  );
}
