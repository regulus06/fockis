import { useEffect, useState } from "react";
import type { CreditChannel, CreditPackage, PaymentMethod } from "../types/platform.types";
import { plansApi } from "../services/plansApi";
import { billingApi } from "../services/billingApi";
import { USE_MOCKS } from "../services/httpClient";
import { useAction } from "../hooks/useMailchimp";
import { Modal } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { Notice, Skeleton } from "./ui/Feedback";
import { Segmented } from "./ui/Tabs";
import { Icon } from "./ui/Icon";
import { CHANNEL_NAME, formatMoney } from "../utils/credits";
import { cx, formatNumber } from "../utils/format";

interface Props {
  open: boolean;
  businessId: string;
  businessName: string;
  initialChannel: CreditChannel;
  /** Pre-select the smallest package that covers this many credits. */
  minimumCredits?: number;
  onClose: () => void;
  onPurchased: () => void;
}

/** Package picker + Stripe-ready checkout. Prices come from the API. */
export function PurchaseCreditsModal({ open, businessId, businessName, initialChannel, minimumCredits = 0, onClose, onPurchased }: Props) {
  const run = useAction();
  const [channel, setChannel] = useState<CreditChannel>(initialChannel);
  const [packages, setPackages] = useState<CreditPackage[] | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setChannel(initialChannel);
  }, [open, initialChannel]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setPackages(null);
    Promise.all([plansApi.listPackages(channel), billingApi.getPaymentMethods(businessId)]).then(([pk, pm]) => {
      if (!live) return;
      setPackages(pk);
      setMethods(pm);
      const fit = pk.find((p) => p.credits >= minimumCredits) ?? pk[pk.length - 1];
      setSelected(fit?.packageId ?? "");
    });
    return () => {
      live = false;
    };
  }, [open, channel, businessId, minimumCredits]);

  const pkg = packages?.find((p) => p.packageId === selected);
  const card = methods.find((m) => m.isDefault) ?? methods[0];

  const checkout = async () => {
    if (!pkg) return;
    setBusy(true);
    const req = { kind: "credits" as const, packageId: pkg.packageId, paymentMethodId: card?.id };
    const session = await run(() => billingApi.createCheckoutSession(businessId, req));
    if (session?.mode === "redirect" && session.url) {
      window.location.assign(session.url);
      return;
    }
    if (session?.mode === "mock") {
      const done = await run(() => billingApi.completeMockCheckout(businessId, req), `Added ${formatNumber(pkg.credits)} ${CHANNEL_NAME[pkg.channel]} credits (demo purchase).`);
      if (done) {
        onPurchased();
        onClose();
      }
    }
    setBusy(false);
  };

  return (
    <Modal
      open={open}
      title={`Buy ${CHANNEL_NAME[channel]} credits`}
      description={`For ${businessName}. Purchased credits don't expire at renewal.`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="lock" loading={busy} disabled={!pkg} onClick={checkout}>
            {pkg ? `Continue to secure checkout · ${formatMoney(pkg.price, "Price on checkout")}` : "Choose a package"}
          </Button>
        </>
      }
    >
      <Segmented<CreditChannel> label="Credit type" value={channel} onChange={setChannel} options={[{ id: "email", label: "Email credits", icon: <Icon name="mail" size={14} /> }, { id: "sms", label: "SMS credits", icon: <Icon name="message" size={14} /> }]} />
      {!packages ? (
        <Skeleton height={220} />
      ) : (
        <div className="fm-packages" role="radiogroup" aria-label="Credit package">
          {packages.map((p) => (
            <button key={p.packageId} type="button" role="radio" aria-checked={p.packageId === selected} className={cx("fm-package", p.packageId === selected && "is-active")} onClick={() => setSelected(p.packageId)}>
              <strong>{formatNumber(p.credits)}</strong>
              <span>{CHANNEL_NAME[p.channel]} credits</span>
              <em>{formatMoney(p.price, "Price on checkout")}</em>
              {p.price && <small>{formatMoney({ amount: Math.round((p.price.amount / p.credits) * (p.channel === "email" ? 1000 : 100)), currency: p.price.currency })} per {p.channel === "email" ? "1,000" : "100"}</small>}
              {(p.bestValue || p.label) && <span className="fm-package__tag">{p.bestValue ? "Best value" : p.label}</span>}
              {minimumCredits > 0 && p.credits >= minimumCredits && p.packageId === selected && <span className="fm-package__fit">Covers your shortfall</span>}
            </button>
          ))}
        </div>
      )}
      <div className="fm-paycard">
        <Icon name="receipt" size={16} />
        {card ? <span>Pay with {card.brand} ending {card.last4}</span> : <span>You'll add a card on the secure checkout page.</span>}
      </div>
      <Notice icon="lock">
        Payment is handled by Stripe on a secure page. Fockis never sees your card number.
        {USE_MOCKS && " Demo mode: no card is charged and credits are added instantly."}
      </Notice>
    </Modal>
  );
}
