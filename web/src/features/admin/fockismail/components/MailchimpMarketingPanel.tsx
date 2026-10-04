import MailchimpStatusCard from "./MailchimpStatusCard";
import SmsMarketingNotice from "./SmsMarketingNotice";
import EmailCampaignComposer from "./EmailCampaignComposer";

type Props = {
  audienceId: string;
  businessId?: string;
  replyTo?: string;
};

export default function MailchimpMarketingPanel({
  audienceId,
  businessId,
  replyTo = "",
}: Props) {
  return (
    <section className="fockis-mailchimp">
      <header className="fockis-mailchimp__header">
        <div>
          <p className="fockis-mailchimp__eyebrow">FOCKIS MARKETING</p>
          <h2>Email & SMS Marketing</h2>
          <p>Businesses can write their own campaigns, review them, and publish them.</p>
        </div>
      </header>

      <MailchimpStatusCard />

      <div className="fockis-mailchimp__grid">
        <div>
          <h3>Email campaign</h3>
          <EmailCampaignComposer
            audienceId={audienceId}
            businessId={businessId}
            defaultReplyTo={replyTo}
          />
        </div>

        <SmsMarketingNotice />
      </div>
    </section>
  );
}
