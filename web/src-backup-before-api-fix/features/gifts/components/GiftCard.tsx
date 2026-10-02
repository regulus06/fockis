import type {
  Gift,
} from "../services/giftsApi";

interface Props {
  gift: Gift;

  selected?: boolean;

  onSelect: (gift: Gift) => void;
}

export default function GiftCard({
  gift,
  selected = false,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      className={`gift-card ${
        selected ? "active" : ""
      }`}
      onClick={() => onSelect(gift)}
      aria-pressed={selected}
    >
      <div className="gift-card-glow" />

      <div className="gift-card-emoji">
        {gift.emoji}
      </div>

      <div className="gift-card-info">
        <strong className="gift-card-name">
          {gift.name}
        </strong>

        <span className="gift-card-description">
          {gift.description}
        </span>

        <span className="gift-card-price">
          <span className="coin-icon">🪙</span>
          {gift.coinPrice.toLocaleString()}
        </span>
      </div>

      {gift.rarity && (
        <span
          className={`gift-card-rarity rarity-${String(
            gift.rarity,
          ).toLowerCase()}`}
        >
          {gift.rarity}
        </span>
      )}

      {selected && (
        <span className="gift-card-selected">
          ✓
        </span>
      )}
    </button>
  );
}