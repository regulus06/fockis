import { useEffect, useRef } from 'react';
import { Image, FileText, Video, Camera } from 'lucide-react';

interface AttachmentMenuProps {
  onClose: () => void;
  onPickImages: () => void;
  onPickVideo: () => void;
  onPickDocument: () => void;
}

export default function AttachmentMenu({ onClose, onPickImages, onPickVideo, onPickDocument }: AttachmentMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const options = [
    { icon: <Image size={20} />, label: 'Photos', action: onPickImages, color: '#8b5cf6' },
    { icon: <Video size={20} />, label: 'Video', action: onPickVideo, color: '#ef4444' },
    { icon: <FileText size={20} />, label: 'Document', action: onPickDocument, color: '#3b82f6' },
    { icon: <Camera size={20} />, label: 'Camera', action: onPickImages, color: '#10b981' },
  ];

  return (
    <div ref={ref} className="attachment-menu">
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          className="attachment-menu__item"
          onClick={() => { opt.action(); onClose(); }}
        >
          <span className="attachment-menu__icon" style={{ background: opt.color }}>
            {opt.icon}
          </span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
