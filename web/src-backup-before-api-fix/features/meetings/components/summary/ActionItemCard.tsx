import type { MeetingActionItem } from '../../types';
import '../../styles/components/summary.scss';

export function ActionItemCard({ item }: { item: MeetingActionItem }) {
  return (
    <div className="fm-action-card">
      <div className="fm-action-card__assignee">{item.assigneeName}</div>
      <div className="fm-action-card__task">{item.task}</div>
      {item.dueDate && (
        <div className="fm-action-card__due">
          Due {new Date(item.dueDate).toLocaleDateString([], { month: 'long', day: 'numeric' })}
        </div>
      )}
    </div>
  );
}
