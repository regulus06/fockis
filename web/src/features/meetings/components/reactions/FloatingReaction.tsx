import '../../styles/components/reactions.scss';

export function FloatingReaction({ emoji }: { emoji: string }) {
  return <span className="fm-floating-reaction">{emoji}</span>;
}
