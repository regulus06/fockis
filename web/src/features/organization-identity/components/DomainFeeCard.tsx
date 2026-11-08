import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import organizationDomainBillingApi, {
  money,
  perPeriod,
  type DomainPricingPublic,
  type OrgDomainBilling,
} from "../services/organizationDomainBillingApi";

import "../styles/DomainFee.scss";

interface Props {
  organizationId: string;
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");

/**
 * The organization's Fockis domain fee: what it costs, whether it's paid, and
 * Pay / Renew / Buy member domains buttons. Prices come from the Admin Center.
 */
export default function DomainFeeCard({ organizationId }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<{ billing: OrgDomainBilling; pricing: DomainPricingPublic } | null>(null);
  const [extra, setExtra] = useState(1);

  const load = useCallback(async () => {
    try {
      const r = await organizationDomainBillingApi.get(organizationId);
      setData(r);
    } catch {
      // Not an administrator, or the fee service isn't reachable: no card.
      setData(null);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return null;
  const { billing: b, pricing } = data;
  if (!pricing.enabled && b.state !== "exempt") return null;
  if (b.state === "free" && b.memberDomainPrice <= 0) return null;

  const pay = (kind: "renew" | "members", members?: number) =>
    navigate(`/organizations/${encodeURIComponent(organizationId)}/identity/domains/pay?kind=${kind}${members ? `&members=${members}` : ""}`);

  const priceLine = [
    b.price > 0 ? `${money(b.price, b.currency)} ${perPeriod(b.periodMonths)} for the organization domain` : "",
    b.memberDomainPrice > 0 ? `${money(b.memberDomainPrice, b.currency)} ${perPeriod(b.periodMonths)} per member domain` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // Before the base domain exists: just tell them the price.
  if (b.state === "no_domain") {
    const typePrice = b.price;
    return (
      <section className="domain-fee domain-fee--info">
        <div className="domain-fee__body">
          <span className="eyebrow">Fockis domain fee</span>
          <h2>{typePrice > 0 ? `${money(typePrice, b.currency)} ${perPeriod(b.periodMonths)}` : "Your organization domain is free"}</h2>
          <p>
            {typePrice > 0
              ? `Create your ${b.organizationTypeLabel.toLowerCase()} domain first. It stays reserved for you, and paying activates it.`
              : "Create your organization domain below."}
            {b.memberDomainPrice > 0 && ` Each member domain costs ${money(b.memberDomainPrice, b.currency)} ${perPeriod(b.periodMonths)}.`}
          </p>
          {b.note && <p className="domain-fee__note">{b.note}</p>}
        </div>
      </section>
    );
  }

  const tone =
    b.state === "unpaid" || b.state === "expired" ? "bad" : b.state === "grace" || (b.state === "active" && b.renewSoon) ? "warn" : "ok";

  const title = {
    unpaid: `Pay to activate ${b.baseDomain}`,
    expired: `${b.baseDomain} is paused`,
    grace: "Your domain payment is due",
    active: b.renewSoon ? "Renew your domain soon" : `${b.baseDomain} is paid`,
    paid: `${b.baseDomain} is paid`,
    exempt: `${b.baseDomain} is free for your organization`,
    free: b.memberDomainPrice > 0 ? "Member domains" : `${b.baseDomain}`,
    no_domain: "",
  }[b.state];

  const text = {
    unpaid: `Your domain is reserved. Pay ${money(b.renewTotal, b.currency)} to activate it — then you can add members and member domains.`,
    expired: "Adding members and member domains is paused until you renew. Existing member logins keep working.",
    grace: `Pay before ${fmt(b.graceEndsAt)} to keep everything running.`,
    active: b.renewSoon ? `Paid until ${fmt(b.paidUntil)}. Renewing adds another period after that date.` : `Paid until ${fmt(b.paidUntil)}.`,
    paid: "One-time fee paid.",
    exempt: "Fockis waived the domain fee for your organization.",
    free: b.memberDomainPrice > 0 ? `Your organization domain is free. Member domains cost ${money(b.memberDomainPrice, b.currency)} ${perPeriod(b.periodMonths)} each.` : "",
    no_domain: "",
  }[b.state];

  return (
    <section className={`domain-fee domain-fee--${tone}`}>
      <div className="domain-fee__body">
        <span className="eyebrow">Fockis domain fee</span>
        <h2>{title}</h2>
        <p>{text}</p>
        {priceLine && b.state !== "exempt" && <p className="domain-fee__price">{priceLine}</p>}
        {b.memberDomainsAllowed !== null && b.state !== "unpaid" && b.state !== "expired" && (
          <p className="domain-fee__members">
            Member domains: <strong>{b.memberDomainsUsed}</strong> used of <strong>{b.memberDomainsAllowed}</strong> paid
          </p>
        )}
        {b.note && <p className="domain-fee__note">{b.note}</p>}
      </div>

      <div className="domain-fee__actions">
        {b.canRenew && (
          <button type="button" className="domain-add-link" onClick={() => pay("renew")}>
            {b.state === "unpaid" ? "Pay & activate" : b.state === "free" ? "Buy member domains" : "Renew"}
            {b.renewTotal > 0 && b.state !== "free" ? ` · ${money(b.renewTotal, b.currency)}` : ""}
          </button>
        )}
        {b.canBuyMemberDomains && (
          <div className="domain-fee__buy">
            <label>
              <span>More member domains</span>
              <input type="number" min={1} max={1000} value={extra} onChange={(e) => setExtra(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))} />
            </label>
            <button type="button" className="domain-users-link" onClick={() => pay("members", extra)}>
              Buy {extra}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
