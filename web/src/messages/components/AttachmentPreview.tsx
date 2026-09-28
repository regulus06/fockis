import { X, FileText, Video as VideoIcon } from 'lucide-react';
import type { UploadState } from '../types';
import { formatFileSize, getFileExtension } from '../utils/fileHelpers';

interface AttachmentPreviewProps {
  uploads: UploadState[];
  onRemove: (id: string) => void;
}

export default function AttachmentPreview({ uploads, onRemove }: AttachmentPreviewProps) {
  if (uploads.length === 0) return null;

  return (
    <div className="attachment-preview">
      {uploads.map((upload) => (
        <div key={upload.id} className="attachment-preview__item">
          <button type="button" className="attachment-preview__remove" onClick={() => onRemove(upload.id)} aria-label="Remove">
            <X size={12} />
          </button>
          {upload.kind === 'image' && <img src={upload.previewUrl} alt={upload.file.name} />}
          {upload.kind === 'video' && (
            <div className="attachment-preview__video">
              <VideoIcon size={20} />
            </div>
          )}
          {upload.kind === 'document' && (
            <div className="attachment-preview__document">
              <FileText size={18} />
              <span>{getFileExtension(upload.file.name)}</span>
            </div>
          )}
          {upload.stage === 'uploading' && (
            <div className="attachment-preview__progress">
              <div className="attachment-preview__progress-fill" style={{ width: `${upload.progress}%` }} />
            </div>
          )}
          <span className="attachment-preview__size">{formatFileSize(upload.file.size)}</span>
        </div>
      ))}
    </div>
  );
}
