interface TypingIndicatorProps {
  names: string[];
}

export default function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  const label = names.length === 1 ? `${names[0]} is typing` : `${names.join(', ')} are typing`;

  return (
    <div className="typing-indicator" aria-live="polite">
      <span className="typing-indicator__text">{label}</span>
      <span className="typing-indicator__dots">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}
