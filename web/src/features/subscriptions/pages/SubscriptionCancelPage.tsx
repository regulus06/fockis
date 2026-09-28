import React from "react";

import {
  useNavigate,
} from "react-router-dom";

import "../styles/SubscriptionPage.scss";

export default function SubscriptionCancelPage() {
  const navigate =
    useNavigate();

  return (
    <main className="fk-subscription-page">
      <section className="fk-subscription-result">
        <div className="fk-subscription-result__icon">
          !
        </div>

        <span className="fk-subscription-eyebrow">
          CHECKOUT CANCELED
        </span>

        <h1>
          Your account was not changed
        </h1>

        <p>
          You can return to the
          subscription page whenever
          you are ready.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/subscriptions",
            )
          }
        >
          Back to subscriptions
        </button>
      </section>
    </main>
  );
}