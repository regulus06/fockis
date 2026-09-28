import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ChangeEvent,
} from "react";

import {
  earningsApi,
} from "../api/earningsApi";

import type {
  EarningsDashboard,
  EarningsTransaction,
  PayoutSchedule,
} from "../types/earnings.types";

import "../styles/EarningsPage.scss";

/* ============================================================================
HELPERS
============================================================================ */

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(
    Number.isFinite(value)
      ? value
      : 0,
  );
}

function date(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function sourceLabel(
  transaction: EarningsTransaction,
) {
  switch (transaction.sourceType) {
    case "live":
      return "LIVE";

    case "post":
      return "POST";

    case "video":
      return "VIDEO";

    case "photo":
      return "PHOTO";

    case "profile":
      return "PROFILE";

    default:
      return "FOCKIS";
  }
}

function transactionIcon(
  transaction: EarningsTransaction,
) {
  if (
    transaction.type ===
    "gift_received"
  ) {
    return "🎁";
  }

  if (
    transaction.type ===
    "withdrawal"
  ) {
    return "💸";
  }

  return "💰";
}

/* ============================================================================
API ERROR HELPER
============================================================================ */

function getApiErrorMessage(
  error: unknown,
): string {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return "An unexpected error occurred.";
  }

  const axiosError =
    error as {
      response?: {
        status?: number;

        data?: {
          message?:
            | string
            | string[];

          error?: string;

          details?: string;
        };
      };

      message?: string;
    };

  const responseData =
    axiosError.response?.data;

  if (
    responseData?.message
  ) {
    if (
      Array.isArray(
        responseData.message,
      )
    ) {
      return responseData.message.join(
        ", ",
      );
    }

    return responseData.message;
  }

  if (
    responseData?.details
  ) {
    return responseData.details;
  }

  if (
    responseData?.error
  ) {
    return responseData.error;
  }

  if (
    axiosError.message
  ) {
    return axiosError.message;
  }

  return "An unexpected error occurred.";
}

/* ============================================================================
PAGE
============================================================================ */

export default function EarningsPage() {
  const [
    dashboard,
    setDashboard,
  ] = useState<EarningsDashboard | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    withdrawalAmount,
    setWithdrawalAmount,
  ] = useState("");

  const [
    withdrawalLoading,
    setWithdrawalLoading,
  ] = useState(false);

  const [
    settlementLoading,
    setSettlementLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState<
    "success" | "error" | ""
  >("");

  const [
    payoutLoading,
    setPayoutLoading,
  ] = useState(false);

  /* ==========================================================================
  LOAD DASHBOARD
  ========================================================================== */

  const loadDashboard =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const data =
            await earningsApi.getDashboard();

          setDashboard(data);
        } catch (err) {
          console.error(
            "[Earnings] Failed to load dashboard:",
            err,
          );

          setError(
            getApiErrorMessage(err) ||
              "Unable to load your earnings.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* ==========================================================================
  ACCOUNT
  ========================================================================== */

  const account =
    dashboard?.account;

  /* ==========================================================================
  REFRESH STRIPE STATUS
  ========================================================================== */

  const refreshStripeStatus =
    useCallback(
      async (
        showMessage = true,
      ) => {
        try {
          setPayoutLoading(true);

          if (showMessage) {
            setMessage("");
            setMessageType("");
          }

          const status =
            await earningsApi.getStripeStatus();

          console.log(
            "[Earnings] Stripe status:",
            status,
          );

          setDashboard(
            (previous) => {
              if (
                !previous ||
                !status
              ) {
                return previous;
              }

              return {
                ...previous,

                account: {
                  ...previous.account,

                  stripeAccountId:
                    status.accountId ??
                    previous.account
                      .stripeAccountId ??
                    null,

                  stripeOnboardingComplete:
                    Boolean(
                      status.onboardingComplete,
                    ),

                  payoutsEnabled:
                    Boolean(
                      status.payoutsEnabled,
                    ),
                },
              };
            },
          );

          await loadDashboard();

          if (showMessage) {
            if (
              status?.connected &&
              status?.onboardingComplete &&
              status?.payoutsEnabled
            ) {
              setMessage(
                "Your Stripe payout account is connected and ready.",
              );

              setMessageType(
                "success",
              );
            } else if (
              status?.connected &&
              status?.onboardingComplete
            ) {
              setMessage(
                "Stripe setup is complete, but payouts are not enabled yet.",
              );

              setMessageType(
                "error",
              );
            } else if (
              status?.connected
            ) {
              setMessage(
                "Your Stripe account is connected. Please complete the remaining Stripe requirements.",
              );

              setMessageType(
                "error",
              );
            } else {
              setMessage(
                "Your Stripe payout account is not connected yet.",
              );

              setMessageType(
                "error",
              );
            }
          }

          return status;
        } catch (err) {
          console.error(
            "[Earnings] Stripe status refresh failed:",
            err,
          );

          if (showMessage) {
            setMessage(
              getApiErrorMessage(err) ||
                "Unable to refresh Stripe payout status.",
            );

            setMessageType(
              "error",
            );
          }

          throw err;
        } finally {
          setPayoutLoading(false);
        }
      },
      [loadDashboard],
    );

  /* ==========================================================================
  AUTO REFRESH AFTER STRIPE RETURN
  ========================================================================== */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const stripeReturn =
      params.get("stripe");

    if (
      stripeReturn !== "return" &&
      stripeReturn !== "refresh"
    ) {
      return;
    }

    let cancelled = false;

    const refreshAfterStripe =
      async () => {
        try {
          setPayoutLoading(true);
          setMessage("");
          setMessageType("");

          await new Promise<void>(
            (resolve) =>
              window.setTimeout(
                resolve,
                300,
              ),
          );

          if (cancelled) {
            return;
          }

          const status =
            await earningsApi.getStripeStatus();

          if (cancelled) {
            return;
          }

          console.log(
            "[Earnings] Stripe status after return:",
            status,
          );

          setDashboard(
            (previous) => {
              if (!previous) {
                return previous;
              }

              return {
                ...previous,

                account: {
                  ...previous.account,

                  stripeAccountId:
                    status?.accountId ??
                    previous.account
                      .stripeAccountId ??
                    null,

                  stripeOnboardingComplete:
                    Boolean(
                      status?.onboardingComplete,
                    ),

                  payoutsEnabled:
                    Boolean(
                      status?.payoutsEnabled,
                    ),
                },
              };
            },
          );

          await loadDashboard();

          if (cancelled) {
            return;
          }

          if (
            status?.connected &&
            status?.onboardingComplete &&
            status?.payoutsEnabled
          ) {
            setMessage(
              "Stripe payout account connected successfully. You can now cash out.",
            );

            setMessageType(
              "success",
            );
          } else if (
            status?.connected &&
            status?.onboardingComplete
          ) {
            setMessage(
              "Stripe setup is complete, but payouts are still being enabled.",
            );

            setMessageType(
              "error",
            );
          } else if (
            status?.connected
          ) {
            setMessage(
              "Your Stripe account is connected, but some Stripe requirements are still incomplete.",
            );

            setMessageType(
              "error",
            );
          } else {
            setMessage(
              "Stripe payout setup is not complete.",
            );

            setMessageType(
              "error",
            );
          }

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        } catch (err) {
          if (cancelled) {
            return;
          }

          console.error(
            "[Earnings] Failed to refresh Stripe status after return:",
            err,
          );

          setMessage(
            getApiErrorMessage(err) ||
              "We could not refresh your Stripe payout status.",
          );

          setMessageType(
            "error",
          );
        } finally {
          if (!cancelled) {
            setPayoutLoading(false);
          }
        }
      };

    void refreshAfterStripe();

    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  /* ==========================================================================
  MONTHLY EARNINGS
  ========================================================================== */

  const earningsThisMonth =
    useMemo(() => {
      if (!dashboard) {
        return 0;
      }

      const now =
        new Date();

      return dashboard.transactions
        .filter((item) => {
          if (
            item.type !==
            "gift_received"
          ) {
            return false;
          }

          const created =
            new Date(
              item.createdAt,
            );

          if (
            Number.isNaN(
              created.getTime(),
            )
          ) {
            return false;
          }

          return (
            created.getMonth() ===
              now.getMonth() &&
            created.getFullYear() ===
              now.getFullYear()
          );
        })
        .reduce(
          (total, item) =>
            total +
            Math.max(
              Number(
                item.amount,
              ) || 0,
              0,
            ),
          0,
        );
    }, [dashboard]);

  /* ==========================================================================
  WEEKLY EARNINGS
  ========================================================================== */

  const earningsThisWeek =
    useMemo(() => {
      if (!dashboard) {
        return 0;
      }

      const now =
        Date.now();

      const week =
        7 *
        24 *
        60 *
        60 *
        1000;

      return dashboard.transactions
        .filter((item) => {
          if (
            item.type !==
            "gift_received"
          ) {
            return false;
          }

          const created =
            new Date(
              item.createdAt,
            ).getTime();

          return (
            Number.isFinite(
              created,
            ) &&
            now - created <=
              week &&
            now >= created
          );
        })
        .reduce(
          (total, item) =>
            total +
            Math.max(
              Number(
                item.amount,
              ) || 0,
              0,
            ),
          0,
        );
    }, [dashboard]);

  /* ==========================================================================
  SETTLE PENDING EARNINGS

  IMPORTANT:
  earningsApi exposes `settle()`.
  ========================================================================== */

  const settlePending =
    async () => {
      if (
        settlementLoading ||
        payoutLoading ||
        withdrawalLoading
      ) {
        return;
      }

      if (!account) {
        setMessage(
          "Your earnings account is not available.",
        );

        setMessageType(
          "error",
        );

        return;
      }

      const pending =
        Number(
          account.pendingBalance,
        ) || 0;

      if (
        pending <= 0
      ) {
        setMessage(
          "You do not have any pending earnings to settle.",
        );

        setMessageType(
          "error",
        );

        return;
      }

      try {
        setSettlementLoading(
          true,
        );

        setMessage("");
        setMessageType("");

        /*
         * IMPORTANT:
         * Your earningsApi has:
         *
         * earningsApi.settle()
         *
         * NOT:
         *
         * earningsApi.settlePendingEarnings()
         */
        await earningsApi.settle();

        setMessage(
          `${money(
            pending,
          )} in pending earnings is now available to cash out.`,
        );

        setMessageType(
          "success",
        );

        await loadDashboard();
      } catch (err) {
        console.error(
          "[Earnings] Failed to settle pending earnings:",
          err,
        );

        setMessage(
          getApiErrorMessage(err) ||
            "Unable to settle pending earnings.",
        );

        setMessageType(
          "error",
        );

        try {
          await loadDashboard();
        } catch (refreshError) {
          console.error(
            "[Earnings] Failed to refresh after settlement error:",
            refreshError,
          );
        }
      } finally {
        setSettlementLoading(
          false,
        );
      }
    };

  /* ==========================================================================
  STRIPE PAYOUT SETUP
  ========================================================================== */

  const setupPayout =
    async () => {
      if (
        payoutLoading ||
        settlementLoading ||
        withdrawalLoading
      ) {
        return;
      }

      try {
        setPayoutLoading(true);
        setMessage("");
        setMessageType("");

        const result =
          await earningsApi.getStripeOnboardingUrl();

        console.log(
          "[Earnings] Stripe onboarding response:",
          result,
        );

        if (
          result?.alreadyComplete
        ) {
          await refreshStripeStatus(
            false,
          );

          setMessage(
            "Your Stripe payout account is already connected and ready.",
          );

          setMessageType(
            "success",
          );

          return;
        }

        if (
          !result ||
          typeof result.url !==
            "string" ||
          !result.url
        ) {
          throw new Error(
            "The server did not return a valid Stripe onboarding URL.",
          );
        }

        window.location.assign(
          result.url,
        );
      } catch (err) {
        console.error(
          "[Earnings] Stripe payout setup failed:",
          err,
        );

        setMessage(
          getApiErrorMessage(err) ||
            "Unable to start Stripe payout setup.",
        );

        setMessageType(
          "error",
        );

        setPayoutLoading(
          false,
        );
      }
    };

  /* ==========================================================================
  WITHDRAWAL INPUT HANDLER
  ========================================================================== */

  const handleWithdrawalAmountChange =
    (
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const value =
        event.target.value;

      if (
        value === ""
      ) {
        setWithdrawalAmount("");
        return;
      }

      if (
        !/^\d*(\.\d{0,2})?$/.test(
          value,
        )
      ) {
        return;
      }

      if (
        value.length > 1 &&
        value.startsWith("0") &&
        !value.startsWith("0.")
      ) {
        const normalized =
          value.replace(
            /^0+/,
            "",
          );

        setWithdrawalAmount(
          normalized || "0",
        );

        return;
      }

      setWithdrawalAmount(
        value,
      );
    };

  /* ==========================================================================
  WITHDRAW
  ========================================================================== */

  const handleWithdraw =
    async () => {
      /*
       * Prevent duplicate requests.
       */
      if (
        withdrawalLoading
      ) {
        return;
      }

      const trimmed =
        withdrawalAmount.trim();

      /* ----------------------------------------------------------------------
      BASIC INPUT VALIDATION
      ---------------------------------------------------------------------- */

      if (
        trimmed === ""
      ) {
        setMessage(
          "Enter the amount you want to withdraw.",
        );

        setMessageType(
          "error",
        );

        return;
      }

      const amount =
        Number(trimmed);

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        setMessage(
          "Enter a valid withdrawal amount.",
        );

        setMessageType(
          "error",
        );

        return;
      }

      if (
        amount < 10
      ) {
        setMessage(
          "The minimum withdrawal amount is $10.00.",
        );

        setMessageType(
          "error",
        );

        return;
      }

      /* ----------------------------------------------------------------------
      ACCOUNT VALIDATION
      ---------------------------------------------------------------------- */

      if (!account) {
        setMessage(
          "Your earnings account is not available.",
        );

        setMessageType(
          "error",
        );

        return;
      }

      const available =
        Number(
          account.availableBalance,
        ) || 0;

      if (
        available < 10
      ) {
        setMessage(
          "You need at least $10.00 in available earnings to cash out.",
        );

        setMessageType(
          "error",
        );

        return;
      }

      if (
        amount > available
      ) {
        setMessage(
          `You can withdraw up to ${money(
            available,
          )}.`,
        );

        setMessageType(
          "error",
        );

        return;
      }

      /* ----------------------------------------------------------------------
      STRIPE VALIDATION

      We check the local dashboard state first so an obviously invalid
      request does not hit the backend.

      The backend remains authoritative and its exact 400 message is
      displayed if Stripe setup has changed.
      ---------------------------------------------------------------------- */

      const payoutReady =
        Boolean(
          account.stripeAccountId,
        ) &&
        Boolean(
          account.stripeOnboardingComplete,
        ) &&
        Boolean(
          account.payoutsEnabled,
        );

      if (!payoutReady) {
        setMessage(
          "Complete your Stripe payout setup before requesting a cash out.",
        );

        setMessageType(
          "error",
        );

        return;
      }

      /* ----------------------------------------------------------------------
      REQUEST WITHDRAWAL
      ---------------------------------------------------------------------- */

      try {
        setWithdrawalLoading(
          true,
        );

        setMessage("");
        setMessageType("");

        const finalAmount =
          Number(
            amount.toFixed(2),
          );

        console.log(
          "[Earnings] Requesting withdrawal:",
          finalAmount,
        );

        const withdrawal =
          await earningsApi.withdraw(
            finalAmount,
          );

        console.log(
          "[Earnings] Withdrawal response:",
          withdrawal,
        );

        setWithdrawalAmount("");

        setMessage(
          "Your withdrawal was submitted successfully.",
        );

        setMessageType(
          "success",
        );

        /*
         * Refresh the dashboard so:
         *
         * availableBalance
         * withdrawals
         * totalWithdrawn
         * transactions
         *
         * are immediately synchronized with the backend.
         */
        await loadDashboard();
      } catch (err) {
        console.error(
          "[Earnings] Withdrawal failed:",
          err,
        );

        /*
         * IMPORTANT:
         * This displays the actual NestJS message.
         *
         * Example:
         *
         * "Complete your Stripe payout setup before requesting a withdrawal."
         *
         * rather than hiding it behind a generic error.
         */
        setMessage(
          getApiErrorMessage(err) ||
            "Withdrawal could not be processed.",
        );

        setMessageType(
          "error",
        );

        /*
         * Refresh after failure because the backend may have changed:
         *
         * - Stripe state
         * - withdrawal state
         * - available balance
         * - payout state
         */
        try {
          await loadDashboard();
        } catch (
          refreshError
        ) {
          console.error(
            "[Earnings] Failed to refresh dashboard after withdrawal error:",
            refreshError,
          );
        }
      } finally {
        setWithdrawalLoading(
          false,
        );
      }
    };

  /* ==========================================================================
  PAYOUT SCHEDULE
  ========================================================================== */

  const updateSchedule =
    async (
      schedule: PayoutSchedule,
    ) => {
      if (
        payoutLoading ||
        withdrawalLoading ||
        settlementLoading
      ) {
        return;
      }

      try {
        setPayoutLoading(true);
        setMessage("");
        setMessageType("");

        await earningsApi.updatePayoutSchedule(
          schedule,
        );

        setMessage(
          "Payout settings updated successfully.",
        );

        setMessageType(
          "success",
        );

        await loadDashboard();
      } catch (err) {
        console.error(
          "[Earnings] Failed to update payout schedule:",
          err,
        );

        setMessage(
          getApiErrorMessage(err) ||
            "Unable to update payout settings.",
        );

        setMessageType(
          "error",
        );
      } finally {
        setPayoutLoading(false);
      }
    };

  /* ==========================================================================
  LOADING
  ========================================================================== */

  if (loading) {
    return (
      <main className="fk-earnings-page">
        <div className="fk-earnings-container">
          <div className="fk-earnings-state">
            <div className="fk-earnings-state-icon">
              ⏳
            </div>

            <h2>
              Loading earnings...
            </h2>

            <p>
              Please wait while we
              load your creator
              earnings.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ==========================================================================
  ERROR
  ========================================================================== */

  if (error) {
    return (
      <main className="fk-earnings-page">
        <div className="fk-earnings-container">
          <div className="fk-earnings-state">
            <div className="fk-earnings-state-icon">
              ⚠️
            </div>

            <h2>
              Unable to load earnings
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ==========================================================================
  ACCOUNT UNAVAILABLE
  ========================================================================== */

  if (
    !dashboard ||
    !account
  ) {
    return (
      <main className="fk-earnings-page">
        <div className="fk-earnings-container">
          <div className="fk-earnings-state">
            <div className="fk-earnings-state-icon">
              💰
            </div>

            <h2>
              Earnings account unavailable
            </h2>

            <p>
              We could not find your
              earnings account.
            </p>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ==========================================================================
  ACCOUNT VALUES
  ========================================================================== */

  const payoutReady =
    Boolean(
      account.stripeAccountId,
    ) &&
    Boolean(
      account.stripeOnboardingComplete,
    ) &&
    Boolean(
      account.payoutsEnabled,
    );

  const availableBalance =
    Number(
      account.availableBalance,
    ) || 0;

  const pendingBalance =
    Number(
      account.pendingBalance,
    ) || 0;

  const lifetimeEarnings =
    Number(
      account.lifetimeEarnings,
    ) || 0;

  const totalWithdrawn =
    Number(
      account.totalWithdrawn,
    ) || 0;

  const requestedAmount =
    withdrawalAmount === ""
      ? 0
      : Number(
          withdrawalAmount,
        );

  const validRequestedAmount =
    Number.isFinite(
      requestedAmount,
    )
      ? requestedAmount
      : 0;

  const receiveAmount =
    Math.max(
      validRequestedAmount,
      0,
    );

  /*
   * Keep the button disabled only when:
   *
   * - request is already processing
   * - no amount entered
   * - amount is invalid
   * - amount is below $10
   * - available balance is below $10
   * - requested amount exceeds available balance
   *
   * Stripe readiness is handled inside handleWithdraw() so the user
   * gets a real error message instead of a button that appears dead.
   */
  const cashoutButtonDisabled =
    withdrawalLoading ||
    withdrawalAmount.trim() === "" ||
    !Number.isFinite(
      validRequestedAmount,
    ) ||
    validRequestedAmount < 10 ||
    availableBalance < 10 ||
    validRequestedAmount >
      availableBalance;

  /* ==========================================================================
  RENDER
  ========================================================================== */

  return (
    <main className="fk-earnings-page">
      <div className="fk-earnings-container">

        {/* ================================================================
            HEADER
        ================================================================ */}

        <header className="fk-earnings-header">
          <div>
            <span className="fk-earnings-eyebrow">
              FOCKIS CREATOR
            </span>

            <h1>
              Earnings
            </h1>

            <p>
              Manage your creator
              earnings, payouts,
              and cash-outs.
            </p>
          </div>

          <button
            type="button"
            className="fk-earnings-refresh"
            onClick={() =>
              void loadDashboard()
            }
            disabled={
              loading ||
              payoutLoading ||
              withdrawalLoading ||
              settlementLoading
            }
          >
            ↻ Refresh
          </button>
        </header>

        {/* ================================================================
            MESSAGE
        ================================================================ */}

        {message && (
          <div
            className={`fk-earnings-message ${
              messageType ===
              "error"
                ? "fk-earnings-message--error"
                : "fk-earnings-message--success"
            }`}
          >
            <span>
              {messageType ===
              "error"
                ? "⚠️"
                : "✓"}
            </span>

            <span>
              {message}
            </span>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setMessageType("");
              }}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* ================================================================
            BALANCE
        ================================================================ */}

        <section className="fk-earnings-balance-card">
          <div className="fk-earnings-balance-main">
            <span>
              AVAILABLE TO CASH OUT
            </span>

            <strong>
              {money(
                availableBalance,
              )}
            </strong>

            <small>
              Available creator earnings
            </small>
          </div>

          <div className="fk-earnings-balance-actions">
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById(
                    "cashout",
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                    block:
                      "start",
                  });
              }}
            >
              Cash out
            </button>
          </div>
        </section>

        {/* ================================================================
            PENDING / AVAILABLE
        ================================================================ */}

        <section className="fk-earnings-section">
          <div className="fk-earnings-section-header">
            <div>
              <h2>
                Earnings balance
              </h2>

              <p>
                Pending earnings are
                separate from money
                currently available to
                cash out.
              </p>
            </div>
          </div>

          <div className="fk-earnings-stat-grid">
            <article>
              <span>
                Available
              </span>

              <strong>
                {money(
                  availableBalance,
                )}
              </strong>

              <small>
                Ready for cash out
              </small>
            </article>

            <article>
              <span>
                Pending
              </span>

              <strong>
                {money(
                  pendingBalance,
                )}
              </strong>

              <small>
                Awaiting settlement
              </small>
            </article>
          </div>

          {pendingBalance > 0 && (
            <div className="fk-payout-setup">
              <div className="fk-payout-setup-info">
                <span className="fk-payout-icon">
                  ⏳
                </span>

                <div>
                  <strong>
                    Pending earnings
                  </strong>

                  <p>
                    {money(
                      pendingBalance,
                    )}{" "}
                    is currently pending
                    and cannot be withdrawn
                    until it is settled.
                  </p>
                </div>
              </div>

              <div className="fk-payout-actions">
                <button
                  type="button"
                  onClick={() =>
                    void settlePending()
                  }
                  disabled={
                    settlementLoading ||
                    payoutLoading ||
                    withdrawalLoading
                  }
                >
                  {settlementLoading
                    ? "Settling..."
                    : "Settle pending earnings"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ================================================================
            STATS
        ================================================================ */}

        <section className="fk-earnings-stat-grid">
          <article>
            <span>
              This week
            </span>

            <strong>
              {money(
                earningsThisWeek,
              )}
            </strong>

            <small>
              Gift earnings
            </small>
          </article>

          <article>
            <span>
              This month
            </span>

            <strong>
              {money(
                earningsThisMonth,
              )}
            </strong>

            <small>
              Gift earnings
            </small>
          </article>

          <article>
            <span>
              Lifetime
            </span>

            <strong>
              {money(
                lifetimeEarnings,
              )}
            </strong>

            <small>
              Total creator earnings
            </small>
          </article>

          <article>
            <span>
              Withdrawn
            </span>

            <strong>
              {money(
                totalWithdrawn,
              )}
            </strong>

            <small>
              Total cash outs
            </small>
          </article>
        </section>

        {/* ================================================================
            PAYOUT ACCOUNT
        ================================================================ */}

        <section className="fk-earnings-section">
          <div className="fk-earnings-section-header">
            <div>
              <h2>
                Payout account
              </h2>

              <p>
                Connect your Stripe
                payout account to
                receive creator
                earnings.
              </p>
            </div>

            <span
              className={
                payoutReady
                  ? "fk-status fk-status--success"
                  : "fk-status"
              }
            >
              {payoutReady
                ? "Ready"
                : account.stripeAccountId
                  ? "Stripe connected"
                  : "Setup required"}
            </span>
          </div>

          {!payoutReady ? (
            <div className="fk-payout-setup">
              <div className="fk-payout-setup-info">
                <span className="fk-payout-icon">
                  🏦
                </span>

                <div>
                  <strong>
                    {account.stripeAccountId
                      ? "Complete your Stripe payout setup"
                      : "Connect your payout account"}
                  </strong>

                  <p>
                    {account.stripeAccountId
                      ? "Your Stripe account exists. Continue Stripe verification to finish enabling payouts."
                      : "Complete Stripe verification before you can cash out your Fockis earnings."}
                  </p>
                </div>
              </div>

              <div className="fk-payout-actions">
                <button
                  type="button"
                  onClick={() =>
                    void setupPayout()
                  }
                  disabled={
                    payoutLoading
                  }
                >
                  {payoutLoading
                    ? "Opening Stripe..."
                    : account.stripeAccountId
                      ? "Continue Stripe setup"
                      : "Set up payouts"}
                </button>

                {account.stripeAccountId && (
                  <button
                    type="button"
                    className="fk-secondary-button"
                    onClick={() =>
                      void refreshStripeStatus()
                    }
                    disabled={
                      payoutLoading
                    }
                  >
                    {payoutLoading
                      ? "Refreshing..."
                      : "Refresh status"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="fk-payout-connected">
              <span className="fk-payout-connected-icon">
                ✓
              </span>

              <div>
                <strong>
                  Payout account connected
                </strong>

                <p>
                  Your Stripe account is
                  ready to receive
                  withdrawals.
                </p>
              </div>

              <button
                type="button"
                className="fk-secondary-button"
                onClick={() =>
                  void refreshStripeStatus()
                }
                disabled={
                  payoutLoading
                }
              >
                {payoutLoading
                  ? "Refreshing..."
                  : "Refresh status"}
              </button>
            </div>
          )}
        </section>

        {/* ================================================================
            CASH OUT
        ================================================================ */}

        <section
          id="cashout"
          className="fk-earnings-section"
        >
          <div className="fk-earnings-section-header">
            <div>
              <h2>
                Cash out
              </h2>

              <p>
                Withdraw your available
                creator earnings.
              </p>
            </div>

            <span
              className={
                payoutReady
                  ? "fk-status fk-status--success"
                  : "fk-status"
              }
            >
              {payoutReady
                ? "Payouts ready"
                : "Stripe setup required"}
            </span>
          </div>

          <div className="fk-cashout-box">
            <div className="fk-cashout-available">
              <span>
                Available
              </span>

              <strong>
                {money(
                  availableBalance,
                )}
              </strong>
            </div>

            <label
              htmlFor="cashout-amount"
            >
              Amount

              <div className="fk-money-input">
                <span>
                  $
                </span>

                <input
                  id="cashout-amount"
                  name="cashoutAmount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={
                    withdrawalAmount
                  }
                  onChange={
                    handleWithdrawalAmountChange
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();

                      if (
                        !withdrawalLoading
                      ) {
                        void handleWithdraw();
                      }
                    }
                  }}
                  placeholder="0.00"
                  aria-label="Withdrawal amount"
                  disabled={
                    withdrawalLoading
                  }
                />
              </div>

              <small>
                Minimum withdrawal: $10.00
              </small>
            </label>

            <div className="fk-cashout-quick-actions">
              {[10, 25, 50, 100].map(
                (amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      if (
                        availableBalance <
                        amount
                      ) {
                        setWithdrawalAmount(
                          availableBalance >=
                            10
                            ? availableBalance.toFixed(
                                2,
                              )
                            : "",
                        );

                        return;
                      }

                      setWithdrawalAmount(
                        amount.toFixed(
                          2,
                        ),
                      );
                    }}
                    disabled={
                      withdrawalLoading ||
                      payoutLoading ||
                      settlementLoading ||
                      availableBalance <
                        10
                    }
                  >
                    ${amount}
                  </button>
                ),
              )}

              {availableBalance >=
                10 && (
                <button
                  type="button"
                  onClick={() =>
                    setWithdrawalAmount(
                      availableBalance.toFixed(
                        2,
                      ),
                    )
                  }
                  disabled={
                    withdrawalLoading ||
                    payoutLoading ||
                    settlementLoading
                  }
                >
                  Max
                </button>
              )}
            </div>

            <div className="fk-cashout-summary">
              <div>
                <span>
                  Withdrawal
                </span>

                <strong>
                  {money(
                    validRequestedAmount,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Fee
                </span>

                <strong>
                  $0.00
                </strong>
              </div>

              <div>
                <span>
                  You receive
                </span>

                <strong>
                  {money(
                    receiveAmount,
                  )}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="fk-cashout-button"
              onClick={() =>
                void handleWithdraw()
              }
              disabled={
                cashoutButtonDisabled
              }
            >
              {withdrawalLoading
                ? "Processing..."
                : "Request cash out"}
            </button>

            {!payoutReady && (
              <div className="fk-cashout-note">
                <strong>
                  Stripe payout setup is not complete.
                </strong>

                <span>
                  Complete Stripe setup before
                  requesting a cash out.
                </span>
              </div>
            )}

            {payoutReady &&
              availableBalance < 10 && (
                <p className="fk-cashout-note">
                  You need at least
                  $10.00 in available
                  earnings to cash out.
                </p>
              )}

            {payoutReady &&
              availableBalance >= 10 &&
              withdrawalAmount !== "" &&
              validRequestedAmount >
                availableBalance && (
                <p className="fk-cashout-note">
                  The requested amount is
                  greater than your available
                  balance of{" "}
                  {money(
                    availableBalance,
                  )}
                  .
                </p>
              )}
          </div>
        </section>

        {/* ================================================================
            PAYOUT SETTINGS
        ================================================================ */}

        <section className="fk-earnings-section">
          <div className="fk-earnings-section-header">
            <div>
              <h2>
                Payout settings
              </h2>

              <p>
                Choose how you want to
                manage your creator
                payouts.
              </p>
            </div>
          </div>

          <div className="fk-payout-schedule">
            {(
              [
                "manual",
                "daily",
                "weekly",
                "monthly",
              ] as PayoutSchedule[]
            ).map(
              (schedule) => (
                <button
                  key={
                    schedule
                  }
                  type="button"
                  className={
                    account.payoutSchedule ===
                    schedule
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    void updateSchedule(
                      schedule,
                    )
                  }
                  disabled={
                    payoutLoading ||
                    withdrawalLoading ||
                    settlementLoading
                  }
                >
                  <strong>
                    {schedule
                      .charAt(
                        0,
                      )
                      .toUpperCase() +
                      schedule.slice(
                        1,
                      )}
                  </strong>

                  <span>
                    {schedule ===
                    "manual"
                      ? "You choose when to withdraw"
                      : `Automatic ${schedule} payouts`}
                  </span>
                </button>
              ),
            )}
          </div>
        </section>

        {/* ================================================================
            TRANSACTIONS
        ================================================================ */}

        <section className="fk-earnings-section">
          <div className="fk-earnings-section-header">
            <div>
              <h2>
                Earnings activity
              </h2>

              <p>
                See where your creator
                earnings came from.
              </p>
            </div>
          </div>

          <div className="fk-transaction-list">
            {dashboard.transactions
              .length === 0 ? (
              <div className="fk-empty-state">
                <span>
                  🎁
                </span>

                <strong>
                  No earnings yet
                </strong>

                <p>
                  Gifts you receive will
                  appear here.
                </p>
              </div>
            ) : (
              dashboard.transactions.map(
                (transaction) => (
                  <article
                    key={
                      transaction._id
                    }
                    className="fk-transaction"
                  >
                    <div className="fk-transaction-icon">
                      {transactionIcon(
                        transaction,
                      )}
                    </div>

                    <div className="fk-transaction-info">
                      <strong>
                        {transaction.description ??
                          "Fockis earnings"}
                      </strong>

                      <span>
                        {sourceLabel(
                          transaction,
                        )}

                        {" • "}

                        {date(
                          transaction.createdAt,
                        )}
                      </span>
                    </div>

                    <div className="fk-transaction-amount">
                      <strong
                        className={
                          Number(
                            transaction.amount,
                          ) >= 0
                            ? "positive"
                            : "negative"
                        }
                      >
                        {Number(
                          transaction.amount,
                        ) >= 0
                          ? "+"
                          : ""}

                        {money(
                          Number(
                            transaction.amount,
                          ) || 0,
                        )}
                      </strong>

                      {Number(
                        transaction.coins,
                      ) > 0 && (
                        <span>
                          {
                            transaction.coins
                          }{" "}
                          coins
                        </span>
                      )}
                    </div>
                  </article>
                ),
              )
            )}
          </div>
        </section>

        {/* ================================================================
            WITHDRAWALS
        ================================================================ */}

        <section className="fk-earnings-section">
          <div className="fk-earnings-section-header">
            <div>
              <h2>
                Cash-out history
              </h2>

              <p>
                Track your previous
                withdrawals.
              </p>
            </div>

            <div className="fk-withdrawal-total">
              <span>
                Total withdrawn
              </span>

              <strong>
                {money(
                  totalWithdrawn,
                )}
              </strong>
            </div>
          </div>

          <div className="fk-transaction-list">
            {dashboard.withdrawals
              .length === 0 ? (
              <div className="fk-empty-state">
                <span>
                  💸
                </span>

                <strong>
                  No withdrawals yet
                </strong>

                <p>
                  Your cash-out history
                  will appear here.
                </p>
              </div>
            ) : (
              dashboard.withdrawals.map(
                (withdrawal) => (
                  <article
                    key={
                      withdrawal._id
                    }
                    className="fk-transaction"
                  >
                    <div className="fk-transaction-icon">
                      💸
                    </div>

                    <div className="fk-transaction-info">
                      <strong>
                        Cash out
                      </strong>

                      <span>
                        {date(
                          withdrawal.createdAt,
                        )}

                        {withdrawal.description &&
                          ` • ${withdrawal.description}`}
                      </span>

                      {withdrawal.failureReason && (
                        <small className="fk-withdrawal-error">
                          {
                            withdrawal.failureReason
                          }
                        </small>
                      )}
                    </div>

                    <div className="fk-transaction-amount">
                      <strong>
                        {money(
                          Number(
                            withdrawal.amount,
                          ) || 0,
                        )}
                      </strong>

                      <span
                        className={`fk-withdrawal-status fk-withdrawal-status--${withdrawal.status}`}
                      >
                        {withdrawal.status}
                      </span>
                    </div>
                  </article>
                ),
              )
            )}
          </div>
        </section>

      </div>
    </main>
  );
}