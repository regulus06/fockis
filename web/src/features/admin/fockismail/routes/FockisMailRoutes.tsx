// Backward-compatible entry point from the first phase. Equivalent to
// <FockisMarketingRoutes section="mailchimp" />.
import FockisMarketingRoutes, { type FockisMarketingRoutesProps } from "./FockisMarketingRoutes";

export type MailchimpRoutesProps = Omit<FockisMarketingRoutesProps, "section"> & {
  /** Kept for compatibility; the marketing base path is fixed at /marketing/mailchimp. */
  basePath?: string;
};

export default function MailchimpRoutes({ basePath: _ignored, ...props }: MailchimpRoutesProps) {
  void _ignored;
  return <FockisMarketingRoutes section="mailchimp" {...props} />;
}
