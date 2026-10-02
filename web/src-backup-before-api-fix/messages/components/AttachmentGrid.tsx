import type { Attachment } from '../types';

interface AttachmentGridProps {
  attachments: Attachment[];
  onOpen: (index: number) => void;
}

export default function AttachmentGrid({ attachments, onOpen }: AttachmentGridProps) {
  const count = attachments.length;
  const visible = attachments.slice(0, 4);
  const overflow = count - 4;

  return (
    <div className={`attachment-grid attachment-grid--count-${Math.min(count, 4)}`}>
      {visible.map((att, i) => (
        <button
          type="button"
          key={att.id}
          className="attachment-grid__cell"
          onClick={() => onOpen(i)}
          aria-label={`Open image ${i + 1}`}
        >
          <img src={att.url} alt={att.caption ?? att.name} loading="lazy" />
          {overflow > 0 && i === 3 && <span className="attachment-grid__overflow">+{overflow}</span>}
        </button>
      ))}
    </div>
  );
}
