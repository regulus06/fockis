import { useMemo, useState } from 'react';
import { Search, Download, FileText } from 'lucide-react';
import type { TranscriptLine } from '../../types';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';
import '../../styles/components/transcript.scss';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MeetingTranscriptPanel({
  lines,
  status = 'complete',
}: {
  lines: TranscriptLine[];
  status?: 'recording' | 'processing' | 'complete';
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => (query ? lines.filter((l) => l.text.toLowerCase().includes(query.toLowerCase())) : lines),
    [lines, query],
  );

  return (
    <div className="fm-transcript">
      <div className="fm-transcript__toolbar">
        <div className="fm-transcript__search">
          <Search size={14} />
          <input placeholder="Search transcript" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Badge tone={status === 'complete' ? 'success' : status === 'recording' ? 'ai' : 'neutral'}>
          {status === 'complete' ? 'Complete' : status === 'recording' ? 'Recording' : 'Processing'}
        </Badge>
        <button className="fm-transcript__download" disabled={status !== 'complete'}>
          <Download size={14} /> Download
        </button>
      </div>

      <div className="fm-transcript__list">
        {filtered.length === 0 ? (
          <EmptyState icon={<FileText size={26} />} title="No transcript lines" description="Nothing matches your search yet." />
        ) : (
          filtered.map((line, i) => {
            const showTime = i === 0 || formatTime(filtered[i - 1].timestamp) !== formatTime(line.timestamp);
            return (
              <div key={line.id} className="fm-transcript__line">
                {showTime && <div className="fm-transcript__time">{formatTime(line.timestamp)}</div>}
                <div className="fm-transcript__entry">
                  <Avatar name={line.speakerName} size="sm" />
                  <div>
                    <div className="fm-transcript__speaker">{line.speakerName}</div>
                    <div className="fm-transcript__text">{line.text}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
