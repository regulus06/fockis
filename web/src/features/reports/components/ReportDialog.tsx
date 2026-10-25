import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, Flag, Loader2, ShieldCheck, X } from "lucide-react";

import {
  ACCOUNT_REASONS,
  DESCRIPTION_MAX,
  POST_REASONS,
  type ReasonOption,
  type ReportReason,
  type ReportTargetType,
} from "../reportTypes";
import { isAlreadyReported, reportErrorMessage, submitReport } from "../services/reportsApi";

import "../styles/ReportDialog.scss";

export interface ReportDialogProps {
  open: boolean;
  targetType: ReportTargetType;
  targetId: string;
  /** Shown in the title, e.g. the account's name. */
  targetName?: string;
  onClose: () => void;
  onReported?: () => void;
}

type Step = "reason" | "details" | "done";

/**
 * Shared Report Post / Report Account dialog. The person being reported
 * is never told who reported them, and the reporter never sees report
 * counts.
 */
export default function ReportDialog({ open, targetType, targetId, targetName, onClose, onReported }: ReportDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<ReasonOption | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [alreadyReported, setAlreadyReported] = useState(false);

  const reasons = targetType === "post" ? POST_REASONS : ACCOUNT_REASONS;
  const noun = targetType === "post" ? "post" : "account";
  const needsDetails = reason?.value === "other";
  const trimmed = description.trim();
  const canSubmit = Boolean(reason) && (!needsDetails || trimmed.length >= 5) && !submitting;

  // Reset every time the dialog opens.
  useEffect(() => {
    if (!open) return;

    setStep("reason");
    setReason(null);
    setDescription("");
    setError("");
    setSubmitting(false);
    setAlreadyReported(false);
  }, [open, targetId, targetType]);

  // Escape to close, lock page scroll, move focus into the dialog.
  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    });

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }

    window.addEventListener("keydown", onKey);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open, onClose, submitting]);

  if (!open || typeof document === "undefined") return null;

  function chooseReason(option: ReasonOption) {
    setReason(option);
    setError("");
    setStep("details");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!reason || !canSubmit) return;

    setSubmitting(true);
    setError("");

    try {
      await submitReport({ targetType, targetId, reason: reason.value as ReportReason, description: trimmed });
      setStep("done");
      onReported?.();
    } catch (caught) {
      if (isAlreadyReported(caught)) {
        setAlreadyReported(true);
        setStep("done");
      } else {
        setError(reportErrorMessage(caught, "We couldn't send your report. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    step === "done"
      ? alreadyReported
        ? "Already reported"
        : "Thanks for reporting"
      : targetType === "post"
        ? "Report post"
        : `Report ${targetName ? targetName : "account"}`;

  return createPortal(
    <div
      className="fkr-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="fkr-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="fkr-dialog__header">
          {step === "details" ? (
            <button type="button" className="fkr-icon-btn" onClick={() => setStep("reason")} aria-label="Back to reasons" disabled={submitting}>
              <ChevronLeft size={20} />
            </button>
          ) : (
            <span className="fkr-dialog__badge" aria-hidden="true">
              <Flag size={16} />
            </span>
          )}

          <h2 id={titleId} className="fkr-dialog__title">
            {title}
          </h2>

          <button type="button" className="fkr-icon-btn" onClick={onClose} aria-label="Close" disabled={submitting}>
            <X size={20} />
          </button>
        </header>

        {step === "reason" && (
          <div className="fkr-dialog__body">
            <p id={descriptionId} className="fkr-dialog__lead">
              Why are you reporting this {noun}? Your report is anonymous — the {targetType === "post" ? "author" : "account owner"} won't know who reported them.
            </p>

            <ul className="fkr-reasons" role="list">
              {reasons.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className="fkr-reason"
                    onClick={() => chooseReason(option)}
                    data-autofocus={index === 0 ? "" : undefined}
                  >
                    <span className="fkr-reason__text">
                      <span className="fkr-reason__label">{option.label}</span>
                      <span className="fkr-reason__hint">{option.hint}</span>
                    </span>
                    <ChevronRight size={18} className="fkr-reason__chevron" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <p className="fkr-dialog__note">
              If someone is in immediate danger, contact local emergency services first.
            </p>
          </div>
        )}

        {step === "details" && reason && (
          <form className="fkr-dialog__body" onSubmit={handleSubmit} noValidate>
            <p id={descriptionId} className="fkr-dialog__lead">
              You're reporting this {noun} for <strong>{reason.label.toLowerCase()}</strong>.
            </p>

            <label className="fkr-field">
              <span className="fkr-field__label">
                {needsDetails ? "Tell us what's wrong" : "Add details (optional)"}
              </span>
              <textarea
                className="fkr-field__input"
                value={description}
                maxLength={DESCRIPTION_MAX}
                rows={4}
                data-autofocus=""
                placeholder={needsDetails ? "Describe the problem so our team can review it." : "Anything that helps our team understand the problem."}
                onChange={(event) => setDescription(event.target.value)}
                aria-invalid={needsDetails && trimmed.length > 0 && trimmed.length < 5 ? true : undefined}
              />
              <span className="fkr-field__meta">
                <span>{needsDetails && trimmed.length < 5 ? "At least 5 characters" : ""}</span>
                <span>
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </span>
            </label>

            {error && (
              <div className="fkr-alert" role="alert">
                {error}
              </div>
            )}

            <div className="fkr-dialog__actions">
              <button type="button" className="fkr-btn fkr-btn--ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="fkr-btn fkr-btn--primary" disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="fkr-spin" aria-hidden="true" /> Sending…
                  </>
                ) : (
                  "Submit report"
                )}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="fkr-dialog__body fkr-dialog__body--center">
            <span className={`fkr-done-icon${alreadyReported ? " is-info" : ""}`} aria-hidden="true">
              {alreadyReported ? <ShieldCheck size={30} /> : <CheckCircle2 size={30} />}
            </span>

            <p id={descriptionId} className="fkr-dialog__lead">
              {alreadyReported
                ? `You've already reported this ${noun}. Our team will review it.`
                : "Thanks for letting us know. Our team will review your report against the Community Guidelines."}
            </p>

            <p className="fkr-dialog__note">
              Reports are reviewed by people. A report doesn't remove content or restrict an account on its own.
            </p>

            <div className="fkr-dialog__actions fkr-dialog__actions--center">
              <button type="button" className="fkr-btn fkr-btn--primary" onClick={onClose} data-autofocus="">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
