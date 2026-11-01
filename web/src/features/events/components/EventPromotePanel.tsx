import { useState } from "react";
import { BarChart3, Check, Copy, Eye, EyeOff, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";

import type { FockisEvent } from "../types/event.types";
import { absoluteEventUrl } from "../utils/eventMedia";
import FeaturedEventCard from "./discover/FeaturedEventCard";

interface Props {
  event: FockisEvent;
  now: number;
}

/**
 * Organizer-only promotion entry point. Promotion runs through the existing
 * Fockis Ads campaign builder (/ads), which handles audience, schedule,
 * budget, billing and review. Nothing here claims a promotion is live: the
 * status and analytics live in Ads Manager, where the backend reports them.
 *
 * The builder accepts objective/format/placement presets only, so the
 * organizer pastes the event link as the destination (copy button below).
 */
export default function EventPromotePanel({ event, now }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = absoluteEventUrl(event.id);
  const isPublic = event.visibility === "public";
  const builder = "/ads/campaigns/create?objective=WEBSITE_TRAFFIC&format=IMAGE&placement=FEED";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked: the link is still shown below for manual copy.
    }
  }

  return (
    <section className="fke-panel fkd-promote" aria-labelledby="fkd-promote-title">
      <span className="fkd-promote__badge">Fockis Ads</span>
      <h2 className="fke-panel__title" id="fkd-promote-title">
        <Megaphone size={18} aria-hidden="true" /> Promote this event
      </h2>

      {isPublic ? (
        <>
          <p>
            Reach more people with a sponsored spot in the Home feed. Campaigns are reviewed by Fockis before they
            start — nothing runs or is charged until it's approved.
          </p>

          <div className="fkd-promote__actions">
            <Link to={builder} className="fkd-promote__btn">
              <Megaphone size={16} aria-hidden="true" /> Create campaign
            </Link>
            <button
              type="button"
              className="fkd-promote__btn fkd-promote__btn--ghost"
              aria-expanded={showPreview}
              onClick={() => setShowPreview((value) => !value)}
            >
              {showPreview ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              {showPreview ? "Hide preview" : "Preview"}
            </button>
            <Link to="/ads/campaigns" className="fkd-promote__btn fkd-promote__btn--ghost">
              <BarChart3 size={16} aria-hidden="true" /> Status &amp; analytics
            </Link>
          </div>

          {showPreview && (
            <div className="fkd-promote__preview" aria-label="Promotion preview">
              <FeaturedEventCard event={event} now={now} preview />
            </div>
          )}

          <div className="fkd-promote__steps">
            <strong>In the campaign builder</strong>
            <ol>
              <li>Use “{event.title}” as the headline and your cover as the image.</li>
              <li>Paste the event link as the destination.</li>
              <li>Pick your audience, dates and budget, then submit for review.</li>
            </ol>
            <code>{url}</code>
            <div className="fkd-promote__actions" style={{ marginTop: 10 }}>
              <button type="button" className="fkd-promote__btn fkd-promote__btn--ghost" onClick={() => void copy()}>
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? "Link copied" : "Copy event link"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p>
          Only public events can be promoted. Change the visibility to Public in Edit event to reach new people.
        </p>
      )}
    </section>
  );
}
