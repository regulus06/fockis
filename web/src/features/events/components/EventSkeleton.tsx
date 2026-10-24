interface Props {
  variant?: "card" | "rail" | "feed" | "details";
  count?: number;
}

export default function EventSkeleton({ variant = "card", count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`fke-skeleton fke-skeleton--${variant}`} aria-hidden="true">
          <div className="fke-skeleton__media fke-shimmer" />
          <div className="fke-skeleton__body">
            <div className="fke-skeleton__line fke-skeleton__line--short fke-shimmer" />
            <div className="fke-skeleton__line fke-shimmer" />
            <div className="fke-skeleton__line fke-skeleton__line--mid fke-shimmer" />
          </div>
        </div>
      ))}
    </>
  );
}
