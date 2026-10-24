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

import { Gift, Link2, Share2, Users } from "lucide-react";

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
          {likesCount > 0 ? (
            <button
              type="button"
              className="fk-post-stats__item"
              onClick={handleReact}
              aria-label={`${likesCount} reactions. ${reacted ? "Remove your reaction" : "React"}`}
            >
              <span className="fk-post-stats__spark" aria-hidden="true">
                <IconSparkFilled size={12} />
              </span>
              <strong>{formatCount(likesCount)}</strong>
            </button>
          ) : (
            <span className="fk-post-stats__item" aria-hidden="true" />
          )}

          {commentsCount > 0 && (
            <button
              type="button"
              className="fk-post-stats__item"
              onClick={handleComment}
            >
              {formatCount(commentsCount)}{" "}
              {commentsCount === 1 ? "comment" : "comments"}
            </button>
          )}

          {repostsCount > 0 && (
            <button
              type="button"
              className="fk-post-stats__item"
              onClick={handleRepost}
            >
              {formatCount(repostsCount)}{" "}
              {repostsCount === 1 ? "repost" : "reposts"}
            </button>
          )}

          {/* GIFTS — opens the "who sent this" list */}
          {giftsCount > 0 && (
            <button
              type="button"
              className="fk-post-stats__item fk-post-stats__item--gift"
              onClick={handleViewGiftSenders}
              disabled={actionLoading === "viewGiftSenders"}
              title="See who sent gifts on this post"
            >
              <strong>{formatCount(giftsCount)}</strong>{" "}
              {giftsCount === 1 ? "gift" : "gifts"}
            </button>
          )}

          {sharesCount > 0 && (
            <button
              type="button"
              className="fk-post-stats__item"
              onClick={handleShare}
            >
              {formatCount(sharesCount)}{" "}
              {sharesCount === 1 ? "share" : "shares"}
            </button>
          )}
        </div>
      )}

      {/* ====================================================================
      ACTION BAR
      ===================================================================== */}

      <div className="fk-action-dock" role="group" aria-label="Post actions">

        {/* LIKE */}
        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--spark${reacted ? " is-active" : ""}`}
          onClick={handleReact}
          disabled={actionLoading === "react"}
          aria-label={reacted ? "Unlike post" : "Like post"}
          aria-pressed={reacted}
        >
          {reacted ? <IconSparkFilled size={19} /> : <IconSpark size={19} />}
          <span className="fk-action-dock__label">{reacted ? "Liked" : "Like"}</span>
        </button>

        {/* COMMENT */}
        <button
          type="button"
          className="fk-action-dock__btn"
          onClick={handleComment}
          disabled={actionLoading === "comment"}
          aria-label="Comment on post"
        >
          <IconComment size={19} />
          <span className="fk-action-dock__label">Comment</span>
        </button>

        {/* GIFT — send flow */}
        {onGift && (
          <button
            type="button"
            className={`fk-action-dock__btn fk-action-dock__btn--gift${giftsCount > 0 ? " has-gifts" : ""}`}
            onClick={handleGift}
            disabled={actionLoading === "gift"}
            aria-label={giftsCount > 0 ? `Send gift. ${giftsCount} gifts sent` : "Send gift"}
          >
            <Gift size={18} />
            <span className="fk-action-dock__label">Send Gift</span>
          </button>
        )}

        {/* REPOST */}
        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--repost${reposted ? " is-active" : ""}`}
          onClick={handleRepost}
          disabled={actionLoading === "repost"}
          aria-label={reposted ? "Undo repost" : "Repost"}
          aria-pressed={reposted}
        >
          <IconRepost size={19} />
          <span className="fk-action-dock__label">{reposted ? "Reposted" : "Repost"}</span>
        </button>

        {/* SHARE */}
        <div className="fk-action-dock__share">
          <button
            type="button"
            className={`fk-action-dock__btn${shareOpen ? " is-active" : ""}`}
            onClick={handleShare}
            disabled={actionLoading === "share"}
            aria-label="Share post"
            aria-expanded={onShare ? undefined : shareOpen}
            aria-haspopup={onShare ? undefined : "menu"}
          >
            <IconShare size={19} />
            <span className="fk-action-dock__label">Share</span>
          </button>

          {shareOpen && (
            <div className="fk-share-menu" role="menu">
              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleShareToFockis}
                disabled={actionLoading === "shareToFockis"}
                role="menuitem"
              >
                <span className="fk-share-menu__icon"><Users size={15} /></span>
                <span>Share to Fockis</span>
              </button>

              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleCopyLink}
                disabled={actionLoading === "copyLink"}
                role="menuitem"
              >
                <span className="fk-share-menu__icon"><Link2 size={15} /></span>
                <span>Copy link</span>
              </button>

              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleShareFacebook}
                disabled={actionLoading === "facebook"}
                role="menuitem"
              >
                <span className="fk-share-menu__icon"><Share2 size={15} /></span>
                <span>Facebook</span>
              </button>

              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleShareWhatsApp}
                disabled={actionLoading === "whatsapp"}
                role="menuitem"
              >
                <span className="fk-share-menu__icon"><Share2 size={15} /></span>
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                className="fk-share-menu__item"
                onClick={handleShareX}
                disabled={actionLoading === "x"}
                role="menuitem"
              >
                <span className="fk-share-menu__icon"><Share2 size={15} /></span>
                <span>X</span>
              </button>
            </div>
          )}
        </div>

        <span className="fk-action-dock__spacer" aria-hidden="true" />

        {/* SAVE */}
        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--save${saved ? " is-active" : ""}`}
          onClick={handleSave}
          disabled={actionLoading === "save"}
          aria-label={saved ? "Unsave post" : "Save post"}
          aria-pressed={saved}
        >
          {saved ? <IconSaveFilled size={19} /> : <IconSave size={19} />}
          <span className="fk-action-dock__label">{saved ? "Saved" : "Save"}</span>
        </button>
      </div>
    </div>
  );
}
