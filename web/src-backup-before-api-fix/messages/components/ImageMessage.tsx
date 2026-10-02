import type { Attachment } from '../types';
import AttachmentGrid from './AttachmentGrid';

interface ImageMessageProps {
  attachments: Attachment[];
  caption?: string;
  onOpen: (index: number) => void;
}

export default function ImageMessage({ attachments, caption, onOpen }: ImageMessageProps) {
  return (
    <div className="image-message">
      <AttachmentGrid attachments={attachments} onOpen={onOpen} />
      {caption && <p className="image-message__caption">{caption}</p>}
    </div>
  );
}
