import { Check, Minus } from "lucide-react";

import type {
  BillingInterval,
  SubscriptionPlan,
  SubscriptionPlanConfig,
} from "../types/subscriptionTypes";

import { getSubscriptionPlanTheme } from "../config/subscriptionPlanThemes";

import {
  formatMoney,
  getPlanLabel,
  getPlanPrice,
  getPlanRank,
  getYearlySavingsPercent,
  normalizeSubscriptionFeatures,
} from "../utils/subscriptionPlanUtils";
import type { PlanCardAction } from "../utils/subscriptionPlanUtils";

/* ============================================================================
   FOCKIS SUBSCRIPTION PLAN CARD

   Presentation only. Everything shown comes from the backend plan
   config; the gemstone art comes from subscriptionPlanThemes.

   `action` decides the button. When it is omitted (legacy callers)
   the card falls back to "current / choose" behaviour.
============================================================================ */

interface Props {
  config: SubscriptionPlanConfig;
  currentPlan: SubscriptionPlan;
  billingInterval: BillingInterval;
  loading?: boolean;
  /** True while THIS plan's checkout is being created. */
  pending?: boolean;
  action?: PlanCardAction;
  onSelect: (plan: SubscriptionPlan) => void;
}

export default function SubscriptionPlanCard({
  config,
  currentPlan,
  billingInterval,
  loading = false,
  pending = false,
  action,
  onSelect,
}: Props) {
  const theme = getSubscriptionPlanTheme(config.plan);
  const name = getPlanLabel(config.plan, [config]);
  const rank = config.rank ?? getPlanRank(config.plan);
  const features = normalizeSubscriptionFeatures(config.features);
  const price = getPlanPrice(config, billingInterval);
  const currency = config.currency || "USD";
  const savings = billingInterval === "YEARLY" ? getYearlySavingsPercent(config) : null;
  const intervalWord = billingInterval === "YEARLY" ? "year" : "month";

  const resolvedAction: PlanCardAction =
    action ??
    (currentPlan === config.plan
      ? { kind: "current", label: "Your current plan", disabled: true }
      : { kind: "checkout", label: `Choose ${name}`, disabled: price === null });

  const isCurrent = resolvedAction.kind === "current";
  const isFeatured = config.plan === "DIAMOND";
  const buttonDisabled = resolvedAction.disabled || loading;
  const headingId = `fk-sub-plan-${config.plan.toLowerCase()}`;
  const hintId = resolvedAction.hint ? `${headingId}-hint` : undefined;

  const classes = [
    "fk-sub-plan",
    `fk-sub-plan--${theme.key}`,
    isCurrent ? "is-current" : "",
    isFeatured ? "is-featured" : "",
    config.popular ? "is-popular" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes} aria-labelledby={headingId}>
      <div className="fk-sub-plan__media">
        <img
          src={theme.image}
          alt={theme.imageAlt}
          width={266}
          height={156}
          loading="lazy"
          decoding="async"
        />

        {(isCurrent || config.popular || isFeatured) && (
          <div className="fk-sub-plan__flags">
            {isCurrent && <span className="fk-sub-flag fk-sub-flag--current">Current plan</span>}
            {!isCurrent && config.popular && <span className="fk-sub-flag fk-sub-flag--popular">Most popular</span>}
            {!isCurrent && !config.popular && isFeatured && (
              <span className="fk-sub-flag fk-sub-flag--featured">Top tier</span>
            )}
          </div>
        )}
      </div>

      <div className="fk-sub-plan__body">
        <span className="fk-sub-plan__level">Level {rank}</span>

        <h3 id={headingId} className="fk-sub-plan__name">
          {name}
        </h3>

        {config.description?.trim() ? (
          <p className="fk-sub-plan__description">{config.description.trim()}</p>
        ) : null}

        <div className="fk-sub-plan__price" aria-live="polite">
          {price === null ? (
            <span className="fk-sub-plan__amount fk-sub-plan__amount--muted">Price unavailable</span>
          ) : price === 0 ? (
            <>
              <span className="fk-sub-plan__amount">Free</span>
              <span className="fk-sub-plan__interval">forever</span>
            </>
          ) : (
            <>
              <span className="fk-sub-plan__amount">{formatMoney(price, currency)}</span>
              <span className="fk-sub-plan__interval">/{intervalWord}</span>
            </>
          )}
        </div>

        <p className="fk-sub-plan__billing-note">
          {price === null
            ? " "
            : price === 0
              ? "No payment required"
              : savings
                ? `Billed yearly · save ${savings}% vs monthly`
                : billingInterval === "YEARLY"
                  ? "Billed once per year"
                  : "Billed once per month"}
        </p>

        {features.length > 0 ? (
          <ul className="fk-sub-plan__features" aria-label={`${name} features`}>
            {features.map((feature, index) => (
              <li
                key={`${config.plan}-${index}-${feature.name}`}
                className={feature.included ? "is-included" : "is-excluded"}
              >
                <span className="fk-sub-plan__feature-icon" aria-hidden="true">
                  {feature.included ? <Check size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
                </span>
                <span className="fk-sub-plan__feature-text">
                  {!feature.included && <span className="fk-sub-sr-only">Not included: </span>}
                  {feature.name}
                  {feature.description && <small>{feature.description}</small>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fk-sub-plan__features-empty">Plan features are being updated.</p>
        )}

        <div className="fk-sub-plan__footer">
          <button
            type="button"
            className={`fk-sub-plan__button fk-sub-plan__button--${resolvedAction.kind}`}
            disabled={buttonDisabled}
            aria-describedby={hintId}
            aria-busy={pending || undefined}
            onClick={() => {
              if (!buttonDisabled) onSelect(config.plan);
            }}
          >
            {pending ? (
              <>
                <span className="fk-sub-spinner" aria-hidden="true" />
                Opening checkout…
              </>
            ) : (
              resolvedAction.label
            )}
          </button>

          {resolvedAction.hint && (
            <p id={hintId} className="fk-sub-plan__hint">
              {resolvedAction.hint}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
