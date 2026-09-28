interface Props {
  className?: string;
}

export default function SponsoredBadge({
  className = "",
}: Props) {
  return (
    <span
      className={`fk-sponsored-badge ${className}`}
    >
      Sponsored
    </span>
  );
}