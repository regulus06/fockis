import type { Message } from '../types';

export function truncate(text: string, max = 60): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** A short human-readable preview of a message, used in conversation list & replies. */
export function getMessagePreview(message: Message | undefined): string {
  if (!message) return '';
  if (message.deletedForEveryone) return 'This message was deleted';
  switch (message.type) {
    case 'text':
      return truncate(message.text ?? '');
    case 'image':
      return message.attachments && message.attachments.length > 1 ? `📷 ${message.attachments.length} photos` : '📷 Photo';
    case 'video':
      return '🎥 Video';
    case 'audio':
      return '🎤 Voice message';
    case 'document':
    case 'file':
      return `📄 ${message.attachments?.[0]?.name ?? 'Document'}`;
    case 'system':
      return message.systemLabel ?? '';
    default:
      return '';
  }
}

export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}
