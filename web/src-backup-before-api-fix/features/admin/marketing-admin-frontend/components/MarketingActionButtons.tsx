import type { MarketingAction, MarketingCampaignStatus } from "../types/marketingAdmin.types";

interface Props {
  status: MarketingCampaignStatus;
  can: (permission: string) => boolean;
  permissions: Record<string, string>;
  onAction: (action: MarketingAction) => void;
  disabled?: boolean;
}

export function MarketingActionButtons({ status, can, permissions: p, onAction, disabled }: Props) {
  const button = (action: MarketingAction, permission: string, label: string) =>
    can(permission) ? <button type="button" disabled={disabled} onClick={() => onAction(action)}>{label}</button> : null;

  return <div className="marketing-admin__actions">
    {status === "PENDING_REVIEW" && button("APPROVE", p.CAMPAIGN_APPROVE, "Approve")}
    {status === "PENDING_REVIEW" && button("REJECT", p.CAMPAIGN_REJECT, "Reject")}
    {status === "APPROVED" && button("PUBLISH", p.CAMPAIGN_PUBLISH, "Publish")}
    {status === "ACTIVE" && button("PAUSE", p.CAMPAIGN_PAUSE, "Pause")}
    {status === "PAUSED" && button("RESUME", p.CAMPAIGN_RESUME, "Resume")}
    {!(["BLOCKED", "ARCHIVED"] as MarketingCampaignStatus[]).includes(status) && button("BLOCK", p.CAMPAIGN_BLOCK, "Block")}
    {status === "BLOCKED" && button("UNBLOCK", p.CAMPAIGN_UNBLOCK, "Unblock")}
    {status !== "ARCHIVED" && button("ARCHIVE", p.CAMPAIGN_ARCHIVE, "Archive")}
  </div>;
}
