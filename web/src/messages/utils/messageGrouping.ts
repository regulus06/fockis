import type { Message } from '../types';

export interface MessageGroup {
  dateLabel: string;
  messages: Message[];
}

const FIVE_MINUTES = 5 * 60 * 1000;

/** Groups consecutive messages by day, for date-divider rendering. */
export function groupMessagesByDay(messages: Message[], dateLabelFn: (iso: string) => string): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const label = dateLabelFn(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === label) {
      last.messages.push(msg);
    } else {
      groups.push({ dateLabel: label, messages: [msg] });
    }
  }
  return groups;
}

/** Determines whether a message should visually "stack" with the previous one (same sender, close in time). */
export function isSameCluster(prev: Message | undefined, current: Message): boolean {
  if (!prev) return false;
  if (prev.senderId !== current.senderId) return false;
  if (prev.type === 'system' || current.type === 'system') return false;
  const diff = new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return diff <= FIVE_MINUTES;
}

export function isFirstInCluster(prev: Message | undefined, current: Message): boolean {
  return !isSameCluster(prev, current);
}

export function isLastInCluster(current: Message, next: Message | undefined): boolean {
  if (!next) return true;
  return !isSameCluster(current, next);
}
