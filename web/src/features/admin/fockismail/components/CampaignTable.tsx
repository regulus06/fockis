import { Link } from "react-router-dom";
import type { Audience, Campaign } from "../types/mailchimp.types";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_TONES, CAMPAIGN_TYPE_LABELS } from "../utils/labels";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "../utils/format";
import { openRate, clickRate } from "../services/campaignsApi";
import { Badge } from "./ui/Badge";
import { ActionMenu, type MenuItem } from "./ui/Menu";
import { useMarketingPath } from "../hooks/useMailchimp";

interface CampaignTableProps {
  campaigns: Campaign[];
  audiences: Audience[];
  actionsFor: (c: Campaign) => MenuItem[];
  variant?: "full" | "compact";
}

export function CampaignTable({ campaigns, audiences, actionsFor, variant = "full" }: CampaignTableProps) {
  const to = useMarketingPath();
  const audienceName = (id: string) => audiences.find((a) => a.id === id)?.name ?? "—";
  const full = variant === "full";

  return (
    <div className="fm-tablewrap">
      <table className="fm-table">
        <thead>
          <tr>
            <th scope="col">Campaign</th>
            <th scope="col">Type</th>
            <th scope="col">Audience</th>
            <th scope="col">Status</th>
            {full && <th scope="col">Created</th>}
            <th scope="col">{full ? "Scheduled / sent" : "Sent"}</th>
            <th scope="col" className="is-num">Open rate</th>
            <th scope="col" className="is-num">Click rate</th>
            <th scope="col" className="is-num">Revenue</th>
            <th scope="col"><span className="fm-sr">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const sent = c.stats.delivered > 0;
            return (
              <tr key={c.id}>
                <td className="fm-table__primary">
                  <Link to={to(`campaigns/${c.id}`)}>{c.name}</Link>
                  <span className="fm-table__sub">{c.subject}</span>
                </td>
                <td>{CAMPAIGN_TYPE_LABELS[c.type]}</td>
                <td>{audienceName(c.audienceId)}</td>
                <td>
                  <Badge tone={CAMPAIGN_STATUS_TONES[c.status]} dot>{CAMPAIGN_STATUS_LABELS[c.status]}</Badge>
                </td>
                {full && <td>{formatDate(c.createdAt)}</td>}
                <td>
                  {c.status === "scheduled" ? formatDate(c.scheduledAt) : c.sentAt ? formatDate(c.sentAt) : "—"}
                  {sent && <span className="fm-table__sub">{formatNumber(c.stats.recipients)} recipients</span>}
                </td>
                <td className="is-num">{sent ? formatPercent(openRate(c)) : "—"}</td>
                <td className="is-num">{sent ? formatPercent(clickRate(c)) : "—"}</td>
                <td className="is-num">{sent ? formatCurrency(c.stats.revenue) : "—"}</td>
                <td className="is-actions">
                  <ActionMenu items={actionsFor(c)} label={`Actions for ${c.name}`} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
