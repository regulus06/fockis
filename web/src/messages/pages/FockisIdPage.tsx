import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { api } from "../../api/api";

import "../styles/fockisidpage.scss";

interface FockisIdStatus {
  fockisId: string | null;
  accessPaid: boolean;
  requiresPayment: boolean;
  price: number | null;
  currency: string;
  oneTime: boolean;
  recurring?: boolean;
}

interface PaymentReturnState {
  paymentSuccess?: boolean;
  purpose?: string;
  referenceId?: string;
  paymentIntentId?: string;
}

export default function FockisIdPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [status, setStatus] =
    useState<FockisIdStatus | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState(false);

  const paymentState =
    (location.state as PaymentReturnState | null) ??
    null;

  /*
   * Support BOTH:
   *
   * /fockis-id?payment=success
   *
   * and:
   *
   * navigate("/fockis-id", {
   *   state: { paymentSuccess: true }
   * })
   */
  const paymentSuccess =
    searchParams.get("payment") === "success" ||
    paymentState?.paymentSuccess === true;

  // ==========================================================================
  // LOAD FOCKIS ID STATUS
  // ==========================================================================

  const loadStatus = useCallback(
    async (
      showLoading = true,
    ): Promise<FockisIdStatus | null> => {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const response =
          await api.get<FockisIdStatus>(
            "/users/me/fockis-id",
          );

        const nextStatus =
          response.data;

        setStatus(nextStatus);

        return nextStatus;
      } catch (err: any) {
        const message =
          err?.response?.data?.message ??
          err?.message ??
          "Unable to load your Fockis ID.";

        setError(
          Array.isArray(message)
            ? message.join(", ")
            : String(message),
        );

        return null;
      } finally {
        if (showLoading) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  // ==========================================================================
  // INITIAL LOAD
  // ==========================================================================

  useEffect(() => {
    void loadStatus(true);
  }, [loadStatus]);

  // ==========================================================================
  // REFRESH AFTER PAYMENT
  // ==========================================================================

  useEffect(() => {
    if (!paymentSuccess) {
      return;
    }

    let cancelled = false;

    const refreshAfterPayment =
      async () => {
        /*
         * Give the backend a moment to finish
         * processing the successful payment.
         */
        for (
          let attempt = 0;
          attempt < 12;
          attempt += 1
        ) {
          if (cancelled) {
            return;
          }

          const nextStatus =
            await loadStatus(false);

          /*
           * SUCCESS:
           *
           * The backend has now activated
           * the Fockis ID.
           */
          if (
            nextStatus?.accessPaid &&
            nextStatus.fockisId
          ) {
            /*
             * Remove payment state from the
             * browser history so refreshing
             * the page doesn't repeatedly show
             * "payment successful".
             */
            if (
              location.pathname ===
              "/fockis-id"
            ) {
              navigate(
                "/fockis-id",
                {
                  replace: true,
                  state: null,
                },
              );
            }

            return;
          }

          /*
           * Wait before asking the backend again.
           */
          if (attempt < 11) {
            await new Promise<void>(
              (resolve) => {
                window.setTimeout(
                  resolve,
                  1500,
                );
              },
            );
          }
        }

        /*
         * If Stripe succeeded but the ID still
         * isn't active after the retries, tell
         * the user instead of pretending the
         * activation succeeded.
         */
        if (!cancelled) {
          setError(
            "Your payment was received, but your Fockis ID activation is still being processed. Please refresh in a moment.",
          );
        }
      };

    void refreshAfterPayment();

    return () => {
      cancelled = true;
    };
  }, [
    paymentSuccess,
    loadStatus,
    location.pathname,
    navigate,
  ]);

  // ==========================================================================
  // FOCKIS ID CHECKOUT
  // ==========================================================================

  const handleCheckout = useCallback(() => {
    setError(null);

    if (!status) {
      setError(
        "Your Fockis ID information is not available.",
      );
      return;
    }

    if (status.accessPaid) {
      setError(
        "Your Fockis ID is already active.",
      );
      return;
    }

    if (!status.requiresPayment) {
      setError(
        "Payment is not currently required for your Fockis ID.",
      );
      return;
    }

    const amount =
      Number(status.price);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "The Fockis ID activation price is not configured.",
      );
      return;
    }

    const currency =
      String(
        status.currency || "USD",
      )
        .trim()
        .toUpperCase();

    if (currency.length !== 3) {
      setError(
        "The Fockis ID payment currency is invalid.",
      );
      return;
    }

    const referenceId =
      status.fockisId ||
      "fockis-id-activation";

    navigate("/checkout", {
      state: {
        type: "fockis-id",

        amount,

        currency,

        country: "US",

        purpose: "fockis_id",

        referenceId,

        title:
          "Fockis ID Activation",

        description:
          status.oneTime &&
          status.recurring
            ? "One-time Fockis ID activation plus recurring access."
            : status.oneTime
              ? "One-time Fockis ID activation payment."
              : status.recurring
                ? "Recurring Fockis ID access."
                : "Fockis ID access payment.",

        metadata: {
          service: "fockis-id",
          paymentType: "activation",
          oneTime: String(
            Boolean(status.oneTime),
          ),
          recurring: String(
            Boolean(status.recurring),
          ),
        },
      },
    });
  }, [navigate, status]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const handleRefresh = useCallback(() => {
    void loadStatus(false);
  }, [loadStatus]);

  // ==========================================================================
  // COPY
  // ==========================================================================

  const handleCopy = useCallback(
    async () => {
      if (!status?.fockisId) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          status.fockisId,
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch {
        setError(
          "Unable to copy your Fockis ID.",
        );
      }
    },
    [status?.fockisId],
  );

  // ==========================================================================
  // SHARE
  // ==========================================================================

  const handleShare = useCallback(
    async () => {
      if (!status?.fockisId) {
        return;
      }

      const shareText =
        `My Fockis ID is ${status.fockisId}`;

      try {
        if (
          typeof navigator.share ===
          "function"
        ) {
          await navigator.share({
            title: "My Fockis ID",
            text: shareText,
          });

          return;
        }

        await navigator.clipboard.writeText(
          shareText,
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch {
        // User cancelled sharing.
      }
    },
    [status?.fockisId],
  );

  // ==========================================================================
  // FORMAT PRICE
  // ==========================================================================

  const formattedPrice =
    useMemo(() => {
      if (!status) {
        return "";
      }

      if (
        status.price === null ||
        status.price === undefined ||
        !Number.isFinite(
          Number(status.price),
        )
      ) {
        return "";
      }

      const currency =
        String(
          status.currency || "USD",
        )
          .trim()
          .toUpperCase();

      try {
        return new Intl.NumberFormat(
          undefined,
          {
            style: "currency",
            currency,
          },
        ).format(
          Number(status.price),
        );
      } catch {
        return `${Number(
          status.price,
        ).toFixed(2)} ${currency}`.trim();
      }
    }, [status]);

  // ==========================================================================
  // PAYMENT LABEL
  // ==========================================================================

  const paymentLabel =
    useMemo(() => {
      if (!status) {
        return "Fockis ID activation";
      }

      if (
        status.oneTime &&
        status.recurring
      ) {
        return "Activation + recurring access";
      }

      if (status.oneTime) {
        return "One-time activation";
      }

      if (status.recurring) {
        return "Recurring access";
      }

      return "Fockis ID access";
    }, [status]);

  // ==========================================================================
  // PAYMENT DESCRIPTION
  // ==========================================================================

  const paymentDescription =
    useMemo(() => {
      if (!status) {
        return "";
      }

      if (
        status.oneTime &&
        status.recurring
      ) {
        return "One-time activation plus recurring access.";
      }

      if (status.oneTime) {
        return "One-time activation payment.";
      }

      if (status.recurring) {
        return "Recurring Fockis ID access.";
      }

      return "Fockis ID access.";
    }, [status]);

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (loading) {
    return (
      <main className="fockis-id-page">
        <div className="fockis-id-shell">
          <div className="fockis-id-loading">
            <div
              className="fockis-id-spinner"
              aria-label="Loading"
            />

            <p>
              Loading your Fockis ID…
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================================
  // PAGE
  // ==========================================================================

  return (
    <main className="fockis-id-page">
      <div className="fockis-id-shell">

        <Link
          to="/messages"
          className="fockis-id-back"
        >
          ← Back to Messages
        </Link>

        {/* HEADER */}

        <div className="fockis-id-header">
          <div>
            <p className="fockis-id-eyebrow">
              FOCKIS ID
            </p>

            <h1>
              Your Fockis identity
            </h1>

            <p className="fockis-id-subtitle">
              Use your Fockis ID so people can
              find you and connect with you
              without needing your phone
              number.
            </p>
          </div>

          <div className="fockis-id-badge">
            <span
              className="fockis-id-badge-dot"
              aria-hidden="true"
            />

            {status?.accessPaid
              ? "Active"
              : "Not activated"}
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            className="fockis-id-alert fockis-id-alert-error"
            role="alert"
          >
            <strong>
              Something went wrong.
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                void loadStatus()
              }
            >
              Try again
            </button>
          </div>
        )}

        {/* SUCCESS */}

        {paymentSuccess &&
          status?.accessPaid &&
          status.fockisId && (
            <div
              className="fockis-id-alert fockis-id-alert-info"
              role="status"
            >
              <strong>
                Payment confirmed.
              </strong>

              <span>
                Your Fockis ID is now active.
              </span>
            </div>
          )}

        {/* PROCESSING */}

        {paymentSuccess &&
          !status?.accessPaid &&
          !error && (
            <div
              className="fockis-id-alert fockis-id-alert-warning"
              role="status"
            >
              <strong>
                Finishing up.
              </strong>

              <span>
                We're confirming your payment
                — this can take a few seconds.
              </span>
            </div>
          )}

        {/* FOCKIS ID CARD */}

        <section className="fockis-id-card">
          <div className="fockis-id-card-icon">
            @
          </div>

          <div className="fockis-id-card-content">

            <div className="fockis-id-card-heading">
              <div>
                <p className="fockis-id-label">
                  YOUR FOCKIS ID
                </p>

                <h2>
                  Fockis identity
                </h2>
              </div>

              <span
                className={`fockis-id-status ${
                  status?.accessPaid
                    ? "paid"
                    : "locked"
                }`}
              >
                {status?.accessPaid
                  ? "Active"
                  : "Locked"}
              </span>
            </div>

            {/* NOT ACTIVE */}

            {!status?.accessPaid ? (
              <>
                <div className="fockis-id-hidden-box">
                  <span className="fockis-id-hidden-value">
                    FK••••••••
                  </span>

                  <span
                    className="fockis-id-lock"
                    aria-hidden="true"
                  >
                    🔒
                  </span>
                </div>

                <p className="fockis-id-description">
                  Your unique Fockis ID is
                  reserved for your account.
                  Complete the required
                  activation payment to reveal
                  and use it.
                </p>

                {status?.requiresPayment ? (
                  <>
                    <div className="fockis-id-payment-box">
                      <div>
                        <span className="fockis-id-payment-label">
                          {paymentLabel}
                        </span>

                        <strong>
                          {formattedPrice ||
                            "Price not configured"}
                        </strong>
                      </div>

                      <span>
                        Secure payment •{" "}
                        {paymentDescription}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="fockis-id-primary-button fockis-id-access-button"
                      onClick={handleCheckout}
                      disabled={
                        !formattedPrice
                      }
                    >
                      {formattedPrice
                        ? "Continue to secure checkout"
                        : "Price not configured"}
                    </button>

                    <p className="fockis-id-secure-note">
                      You will review the{" "}
                      {formattedPrice
                        ? formattedPrice
                        : ""}{" "}
                      activation fee on the
                      secure Fockis checkout
                      page before entering your
                      payment information.
                    </p>
                  </>
                ) : (
                  <div className="fockis-id-payment-box">
                    <div>
                      <span className="fockis-id-payment-label">
                        Fockis ID
                      </span>

                      <strong>
                        Available
                      </strong>
                    </div>

                    <span>
                      Payment is not currently
                      required.
                    </span>
                  </div>
                )}
              </>
            ) : (

              /* ACTIVE */

              <>
                <div className="fockis-id-revealed">
                  <span>
                    {status.fockisId}
                  </span>
                </div>

                <p className="fockis-id-description">
                  Share this ID with people
                  you want to connect with on
                  Fockis. They can use it to
                  find and message or call you
                  without needing your phone
                  number.
                </p>

                <div className="fockis-id-actions">
                  <button
                    type="button"
                    className="fockis-id-primary-button"
                    onClick={handleCopy}
                  >
                    {copied
                      ? "Copied!"
                      : "Copy Fockis ID"}
                  </button>

                  <button
                    type="button"
                    className="fockis-id-secondary-button"
                    onClick={handleShare}
                  >
                    Share ID
                  </button>

                  <button
                    type="button"
                    className="fockis-id-secondary-button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <span
                        className="fockis-id-small-spinner"
                        aria-label="Refreshing"
                      />
                    ) : (
                      "Refresh"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* INFORMATION */}

        <div className="fockis-id-info-grid">

          <div className="fockis-id-info-card">
            <div className="fockis-id-info-icon">
              @
            </div>

            <h3>
              No phone number required
            </h3>

            <p>
              Your Fockis ID gives other
              users a way to find you
              without exposing or requiring
              a phone number.
            </p>
          </div>

          <div className="fockis-id-info-card">
            <div className="fockis-id-info-icon">
              ✓
            </div>

            <h3>
              Unique to your account
            </h3>

            <p>
              Your Fockis ID is generated and
              reserved by Fockis for your
              account.
            </p>
          </div>

          <div className="fockis-id-info-card">
            <div className="fockis-id-info-icon">
              $
            </div>

            <h3>
              Administrator-controlled pricing
            </h3>

            <p>
              The activation price is managed
              from the Fockis ID Pricing
              administration page.
            </p>
          </div>

        </div>

        {/* FOOTER */}

        <footer className="fockis-id-footer">
          <span>
            © 2026 Fockis LLC Trusted
            Marketplace
          </span>

          <Link to="/messages">
            Go to Messages
          </Link>
        </footer>

      </div>
    </main>
  );
}