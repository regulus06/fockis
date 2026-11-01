import { Check, Radio, Square, X } from "lucide-react";

import type {
  Analytics,
  ConnectionQuality,
  DeviceState,
  StreamInfo,
} from "../../types";

import { Button } from "../ui/Primitives";
import {
  formatCount,
  formatDuration,
} from "../../utils";

/* ============================================================================
   GO LIVE MODAL
============================================================================ */

export function GoLiveModal({
  closeGoLiveModal,
  confirmGoLive,
  devices,
  connection,
  streamInfo,
  setStreamInfo,
}: {
  closeGoLiveModal: () => void;
  confirmGoLive: () => void;
  devices: DeviceState;
  connection: ConnectionQuality;
  streamInfo: StreamInfo;
  setStreamInfo: (info: StreamInfo) => void;
}) {
  const checks = [
    {
      label: "Camera",
      ok: devices.camera === "connected",
      value:
        devices.camera === "connected"
          ? "Connected"
          : "Not connected",
    },
    {
      label: "Microphone",
      ok:
        devices.microphone === "connected",
      value:
        devices.microphone === "connected"
          ? "Connected"
          : "Not connected",
    },
    {
      label: "Internet",
      ok: connection !== "offline",
      value:
        connection === "excellent"
          ? "Excellent"
          : connection === "good"
            ? "Good"
            : connection === "offline"
              ? "Offline"
              : "Unstable",
    },
  ];

  const allOk =
    checks.every((check) => check.ok) &&
    streamInfo.title.trim().length > 0;

  const updateStreamInfo = (
    changes: Partial<StreamInfo>,
  ) => {
    setStreamInfo({
      ...streamInfo,
      ...changes,
    });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={closeGoLiveModal}
    >
      <div
        className="modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        onKeyDown={(event) =>
          // ------------------------------------------------------------
          // Stop keydown from bubbling past the modal.
          //
          // If something elsewhere in the app (a global hotkey handler,
          // a mic-mute shortcut, etc.) is listening for keydown on
          // document/window and calling preventDefault(), it can swallow
          // keystrokes meant for inputs inside this modal before React
          // ever gets to update state. Stopping propagation here means
          // any such listener attached via normal (bubble-phase)
          // addEventListener will never see these events, so typing in
          // the fields below is protected regardless of what else is
          // listening on the page.
          //
          // NOTE: this does NOT protect against a listener registered
          // with the capture flag (addEventListener("keydown", fn, true)),
          // since capture-phase listeners fire before this handler does.
          // If typing is still blocked after this change, that's the
          // remaining thing to look for.
          // ------------------------------------------------------------
          event.stopPropagation()
        }
      >
        {/* ================================================================
            ICON
        ================================================================ */}

        <div className="modal__icon-badge modal__icon-badge--live">
          <Radio size={20} />
        </div>

        {/* ================================================================
            HEADER
        ================================================================ */}

        <h2 className="modal__title">
          Ready to go live?
        </h2>

        <p className="modal__subtitle">
          Viewers will be able to find and join
          your stream immediately.
        </p>

        {/* ================================================================
            CHECKS + FORM
        ================================================================ */}

        <div className="modal__checklist">

          {/* DEVICE CHECKS */}

          {checks.map((check) => (
            <div
              className="modal__check-row"
              key={check.label}
            >
              <span className="modal__check-label">
                {check.label}
              </span>

              <span
                className={`modal__check-value ${
                  check.ok
                    ? "modal__check-value--ok"
                    : "modal__check-value--bad"
                }`}
              >
                {check.ok ? (
                  <Check size={13} />
                ) : (
                  <X size={13} />
                )}

                {check.value}
              </span>
            </div>
          ))}

          <div className="modal__divider" />

          {/* ==============================================================
              TITLE
          ============================================================== */}

          <div className="field">
            <label
              className="field__label"
              htmlFor="live-stream-title"
            >
              Title
            </label>

            <input
              id="live-stream-title"
              name="live-stream-title"
              className="field__input"
              type="text"
              value={streamInfo.title ?? ""}
              maxLength={100}
              autoFocus
              autoComplete="off"
              onChange={(event) => {
                updateStreamInfo({
                  title: event.target.value,
                });
              }}
              placeholder="What are you going live about?"
            />

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                opacity: 0.65,
                textAlign: "right",
              }}
            >
              {(streamInfo.title ?? "").length}/100
            </div>
          </div>

          {/* ==============================================================
              DESCRIPTION
          ============================================================== */}

          <div className="field">
            <label
              className="field__label"
              htmlFor="live-stream-description"
            >
              Description
            </label>

            <textarea
              id="live-stream-description"
              name="live-stream-description"
              className="field__textarea"
              value={
                streamInfo.description ?? ""
              }
              rows={3}
              onChange={(event) => {
                updateStreamInfo({
                  description:
                    event.target.value,
                });
              }}
              placeholder="Tell viewers what this LIVE is about..."
            />
          </div>

          {/* ==============================================================
              VISIBILITY
          ============================================================== */}

          <div className="field">
            <label
              className="field__label"
              htmlFor="live-stream-visibility"
            >
              Visibility
            </label>

            <select
              id="live-stream-visibility"
              name="live-stream-visibility"
              className="field__select"
              value={streamInfo.visibility}
              onChange={(event) => {
                updateStreamInfo({
                  visibility:
                    event.target
                      .value as StreamInfo["visibility"],
                });
              }}
            >
              <option value="public">
                Public
              </option>

              <option value="followers">
                Followers only
              </option>

              <option value="private">
                Private
              </option>
            </select>
          </div>
        </div>

        {/* ================================================================
            ACTIONS
        ================================================================ */}

        <div className="modal__actions">
          <Button
            variant="secondary"
            fullWidth
            onClick={closeGoLiveModal}
          >
            Cancel
          </Button>

          <Button
            variant="live"
            fullWidth
            onClick={confirmGoLive}
            disabled={!allOk}
          >
            Go live
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   END LIVE MODAL
============================================================================ */

export function EndLiveModal({
  closeEndLiveModal,
  confirmEndLive,
  analytics,
  elapsedSeconds,
}: {
  closeEndLiveModal: () => void;
  confirmEndLive: () => void;
  analytics: Analytics;
  elapsedSeconds: number;
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={closeEndLiveModal}
    >
      <div
        className="modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        onKeyDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* ================================================================
            ICON
        ================================================================ */}

        <div className="modal__icon-badge modal__icon-badge--end">
          <Square
            size={18}
            fill="currentColor"
          />
        </div>

        {/* ================================================================
            HEADER
        ================================================================ */}

        <h2 className="modal__title">
          End your live stream?
        </h2>

        <p className="modal__subtitle">
          Viewers will be disconnected and your
          stream will stop broadcasting. This
          can't be undone.
        </p>

        {/* ================================================================
            ANALYTICS
        ================================================================ */}

        <div className="modal__checklist">

          <div className="modal__check-row">
            <span className="modal__check-label">
              Duration
            </span>

            <span className="modal__check-plain">
              {formatDuration(
                elapsedSeconds,
              )}
            </span>
          </div>

          <div className="modal__check-row">
            <span className="modal__check-label">
              Current viewers
            </span>

            <span className="modal__check-plain">
              {formatCount(
                analytics.currentViewers,
              )}
            </span>
          </div>

          <div className="modal__check-row">
            <span className="modal__check-label">
              Peak viewers
            </span>

            <span className="modal__check-plain">
              {formatCount(
                analytics.peakViewers,
              )}
            </span>
          </div>

        </div>

        {/* ================================================================
            ACTIONS
        ================================================================ */}

        <div className="modal__actions">
          <Button
            variant="secondary"
            fullWidth
            onClick={closeEndLiveModal}
          >
            Keep streaming
          </Button>

          <Button
            variant="danger"
            fullWidth
            onClick={confirmEndLive}
          >
            End live
          </Button>
        </div>
      </div>
    </div>
  );
}