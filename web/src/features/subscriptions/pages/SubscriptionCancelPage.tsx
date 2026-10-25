import { useNavigate } from "react-router-dom";
import { ArrowLeft, CircleSlash } from "lucide-react";

import "../styles/SubscriptionPage.scss";

/* ============================================================================
   CHECKOUT CANCELED

   The user left Stripe Checkout before paying. Nothing about their
   existing subscription changed — this is NOT a subscription
   cancellation.
============================================================================ */

export default function SubscriptionCancelPage() {
  const navigate = useNavigate();

  return (
    <main className="fk-sub-page">
      <section className="fk-sub-result">
        <span className="fk-sub-result__icon fk-sub-result__icon--neutral">
          <CircleSlash size={30} aria-hidden="true" />
        </span>

        <span className="fk-sub-eyebrow">Checkout not completed</span>

        <h1>No changes were made</h1>

        <p>
          You left checkout before completing payment, so this checkout did not charge you and your current Fockis plan
          is exactly as it was. Any subscription you already had is unchanged.
        </p>

        <div className="fk-sub-actions fk-sub-actions--center">
          <button type="button" className="fk-sub-btn fk-sub-btn--primary" onClick={() => navigate("/subscriptions/plans")}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to plans
          </button>
          <button type="button" className="fk-sub-btn fk-sub-btn--secondary" onClick={() => navigate("/subscriptions")}>
            My subscription
          </button>
        </div>
      </section>
    </main>
  );
}
