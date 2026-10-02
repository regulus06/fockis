export type BadgeVariant = 'verified' | 'bestseller' | 'sponsored' | 'new';

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
}

const DEFAULT_LABEL: Record<BadgeVariant, string> = {
  verified: '✓ Verified Seller',
  bestseller: '🏆 Best Seller',
  sponsored: 'Sponsored',
  new: 'New',
};

export function Badge({ variant, children }: BadgeProps) {
  return <span className={`badge-chip badge-${variant}`}>{children ?? DEFAULT_LABEL[variant]}</span>;
}
