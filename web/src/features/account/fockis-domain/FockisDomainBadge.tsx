import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

import fockisDomainApi from "./fockisDomainApi";
import "./MyFockisDomain.scss";

/** Shows a person's personal Fockis domain (john.fockis.com) on their profile while it is active. */
export default function FockisDomainBadge({ userId }: { userId?: string }) {
  const [domain, setDomain] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setDomain(null);
    if (!userId) return;
    fockisDomainApi
      .forProfile(userId)
      .then((r) => alive && setDomain(r.domain))
      .catch(() => alive && setDomain(null));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (!domain) return null;
  return (
    <span className="fk-domain-badge" title="Personal Fockis domain">
      <Globe size={13} aria-hidden="true" />
      {domain}
    </span>
  );
}
