import {
  useEffect,
  useState,
} from "react";

import type {
  ContentAccessType,
  ContentMonetization,
  ContentPaymentMethod,
} from "../types/contentMonetization.types";

interface MonetizationSettingsModalProps {
  open: boolean;

  initialValue?: ContentMonetization;

  contentType?: "photo" | "video" | "music";

  onClose: () => void;

  onSave: (
    settings: ContentMonetization,
  ) => void;
}

const DEFAULT_SETTINGS: ContentMonetization = {
  enabled: false,

  accessType: "everyone",

  paymentMethod: "coins",

  watchPrice: 2.99,

  listenPrice: 2.99,

  downloadEnabled: false,

  downloadIncluded: true,

  downloadPrice: 1.99,

  previewEnabled: true,

  previewDuration: 10,
};

export default function MonetizationSettingsModal({
  open,
  initialValue,
  contentType = "video",
  onClose,
  onSave,
}: MonetizationSettingsModalProps) {
  const [settings, setSettings] =
    useState<ContentMonetization>(
      initialValue ??
        DEFAULT_SETTINGS,
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    setSettings(
      initialValue ??
        DEFAULT_SETTINGS,
    );
  }, [
    open,
    initialValue,
  ]);

  if (!open) {
    return null;
  }

  const update = <
    K extends keyof ContentMonetization
  >(
    key: K,
    value: ContentMonetization[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleAccessTypeChange = (
    value: ContentAccessType,
  ) => {
    update(
      "accessType",
      value,
    );

    if (value === "everyone") {
      update(
        "enabled",
        false,
      );
    } else {
      update(
        "enabled",
        true,
      );
    }
  };

  const handleSave = () => {
    onSave({
      ...settings,

      enabled:
        settings.accessType !==
        "everyone",
    });
  };

  const priceLabel =
    contentType === "music"
      ? "Listen price"
      : "Watch price";

  return (
    <div
      className="fk-monetization-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fk-monetization-title"
    >
      <div className="fk-monetization-modal">
        {/* HEADER */}

        <div className="fk-monetization-header">
          <div>
            <span className="fk-monetization-eyebrow">
              FOCKIS MONETIZATION
            </span>

            <h2 id="fk-monetization-title">
              Monetize this content
            </h2>

            <p>
              Choose who can access
              your content and how
              you want to earn.
            </p>
          </div>

          <button
            type="button"
            className="fk-monetization-close"
            onClick={onClose}
            aria-label="Close monetization settings"
          >
            ×
          </button>
        </div>

        {/* BODY */}

        <div className="fk-monetization-body">
          {/* ENABLE */}

          <div className="fk-monetization-enable">
            <div>
              <strong>
                Monetize this post
              </strong>

              <span>
                Allow this content
                to generate creator
                earnings.
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={
                settings.enabled
              }
              className={[
                "fk-monetization-switch",
                settings.enabled
                  ? "is-active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                update(
                  "enabled",
                  !settings.enabled,
                )
              }
            >
              <span />
            </button>
          </div>

          {/* ACCESS */}

          <section className="fk-monetization-section">
            <div className="fk-monetization-section-heading">
              <strong>
                Subscriber Access
              </strong>

              <span>
                Choose who can access
                this content.
              </span>
            </div>

            <div className="fk-monetization-options">
              <label
                className={[
                  "fk-monetization-option",
                  settings.accessType ===
                  "everyone"
                    ? "is-selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="content-access"
                  checked={
                    settings.accessType ===
                    "everyone"
                  }
                  onChange={() =>
                    handleAccessTypeChange(
                      "everyone",
                    )
                  }
                />

                <span className="fk-monetization-radio" />

                <span>
                  <strong>
                    Everyone
                  </strong>

                  <small>
                    Anyone can access
                    this content for
                    free.
                  </small>
                </span>
              </label>

              <label
                className={[
                  "fk-monetization-option",
                  settings.accessType ===
                  "subscribers"
                    ? "is-selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="content-access"
                  checked={
                    settings.accessType ===
                    "subscribers"
                  }
                  onChange={() =>
                    handleAccessTypeChange(
                      "subscribers",
                    )
                  }
                />

                <span className="fk-monetization-radio" />

                <span>
                  <strong>
                    Subscribers only
                  </strong>

                  <small>
                    Only your active
                    subscribers can
                    access it.
                  </small>
                </span>
              </label>

              <label
                className={[
                  "fk-monetization-option",
                  settings.accessType ===
                  "pay_to_unlock"
                    ? "is-selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="content-access"
                  checked={
                    settings.accessType ===
                    "pay_to_unlock"
                  }
                  onChange={() =>
                    handleAccessTypeChange(
                      "pay_to_unlock",
                    )
                  }
                />

                <span className="fk-monetization-radio" />

                <span>
                  <strong>
                    Pay to unlock
                  </strong>

                  <small>
                    Users pay to unlock
                    this content.
                  </small>
                </span>
              </label>
            </div>
          </section>

          {/* PAYMENT */}

          {settings.accessType ===
            "pay_to_unlock" && (
            <>
              <section className="fk-monetization-section">
                <div className="fk-monetization-section-heading">
                  <strong>
                    Payment
                  </strong>

                  <span>
                    Choose how your
                    audience pays.
                  </span>
                </div>

                <div className="fk-monetization-payment-methods">
                  <button
                    type="button"
                    className={
                      settings.paymentMethod ===
                      "coins"
                        ? "is-selected"
                        : ""
                    }
                    onClick={() =>
                      update(
                        "paymentMethod",
                        "coins" as ContentPaymentMethod,
                      )
                    }
                  >
                    🪙
                    <span>
                      Fockis Coins
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      settings.paymentMethod ===
                      "stripe"
                        ? "is-selected"
                        : ""
                    }
                    onClick={() =>
                      update(
                        "paymentMethod",
                        "stripe" as ContentPaymentMethod,
                      )
                    }
                  >
                    💳
                    <span>
                      Card
                    </span>
                  </button>
                </div>
              </section>

              <section className="fk-monetization-section">
                <label className="fk-monetization-price">
                  <span>
                    {priceLabel}
                  </span>

                  <div>
                    <span>
                      {settings.paymentMethod ===
                      "coins"
                        ? "🪙"
                        : "$"}
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        contentType ===
                        "music"
                          ? settings.listenPrice
                          : settings.watchPrice
                      }
                      onChange={(event) => {
                        const value =
                          Number(
                            event.target
                              .value,
                          );

                        if (
                          contentType ===
                          "music"
                        ) {
                          update(
                            "listenPrice",
                            value,
                          );
                        } else {
                          update(
                            "watchPrice",
                            value,
                          );
                        }
                      }}
                    />
                  </div>
                </label>
              </section>
            </>
          )}

          {/* DOWNLOAD */}

          <section className="fk-monetization-section">
            <div className="fk-monetization-toggle-row">
              <div>
                <strong>
                  Download
                </strong>

                <span>
                  Allow users to download
                  this content.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  settings.downloadEnabled
                }
                onChange={(event) =>
                  update(
                    "downloadEnabled",
                    event.target.checked,
                  )
                }
              />
            </div>

            {settings.downloadEnabled &&
              settings.accessType ===
                "pay_to_unlock" && (
                <div className="fk-monetization-download-options">
                  <label>
                    <input
                      type="radio"
                      name="download-mode"
                      checked={
                        settings.downloadIncluded
                      }
                      onChange={() =>
                        update(
                          "downloadIncluded",
                          true,
                        )
                      }
                    />

                    <span>
                      Include with
                      purchase
                    </span>
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="download-mode"
                      checked={
                        !settings.downloadIncluded
                      }
                      onChange={() =>
                        update(
                          "downloadIncluded",
                          false,
                        )
                      }
                    />

                    <span>
                      Separate download
                      purchase
                    </span>
                  </label>

                  {!settings.downloadIncluded && (
                    <div className="fk-monetization-download-price">
                      <span>
                        Download price
                      </span>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          settings.downloadPrice
                        }
                        onChange={(event) =>
                          update(
                            "downloadPrice",
                            Number(
                              event.target
                                .value,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              )}
          </section>

          {/* PREVIEW */}

          <section className="fk-monetization-section">
            <div className="fk-monetization-toggle-row">
              <div>
                <strong>
                  Preview
                </strong>

                <span>
                  Show a preview before
                  users unlock the content.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  settings.previewEnabled
                }
                onChange={(event) =>
                  update(
                    "previewEnabled",
                    event.target.checked,
                  )
                }
              />
            </div>

            {settings.previewEnabled && (
              <div className="fk-monetization-preview-duration">
                <label>
                  Preview duration
                </label>

                <select
                  value={
                    settings.previewDuration
                  }
                  onChange={(event) =>
                    update(
                      "previewDuration",
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                >
                  <option value={5}>
                    5 seconds
                  </option>

                  <option value={10}>
                    10 seconds
                  </option>

                  <option value={15}>
                    15 seconds
                  </option>

                  <option value={30}>
                    30 seconds
                  </option>
                </select>
              </div>
            )}
          </section>
        </div>

        {/* FOOTER */}

        <div className="fk-monetization-footer">
          <button
            type="button"
            className="fk-monetization-cancel"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="fk-monetization-save"
            onClick={handleSave}
          >
            Save Monetization
          </button>
        </div>
      </div>
    </div>
  );
}