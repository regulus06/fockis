import { useMemo, useState } from "react";
import type {
  CreditChannel,
  CreditPackage,
} from "../services/marketingCreditsApi";

interface MarketingCreditPurchaseModalProps {
  channel: CreditChannel;
  packages: CreditPackage[];
  onClose: () => void;
  onPurchase: (
    channel: CreditChannel,
    packageId: string,
  ) => Promise<void>;
}

function money(
  amount: number | null | undefined,
  currency = "USD",
): string {
  if (amount == null) {
    return "Contact us";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function MarketingCreditPurchaseModal({
  channel,
  packages,
  onClose,
  onPurchase,
}: MarketingCreditPurchaseModalProps) {
  const available = useMemo(
    () =>
      packages.filter(
        (item) =>
          item.channel === channel &&
          item.status === "active",
      ),
    [packages, channel],
  );

  const [selectedId, setSelectedId] = useState(
    available[0]?.packageId ?? "",
  );

  const [purchasing, setPurchasing] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  async function handlePurchase() {
    if (!selectedId || purchasing) {
      return;
    }

    try {
      setPurchasing(true);
      setError(null);

      await onPurchase(
        channel,
        selectedId,
      );

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start the purchase.",
      );
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div
      className="mk-credit-modal__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="mk-credit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mk-credit-modal-title"
      >
        <header className="mk-credit-modal__header">
          <div>
            <span>
              {channel === "email"
                ? "EMAIL MARKETING"
                : "SMS MARKETING"}
            </span>

            <h2 id="mk-credit-modal-title">
              Buy{" "}
              {channel === "email"
                ? "Email"
                : "SMS"}{" "}
              Credits
            </h2>

            <p>
              Choose a credit package for
              your marketing campaigns.
            </p>
          </div>

          <button
            type="button"
            className="mk-credit-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {error && (
          <div className="mk-credit-modal__error">
            {error}
          </div>
        )}

        <div className="mk-credit-modal__packages">
          {available.length === 0 ? (
            <div className="mk-credit-modal__empty">
              No packages are currently
              available.
            </div>
          ) : (
            available.map((item) => (
              <button
                type="button"
                key={item.packageId}
                className={[
                  "mk-credit-package",
                  selectedId ===
                    item.packageId
                    ? "is-selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  setSelectedId(
                    item.packageId,
                  )
                }
              >
                {item.bestValue && (
                  <span className="mk-credit-package__badge">
                    Best value
                  </span>
                )}

                <strong>
                  {new Intl.NumberFormat(
                    "en-US",
                  ).format(item.credits)}
                </strong>

                <span>
                  {item.label ??
                    `${item.credits.toLocaleString()} credits`}
                </span>

                <b>
                  {money(
                    item.price?.amount,
                    item.price?.currency,
                  )}
                </b>
              </button>
            ))
          )}
        </div>

        <footer className="mk-credit-modal__footer">
          <button
            type="button"
            className="mk-credit-modal__cancel"
            onClick={onClose}
            disabled={purchasing}
          >
            Cancel
          </button>

          <button
            type="button"
            className="mk-credit-modal__purchase"
            onClick={() =>
              void handlePurchase()
            }
            disabled={
              !selectedId || purchasing
            }
          >
            {purchasing
              ? "Starting checkout..."
              : "Continue to checkout"}
          </button>
        </footer>
      </section>
    </div>
  );
}