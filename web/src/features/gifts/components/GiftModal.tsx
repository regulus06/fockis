import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import "../styles/gifts.scss";

import type {
  Gift,
} from "../services/giftsApi";

import GiftPicker from "./GiftPicker";

import {
  useWallet,
} from "../../wallet/hooks/useWallet";

/* ============================================================================
TYPES
============================================================================ */

interface GiftModalProps {
  open: boolean;

  gifts: Gift[];

  selectedGift: Gift | null;

  onClose: () => void;

  onSelect: (
    gift: Gift,
  ) => void;

  onSend: () => void;

  sending?: boolean;
}

/* ============================================================================
COMPONENT
============================================================================ */

export default function GiftModal({
  open,
  gifts,
  selectedGift,
  onClose,
  onSelect,
  onSend,
  sending = false,
}: GiftModalProps) {
  const navigate = useNavigate();

  const {
    coins,
    loading: walletLoading,
  } = useWallet();

  const [
    showBuyCoins,
    setShowBuyCoins,
  ] = useState(false);

  /* ==========================================================================
  CLOSED
  ========================================================================== */

  if (!open) {
    return null;
  }

  /* ==========================================================================
  CALCULATIONS
  ========================================================================== */

  const selectedPrice =
    selectedGift?.coinPrice ?? 0;

  const hasEnoughCoins =
    Boolean(selectedGift) &&
    coins >= selectedPrice;

  const canSend =
    Boolean(selectedGift) &&
    !walletLoading &&
    !sending &&
    hasEnoughCoins;

  const remainingCoins =
    Math.max(
      coins - selectedPrice,
      0,
    );

  const coinsNeeded =
    Math.max(
      selectedPrice - coins,
      0,
    );

  /* ==========================================================================
  SEND GIFT
  ========================================================================== */

  const handleSendClick = () => {
    console.log(
      "[GiftModal] Send button clicked",
      {
        selectedGiftId:
          selectedGift?._id,

        selectedGiftName:
          selectedGift?.name,

        selectedPrice,

        coins,

        hasEnoughCoins,

        canSend,

        sending,
      },
    );

    if (!selectedGift) {
      console.warn(
        "[GiftModal] No gift selected.",
      );

      return;
    }

    if (walletLoading) {
      console.warn(
        "[GiftModal] Wallet is still loading.",
      );

      return;
    }

    if (sending) {
      console.warn(
        "[GiftModal] Gift is already being sent.",
      );

      return;
    }

    if (!hasEnoughCoins) {
      console.warn(
        "[GiftModal] Insufficient coins.",
      );

      setShowBuyCoins(true);

      return;
    }

    console.log(
      "[GiftModal] Calling onSend().",
    );

    onSend();
  };

  /* ==========================================================================
  BUY COINS
  ========================================================================== */

  const openBuyCoins = () => {
    console.log(
      "[GiftModal] Opening Fockis Coin Checkout.",
    );

    setShowBuyCoins(false);

    navigate(
      "/wallet/buy-coins",
      {
        state: {
          giftId:
            selectedGift?._id,

          giftName:
            selectedGift?.name,

          giftPrice:
            selectedPrice,

          coins,

          coinsNeeded,

          returnTo:
            window.location.pathname,

          reason:
            "insufficient-coins",
        },
      },
    );
  };

  /* ==========================================================================
  CLOSE BUY COINS
  ========================================================================== */

  const closeBuyCoins = () => {
    if (sending) {
      return;
    }

    setShowBuyCoins(false);
  };

  /* ==========================================================================
  RENDER
  ========================================================================== */

  return (
    <>
      {/* ====================================================================
      GIFT MODAL
      ==================================================================== */}

      <div
        className="gift-modal-overlay"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="gift-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Send a gift"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {/* ================================================================
          HEADER
          ================================================================ */}

          <div className="gift-modal-top">
            <div className="gift-modal-title">
              Send a Gift 🎁
            </div>

            <button
              type="button"
              className="close-button"
              onClick={onClose}
              disabled={sending}
              aria-label="Close gift modal"
            >
              ✖
            </button>
          </div>

          {/* ================================================================
          BALANCE
          ================================================================ */}

          <div className="gift-sender-balance">
            <div className="gift-balance-left">
              <span
                className="gift-balance-icon"
                aria-hidden="true"
              >
                🪙
              </span>

              <div>
                <div className="gift-balance-label">
                  Your balance
                </div>

                <div className="gift-balance-value">
                  {walletLoading
                    ? "Loading..."
                    : `${coins.toLocaleString()} Coins`}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="gift-buy-coins-button"
              onClick={openBuyCoins}
              disabled={sending}
            >
              + Buy Coins
            </button>
          </div>

          {/* ================================================================
          GIFT PICKER
          ================================================================ */}

          <GiftPicker
            gifts={gifts}
            selectedGift={selectedGift}
            onSelect={onSelect}
          />

          {/* ================================================================
          SELECTED GIFT
          ================================================================ */}

          {selectedGift && (
            <div className="gift-selected-summary">
              <div className="gift-selected-left">
                <span
                  className="gift-selected-emoji"
                  aria-hidden="true"
                >
                  {selectedGift.emoji}
                </span>

                <div>
                  <strong>
                    {selectedGift.name}
                  </strong>

                  <span>
                    {selectedGift.description}
                  </span>
                </div>
              </div>

              <div className="gift-selected-price">
                🪙{" "}
                {selectedPrice.toLocaleString()}
              </div>
            </div>
          )}

          {/* ================================================================
          BALANCE AFTER GIFT
          ================================================================ */}

          {selectedGift &&
            hasEnoughCoins &&
            !walletLoading && (
              <div className="gift-balance-after">
                <span>
                  Balance after gift
                </span>

                <strong>
                  🪙{" "}
                  {remainingCoins.toLocaleString()}
                </strong>
              </div>
            )}

          {/* ================================================================
          INSUFFICIENT COINS
          ================================================================ */}

          {selectedGift &&
            !walletLoading &&
            !hasEnoughCoins && (
              <div className="gift-insufficient-coins">
                <div className="gift-insufficient-content">
                  <strong>
                    Not enough coins
                  </strong>

                  <span>
                    You need{" "}
                    <b>
                      {selectedPrice.toLocaleString()}
                    </b>{" "}
                    coins, but you only have{" "}
                    <b>
                      {coins.toLocaleString()}
                    </b>
                    .
                  </span>

                  <span>
                    You need{" "}
                    <b>
                      {coinsNeeded.toLocaleString()}
                    </b>{" "}
                    more coins.
                  </span>
                </div>

                <button
                  type="button"
                  className="gift-buy-coins-large-button"
                  onClick={openBuyCoins}
                  disabled={sending}
                >
                  🪙 Buy Coins
                </button>
              </div>
            )}

          {/* ================================================================
          SEND BUTTON
          ================================================================ */}

          <button
            type="button"
            className={`send-gift-button ${
              canSend
                ? "ready"
                : ""
            }`}
            disabled={
              sending ||
              walletLoading ||
              !selectedGift
            }
            onClick={handleSendClick}
          >
            {sending ? (
              "Sending..."
            ) : walletLoading ? (
              "Loading balance..."
            ) : !selectedGift ? (
              "Select a Gift 🎁"
            ) : !hasEnoughCoins ? (
              "Buy Coins to Continue 🪙"
            ) : (
              <>
                Send Gift 🎁 •{" "}
                {selectedPrice.toLocaleString()} Coins
              </>
            )}
          </button>
        </div>
      </div>

      {/* ====================================================================
      BUY COINS PANEL
      ==================================================================== */}

      {showBuyCoins && (
        <div
          className="buy-coins-overlay"
          role="presentation"
          onClick={closeBuyCoins}
        >
          <div
            className="buy-coins-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Buy Fockis Coins"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {/* ==============================================================
            HEADER
            ============================================================== */}

            <div className="buy-coins-panel-header">
              <div>
                <span>
                  Fockis Wallet
                </span>

                <h2>
                  Buy Coins 🪙
                </h2>
              </div>

              <button
                type="button"
                onClick={closeBuyCoins}
                aria-label="Close buy coins"
              >
                ✖
              </button>
            </div>

            {/* ==============================================================
            CURRENT BALANCE
            ============================================================== */}

            <div className="buy-coins-current">
              <span>
                Current balance
              </span>

              <strong>
                🪙{" "}
                {coins.toLocaleString()}
              </strong>
            </div>

            {/* ==============================================================
            SELECTED GIFT
            ============================================================== */}

            {selectedGift && (
              <div className="buy-coins-gift-info">
                <span>
                  Gift you selected
                </span>

                <strong>
                  {selectedGift.emoji}{" "}
                  {selectedGift.name}
                </strong>

                <span>
                  Cost:{" "}
                  {selectedPrice.toLocaleString()} coins
                </span>
              </div>
            )}

            <p className="buy-coins-message">
              Purchase Fockis Coins to send
              gifts to creators and posts.
            </p>

            {/* ==============================================================
            CONTINUE
            ============================================================== */}

            <button
              type="button"
              className="open-wallet-button"
              onClick={openBuyCoins}
            >
              Continue to Buy Coins
            </button>

            <button
              type="button"
              className="cancel-buy-coins-button"
              onClick={closeBuyCoins}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}