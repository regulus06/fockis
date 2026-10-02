import {
  IconSpark,
  IconSparkFilled,
  IconComment,
  IconRepost,
  IconShare,
  IconSave,
  IconSaveFilled,
} from "./FockisIcons";

import {
  useState,
} from "react";

/* ============================================================================
TYPES
============================================================================ */

export interface FockisPostActionsProps {
  reacted: boolean;
  reposted: boolean;
  saved: boolean;

  likesCount: number;
  repostsCount: number;
  commentsCount: number;
  sharesCount: number;

  /**
   * Total number of gifts sent on this post.
   */
  giftsCount: number;

  onReact: () => void | Promise<void>;
  onRepost: () => void | Promise<void>;
  onSave: () => void | Promise<void>;

  onComment?: () => void | Promise<void>;

  onShare?: () => void | Promise<void>;

  onCopyLink?: () => void | Promise<void>;

  onShareMenu?: () => void | Promise<void>;

  onShareToFockis?: () => void | Promise<void>;

  onShareFacebook?: () => void | Promise<void>;

  onShareWhatsApp?: () => void | Promise<void>;

  onShareX?: () => void | Promise<void>;

  /**
   * Opens the existing GiftModal (send flow).
   *
   * Used by the dock's gift icon.
   */
  onGift?: () => void | Promise<void>;

  /**
   * Opens the "who sent this" senders list.
   *
   * Used by the stats-row "🎁 N gift(s)" button.
   * Falls back to onGift if not provided, so older
   * call sites that only pass onGift keep working.
   */
  onViewGiftSenders?: () => void | Promise<void>;
}

/* ============================================================================
FORMAT COUNT
============================================================================ */

function formatCount(
  value: number,
): string {
  if (!value || value <= 0) {
    return "0";
  }

  if (value < 1000) {
    return String(value);
  }

  if (value < 1_000_000) {
    const thousands = value / 1000;

    return `${
      thousands % 1 === 0
        ? thousands
        : thousands.toFixed(1)
    }K`;
  }

  const millions = value / 1_000_000;

  return `${
    millions % 1 === 0
      ? millions
      : millions.toFixed(1)
  }M`;
}

/* ============================================================================
POST ACTIONS
============================================================================ */

export default function FockisPostActions({
  reacted,
  reposted,
  saved,

  likesCount,
  repostsCount,
  commentsCount,
  sharesCount,

  giftsCount,

  onReact,
  onRepost,
  onSave,

  onComment,
  onShare,

  onCopyLink,
  onShareMenu,
  onShareToFockis,
  onShareFacebook,
  onShareWhatsApp,
  onShareX,

  onGift,
  onViewGiftSenders,
}: FockisPostActionsProps) {

  const [
    shareOpen,
    setShareOpen,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<string | null>(null);

  /* ==========================================================================
  SAFE ACTION HELPER
  ========================================================================== */

  const runAction = async (
    actionName: string,
    callback?: () => void | Promise<void>,
  ) => {
    if (!callback) {
      console.warn(
        `Fockis action "${actionName}" has no callback.`,
      );

      return;
    }

    if (actionLoading !== null) {
      return;
    }

    try {
      setActionLoading(actionName);

      await callback();
    } catch (error) {
      console.error(
        `Fockis action "${actionName}" failed:`,
        error,
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ==========================================================================
  REACT / LIKE
  ========================================================================== */

  const handleReact = async () => {
    await runAction(
      "react",
      onReact,
    );
  };

  /* ==========================================================================
  REPOST
  ========================================================================== */

  const handleRepost = async () => {
    await runAction(
      "repost",
      onRepost,
    );
  };

  /* ==========================================================================
  COMMENT
  ========================================================================== */

  const handleComment = async () => {
    await runAction(
      "comment",
      onComment,
    );
  };

  /* ==========================================================================
  MAIN SHARE
  ========================================================================== */

  const handleShare = async () => {
    if (onShare) {
      await runAction(
        "share",
        onShare,
      );

      return;
    }

    setShareOpen(
      (previous) => !previous,
    );

    if (onShareMenu) {
      await runAction(
        "shareMenu",
        onShareMenu,
      );
    }
  };

  /* ==========================================================================
  COPY LINK
  ========================================================================== */

  const handleCopyLink = async () => {
    await runAction(
      "copyLink",
      onCopyLink,
    );

    setShareOpen(false);
  };

  /* ==========================================================================
  SHARE TO FOCKIS
  ========================================================================== */

  const handleShareToFockis = async () => {
    await runAction(
      "shareToFockis",
      onShareToFockis,
    );

    setShareOpen(false);
  };

  /* ==========================================================================
  FACEBOOK
  ========================================================================== */

  const handleShareFacebook = async () => {
    await runAction(
      "facebook",
      onShareFacebook,
    );

    setShareOpen(false);
  };

  /* ==========================================================================
  WHATSAPP
  ========================================================================== */

  const handleShareWhatsApp = async () => {
    await runAction(
      "whatsapp",
      onShareWhatsApp,
    );

    setShareOpen(false);
  };

  /* ==========================================================================
  X
  ========================================================================== */

  const handleShareX = async () => {
    await runAction(
      "x",
      onShareX,
    );

    setShareOpen(false);
  };

  /* ==========================================================================
  SAVE
  ========================================================================== */

  const handleSave = async () => {
    await runAction(
      "save",
      onSave,
    );
  };

  /* ==========================================================================
  GIFT — SEND FLOW (dock icon)
  ========================================================================== */

  const handleGift = async () => {
    await runAction(
      "gift",
      onGift,
    );
  };

  /* ==========================================================================
  GIFT — VIEW SENDERS (stats-row button)

  Falls back to the send flow if the caller only wired onGift,
  so this stays backward compatible with older call sites.
  ========================================================================== */

  const handleViewGiftSenders = async () => {
    await runAction(
      "viewGiftSenders",
      onViewGiftSenders || onGift,
    );
  };

  /* ==========================================================================
  HAS STATS
  ========================================================================== */

  const hasStats =
    likesCount > 0 ||
    commentsCount > 0 ||
    repostsCount > 0 ||
    sharesCount > 0 ||
    giftsCount > 0;

  /* ==========================================================================
  RENDER
  ========================================================================== */

  return (
    <div className="fk-post-actions">

      {/* ====================================================================
      STATS ROW
      ===================================================================== */}

      {hasStats && (
        <div className="fk-post-stats">

          {/* REACTIONS */}

          {likesCount > 0 && (
            <button
              type="button"
              className="fk-post-stats__item"
              onClick={handleReact}
            >
              <strong>
                {formatCount(likesCount)}
              </strong>{" "}
              reactions
            </button>
          )}

          {/* COMMENTS */}

          <button
            type="button"
            className="fk-post-stats__item"
            onClick={handleComment}
          >
            {formatCount(commentsCount)}{" "}
            comments
          </button>

          {/* REPOSTS */}

          {repostsCount > 0 && (
            <button
              type="button"
              className="fk-post-stats__item"
              onClick={handleRepost}
            >
              {formatCount(repostsCount)}{" "}
              reposts
            </button>
          )}

          {/* GIFTS — tapping this opens the "who sent this" list */}

          {giftsCount > 0 && (
            <button
              type="button"
              className="fk-post-stats__item fk-post-stats__item--gift"
              onClick={handleViewGiftSenders}
              disabled={
                actionLoading ===
                "viewGiftSenders"
              }
              title="See who sent gifts on this post"
            >
              <span aria-hidden="true">
                🎁
              </span>{" "}
              <strong>
                {formatCount(giftsCount)}
              </strong>{" "}
              {giftsCount === 1 ? "gift" : "gifts"}
            </button>
          )}

          {/* SHARES */}

          {sharesCount > 0 && (
            <button
              type="button"
              className="fk-post-stats__item"
              onClick={handleShare}
            >
              {formatCount(sharesCount)}{" "}
              shares
            </button>
          )}

        </div>
      )}

      {/* ====================================================================
      ACTION DOCK
      ===================================================================== */}

      <div className="fk-action-dock">

        {/* LIKE */}

        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--spark${
            reacted ? " is-active" : ""
          }`}
          onClick={handleReact}
          disabled={
            actionLoading === "react"
          }
          aria-label={
            reacted
              ? "Unlike post"
              : "Like post"
          }
          aria-pressed={reacted}
        >
          {reacted ? (
            <IconSparkFilled size={18} />
          ) : (
            <IconSpark size={18} />
          )}

          {likesCount > 0 && (
            <span className="fk-action-dock__count">
              {formatCount(likesCount)}
            </span>
          )}
        </button>

        {/* COMMENT */}

        <button
          type="button"
          className="fk-action-dock__btn"
          onClick={handleComment}
          disabled={
            actionLoading === "comment"
          }
          aria-label="Comment on post"
        >
          <IconComment size={18} />

          <span className="fk-action-dock__count">
            {formatCount(commentsCount)}
          </span>
        </button>

        {/* REPOST */}

        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--repost${
            reposted ? " is-active" : ""
          }`}
          onClick={handleRepost}
          disabled={
            actionLoading === "repost"
          }
          aria-label={
            reposted
              ? "Undo repost"
              : "Repost"
          }
          aria-pressed={reposted}
        >
          <IconRepost size={18} />

          {repostsCount > 0 && (
            <span className="fk-action-dock__count">
              {formatCount(repostsCount)}
            </span>
          )}
        </button>

        {/* GIFT — send flow */}

        {onGift && (
          <button
            type="button"
            className={`fk-action-dock__btn fk-action-dock__btn--gift${
              giftsCount > 0
                ? " has-gifts"
                : ""
            }`}
            onClick={handleGift}
            disabled={
              actionLoading === "gift"
            }
            aria-label={
              giftsCount > 0
                ? `Send gift. ${giftsCount} gifts sent`
                : "Send gift"
            }
            title={
              giftsCount > 0
                ? `${formatCount(giftsCount)} ${
                    giftsCount === 1
                      ? "gift"
                      : "gifts"
                  } sent`
                : "Send gift"
            }
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              🎁
            </span>

            {giftsCount > 0 && (
              <span className="fk-action-dock__count fk-action-dock__count--gift">
                {formatCount(giftsCount)}
              </span>
            )}
          </button>
        )}

        {/* SHARE */}

        <div className="fk-action-dock__share">

          <button
            type="button"
            className={`fk-action-dock__btn${
              shareOpen
                ? " is-active"
                : ""
            }`}
            onClick={handleShare}
            disabled={
              actionLoading === "share"
            }
            aria-label="Share post"
            aria-expanded={shareOpen}
          >
            <IconShare size={18} />

            {sharesCount > 0 && (
              <span className="fk-action-dock__count">
                {formatCount(sharesCount)}
              </span>
            )}
          </button>

          {shareOpen && (
            <div
              className="fk-share-menu"
              role="menu"
            >
              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleShareToFockis}
                disabled={
                  actionLoading ===
                  "shareToFockis"
                }
                role="menuitem"
              >
                <span className="fk-share-menu__icon">
                  👥
                </span>

                <span>
                  Share to Fockis
                </span>
              </button>

              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleCopyLink}
                disabled={
                  actionLoading ===
                  "copyLink"
                }
                role="menuitem"
              >
                <span className="fk-share-menu__icon">
                  🔗
                </span>

                <span>
                  Copy link
                </span>
              </button>

              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleShareFacebook}
                disabled={
                  actionLoading ===
                  "facebook"
                }
                role="menuitem"
              >
                <span className="fk-share-menu__icon">
                  f
                </span>

                <span>
                  Facebook
                </span>
              </button>

              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleShareWhatsApp}
                disabled={
                  actionLoading ===
                  "whatsapp"
                }
                role="menuitem"
              >
                <span className="fk-share-menu__icon">
                  W
                </span>

                <span>
                  WhatsApp
                </span>
              </button>

              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleShareX}
                disabled={
                  actionLoading === "x"
                }
                role="menuitem"
              >
                <span className="fk-share-menu__icon">
                  𝕏
                </span>

                <span>
                  X
                </span>
              </button>
            </div>
          )}
        </div>

        {/* SPACER */}

        <span
          className="fk-action-dock__spacer"
          aria-hidden="true"
        />

        {/* SAVE */}

        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--save${
            saved ? " is-active" : ""
          }`}
          onClick={handleSave}
          disabled={
            actionLoading === "save"
          }
          aria-label={
            saved
              ? "Unsave post"
              : "Save post"
          }
          aria-pressed={saved}
        >
          {saved ? (
            <IconSaveFilled size={18} />
          ) : (
            <IconSave size={18} />
          )}
        </button>

      </div>
    </div>
  );
}