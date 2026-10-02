import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";

import type {
  PostGiftSender,
} from "../services/giftsApi";

/* ============================================================================
TYPES
============================================================================ */

interface GiftSendersModalProps {
  open: boolean;

  senders: PostGiftSender[];

  loading: boolean;

  onClose: () => void;
}

/* ============================================================================
FORMAT TIME
============================================================================ */

function formatSentAt(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

/* ============================================================================
INLINE STYLES

All structural/scroll-critical layout lives here as inline
styles rather than an external .scss file, so it can never be
silently dropped by a missed import.
============================================================================ */

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,

    /*
     * Higher than .fk-bottom-nav's z-index: 10001,
     * so the mobile bottom nav never covers this.
     */
    zIndex: 10002,

    display: "flex",
    alignItems: "stretch",
    justifyContent: "flex-end",

    background: "rgba(0, 0, 0, 0.5)",
  },

  /*
   * SIDE DRAWER:
   * Full viewport height, anchored to the right edge,
   * fixed width rather than a bottom sheet.
   */
  panel: {
    width: "min(380px, 100vw)",
    height: "100dvh",

    display: "flex",
    flexDirection: "column",

    background: "#14161c",
    color: "#f5f5f7",

    boxShadow: "-8px 0 24px rgba(0,0,0,0.35)",

    overflow: "hidden",
  },

  panelHidden: {
    transform: "translateX(100%)",
  },

  panelVisible: {
    transform: "translateX(0)",
  },

  header: {
    flexShrink: 0,

    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    padding:
      "calc(16px + env(safe-area-inset-top, 0px)) 16px 12px",

    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  title: {
    fontSize: 17,
    fontWeight: 700,
  },

  closeButton: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.08)",
    color: "#f5f5f7",
    cursor: "pointer",
    fontSize: 14,
  },

  summary: {
    flexShrink: 0,

    display: "flex",
    alignItems: "center",
    gap: 10,

    margin: "12px 16px",
    padding: "10px 12px",

    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
  },

  summaryLabel: {
    fontSize: 11,
    opacity: 0.65,
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: 700,
  },

  status: {
    padding: "24px 16px",
    textAlign: "center",
    opacity: 0.7,
    fontSize: 14,
  },

  /*
   * The ONLY scrollable region. flex: 1 with minHeight: 0
   * lets this shrink and scroll while header/summary stay
   * fixed above it, and it fills all remaining height down
   * to the bottom of the drawer.
   */
  list: {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",

    padding: "0 16px 16px",
  },

  item: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },

  avatar: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: "50%",
    overflow: "hidden",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    background: "rgba(255,255,255,0.1)",
    fontWeight: 700,
    fontSize: 14,
  },

  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  body: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  line: {
    fontSize: 14,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },

  meta: {
    display: "flex",
    gap: 10,
    fontSize: 12,
    opacity: 0.6,
  },
};

/* ============================================================================
COMPONENT
============================================================================ */

export default function GiftSendersModal({
  open,
  senders,
  loading,
  onClose,
}: GiftSendersModalProps) {

  /* ==========================================================================
  SLIDE-IN ANIMATION

  Mount with the panel translated off-screen, then flip to
  visible on the next frame so the browser actually animates
  the transform instead of snapping straight to open.
  ========================================================================== */

  const [
    visible,
    setVisible,
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);

      return;
    }

    const frame =
      requestAnimationFrame(() => {
        setVisible(true);
      });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open]);

  /* ==========================================================================
  CLOSED
  ========================================================================== */

  if (!open) {
    return null;
  }

  /* ==========================================================================
  TOTAL COINS
  ========================================================================== */

  const totalCoins =
    senders.reduce(
      (sum, sender) =>
        sum + (sender.coinsSpent || 0),
      0,
    );

  /* ==========================================================================
  RENDER
  ========================================================================== */

  return (
    <div
      style={styles.overlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        style={{
          ...styles.panel,
          ...(visible
            ? styles.panelVisible
            : styles.panelHidden),
          transition:
            "transform 260ms ease",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Gifts sent to this post"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {/* ==================================================================
        HEADER — stays fixed, never scrolls
        ================================================================== */}

        <div style={styles.header}>
          <div style={styles.title}>
            Gifts on this post 🎁
          </div>

          <button
            type="button"
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close gift senders"
          >
            ✕
          </button>
        </div>

        {/* ==================================================================
        SUMMARY — stays fixed, never scrolls
        ================================================================== */}

        {!loading &&
          senders.length > 0 && (
            <div style={styles.summary}>
              <span aria-hidden="true">
                🪙
              </span>

              <div>
                <div style={styles.summaryLabel}>
                  Total gifted
                </div>

                <div style={styles.summaryValue}>
                  {totalCoins.toLocaleString()}{" "}
                  Coins •{" "}
                  {senders.length}{" "}
                  {senders.length === 1
                    ? "gift"
                    : "gifts"}
                </div>
              </div>
            </div>
          )}

        {/* ==================================================================
        LOADING
        ================================================================== */}

        {loading && (
          <div style={styles.status}>
            Loading gifts...
          </div>
        )}

        {/* ==================================================================
        EMPTY
        ================================================================== */}

        {!loading &&
          senders.length === 0 && (
            <div style={styles.status}>
              No gifts yet on this post.
            </div>
          )}

        {/* ==================================================================
        SENDERS LIST — the ONLY scrollable region, top to bottom
        ================================================================== */}

        {!loading &&
          senders.length > 0 && (
            <div style={styles.list}>
              {senders.map(
                (sender, index) => (
                  <div
                    key={`${sender.senderId}-${sender.createdAt}-${index}`}
                    style={styles.item}
                  >
                    <div style={styles.avatar}>
                      {sender.profilePicture ? (
                        <img
                          src={
                            sender.profilePicture
                          }
                          alt={
                            sender.username
                          }
                          style={
                            styles.avatarImg
                          }
                        />
                      ) : (
                        sender.username
                          .trim()
                          .charAt(0)
                          .toUpperCase() ||
                        "U"
                      )}
                    </div>

                    <div style={styles.body}>
                      <div style={styles.line}>
                        <strong>
                          {
                            sender.username
                          }
                        </strong>{" "}
                        sent{" "}
                        <span aria-hidden="true">
                          {sender.emoji}
                        </span>{" "}
                        {sender.giftName}
                      </div>

                      <div style={styles.meta}>
                        <span>
                          🪙{" "}
                          {sender.coinsSpent.toLocaleString()}
                        </span>

                        {sender.createdAt && (
                          <span>
                            {formatSentAt(
                              sender.createdAt,
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
      </div>
    </div>
  );
}