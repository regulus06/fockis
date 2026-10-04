import { EmptyState } from "../components/ui/Feedback";
import { LinkButton } from "../components/ui/Button";
import { useMarketingPath } from "../hooks/useMailchimp";

export default function MarketingNotFoundPage() {
  const to = useMarketingPath();
  return (
    <div className="fm-page">
      <EmptyState icon="search" title="This marketing page doesn't exist" body="Check the address, or head back to the overview." action={<LinkButton to={to()} variant="primary" icon="home">Go to overview</LinkButton>} />
    </div>
  );
}
