import {
  useEffect,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useWallet,
} from "../hooks/useWallet";

import CoinBalance from "../components/CoinBalance";

/* ============================================================================
TYPES
============================================================================ */

interface WalletStats {
  coins?: number;
  totalPurchased?: number;
  totalSpent?: number;
  totalReceived?: number;
}

interface WalletLocationState {
  coinPurchaseSuccess?: boolean;
  addedCoins?: number;
}

/* ============================================================================
PAGE
============================================================================ */

export default function WalletPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const {
    wallet,
    loading,
    error,
    refresh,
  } = useWallet();

  const walletStats =
    wallet as WalletStats | null;

  /* ==========================================================================
  REFRESH AFTER COIN PURCHASE
  ========================================================================== */

  useEffect(() => {
    const state =
      location.state as
        | WalletLocationState
        | null;

    if (!state?.coinPurchaseSuccess) {
      return;
    }

    void refresh();

    navigate(
      location.pathname,
      {
        replace: true,
        state: null,
      },
    );
  }, [
    location.pathname,
    location.state,
    navigate,
    refresh,
  ]);

  /* ==========================================================================
  BUY COINS
  ========================================================================== */

  function handleBuyCoins() {
    navigate(
      "/checkout",
      {
        state: {
          type: "coins",
        },
      },
    );
  }

  /* ==========================================================================
  LOADING
  ========================================================================== */

  if (loading) {
    return (
      <div className="wallet-page">
        <div className="wallet-loading">
          <div
            className="wallet-loading-icon"
            aria-hidden="true"
          >
            🪙
          </div>

          <h2>
            Loading wallet...
          </h2>

          <p>
            Preparing your Fockis
            wallet.
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================================
  RENDER
  ========================================================================== */

  return (
    <div className="wallet-page">
      <div className="wallet-container">
        {/* ================================================================
            HEADER
        ================================================================ */}

        <header className="wallet-header">
          <div>
            <span className="wallet-eyebrow">
              Fockis Wallet
            </span>

            <h1>
              My Wallet
            </h1>

            <p>
              Manage your Fockis Coins
              and LIVE gifting balance.
            </p>
          </div>

          <CoinBalance
            coins={
              walletStats?.coins ?? 0
            }
            onClick={
              handleBuyCoins
            }
          />
        </header>

        {/* ================================================================
            ERROR
        ================================================================ */}

        {error && (
          <div
            className="wallet-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ================================================================
            BALANCE HERO
        ================================================================ */}

        <section className="wallet-balance-card">
          <div>
            <span>
              Available Balance
            </span>

            <strong>
              🪙{" "}
              {Number(
                walletStats?.coins ?? 0,
              ).toLocaleString()}
            </strong>

            <small>
              Fockis Coins
            </small>
          </div>

          <button
            type="button"
            onClick={
              handleBuyCoins
            }
          >
            Buy Coins
          </button>
        </section>

        {/* ================================================================
            STATISTICS
        ================================================================ */}

        <section className="wallet-stats-grid">
          <StatCard
            title="Available Coins"
            value={
              walletStats?.coins ?? 0
            }
            icon="🪙"
          />

          <StatCard
            title="Purchased"
            value={
              walletStats?.totalPurchased ??
              0
            }
            icon="💳"
          />

          <StatCard
            title="Spent"
            value={
              walletStats?.totalSpent ??
              0
            }
            icon="🎁"
          />

          <StatCard
            title="Received"
            value={
              walletStats?.totalReceived ??
              0
            }
            icon="💰"
          />
        </section>

        {/* ================================================================
            LIVE GIFTS
        ================================================================ */}

        <section className="wallet-live-card">
          <div
            className="wallet-live-icon"
            aria-hidden="true"
          >
            🎁
          </div>

          <div>
            <span className="wallet-eyebrow">
              LIVE GIFTING
            </span>

            <h2>
              Support your favorite
              creators
            </h2>

            <p>
              Use your Fockis Coins to
              send animated gifts while
              watching LIVE streams.
            </p>

            <button
              type="button"
              onClick={
                handleBuyCoins
              }
            >
              Buy Coins
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================================
STAT CARD
============================================================================ */

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
}

function StatCard({
  title,
  value,
  icon,
}: StatCardProps) {
  return (
    <div className="wallet-stat-card">
      <div
        className="wallet-stat-icon"
        aria-hidden="true"
      >
        {icon}
      </div>

      <strong>
        {Number(
          value ?? 0,
        ).toLocaleString()}
      </strong>

      <span>
        {title}
      </span>
    </div>
  );
}