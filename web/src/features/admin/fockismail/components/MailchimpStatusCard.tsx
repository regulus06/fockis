import { useEffect, useState } from "react";
import { mailchimpApi } from "../services/mailchimpApi";
import type { MailchimpStatus } from "../types/mailchimp.types";

export default function MailchimpStatusCard() {
  const [status, setStatus] = useState<MailchimpStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    mailchimpApi
      .status()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load Mailchimp status."));
  }, []);

  if (error) {
    return <div className="fockis-mailchimp-card fockis-mailchimp-card--error">{error}</div>;
  }

  if (!status) {
    return <div className="fockis-mailchimp-card">Checking Mailchimp connection…</div>;
  }

  return (
    <div className="fockis-mailchimp-card">
      <div className="fockis-mailchimp-card__title">Mailchimp</div>
      <div className="fockis-mailchimp-card__row">
        <span>Connection</span>
        <strong>{status.configured ? "Connected" : "Not configured"}</strong>
      </div>
      {status.serverPrefix && (
        <div className="fockis-mailchimp-card__row">
          <span>Server</span>
          <strong>{status.serverPrefix}</strong>
        </div>
      )}
      {status.defaultAudienceId && (
        <div className="fockis-mailchimp-card__row">
          <span>Default audience</span>
          <strong>{status.defaultAudienceId}</strong>
        </div>
      )}
      {status.message && <p>{status.message}</p>}
    </div>
  );
}
