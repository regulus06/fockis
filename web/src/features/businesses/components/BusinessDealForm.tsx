import React, {
  FormEvent,
  useEffect,
  useState,
} from "react";

import type {
  BusinessDeal,
} from "../types/business.types";

import "../styles/BusinessDealForm.scss";

export interface BusinessDealFormValues {
  title: string;
  description: string;
  discount: string;
  couponCode: string;
  expiresAt: string;
  active: boolean;
}

interface BusinessDealFormProps {
  deal?: BusinessDeal | null;

  loading?: boolean;

  onSubmit: (
    values: BusinessDealFormValues,
  ) => void | Promise<void>;

  onCancel?: () => void;
}

const EMPTY_FORM: BusinessDealFormValues = {
  title: "",
  description: "",
  discount: "",
  couponCode: "",
  expiresAt: "",
  active: true,
};

function createInitialValues(
  deal?: BusinessDeal | null,
): BusinessDealFormValues {
  if (!deal) {
    return {
      ...EMPTY_FORM,
    };
  }

  let expiresAt = "";

  if (deal.expiresAt) {
    const date = new Date(deal.expiresAt);

    if (!Number.isNaN(date.getTime())) {
      const year =
        date.getFullYear();

      const month = String(
        date.getMonth() + 1,
      ).padStart(2, "0");

      const day = String(
        date.getDate(),
      ).padStart(2, "0");

      expiresAt =
        `${year}-${month}-${day}`;
    }
  }

  return {
    title: deal.title || "",

    description:
      deal.description || "",

    discount:
      deal.discount || "",

    couponCode:
      deal.couponCode || "",

    expiresAt,

    active:
      deal.active !== false,
  };
}

export default function BusinessDealForm({
  deal,
  loading = false,
  onSubmit,
  onCancel,
}: BusinessDealFormProps) {
  const [form, setForm] =
    useState<BusinessDealFormValues>(
      createInitialValues(deal),
    );

  const [error, setError] =
    useState("");

  useEffect(() => {
    setForm(
      createInitialValues(deal),
    );

    setError("");
  }, [deal]);

  const updateField = <
    K extends keyof BusinessDealFormValues
  >(
    field: K,
    value: BusinessDealFormValues[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    // ================================================================
    // VALIDATION
    // ================================================================

    if (!form.title.trim()) {
      setError(
        "Deal title is required.",
      );

      return;
    }

    if (
      !form.discount.trim() &&
      !form.couponCode.trim()
    ) {
      setError(
        "Enter a discount or coupon code.",
      );

      return;
    }

    // ================================================================
    // EXPIRATION VALIDATION
    // ================================================================

    if (form.expiresAt) {
      const expiration =
        new Date(
          `${form.expiresAt}T23:59:59`,
        );

      if (
        Number.isNaN(
          expiration.getTime(),
        )
      ) {
        setError(
          "Please enter a valid expiration date.",
        );

        return;
      }

      if (
        expiration.getTime() <
        Date.now()
      ) {
        setError(
          "The deal expiration date must be in the future.",
        );

        return;
      }
    }

    // ================================================================
    // SUBMIT
    // ================================================================

    try {
      await onSubmit({
        title:
          form.title.trim(),

        description:
          form.description.trim(),

        discount:
          form.discount.trim(),

        couponCode:
          form.couponCode.trim(),

        expiresAt:
          form.expiresAt,

        active:
          form.active,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save deal.",
      );
    }
  };

  return (
    <form
      className="fk-business-deal-form"
      onSubmit={handleSubmit}
      noValidate
    >
      {/* ============================================================
          HEADER
      ============================================================ */}

      <div className="fk-business-deal-form__header">
        <div className="fk-business-deal-form__icon">
          🎁
        </div>

        <div>
          <span className="fk-business-deal-form__eyebrow">
            SPECIAL DEAL
          </span>

          <h2>
            {deal
              ? "Edit Special Deal"
              : "Create Special Deal"}
          </h2>

          <p>
            Give customers a reason to visit
            your business.
          </p>
        </div>
      </div>

      {/* ============================================================
          ERROR
      ============================================================ */}

      {error && (
        <div
          className="fk-business-deal-form__error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ============================================================
          DEAL INFORMATION
      ============================================================ */}

      <section className="fk-business-deal-form__section">
        <label>
          <span>
            Deal Title *
          </span>

          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              updateField(
                "title",
                event.target.value,
              )
            }
            placeholder="20% Off Your First Service"
            maxLength={150}
            required
          />
        </label>

        <label>
          <span>
            Deal Description
          </span>

          <textarea
            value={form.description}
            onChange={(event) =>
              updateField(
                "description",
                event.target.value,
              )
            }
            placeholder="Explain what customers receive..."
            rows={4}
            maxLength={500}
          />
        </label>
      </section>

      {/* ============================================================
          OFFER
      ============================================================ */}

      <section className="fk-business-deal-form__section">
        <h3>
          Offer
        </h3>

        <div className="fk-business-deal-form__grid">
          {/* DISCOUNT */}

          <label>
            <span>
              Discount
            </span>

            <input
              type="text"
              value={form.discount}
              onChange={(event) =>
                updateField(
                  "discount",
                  event.target.value,
                )
              }
              placeholder="20% OFF"
              maxLength={80}
            />

            <small>
              Example: 20% OFF, $50 OFF,
              Buy 1 Get 1
            </small>
          </label>

          {/* COUPON */}

          <label>
            <span>
              Coupon Code
            </span>

            <input
              type="text"
              value={form.couponCode}
              onChange={(event) =>
                updateField(
                  "couponCode",
                  event.target.value,
                )
              }
              placeholder="FOCKIS20"
              maxLength={100}
            />

            <small>
              Optional code customers can
              use for the offer.
            </small>
          </label>
        </div>
      </section>

      {/* ============================================================
          EXPIRATION
      ============================================================ */}

      <section className="fk-business-deal-form__section">
        <label>
          <span>
            Expiration Date *
          </span>

          <input
            type="date"
            value={form.expiresAt}
            onChange={(event) =>
              updateField(
                "expiresAt",
                event.target.value,
              )
            }
            required
          />

          <small>
            Choose when this special deal
            expires.
          </small>
        </label>
      </section>

      {/* ============================================================
          ACTIVE STATUS
      ============================================================ */}

      <section className="fk-business-deal-form__section">
        <label className="fk-business-deal-form__switch">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              updateField(
                "active",
                event.target.checked,
              )
            }
          />

          <span>
            <strong>
              Deal is active
            </strong>

            <small>
              Customers can see this deal
              in Business Spotlight.
            </small>
          </span>
        </label>
      </section>

      {/* ============================================================
          ACTIONS
      ============================================================ */}

      <div className="fk-business-deal-form__actions">
        {onCancel && (
          <button
            type="button"
            className="fk-business-deal-form__cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          className="fk-business-deal-form__submit"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : deal
              ? "Save Deal"
              : "Create Deal"}
        </button>
      </div>
    </form>
  );
}