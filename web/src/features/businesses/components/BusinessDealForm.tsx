import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { AlertCircle, Loader2, Tag } from "lucide-react";

import type { BusinessDeal } from "../types/business.types";

import "../styles/BusinessUi.scss";
import "../styles/BusinessDealForm.scss";


/* ============================================================================
   BUSINESS DEAL FORM

   Creates or edits a deal (POST/PATCH /businesses/:id/deals[/:dealId]).
============================================================================ */

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
  onSubmit: (values: BusinessDealFormValues) => void | Promise<void>;
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

function toDateInput(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function todayInput(): string {
  return toDateInput(new Date().toISOString());
}

function createInitialValues(deal?: BusinessDeal | null): BusinessDealFormValues {
  if (!deal) {
    return { ...EMPTY_FORM };
  }

  return {
    title: deal.title || "",
    description: deal.description || "",
    discount: deal.discount || "",
    couponCode: deal.couponCode || "",
    expiresAt: toDateInput(deal.expiresAt),
    active: deal.active !== false,
  };
}

type Errors = Partial<Record<keyof BusinessDealFormValues | "offer", string>>;

export default function BusinessDealForm({
  deal,
  loading = false,
  onSubmit,
  onCancel,
}: BusinessDealFormProps) {
  const [form, setForm] = useState<BusinessDealFormValues>(() => createInitialValues(deal));
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const busy = loading || submitting;

  useEffect(() => {
    setForm(createInitialValues(deal));
    setErrors({});
    setSubmitError("");
  }, [deal]);

  const updateField = <K extends keyof BusinessDealFormValues>(
    field: K,
    value: BusinessDealFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, offer: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};

    if (!form.title.trim()) {
      next.title = "Give the deal a title.";
    }

    if (!form.discount.trim() && !form.couponCode.trim()) {
      next.offer = "Enter a discount, a coupon code, or both.";
    }

    if (!form.expiresAt) {
      next.expiresAt = "Choose when the deal ends.";
    } else {
      const expiration = new Date(`${form.expiresAt}T23:59:59`);

      if (Number.isNaN(expiration.getTime())) {
        next.expiresAt = "Enter a valid date.";
      } else if (expiration.getTime() < Date.now()) {
        next.expiresAt = "The end date must be today or later.";
      }
    }

    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    setSubmitError("");

    const next = validate();
    setErrors(next);

    if (Object.values(next).some(Boolean)) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        discount: form.discount.trim(),
        couponCode: form.couponCode.trim(),
        expiresAt: form.expiresAt,
        active: form.active,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to save the deal.");
    } finally {
      setSubmitting(false);
    }
  };

  const errorText = (key: keyof Errors) =>
    errors[key] ? (
      <span className="fkb-field__error" id={`fkb-deal-err-${key}`}>
        <AlertCircle size={14} aria-hidden="true" />
        {errors[key]}
      </span>
    ) : null;

  const invalid = (key: keyof Errors) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `fkb-deal-err-${key}` : undefined,
  });

  return (
    <form className="fkb fkb-deal-form" onSubmit={handleSubmit} noValidate aria-busy={busy}>
      <header className="fkb-deal-form__header">
        <span className="fkb-deal-form__icon" aria-hidden="true">
          <Tag size={20} />
        </span>
        <div>
          <h2>{deal ? "Edit deal" : "New deal"}</h2>
          <p>Active deals appear on your business profile, cards and the Spotlight deals rail until they end.</p>
        </div>
      </header>

      {submitError && (
        <div className="fkb-alert fkb-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="fkb-deal-form__grid">
        <div className="fkb-field fkb-field--full">
          <label className="fkb-field__label" htmlFor="fkb-deal-title">
            Title<span className="fkb-field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="fkb-deal-title"
            className="fkb-input"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="20% off your first service"
            maxLength={150}
            required
            {...invalid("title")}
          />
          {errorText("title")}
        </div>

        <div className="fkb-field fkb-field--full">
          <label className="fkb-field__label" htmlFor="fkb-deal-description">
            Details
          </label>
          <textarea
            id="fkb-deal-description"
            className="fkb-input"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="What customers get and any conditions."
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="fkb-field">
          <label className="fkb-field__label" htmlFor="fkb-deal-discount">
            Discount
          </label>
          <input
            id="fkb-deal-discount"
            className="fkb-input"
            value={form.discount}
            onChange={(event) => updateField("discount", event.target.value)}
            placeholder="20% OFF"
            maxLength={80}
            {...invalid("offer")}
          />
          <span className="fkb-field__hint">For example: 20% OFF, $50 OFF, Buy 1 Get 1.</span>
        </div>

        <div className="fkb-field">
          <label className="fkb-field__label" htmlFor="fkb-deal-coupon">
            Coupon code
          </label>
          <input
            id="fkb-deal-coupon"
            className="fkb-input fkb-deal-form__code"
            value={form.couponCode}
            onChange={(event) => updateField("couponCode", event.target.value.toUpperCase())}
            placeholder="FOCKIS20"
            maxLength={100}
            autoComplete="off"
            {...invalid("offer")}
          />
          <span className="fkb-field__hint">Optional. Customers can copy it from your profile.</span>
        </div>

        {errors.offer && <div className="fkb-field--full">{errorText("offer")}</div>}

        <div className="fkb-field">
          <label className="fkb-field__label" htmlFor="fkb-deal-expires">
            Ends on<span className="fkb-field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="fkb-deal-expires"
            className="fkb-input"
            type="date"
            min={todayInput()}
            value={form.expiresAt}
            onChange={(event) => updateField("expiresAt", event.target.value)}
            required
            {...invalid("expiresAt")}
          />
          {errorText("expiresAt")}
          <span className="fkb-field__hint">The deal stays live through the end of this day.</span>
        </div>

        <label className="fkb-toggle fkb-deal-form__active">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => updateField("active", event.target.checked)}
          />
          <span>
            <strong>Deal is active</strong>
            <small>Turn off to pause the deal without deleting it.</small>
          </span>
        </label>
      </div>

      <div className="fkb-deal-form__actions">
        {onCancel && (
          <button type="button" className="fkb-btn fkb-btn--secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="submit" className="fkb-btn fkb-btn--primary" disabled={busy}>
          {busy && <Loader2 size={16} className="fkb-spin" aria-hidden="true" />}
          {busy ? "Saving…" : deal ? "Save deal" : "Create deal"}
        </button>
      </div>
    </form>
  );
}
