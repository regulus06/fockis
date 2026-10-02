import { FileText, Download, Share2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import type { Meeting, MeetingPdfReport } from '../../types';
import '../../styles/components/pdf.scss';

export function MeetingPdfPreview({
  meeting,
  report,
  onRequestGenerate,
}: {
  meeting: Meeting;
  report: MeetingPdfReport;
  onRequestGenerate: () => void;
}) {
  return (
    <div className="fm-pdf-preview">
      <div className="fm-pdf-preview__doc">
        <div className="fm-pdf-preview__doc-header">
          <FileText size={18} />
          <span>Meeting Report</span>
        </div>
        <h2>{meeting.topic}</h2>
        <div className="fm-pdf-preview__grid">
          <div><span>Date</span><strong>{new Date(meeting.startTime).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</strong></div>
          <div><span>Duration</span><strong>{meeting.durationMinutes} minutes</strong></div>
          <div><span>Host</span><strong>{meeting.hostName}</strong></div>
          <div><span>Participants</span><strong>{meeting.participantCount}</strong></div>
        </div>
        <div className="fm-pdf-preview__sections">
          {['Executive Summary', 'Discussion Points', 'Decisions', 'Action Items', 'Next Steps', 'Attendance'].map((s) => (
            <div key={s} className="fm-pdf-preview__section-stub">
              <span>{s}</span>
              <div className="fm-pdf-preview__lines">
                <div /><div /><div style={{ width: '70%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fm-pdf-preview__side">
        <div className="fm-pdf-preview__status">
          <Badge tone={report.status === 'ready' ? 'success' : report.status === 'error' ? 'danger' : report.status === 'idle' ? 'neutral' : 'ai'}>
            {report.status === 'idle' && 'Not generated'}
            {report.status === 'requested' && 'Queued'}
            {report.status === 'generating' && 'Generating…'}
            {report.status === 'ready' && 'Ready'}
            {report.status === 'error' && 'Error'}
          </Badge>
        </div>

        {report.status === 'error' && (
          <div className="fm-pdf-preview__error"><AlertCircle size={14} /> {report.error ?? 'Could not generate the report.'}</div>
        )}

        <Button
          variant="primary"
          fullWidth
          icon={<Download size={15} />}
          disabled={report.status !== 'ready'}
          onClick={onRequestGenerate}
        >
          {report.status === 'ready' ? 'Download PDF' : report.status === 'idle' ? 'Generate report' : 'Working…'}
        </Button>
        <Button variant="secondary" fullWidth icon={<Share2 size={15} />} disabled={report.status !== 'ready'}>
          Share
        </Button>
      </div>
    </div>
  );
}
