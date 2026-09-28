import { X, CornerUpLeft } from 'lucide-react';
import type { ReplyReference } from '../types';

interface ReplyPreviewProps {
  reply: ReplyReference;
  variant?: 'composer' | 'quote';
  onClose?: () => void;
  onClick?: () => void;
}

export default function ReplyPreview({ reply, variant = 'composer', onClose, onClick }: ReplyPreviewProps) {
  if (variant === 'quote') {
    return (
      <button type="button" className="reply-preview reply-preview--quote" onClick={onClick}>
        <span className="reply-preview__bar" />
        <span className="reply-preview__body">
          <span className="reply-preview__sender">{reply.senderName}</span>
          <span className="reply-preview__text">{reply.preview}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="reply-preview reply-preview--composer">
      <CornerUpLeft size={16} className="reply-preview__icon" />
      <div className="reply-preview__body">
        <span className="reply-preview__sender">Replying to {reply.senderName}</span>
        <span className="reply-preview__text">{reply.preview}</span>
      </div>
      {onClose && (
        <button type="button" className="reply-preview__close" onClick={onClose} aria-label="Cancel reply">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
