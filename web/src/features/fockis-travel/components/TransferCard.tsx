export interface TransferCardProps {
  id: string;
  name: string;
  icon: string;
  meta: string;
  price: number;
  currency?: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

/** Ground-transportation option card used on TravelTransfersPage. */
export default function TransferCard({
  id,
  name,
  icon,
  meta,
  price,
  currency = '$',
  selected = false,
  onSelect,
}: TransferCardProps) {
  return (
    <button
      type="button"
      className={`transfer-card${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect?.(id)}
      aria-pressed={selected}
      style={{ textAlign: 'left', width: '100%' }}
    >
      <div className="transfer-card__icon" aria-hidden="true">{icon}</div>
      <h4>{name}</h4>
      <div className="transfer-card__meta">{meta}</div>
      <div className="price-row">
        <div className="price">
          {currency}{price}
        </div>
      </div>
    </button>
  );
}
