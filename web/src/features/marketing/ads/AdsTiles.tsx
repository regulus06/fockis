/* ============================================================================
   FOCKIS ADS — TILES AND RAILS
============================================================================ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Image as ImageIcon,
  LayoutGrid,
} from "lucide-react";

import { buildFockisUrl } from "../../../config/fockisConfig";
import type { Advertisement } from "../types/marketingTypes";

import {
  STATUS_LABEL,
  adsPaths,
  formatCount,
  formatMoney,
  formatPercent,
  humanize,
  ratio,
  type AdsCampaign,
  type AdsCampaignStatus,
} from "./adsModel";
import CampaignActions from "./CampaignActions";

/* ============================================================================
   MEDIA
============================================================================ */

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_EXT.test(url);
}

export function AdsMedia({
  url,
  poster,
  format,
  label,
}: {
  url?: string;
  poster?: string;
  format?: string;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = url ? buildFockisUrl(url) : "";
  const posterSrc = poster ? buildFockisUrl(poster) : "";

  const placeholderIcon =
    format === "VIDEO" ? (
      <Clapperboard size={28} aria-hidden="true" />
    ) : format === "CAROUSEL" ? (
      <LayoutGrid size={28} aria-hidden="true" />
    ) : (
      <ImageIcon size={28} aria-hidden="true" />
    );

  if (!src || failed) {
    if (posterSrc && !failed) {
      return (
        <img
          className="fk-ads-media"
          src={posterSrc}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      );
    }

    return (
      <div className="fk-ads-media fk-ads-media--placeholder" aria-hidden="true">
        {placeholderIcon}
        <span>{label}</span>
      </div>
    );
  }

  if (isVideoUrl(src)) {
    return (
      <video
        className="fk-ads-media"
        src={src}
        poster={posterSrc || undefined}
        muted
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      className="fk-ads-media"
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/* ============================================================================
   STATUS CHIP
============================================================================ */

export function StatusChip({ status }: { status: AdsCampaignStatus }) {
  return (
    <span className={`fk-ads-status fk-ads-status--${status.toLowerCase()}`}>
      <i aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ============================================================================
   RAIL
============================================================================ */

export function Rail({
  id,
  title,
  description,
  action,
  children,
  empty,
  count,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  empty?: ReactNode;
  count: number;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    function update() {
      if (!track) {
        return;
      }

      setEdges({
        start: track.scrollLeft <= 4,
        end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
      });
    }

    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [count]);

  function scroll(direction: 1 | -1) {
    const track = trackRef.current;

    if (track) {
      track.scrollBy({
        left: direction * Math.max(240, track.clientWidth * 0.8),
        behavior: "smooth",
      });
    }
  }

  const headingId = `fk-ads-rail-${id}`;

  return (
    <section className="fk-ads-rail" aria-labelledby={headingId}>
      <div className="fk-ads-rail__head">
        <div>
          <h2 id={headingId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>

        <div className="fk-ads-rail__tools">
          {action}
          {count > 1 && (
            <>
              <button
                type="button"
                className="fk-ads-icon-btn fk-ads-icon-btn--sm"
                onClick={() => scroll(-1)}
                disabled={edges.start}
                aria-label={`Scroll ${title} left`}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="fk-ads-icon-btn fk-ads-icon-btn--sm"
                onClick={() => scroll(1)}
                disabled={edges.end}
                aria-label={`Scroll ${title} right`}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {count === 0 ? (
        empty
      ) : (
        <div className="fk-ads-rail__track" ref={trackRef}>
          {children}
        </div>
      )}
    </section>
  );
}

export function RailEmpty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="fk-ads-empty">
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

/* ============================================================================
   CAMPAIGN TILE
============================================================================ */

export function CampaignTile({
  campaign,
  raw,
  onChanged,
  onError,
  onNotice,
}: {
  campaign: AdsCampaign;
  raw?: Record<string, unknown>;
  onChanged: () => void | Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const ctr = ratio(campaign.clicks, campaign.impressions);
  const budgetUsed =
    campaign.totalBudget > 0
      ? Math.min(1, campaign.spent / campaign.totalBudget)
      : null;

  return (
    <article className="fk-ads-tile">
      <Link
        to={adsPaths.campaign(campaign.id)}
        className="fk-ads-tile__media"
        aria-label={`Open ${campaign.name}`}
      >
        <AdsMedia
          url={campaign.mediaUrl}
          poster={campaign.thumbnailUrl}
          format={campaign.adFormat}
          label={humanize(campaign.adFormat) || "Creative"}
        />
        <StatusChip status={campaign.status} />
      </Link>

      <div className="fk-ads-tile__body">
        <h3>
          <Link to={adsPaths.campaign(campaign.id)}>{campaign.name}</Link>
        </h3>
        <p className="fk-ads-tile__meta">
          {[humanize(campaign.objective), humanize(campaign.adFormat)]
            .filter(Boolean)
            .join(" · ") || "Campaign"}
        </p>

        <dl className="fk-ads-tile__stats">
          <div>
            <dt>Impressions</dt>
            <dd>{formatCount(campaign.impressions)}</dd>
          </div>
          <div>
            <dt>CTR</dt>
            <dd>{formatPercent(ctr)}</dd>
          </div>
          <div>
            <dt>Spent</dt>
            <dd>{formatMoney(campaign.spent)}</dd>
          </div>
        </dl>

        {budgetUsed !== null && (
          <div
            className="fk-ads-meter"
            role="meter"
            aria-label="Budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(budgetUsed * 100)}
            title={`${formatMoney(campaign.spent)} of ${formatMoney(campaign.totalBudget)}`}
          >
            <span style={{ width: `${budgetUsed * 100}%` }} />
          </div>
        )}

        <CampaignActions
          campaign={campaign}
          raw={raw}
          onChanged={onChanged}
          onError={onError}
          onNotice={onNotice}
        />
      </div>
    </article>
  );
}

/* ============================================================================
   CREATIVE TILE
============================================================================ */

export function CreativeTile({ ad }: { ad: Advertisement }) {
  const url = ad.mediaUrl || ad.videoUrl || ad.imageUrl || "";
  const title = ad.headline || ad.title || ad.name || "Untitled creative";
  const campaignId = ad.campaignId ? String(ad.campaignId) : "";

  return (
    <article className="fk-ads-tile fk-ads-tile--creative">
      <div className="fk-ads-tile__media">
        <AdsMedia
          url={url}
          poster={ad.thumbnailUrl}
          format={ad.type}
          label={humanize(ad.type ?? "") || "Creative"}
        />
        {ad.status && (
          <span className="fk-ads-status fk-ads-status--neutral">
            {humanize(ad.status)}
          </span>
        )}
      </div>
      <div className="fk-ads-tile__body">
        <h3>{title}</h3>
        {ad.description && <p className="fk-ads-tile__meta">{ad.description}</p>}
        {campaignId && (
          <Link className="fk-ads-link" to={adsPaths.campaign(campaignId)}>
            Open campaign
          </Link>
        )}
      </div>
    </article>
  );
}

/* ============================================================================
   PRESET TILE (templates and formats — guidance, not data)
============================================================================ */

export function PresetTile({
  to,
  icon,
  title,
  text,
  tag,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  text: string;
  tag?: string;
}) {
  return (
    <Link to={to} className="fk-ads-preset">
      <span className="fk-ads-preset__icon">{icon}</span>
      <strong>{title}</strong>
      <span className="fk-ads-preset__text">{text}</span>
      {tag && <span className="fk-ads-preset__tag">{tag}</span>}
    </Link>
  );
}
