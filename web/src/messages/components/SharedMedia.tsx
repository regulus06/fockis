import { useMemo, useState } from 'react';
import { FileText, Link as LinkIcon } from 'lucide-react';
import type { Message } from '../types';
import { formatFileSize, getFileExtension } from '../utils/fileHelpers';

interface SharedMediaProps {
  messages: Message[];
  onOpenImage: (attachments: NonNullable<Message['attachments']>, index: number) => void;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function SharedMedia({ messages, onOpenImage }: SharedMediaProps) {
  const [tab, setTab] = useState<'media' | 'files' | 'links'>('media');

  const media = useMemo(
    () => messages.filter((m) => (m.type === 'image' || m.type === 'video') && m.attachments?.length).flatMap((m) => m.attachments!),
    [messages],
  );

  const files = useMemo(
    () => messages.filter((m) => m.type === 'document' && m.attachments?.length).flatMap((m) => m.attachments!),
    [messages],
  );

  const links = useMemo(() => {
    const found: string[] = [];
    messages.forEach((m) => {
      if (m.type === 'text' && m.text) {
        const matches = m.text.match(URL_REGEX);
        if (matches) found.push(...matches);
      }
    });
    return found;
  }, [messages]);

  return (
    <div className="shared-media">
      <div className="shared-media__tabs">
        <button type="button" className={tab === 'media' ? 'is-active' : ''} onClick={() => setTab('media')}>Media</button>
        <button type="button" className={tab === 'files' ? 'is-active' : ''} onClick={() => setTab('files')}>Files</button>
        <button type="button" className={tab === 'links' ? 'is-active' : ''} onClick={() => setTab('links')}>Links</button>
      </div>

      {tab === 'media' && (
        <div className="shared-media__grid">
          {media.length === 0 && <p className="shared-media__empty">No shared media yet</p>}
          {media.map((att, i) => (
            <button key={att.id} type="button" className="shared-media__cell" onClick={() => onOpenImage(media, i)}>
              <img src={att.kind === 'video' ? att.thumbnailUrl : att.url} alt={att.name} />
            </button>
          ))}
        </div>
      )}

      {tab === 'files' && (
        <div className="shared-media__file-list">
          {files.length === 0 && <p className="shared-media__empty">No shared files yet</p>}
          {files.map((att) => (
            <div key={att.id} className="shared-media__file">
              <FileText size={18} />
              <div>
                <span>{att.name}</span>
                <small>{getFileExtension(att.name)} · {formatFileSize(att.size)}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'links' && (
        <div className="shared-media__link-list">
          {links.length === 0 && <p className="shared-media__empty">No shared links yet</p>}
          {links.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="shared-media__link">
              <LinkIcon size={16} />
              <span>{url}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
