import { X, ChevronLeft, ChevronRight, Download, ZoomIn } from 'lucide-react';
import type { Attachment } from '../types';

interface MediaViewerProps {
  items: Attachment[];
  index: number;
  zoom: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleZoom: () => void;
}

export default function MediaViewer({ items, index, zoom, onClose, onNext, onPrev, onToggleZoom }: MediaViewerProps) {
  const current = items[index];
  if (!current) return null;

  return (
    <div className="media-viewer" role="dialog" aria-modal="true">
      <div className="media-viewer__backdrop" onClick={onClose} />
      <div className="media-viewer__toolbar">
        <span className="media-viewer__counter">{index + 1} / {items.length}</span>
        <div className="media-viewer__toolbar-actions">
          <button type="button" onClick={onToggleZoom} aria-label="Zoom"><ZoomIn size={20} /></button>
          <a href={current.url} download={current.name} aria-label="Download"><Download size={20} /></a>
          <button type="button" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
      </div>

      {items.length > 1 && (
        <button type="button" className="media-viewer__nav media-viewer__nav--prev" onClick={onPrev} aria-label="Previous">
          <ChevronLeft size={28} />
        </button>
      )}

      <div className="media-viewer__stage">
        {current.kind === 'image' ? (
          <img
            src={current.url}
            alt={current.caption ?? current.name}
            style={{ transform: `scale(${zoom})` }}
            onClick={onToggleZoom}
          />
        ) : (
          <video src={current.url} controls autoPlay />
        )}
      </div>

      {items.length > 1 && (
        <button type="button" className="media-viewer__nav media-viewer__nav--next" onClick={onNext} aria-label="Next">
          <ChevronRight size={28} />
        </button>
      )}

      {current.caption && <p className="media-viewer__caption">{current.caption}</p>}
    </div>
  );
}
