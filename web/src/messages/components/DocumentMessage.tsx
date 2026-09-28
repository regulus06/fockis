import { FileText, Download } from 'lucide-react';
import type { Attachment } from '../types';
import { formatFileSize, getFileExtension, documentColor } from '../utils/fileHelpers';

interface DocumentMessageProps {
  attachment: Attachment;
}

export default function DocumentMessage({ attachment }: DocumentMessageProps) {
  const ext = getFileExtension(attachment.name);
  const color = documentColor(ext);

  return (
    <a href={attachment.url} download={attachment.name} className="document-message" onClick={(e) => e.preventDefault()}>
      <div className="document-message__icon" style={{ background: color }}>
        <FileText size={22} />
        <span className="document-message__ext">{ext}</span>
      </div>
      <div className="document-message__meta">
        <span className="document-message__name">{attachment.name}</span>
        <span className="document-message__size">{formatFileSize(attachment.size)}</span>
      </div>
      <span className="document-message__download">
        <Download size={16} />
      </span>
    </a>
  );
}
