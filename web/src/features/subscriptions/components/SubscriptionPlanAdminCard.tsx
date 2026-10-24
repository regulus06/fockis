import { useEffect, useId, useState } from "react";

import type {
  AdminSubscriptionPlan,
  UpdateSubscriptionPlanPayload,
} from "../types/subscriptionPlanAdminTypes";

import { updateAdminSubscriptionPlan } from "../services/subscriptionPlanAdminApi";
import { getSubscriptionPlanTheme } from "../config/subscriptionPlanThemes";
import { getPlanRank, getYearlySavingsPercent, normalizeSubscriptionFeatures } from "../utils/subscriptionPlanUtils";

import "../styles/SubscriptionPlanAdminCard.scss";

/* ============================================================================
   ADMIN — SUBSCRIPTION PLAN CARD

   Edits one plan through PATCH /admin/subscription-plans/:plan
   (JwtAuthGuard + RbacGuard + SuperAdminGuard on the backend).
   Fields map 1:1 to UpdateSubscriptionPlanDto.
============================================================================ */

interface Props {
  plan: AdminSubscriptionPlan;
  onUpdated: (plan: AdminSubscriptionPlan) => void;
}

function featuresToText(features: AdminSubscriptionPlan["features"]): string {
  return normalizeSubscriptionFeatures(features)
    .map((item) => item.name)
    .join("\n");
}

function textToFeatures(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "-");
}

export default function SubscriptionPlanAdminCard({ plan, onUpdated }: Props) {
  const uid = useId();
  const field = (name: string) => `${uid}-${name}`;

  const [monthlyPrice, setMonthlyPrice] = useState(String(plan.monthlyPrice));
  const [yearlyPrice, setYearlyPrice] = useState(String(plan.yearlyPrice));
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [currency, setCurrency] = useState(plan.currency);
  const [featuresText, setFeaturesText] = useState(featuresToText(plan.features));
  const [displayOrder, setDisplayOrder] = useState(String(plan.displayOrder ?? ""));
  const [stripeMonthlyPriceId, setStripeMonthlyPriceId] = useState(plan.stripeMonthlyPriceId ?? "");
  const [stripeYearlyPriceId, setStripeYearlyPriceId] = useState(plan.stripeYearlyPriceId ?? "");
  const [active, setActive] = useState(plan.active);
  const [popular, setPopular] = useState(plan.popular);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMonthlyPrice(String(plan.monthlyPrice));
    setYearlyPrice(String(plan.yearlyPrice));
    setName(plan.name);
    setDescription(plan.description);
    setCurrency(plan.currency);
    setFeaturesText(featuresToText(plan.features));
    setDisplayOrder(String(plan.displayOrder ?? ""));
    setStripeMonthlyPriceId(plan.stripeMonthlyPriceId ?? "");
    setStripeYearlyPriceId(plan.stripeYearlyPriceId ?? "");
    setActive(plan.active);
    setPopular(plan.popular);
  }, [plan]);

  const isBasic = plan.plan === "BASIC";
  const theme = getSubscriptionPlanTheme(plan.plan);
  const savings = getYearlySavingsPercent({
    monthlyPrice: Number(monthlyPrice),
    yearlyPrice: Number(yearlyPrice),
  });

  async function handleSave() {
    setError(null);
    setSuccess(false);

    const monthly = Number(monthlyPrice);
    const yearly = Number(yearlyPrice);
    const order = Number(displayOrder);

    if (!name.trim()) return setError("Plan name is required.");
    if (!Number.isFinite(monthly) || monthly < 0) return setError("Enter a valid monthly price.");
    if (!Number.isFinite(yearly) || yearly < 0) return setError("Enter a valid yearly price.");
    if (isBasic && (monthly !== 0 || yearly !== 0)) return setError("BASIC must remain free.");
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) return setError("Currency must be a 3-letter code, e.g. USD.");
    if (displayOrder.trim() !== "" && (!Number.isInteger(order) || order < 0 || order > 999)) {
      return setError("Display order must be a whole number between 0 and 999.");
    }
    if (!isBasic && !stripeMonthlyPriceId.trim()) return setError("Stripe monthly Price ID is required for paid plans.");
    if (!isBasic && !stripeYearlyPriceId.trim()) return setError("Stripe yearly Price ID is required for paid plans.");

    const payload: UpdateSubscriptionPlanPayload = {
      name: name.trim(),
      description: description.trim(),
      monthlyPrice: monthly,
      yearlyPrice: yearly,
      currency: currency.trim().toUpperCase(),
      features: textToFeatures(featuresText),
      active,
      popular,
      ...(displayOrder.trim() !== "" ? { displayOrder: order } : {}),
      stripeMonthlyPriceId: stripeMonthlyPriceId.trim() || undefined,
      stripeYearlyPriceId: stripeYearlyPriceId.trim() || undefined,
    };

    try {
      setSaving(true);
      const updated = await updateAdminSubscriptionPlan(plan.plan, payload);
      onUpdated(updated);
      setStripeMonthlyPriceId(updated.stripeMonthlyPriceId ?? "");
      setStripeYearlyPriceId(updated.stripeYearlyPriceId ?? "");
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update subscription plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`fk-sub-admin-card fk-sub-admin-card--${theme.key}`}>
      <header className="fk-sub-admin-card__header">
        <img src={theme.image} alt="" width={96} height={56} />
        <div>
          <span className="fk-sub-admin-card__code">
            {plan.plan} · Level {getPlanRank(plan.plan)}
          </span>
          <h2>{plan.name}</h2>
        </div>
        <span className={`fk-sub-admin-pill${active ? " is-active" : ""}`}>{active ? "Active" : "Inactive"}</span>
      </header>

      <div className="fk-sub-admin-card__body">
        <div className="fk-sub-field">
          <label htmlFor={field("name")}>Plan name</label>
          <input id={field("name")} type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="fk-sub-field">
          <label htmlFor={field("description")}>Description</label>
          <textarea
            id={field("description")}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="fk-sub-field-row">
          <div className="fk-sub-field">
            <label htmlFor={field("monthly")}>Monthly price</label>
            <div className="fk-sub-input-affix">
              <span>{currency || "USD"}</span>
              <input
                id={field("monthly")}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={monthlyPrice}
                disabled={isBasic}
                onChange={(e) => setMonthlyPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="fk-sub-field">
            <label htmlFor={field("yearly")}>Yearly price</label>
            <div className="fk-sub-input-affix">
              <span>{currency || "USD"}</span>
              <input
                id={field("yearly")}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={yearlyPrice}
                disabled={isBasic}
                onChange={(e) => setYearlyPrice(e.target.value)}
              />
            </div>
          </div>
        </div>

        {!isBasic && (
          <p className="fk-sub-admin-hint">
            {savings
              ? `Customers will see "save ${savings}%" on yearly billing.`
              : "No yearly discount: the yearly price is not below 12 monthly payments."}
          </p>
        )}

        <div className="fk-sub-field-row">
          <div className="fk-sub-field">
            <label htmlFor={field("currency")}>Currency</label>
            <input
              id={field("currency")}
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </div>

          <div className="fk-sub-field">
            <label htmlFor={field("order")}>Display order</label>
            <input
              id={field("order")}
              type="number"
              min="0"
              max="999"
              step="1"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
            />
          </div>
        </div>

        <div className="fk-sub-field">
          <label htmlFor={field("features")}>Features</label>
          <textarea
            id={field("features")}
            rows={5}
            value={featuresText}
            placeholder={"One feature per line"}
            aria-describedby={field("features-help")}
            onChange={(e) => setFeaturesText(e.target.value)}
          />
          <small id={field("features-help")}>One feature per line. Shown on the public plan card in this order.</small>
        </div>

        {!isBasic && (
          <fieldset className="fk-sub-admin-stripe">
            <legend>Stripe pricing</legend>
            <div className="fk-sub-field">
              <label htmlFor={field("stripe-monthly")}>Stripe monthly Price ID</label>
              <input
                id={field("stripe-monthly")}
                type="text"
                placeholder="price_…"
                spellCheck={false}
                value={stripeMonthlyPriceId}
                onChange={(e) => setStripeMonthlyPriceId(e.target.value)}
              />
            </div>
            <div className="fk-sub-field">
              <label htmlFor={field("stripe-yearly")}>Stripe yearly Price ID</label>
              <input
                id={field("stripe-yearly")}
                type="text"
                placeholder="price_…"
                spellCheck={false}
                value={stripeYearlyPriceId}
                onChange={(e) => setStripeYearlyPriceId(e.target.value)}
              />
            </div>
            <small>Use Stripe Price IDs (price_…), not Product IDs. The Stripe price amount should match the price above.</small>
          </fieldset>
        )}

        <div className="fk-sub-admin-toggles">
          <label className="fk-sub-check">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Plan is active</span>
          </label>
          <label className="fk-sub-check">
            <input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)} />
            <span>Mark as most popular</span>
          </label>
        </div>

        {isBasic && <p className="fk-sub-admin-hint">BASIC is always free.</p>}

        {error && (
          <p className="fk-sub-alert fk-sub-alert--error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="fk-sub-alert fk-sub-alert--success" role="status">
            Plan updated successfully.
          </p>
        )}
      </div>

      <footer className="fk-sub-admin-card__footer">
        <button type="button" className="fk-sub-btn fk-sub-btn--primary" disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </footer>
    </article>
  );
}
