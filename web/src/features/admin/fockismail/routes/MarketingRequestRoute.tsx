import { lazy, Suspense } from "react";
import { MarketingProvider } from "../components/MarketingProvider";
import { Skeleton } from "../components/ui/Feedback";
import "../styles/mailchimp.scss";

const MarketingRequestPage = lazy(() => import("../pages/request/MarketingRequestPage"));

/** Public page: /marketing/request. No marketing sidebar or agency data. */
export default function MarketingRequestRoute() {
  return (
    <MarketingProvider audienceId="" basePath="/marketing/mailchimp" userName="">
      <Suspense fallback={<div className="fm-theme" style={{ padding: 24 }}><Skeleton height={400} /></div>}>
        <MarketingRequestPage />
      </Suspense>
    </MarketingProvider>
  );
}
