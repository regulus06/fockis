import {
  useEffect,
  useState,
} from "react";

import {
  Mail,
  MessageSquare,
} from "lucide-react";

import MarketingCreditCard from "../components/MarketingCreditCard";
import MarketingCreditPurchaseModal from "../components/MarketingCreditPurchaseModal";

import {
  getMarketingCredits,
  purchaseMarketingCredits,
  type CreditBalance,
  type CreditChannel,
  type CreditPackage,
} from "../services/marketingCreditsApi";

import "../styles/MarketingCreditsPage.scss";

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    packageId: "email-1000",
    channel: "email",
    credits: 1000,
    price: {
      amount: 10,
      currency: "USD",
    },
    label: "1,000 Email Credits",
    status: "active",
  },
  {
    packageId: "email-5000",
    channel: "email",
    credits: 5000,
    price: {
      amount: 35,
      currency: "USD",
    },
    label: "5,000 Email Credits",
    bestValue: true,
    status: "active",
  },
  {
    packageId: "email-10000",
    channel: "email",
    credits: 10000,
    price: {
      amount: 60,
      currency: "USD",
    },
    label: "10,000 Email Credits",
    status: "active",
  },
  {
    packageId: "sms-500",
    channel: "sms",
    credits: 500,
    price: {
      amount: 15,
      currency: "USD",
    },
    label: "500 SMS Credits",
    status: "active",
  },
  {
    packageId: "sms-2500",
    channel: "sms",
    credits: 2500,
    price: {
      amount: 55,
      currency: "USD",
    },
    label: "2,500 SMS Credits",
    bestValue: true,
    status: "active",
  },
  {
    packageId: "sms-10000",
    channel: "sms",
    credits: 10000,
    price: {
      amount: 180,
      currency: "USD",
    },
    label: "10,000 SMS Credits",
    status: "active",
  },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(
    Math.max(0, value),
  );
}

function formatStatus(value: string): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export default function MarketingCreditsPage() {
  const [balance, setBalance] =
    useState<CreditBalance | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [channel, setChannel] =
    useState<CreditChannel | null>(null);

  async function loadCredits() {
    try {
      setLoading(true);
      setError(null);

      const result =
        await getMarketingCredits();

      setBalance(result);
    } catch (err) {
      console.error(
        "Failed to load marketing credits:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load marketing credits.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCredits();
  }, []);

  async function handlePurchase(
    selectedChannel: CreditChannel,
    packageId: string,
  ) {
    const selected =
      CREDIT_PACKAGES.find(
        (item) =>
          item.packageId === packageId &&
          item.channel === selectedChannel,
      );

    if (!selected) {
      throw new Error(
        "Credit package could not be found.",
      );
    }

    await purchaseMarketingCredits(
      selectedChannel,
      selected.packageId,
      selected.credits,
    );

    await loadCredits();
  }

  if (loading) {
    return (
      <main className="mk-credits-page">
        <div className="mk-credits-page__loading">
          Loading marketing credits...
        </div>
      </main>
    );
  }

  return (
    <main className="mk-credits-page">
      <header className="mk-credits-page__header">
        <div>
          <span className="mk-credits-page__eyebrow">
            MARKETING BILLING
          </span>

          <h1>Email & SMS Credits</h1>

          <p>
            Buy marketing credits and keep
            your Fockis campaigns running.
          </p>
        </div>
      </header>

      {error && (
        <div className="mk-credits-page__error">
          <strong>
            Unable to load credits
          </strong>

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              void loadCredits()
            }
          >
            Try again
          </button>
        </div>
      )}

      {balance && (
        <>
          <section className="mk-credits-page__summary">
            <div>
              <span>Email credits</span>

              <strong>
                {formatNumber(
                  balance.emailCreditsRemaining,
                )}
              </strong>
            </div>

            <div>
              <span>SMS credits</span>

              <strong>
                {formatNumber(
                  balance.smsCreditsRemaining,
                )}
              </strong>
            </div>

            <div>
              <span>Billing status</span>

              <strong>
                {formatStatus(
                  balance.billingStatus,
                )}
              </strong>
            </div>
          </section>

          <section className="mk-credits-page__cards">
            <MarketingCreditCard
              title="Email"
              description="Send newsletters, promotions, announcements and customer emails."
              icon={<Mail size={22} />}
              remaining={
                balance.emailCreditsRemaining
              }
              used={
                balance.emailCreditsUsed
              }
              included={
                balance.emailCreditsIncluded
              }
              onBuy={() =>
                setChannel("email")
              }
            />

            <MarketingCreditCard
              title="SMS"
              description="Reach customers directly with promotional and transactional SMS."
              icon={
                <MessageSquare size={22} />
              }
              remaining={
                balance.smsCreditsRemaining
              }
              used={
                balance.smsCreditsUsed
              }
              included={
                balance.smsCreditsIncluded
              }
              onBuy={() =>
                setChannel("sms")
              }
            />
          </section>

          <section className="mk-credits-page__details">
            <div>
              <span>Email credits used</span>
              <strong>
                {formatNumber(
                  balance.emailCreditsUsed,
                )}
              </strong>
            </div>

            <div>
              <span>Email bonus credits</span>
              <strong>
                {formatNumber(
                  balance.emailCreditsBonus,
                )}
              </strong>
            </div>

            <div>
              <span>SMS credits used</span>
              <strong>
                {formatNumber(
                  balance.smsCreditsUsed,
                )}
              </strong>
            </div>

            <div>
              <span>SMS bonus credits</span>
              <strong>
                {formatNumber(
                  balance.smsCreditsBonus,
                )}
              </strong>
            </div>

            <div>
              <span>Billing cycle</span>
              <strong>
                {formatStatus(
                  balance.billingCycle,
                )}
              </strong>
            </div>

            <div>
              <span>Renewal date</span>
              <strong>
                {balance.renewalDate
                  ? new Intl.DateTimeFormat(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    ).format(
                      new Date(
                        balance.renewalDate,
                      ),
                    )
                  : "—"}
              </strong>
            </div>
          </section>
        </>
      )}

      {channel && (
        <MarketingCreditPurchaseModal
          channel={channel}
          packages={CREDIT_PACKAGES}
          onClose={() =>
            setChannel(null)
          }
          onPurchase={handlePurchase}
        />
      )}
    </main>
  );
}