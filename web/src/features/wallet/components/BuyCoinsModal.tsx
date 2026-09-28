import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  walletApi,
  type CoinPackage,
} from "../services/walletApi";

interface BuyCoinsModalProps {
  open: boolean;

  onClose: () => void;

  onSuccess?: (
    coins: number,
  ) => void;
}

export default function BuyCoinsModal({
  open,
  onClose,
}: BuyCoinsModalProps) {
  const navigate =
    useNavigate();

  const [
    packages,
    setPackages,
  ] = useState<
    CoinPackage[]
  >([]);

  const [
    selectedPackageId,
    setSelectedPackageId,
  ] = useState<
    string | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  /* ==========================================================================
  LOAD PACKAGES
  ========================================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;

    async function loadPackages() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await walletApi.getCoinPackages();

        if (!mounted) {
          return;
        }

        setPackages(result);

        if (result.length > 0) {
          const popular =
            result.find(
              (item) =>
                item.popular,
            );

          setSelectedPackageId(
            popular?.id ??
              result[0].id,
          );
        }
      } catch (err: any) {
        console.error(
          "[BuyCoinsModal] Failed to load packages:",
          err,
        );

        if (mounted) {
          setError(
            err?.response?.data
              ?.message ??
              err?.message ??
              "Unable to load coin packages.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPackages();

    return () => {
      mounted = false;
    };
  }, [open]);

  /* ==========================================================================
  CLOSED
  ========================================================================== */

  if (!open) {
    return null;
  }

  /* ==========================================================================
  SELECTED PACKAGE
  ========================================================================== */

  const selectedPackage =
    packages.find(
      (item) =>
        item.id ===
        selectedPackageId,
    ) ??
    packages[0] ??
    null;

  /* ==========================================================================
  CONTINUE
  ========================================================================== */

  function handleContinue() {
    if (!selectedPackage) {
      setError(
        "Please select a coin package.",
      );

      return;
    }

    onClose();

    navigate(
      "/checkout",
      {
        state: {
          type: "coins",

          package:
            selectedPackage,
        },
      },
    );
  }

  /* ==========================================================================
  RENDER
  ========================================================================== */

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-coins-title"
      onClick={
        onClose
      }
      className="buy-coins-modal-backdrop"
    >
      <div
        onClick={(event) =>
          event.stopPropagation()
        }
        className="buy-coins-modal"
      >
        <div className="buy-coins-modal-header">
          <div>
            <span className="wallet-eyebrow">
              Fockis Wallet
            </span>

            <h2 id="buy-coins-title">
              Buy Coins
            </h2>

            <p>
              Choose a package, then
              continue to secure checkout.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={
              onClose
            }
            className="buy-coins-modal-close"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="buy-coins-modal-loading">
            <div className="checkout-loading-spinner" />

            <p>
              Loading coin packages...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div
                className="checkout-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="buy-coins-modal-packages">
              {packages.map(
                (item) => {
                  const selected =
                    selectedPackageId ===
                    item.id;

                  return (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() =>
                        setSelectedPackageId(
                          item.id,
                        )
                      }
                      className={`buy-coins-modal-package ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                    >
                      {item.popular && (
                        <span>
                          POPULAR
                        </span>
                      )}

                      <strong>
                        🪙{" "}
                        {Number(
                          item.coins ??
                            0,
                        ).toLocaleString()}
                      </strong>

                      {Number(
                        item.bonus ??
                          0,
                      ) > 0 && (
                        <small>
                          +
                          {Number(
                            item.bonus ??
                              0,
                          ).toLocaleString()}{" "}
                          bonus
                        </small>
                      )}

                      <b>
                        $
                        {Number(
                          item.price ??
                            0,
                        ).toFixed(
                          2,
                        )}
                      </b>
                    </button>
                  );
                },
              )}
            </div>

            {selectedPackage && (
              <div className="buy-coins-modal-selected">
                <span>
                  Selected
                </span>

                <strong>
                  🪙{" "}
                  {Number(
                    selectedPackage.coins ??
                      0,
                  ).toLocaleString()}{" "}
                  Coins
                  {" • "}
                  $
                  {Number(
                    selectedPackage.price ??
                      0,
                  ).toFixed(
                    2,
                  )}
                </strong>
              </div>
            )}

            <button
              type="button"
              className="buy-coins-modal-continue"
              disabled={
                !selectedPackage
              }
              onClick={
                handleContinue
              }
            >
              Continue to Secure Checkout
            </button>
          </>
        )}

        <p className="buy-coins-modal-footer">
          🔒 Your payment will be processed
          securely through Fockis Checkout.
        </p>
      </div>
    </div>
  );
}