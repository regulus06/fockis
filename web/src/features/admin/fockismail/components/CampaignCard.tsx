import { Link } from "react-router-dom";
import type { Campaign } from "../types/mailchimp.types";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_TONES, CAMPAIGN_TYPE_LABELS } from "../utils/labels";
import { formatCurrency, formatDate, formatPercent } from "../utils/format";
import { clickRate, openRate } from "../services/campaignsApi";
import { Badge } from "./ui/Badge";
import { ActionMenu, type MenuItem } from "./ui/Menu";
import { ProgressBar } from "./ui/Feedback";
import { useMarketingPath } from "../hooks/useMailchimp";

export function CampaignCard({ campaign: c, audienceName, actions }: { campaign: Campaign; audienceName: string; actions: MenuItem[] }) {
  const to = useMarketingPath();
  const sent = c.stats.delivered > 0;
  return (
    <article className="fm-ccard">
      <header>
        <Badge tone={CAMPAIGN_STATUS_TONES[c.status]} dot>{CAMPAIGN_STATUS_LABELS[c.status]}</Badge>
        <ActionMenu items={actions} label={`Actions for ${c.name}`} />
      </header>
      <h3><Link to={to(`campaigns/${c.id}`)}>{c.name}</Link></h3>
      <p className="fm-ccard__subject">{c.subject}</p>
      <dl className="fm-ccard__meta">
        <div><dt>Type</dt><dd>{CAMPAIGN_TYPE_LABELS[c.type]}</dd></div>
        <div><dt>Audience</dt><dd>{audienceName}</dd></div>
        <div><dt>{c.status === "scheduled" ? "Sends" : sent ? "Sent" : "Created"}</dt><dd>{formatDate(c.scheduledAt ?? c.sentAt ?? c.createdAt)}</dd></div>
      </dl>
      {sent ? (
        <div className="fm-ccard__stats">
          <div><span>Opens</span><strong>{formatPercent(openRate(c))}</strong><ProgressBar value={openRate(c)} label="Open rate" /></div>
          <div><span>Clicks</span><strong>{formatPercent(clickRate(c))}</strong><ProgressBar value={clickRate(c) * 4} tone="green" label="Click rate" /></div>
          <div><span>Revenue</span><strong>{formatCurrency(c.stats.revenue)}</strong></div>
        </div>
      ) : (
        <p className="fm-ccard__pending">Results appear after this campaign sends.</p>
      )}
    </article>
  );
}
