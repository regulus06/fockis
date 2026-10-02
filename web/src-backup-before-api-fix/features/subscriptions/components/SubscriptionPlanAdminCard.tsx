import React, {
  useEffect,
  useState,
} from "react";

import type {
  AdminSubscriptionPlan,
  UpdateSubscriptionPlanPayload,
} from "../types/subscriptionPlanAdminTypes";

import {
  updateAdminSubscriptionPlan,
} from "../services/subscriptionPlanAdminApi";

import "../styles/SubscriptionPlanAdminCard.scss";

/* ============================================================================
   PROPS
============================================================================ */

interface Props {
  plan: AdminSubscriptionPlan;

  onUpdated: (
    plan: AdminSubscriptionPlan,
  ) => void;
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function SubscriptionPlanAdminCard({
  plan,
  onUpdated,
}: Props) {

  /* --------------------------------------------------------------------------
     BASIC PLAN INFORMATION
  -------------------------------------------------------------------------- */

  const [monthlyPrice, setMonthlyPrice] =
    useState(
      String(plan.monthlyPrice),
    );

  const [yearlyPrice, setYearlyPrice] =
    useState(
      String(plan.yearlyPrice),
    );

  const [name, setName] =
    useState(plan.name);

  const [description, setDescription] =
    useState(plan.description);

  const [currency, setCurrency] =
    useState(plan.currency);

  /* --------------------------------------------------------------------------
     STRIPE PRICE IDS
  -------------------------------------------------------------------------- */

  const [stripeMonthlyPriceId, setStripeMonthlyPriceId] =
    useState(
      plan.stripeMonthlyPriceId ?? "",
    );

  const [stripeYearlyPriceId, setStripeYearlyPriceId] =
    useState(
      plan.stripeYearlyPriceId ?? "",
    );

  /* --------------------------------------------------------------------------
     OPTIONS
  -------------------------------------------------------------------------- */

  const [active, setActive] =
    useState(plan.active);

  const [popular, setPopular] =
    useState(plan.popular);

  /* --------------------------------------------------------------------------
     STATE
  -------------------------------------------------------------------------- */

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  /* ==========================================================================
     SYNC WITH PLAN
  ========================================================================== */

  useEffect(() => {

    setMonthlyPrice(
      String(plan.monthlyPrice),
    );

    setYearlyPrice(
      String(plan.yearlyPrice),
    );

    setName(
      plan.name,
    );

    setDescription(
      plan.description,
    );

    setCurrency(
      plan.currency,
    );

    setStripeMonthlyPriceId(
      plan.stripeMonthlyPriceId ?? "",
    );

    setStripeYearlyPriceId(
      plan.stripeYearlyPriceId ?? "",
    );

    setActive(
      plan.active,
    );

    setPopular(
      plan.popular,
    );

  }, [plan]);

  /* ==========================================================================
     SAVE
  ========================================================================== */

  async function handleSave() {

    setError(null);
    setSuccess(false);

    /* ------------------------------------------------------------------------
       PRICE VALIDATION
    ------------------------------------------------------------------------ */

    const monthly =
      Number(monthlyPrice);

    const yearly =
      Number(yearlyPrice);

    if (
      !Number.isFinite(monthly) ||
      monthly < 0
    ) {

      setError(
        "Enter a valid monthly price.",
      );

      return;
    }

    if (
      !Number.isFinite(yearly) ||
      yearly < 0
    ) {

      setError(
        "Enter a valid yearly price.",
      );

      return;
    }

    /* ------------------------------------------------------------------------
       BASIC MUST REMAIN FREE
    ------------------------------------------------------------------------ */

    if (
      plan.plan === "BASIC" &&
      (
        monthly !== 0 ||
        yearly !== 0
      )
    ) {

      setError(
        "BASIC must remain free.",
      );

      return;
    }

    /* ------------------------------------------------------------------------
       STRIPE PRICE ID VALIDATION
    ------------------------------------------------------------------------ */

    if (
      plan.plan !== "BASIC" &&
      !stripeMonthlyPriceId.trim()
    ) {

      setError(
        "Stripe monthly Price ID is required for paid plans.",
      );

      return;
    }

    if (
      plan.plan !== "BASIC" &&
      !stripeYearlyPriceId.trim()
    ) {

      setError(
        "Stripe yearly Price ID is required for paid plans.",
      );

      return;
    }

    /* ------------------------------------------------------------------------
       PAYLOAD
    ------------------------------------------------------------------------ */

    const payload: UpdateSubscriptionPlanPayload = {

      name:
        name.trim(),

      description:
        description.trim(),

      monthlyPrice:
        monthly,

      yearlyPrice:
        yearly,

      currency:
        currency
          .trim()
          .toUpperCase(),

      active,

      popular,

      stripeMonthlyPriceId:
        stripeMonthlyPriceId.trim() ||
        undefined,

      stripeYearlyPriceId:
        stripeYearlyPriceId.trim() ||
        undefined,
    };

    /* ------------------------------------------------------------------------
       SAVE
    ------------------------------------------------------------------------ */

    try {

      setSaving(true);

      const updated =
        await updateAdminSubscriptionPlan(
          plan.plan,
          payload,
        );

      onUpdated(
        updated,
      );

      /* ----------------------------------------------------------------------
         Update local Stripe fields immediately.
      ---------------------------------------------------------------------- */

      setStripeMonthlyPriceId(
        updated.stripeMonthlyPriceId ?? "",
      );

      setStripeYearlyPriceId(
        updated.stripeYearlyPriceId ?? "",
      );

      setSuccess(true);

      window.setTimeout(() => {
        setSuccess(false);
      }, 2500);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update subscription plan.",
      );

    } finally {

      setSaving(false);

    }
  }

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <article className="fk-subscription-admin-card">

      {/* ======================================================================
         HEADER
      ====================================================================== */}

      <div className="fk-subscription-admin-card__header">

        <div>

          <span className="fk-subscription-admin-card__plan">
            {plan.plan}
          </span>

          <h2>
            {plan.name}
          </h2>

        </div>

        <div
          className={
            active
              ? "fk-subscription-admin-status is-active"
              : "fk-subscription-admin-status"
          }
        >
          {active
            ? "ACTIVE"
            : "INACTIVE"}
        </div>

      </div>

      {/* ======================================================================
         PLAN NAME
      ====================================================================== */}

      <label>

        Plan Name

        <input
          type="text"
          value={name}
          onChange={(event) =>
            setName(
              event.target.value,
            )
          }
        />

      </label>

      {/* ======================================================================
         DESCRIPTION
      ====================================================================== */}

      <label>

        Description

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value,
            )
          }
          rows={3}
        />

      </label>

      {/* ======================================================================
         PRICING
      ====================================================================== */}

      <div className="fk-subscription-admin-pricing">

        {/* --------------------------------------------------------------------
           MONTHLY
        -------------------------------------------------------------------- */}

        <label>

          Monthly Price

          <div className="fk-subscription-admin-price-input">

            <span>
              $
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyPrice}
              disabled={
                plan.plan === "BASIC"
              }
              onChange={(event) =>
                setMonthlyPrice(
                  event.target.value,
                )
              }
            />

          </div>

        </label>

        {/* --------------------------------------------------------------------
           YEARLY
        -------------------------------------------------------------------- */}

        <label>

          Yearly Price

          <div className="fk-subscription-admin-price-input">

            <span>
              $
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={yearlyPrice}
              disabled={
                plan.plan === "BASIC"
              }
              onChange={(event) =>
                setYearlyPrice(
                  event.target.value,
                )
              }
            />

          </div>

        </label>

      </div>

      {/* ======================================================================
         STRIPE PRICE IDS
      ====================================================================== */}

      {plan.plan !== "BASIC" && (

        <section className="fk-subscription-admin-stripe">

          <div className="fk-subscription-admin-stripe__header">

            <strong>
              Stripe Pricing
            </strong>

            <span>
              Connect this Fockis plan to its Stripe prices.
            </span>

          </div>

          {/* ------------------------------------------------------------------
             MONTHLY STRIPE PRICE
          ------------------------------------------------------------------ */}

          <label>

            Stripe Monthly Price ID

            <input
              type="text"
              value={stripeMonthlyPriceId}
              placeholder="price_..."
              onChange={(event) =>
                setStripeMonthlyPriceId(
                  event.target.value,
                )
              }
            />

            <small>
              Used when customers select monthly billing.
            </small>

          </label>

          {/* ------------------------------------------------------------------
             YEARLY STRIPE PRICE
          ------------------------------------------------------------------ */}

          <label>

            Stripe Yearly Price ID

            <input
              type="text"
              value={stripeYearlyPriceId}
              placeholder="price_..."
              onChange={(event) =>
                setStripeYearlyPriceId(
                  event.target.value,
                )
              }
            />

            <small>
              Used when customers select yearly billing.
            </small>

          </label>

        </section>

      )}

      {/* ======================================================================
         CURRENCY
      ====================================================================== */}

      <label>

        Currency

        <input
          type="text"
          maxLength={3}
          value={currency}
          onChange={(event) =>
            setCurrency(
              event.target.value
                .toUpperCase(),
            )
          }
        />

      </label>

      {/* ======================================================================
         OPTIONS
      ====================================================================== */}

      <div className="fk-subscription-admin-options">

        <label className="fk-subscription-admin-checkbox">

          <input
            type="checkbox"
            checked={active}
            onChange={(event) =>
              setActive(
                event.target.checked,
              )
            }
          />

          <span>
            Plan is active
          </span>

        </label>

        <label className="fk-subscription-admin-checkbox">

          <input
            type="checkbox"
            checked={popular}
            onChange={(event) =>
              setPopular(
                event.target.checked,
              )
            }
          />

          <span>
            Mark as popular
          </span>

        </label>

      </div>

      {/* ======================================================================
         BASIC NOTICE
      ====================================================================== */}

      {plan.plan === "BASIC" && (

        <div className="fk-subscription-admin-notice">

          BASIC is always free.

        </div>

      )}

      {/* ======================================================================
         ERROR
      ====================================================================== */}

      {error && (

        <div className="fk-subscription-admin-error">

          {error}

        </div>

      )}

      {/* ======================================================================
         SUCCESS
      ====================================================================== */}

      {success && (

        <div className="fk-subscription-admin-success">

          Plan updated successfully.

        </div>

      )}

      {/* ======================================================================
         SAVE
      ====================================================================== */}

      <button
        type="button"
        className="fk-subscription-admin-save"
        disabled={saving}
        onClick={handleSave}
      >

        {saving
          ? "Saving..."
          : "Save Changes"}

      </button>

    </article>
  );
}