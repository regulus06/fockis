import type { ReactNode } from "react";
import { PageHeader } from "../components/ui/Layout";
import { EmptyState, Notice } from "../components/ui/Feedback";
import { LinkButton } from "../components/ui/Button";
import { useMarketingPath } from "../hooks/useMailchimp";

/**
 * Hosts the original MailchimpMarketingPanel / EmailCampaignComposer inside
 * the new shell so existing functionality keeps working unchanged.
 */
export default function LegacyMailchimpPage({ title, children }: { title: string; children?: ReactNode }) {
  const to = useMarketingPath();
  return (
    <div className="fm-page">
      <PageHeader title={title} description="The original Mailchimp tools, kept as they were." actions={<LinkButton to={to("compose")} variant="primary" icon="plus">Use the new campaign builder</LinkButton>} />
      <Notice>Everything here talks to Mailchimp exactly as before. The rest of Fockis Marketing is new.</Notice>
      {children ?? <EmptyState icon="mail" title="Classic panel not provided" body="Pass the existing component to <MailchimpRoutes legacyPanel={…} /> to show it here." />}
    </div>
  );
}
