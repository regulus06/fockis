import type { ReactNode } from "react";

interface MarketingCreditCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  remaining: number;
  used: number;
  included: number;
  onBuy: () => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(
    Math.max(0, value),
  );
}

export default function MarketingCreditCard({
  title,
  description,
  icon,
  remaining,
  used,
  included,
  onBuy,
}: MarketingCreditCardProps) {
  const total = Math.max(included, used + remaining, 1);

  const percentage = Math.min(
    100,
    Math.max(0, (remaining / total) * 100),
  );

  const isLow = percentage <= 25;

  return (
    <article className="mk-credit-card">
      <div className="mk-credit-card__top">
        <div className="mk-credit-card__icon">
          {icon}
        </div>

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="mk-credit-card__balance">
        <strong>{formatNumber(remaining)}</strong>
        <span>credits remaining</span>
      </div>

      <div className="mk-credit-card__meter">
        <div className="mk-credit-card__meter-head">
          <span>Remaining</span>
          <strong>{Math.round(percentage)}%</strong>
        </div>

        <div className="mk-credit-card__track">
          <span
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      </div>

      <dl className="mk-credit-card__stats">
        <div>
          <dt>Included</dt>
          <dd>{formatNumber(included)}</dd>
        </div>

        <div>
          <dt>Used</dt>
          <dd>{formatNumber(used)}</dd>
        </div>
      </dl>

      {isLow && (
        <div className="mk-credit-card__warning">
          Your credit balance is running low.
        </div>
      )}

      <button
        type="button"
        className="mk-credit-card__button"
        onClick={onBuy}
      >
        Buy {title} Credits
      </button>
    </article>
  );
}