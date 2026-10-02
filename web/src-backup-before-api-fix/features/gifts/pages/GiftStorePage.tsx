import {
  useGifts,
} from "../hooks/useGifts";

import GiftPicker from "../components/GiftPicker";

import "../styles/GiftStorePage.scss";

export default function GiftStorePage() {
  const {
    gifts,
    selectedGift,
    selectGift,
  } = useGifts();

  return (
    <main className="gift-store-page">

      <div className="gift-store-background-glow gift-store-background-glow-one" />
      <div className="gift-store-background-glow gift-store-background-glow-two" />

      <div className="gift-store-container">

        <header className="gift-store-header">

          <div className="gift-store-header-icon">
            🎁
          </div>

          <div className="gift-store-header-content">

            <span className="gift-store-eyebrow">
              FOCKIS GIFTS
            </span>

            <h1>
              Gift Store
              <span>🎁</span>
            </h1>

            <p>
              Support your friends and favorite creators
              with special Fockis gifts.
            </p>

          </div>

          <div className="gift-store-live-badge">
            <span />
            LIVE GIFTS
          </div>

        </header>

        <section className="gift-store-picker">

          <GiftPicker
            gifts={gifts}
            selectedGift={selectedGift}
            onSelect={selectGift}
          />

        </section>

      </div>

    </main>
  );
}