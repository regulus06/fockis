import {
  Coins,
} from "lucide-react";

import "./CoinBalance.scss";

interface CoinBalanceProps {
  coins: number;

  onClick?: () => void;

  compact?: boolean;
}

export default function CoinBalance({
  coins,
  onClick,
  compact = false,
}: CoinBalanceProps) {
  const content = (
    <>
      <Coins
        size={
          compact
            ? 15
            : 18
        }
      />

      <span className="coin-balance-value">
        {Number(
          coins ?? 0,
        ).toLocaleString()}
      </span>

      {!compact && (
        <span className="coin-balance-label">
          Coins
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`coin-balance ${
          compact
            ? "coin-balance--compact"
            : ""
        }`}
        onClick={
          onClick
        }
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`coin-balance ${
        compact
          ? "coin-balance--compact"
          : ""
      }`}
    >
      {content}
    </div>
  );
}