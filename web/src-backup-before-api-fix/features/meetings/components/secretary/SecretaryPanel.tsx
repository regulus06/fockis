import { PanelHeader } from '../common/PanelHeader';
import { SecretaryStatusBadge } from './SecretaryStatusBadge';
import { SecretaryEmptyOff } from './SecretaryEmptyOff';
import { SecretarySection } from './SecretarySection';
import { Button } from '../common/Button';
import { useRoomStore } from '../../store/roomStore';
import { mockSummary } from '../../services/dev-mock/devMockData';
import { AlertTriangle } from 'lucide-react';
import '../../styles/components/secretary.scss';

export function SecretaryPanel({ isHost, onClose }: { isHost: boolean; onClose: () => void }) {
  const status = useRoomStore((s) => s.secretaryStatus);
  const setStatus = useRoomStore((s) => s.setSecretaryStatus);

  return (
    <div className="fm-panel">
      <PanelHeader title="Fockis Secretary" onClose={onClose} right={<SecretaryStatusBadge status={status} />} />

      <div className="fm-panel__scroll fm-secretary-scroll">
        {status === 'off' && <SecretaryEmptyOff isHost={isHost} onEnable={() => setStatus('listening')} />}

        {status === 'listening' && (
          <>
            <div className="fm-secretary-live-hint">
              <span className="fm-secretary-live-dot" />
              Fockis Secretary is listening and taking notes. Everyone in this meeting can see it's active.
            </div>
            <SecretarySection title="Main points">
              <ul className="fm-secretary-list">
                <li>Project deadline discussed</li>
                <li>Budget reviewed</li>
              </ul>
            </SecretarySection>
            <SecretarySection title="Questions">
              <ul className="fm-secretary-list">
                <li>What is the final testing date?</li>
              </ul>
            </SecretarySection>
          </>
        )}

        {status === 'processing' && (
          <div className="fm-secretary-loading">
            <div className="fm-secretary-loading__spinner" />
            <p>Processing the conversation…</p>
          </div>
        )}

        {status === 'generating_summary' && (
          <div className="fm-secretary-loading">
            <div className="fm-secretary-loading__spinner" />
            <p>Generating meeting summary…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="fm-secretary-error">
            <AlertTriangle size={20} />
            <p>Fockis Secretary ran into a problem and paused. Notes so far are safe.</p>
            <Button size="sm" variant="secondary" onClick={() => setStatus('listening')}>Retry</Button>
          </div>
        )}

        {status === 'complete' && (
          <>
            <SecretarySection title="Main points">
              <ul className="fm-secretary-list">
                {mockSummary.mainPoints.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </SecretarySection>
            <SecretarySection title="Decisions">
              <ul className="fm-secretary-list fm-secretary-list--decision">
                {mockSummary.decisions.map((d) => <li key={d.id}>{d.text}</li>)}
              </ul>
            </SecretarySection>
            <SecretarySection title="Action items">
              {mockSummary.actionItems.map((a) => (
                <div key={a.id} className="fm-secretary-action">
                  <span className="fm-secretary-action__name">{a.assigneeName}</span>
                  <span className="fm-secretary-action__task">{a.task}</span>
                  {a.dueDate && <span className="fm-secretary-action__due">Due {new Date(a.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                </div>
              ))}
            </SecretarySection>
            <SecretarySection title="Questions">
              <ul className="fm-secretary-list">
                {mockSummary.questions.map((q) => <li key={q.id}>{q.text}</li>)}
              </ul>
            </SecretarySection>
          </>
        )}
      </div>

      {status !== 'off' && (
        <div className="fm-panel__footer fm-secretary-footer">
          <Button size="sm" variant="secondary" fullWidth>Transcript</Button>
          <Button size="sm" variant="secondary" fullWidth>Summary</Button>
        </div>
      )}
    </div>
  );
}
