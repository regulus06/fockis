interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  loading?: boolean;
  buttonLabel?: string;
}

export default function AiPromptBox({
  value,
  onChange,
  onSubmit,
  placeholder = "Describe what you want AI to create…",
  loading,
  buttonLabel = "Generate",
}: Props) {
  return (
    <div className="fockis-ai-prompt-box">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
      />
      <div className="fockis-ai-prompt-box__footer">
        <span>Be specific about style, subject, audience, and mood.</span>
        <button type="button" onClick={onSubmit} disabled={loading || !value.trim()}>
          {loading ? "Working…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}
