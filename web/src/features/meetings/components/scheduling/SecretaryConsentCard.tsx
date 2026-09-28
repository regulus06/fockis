import { Sparkles, ShieldCheck } from 'lucide-react';
import type { AiSecretaryConfig } from '../../types';
import '../../styles/components/scheduling.scss';

const OPTIONS: { key: keyof AiSecretaryConfig; label: string }[] = [
  { key: 'takeNotes', label: 'Take notes' },
  { key: 'generateTranscript', label: 'Generate transcript' },
  { key: 'identifyMainPoints', label: 'Identify main points' },
  { key: 'identifyDecisions', label: 'Identify decisions' },
  { key: 'identifyActionItems', label: 'Identify action items' },
  { key: 'identifyQuestions', label: 'Identify questions' },
  { key: 'generateSummary', label: 'Generate meeting summary' },
  { key: 'generatePdfReport', label: 'Generate PDF report' },
];

export function SecretaryConsentCard({
  config,
  onChange,
}: {
  config: AiSecretaryConfig;
  onChange: (c: AiSecretaryConfig) => void;
}) {
  return (
    <div className="fm-secretary-consent">
      <div className="fm-secretary-consent__header">
        <div className="fm-secretary-consent__title-row">
          <span className="fm-secretary-consent__icon"><Sparkles size={16} /></span>
          <h3>AI Meeting Secretary</h3>
        </div>
        <button
          role="switch"
          aria-checked={config.enabled}
          className={`fm-switch fm-switch--amber ${config.enabled ? 'fm-switch--on' : ''}`}
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
        >
          <span className="fm-switch__thumb" />
        </button>
      </div>

      {config.enabled && (
        <div className="fm-secretary-consent__options">
          {OPTIONS.map((opt) => (
            <label key={opt.key} className="fm-checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(config[opt.key])}
                onChange={(e) => onChange({ ...config, [opt.key]: e.target.checked })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      <div className="fm-secretary-consent__privacy">
        <ShieldCheck size={14} />
        <span>
          When enabled, Fockis Secretary listens during the meeting to generate notes and a summary for
          participants. Everyone in the meeting will see a visible indicator while it's active, and hosts can
          turn it off at any time.
        </span>
      </div>
    </div>
  );
}
