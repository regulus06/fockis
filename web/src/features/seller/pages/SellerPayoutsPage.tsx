import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";

import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { useActiveStore } from "../store/activeStore";
import {
  payoutErrorMessage,
  payoutsApi,
  type PayoutStatus,
} from "../services/payoutsApi";

import "../styles/SellerPayoutsPage.scss";

type Stage = "not_connected" | "incomplete" | "reviewing" | "active";

function getStage(status: PayoutStatus | null): Stage {
  if (!status || !status.connected) return "not_connected";
  if (status.readyForPayouts) return "active";
  if (!status.detailsSubmitted || status.requirementsDue.length > 0) {
    return "incomplete";
  }
  return "reviewing";
}

/**
 * Readable labels for Stripe Accounts v2 requirement descriptions,
 * e.g. "identity.attestations.terms_of_service.account.date".
 * Checked in order; the first matching fragment wins.
 */
const REQUIREMENT_RULES: Array<[string, string]> = [
  ["terms_of_service", "Accept Stripe's terms of service"],
  ["external_account", "Bank account for deposits"],
  ["bank_account", "Bank account for deposits"],
  ["payout_method", "Bank account for deposits"],
  ["business_url", "Business website or product description"],
  ["product_description", "Business website or product description"],
  ["entity_type", "Business type (individual or company)"],
  ["dob", "Date of birth"],
  ["date_of_birth", "Date of birth"],
  ["ssn_last_4", "Last 4 digits of SSN"],
  ["id_number", "Tax ID (SSN or EIN)"],
  ["tax_id", "Tax ID (SSN or EIN)"],
  ["verification.document", "Photo ID"],
  ["documents", "Photo ID"],
  ["address", "Address"],
  ["phone", "Phone number"],
  ["email", "Email address"],
  ["given_name", "Legal name"],
  ["surname", "Legal name"],
  ["first_name", "Legal name"],
  ["last_name", "Legal name"],
  ["registered_name", "Business name"],
  ["mcc", "Business category"],
  ["representative", "Account representative details"],
  ["owners", "Business owner details"],
  ["directors", "Business director details"],
  ["executives", "Business executive details"],
];

/** Turns Stripe requirement keys into readable labels. */
function requirementLabel(key: string): string {
  const normalized = key.toLowerCase();
  for (const [fragment, label] of REQUIREMENT_RULES) {
    if (normalized.includes(fragment)) return label;
  }

  const known: Record<string, string> = {
    external_account: "Bank account",
    "business_profile.url": "Business website",
    "business_profile.mcc": "Business category",
    "business_profile.product_description": "Product description",
    tos_acceptance: "Accept Stripe terms",
    "individual.dob.day": "Date of birth",
    "individual.dob.month": "Date of birth",
    "individual.dob.year": "Date of birth",
    "individual.ssn_last_4": "Last 4 digits of SSN",
    "individual.id_number": "Tax ID number",
    "individual.verification.document": "ID document",
    "individual.address.line1": "Home address",
    "individual.phone": "Phone number",
    "individual.email": "Email",
    "individual.first_name": "First name",
    "individual.last_name": "Last name",
    business_type: "Business type",
  };

  if (known[key]) return known[key];

  const last = key.split(".").pop() ?? key;
  return last.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function SellerPayoutsPage() {
  const { activeStore } = useActiveStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const storeId =
    searchParams.get("storeId") ||
    activeStore?._id ||
    localStorage.getItem("activeStoreId") ||
    "";

  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handledReturn = useRef(false);

  const loadStatus = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      setStatus(await payoutsApi.getStatus(storeId));
    } catch (err) {
      setError(payoutErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const startOnboarding = useCallback(async () => {
    if (!storeId) return;

    setRedirecting(true);
    setError("");

    try {
      const url = await payoutsApi.startOnboarding(storeId);
      window.location.href = url;
    } catch (err) {
      setError(payoutErrorMessage(err));
      setRedirecting(false);
    }
  }, [storeId]);

  async function openDashboard() {
    if (!storeId) return;

    setOpeningDashboard(true);
    setError("");

    try {
      const url = await payoutsApi.getDashboardLink(storeId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(payoutErrorMessage(err));
    } finally {
      setOpeningDashboard(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Handle returning from Stripe (?done=1) or an expired link (?refresh=1).
  useEffect(() => {
    if (handledReturn.current || !storeId) return;

    const done = searchParams.get("done") === "1";
    const refresh = searchParams.get("refresh") === "1";
    if (!done && !refresh) return;

    handledReturn.current = true;

    const next = new URLSearchParams(searchParams);
    next.delete("done");
    next.delete("refresh");
    setSearchParams(next, { replace: true });

    if (done) {
      setNotice("Thanks! We're checking your payout setup with Stripe.");
    } else {
      setNotice("Your setup link expired. Opening a new one…");
      void startOnboarding();
    }
  }, [searchParams, setSearchParams, startOnboarding, storeId]);

  const stage = getStage(status);
  const requirements = Array.from(
    new Set((status?.requirementsDue ?? []).map(requirementLabel)),
  );

  if (!storeId) {
    return (
      <div className="seller-payouts">
        <div className="payouts-body">
          <div className="empty-state">
            <p>No store selected</p>
            <span>Choose a store first, then come back to set up payouts.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-payouts">
      <div className="payouts-body">
        <div className="payouts-page-head">
          <div className="eyebrow">Seller Center</div>
          <h1>Payouts</h1>
          <p>
            Get paid for your sales{activeStore?.name ? ` at ${activeStore.name}` : ""}.
            Payments are handled securely by Stripe.
          </p>
        </div>

        {notice && (
          <div className="payouts-alert payouts-alert--info">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="payouts-alert payouts-alert--error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <section className={`payouts-status-card is-${stage}`}>
          {loading ? (
            <div className="payouts-loading">
              <Loader2 size={20} className="spin" />
              <span>Checking payout status…</span>
            </div>
          ) : (
            <>
              <div className="payouts-status-head">
                <div className="payouts-status-icon">
                  {stage === "active" && <CheckCircle2 size={26} />}
                  {stage === "reviewing" && <Clock size={26} />}
                  {stage === "incomplete" && <AlertCircle size={26} />}
                  {stage === "not_connected" && <Banknote size={26} />}
                </div>

                <div className="payouts-status-text">
                  <span className={`payouts-pill is-${stage}`}>
                    {stage === "active" && "Payouts active"}
                    {stage === "reviewing" && "Under review"}
                    {stage === "incomplete" && "Action needed"}
                    {stage === "not_connected" && "Not set up"}
                  </span>

                  <h2>
                    {stage === "active" && "You're all set to get paid"}
                    {stage === "reviewing" && "Stripe is reviewing your details"}
                    {stage === "incomplete" && "Finish setting up payouts"}
                    {stage === "not_connected" && "Set up payouts to get paid"}
                  </h2>

                  <p>
                    {stage === "active" &&
                      "Your earnings are sent to your bank automatically after you ship each order."}
                    {stage === "reviewing" &&
                      "This usually takes a few minutes. Any sales you ship in the meantime will be paid once you're approved."}
                    {stage === "incomplete" &&
                      "Stripe needs a bit more information before it can send money to your bank."}
                    {stage === "not_connected" &&
                      "Connect a bank account through Stripe. It takes about 5 minutes."}
                  </p>
                </div>
              </div>

              {stage === "incomplete" && requirements.length > 0 && (
                <p className="payouts-requirements-intro">
                  Click <strong>Continue setup</strong> to give Stripe:
                </p>
              )}

              {stage === "incomplete" && requirements.length > 0 && (
                <ul className="payouts-requirements">
                  {requirements.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              )}

              <div className="payouts-actions">
                {stage === "active" ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openDashboard}
                    disabled={openingDashboard}
                  >
                    {openingDashboard ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <ExternalLink size={16} />
                    )}
                    View payouts &amp; balance
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startOnboarding}
                    disabled={redirecting}
                  >
                    {redirecting ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Banknote size={16} />
                    )}
                    {stage === "not_connected"
                      ? "Set up payouts"
                      : "Continue setup"}
                  </button>
                )}

                {stage !== "active" && status?.connected && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={openDashboard}
                    disabled={openingDashboard || !status.detailsSubmitted}
                    title={
                      status.detailsSubmitted
                        ? undefined
                        : "Available after you submit your details"
                    }
                  >
                    <ExternalLink size={16} />
                    Stripe dashboard
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void loadStatus()}
                  disabled={loading}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </>
          )}
        </section>

        <section className="payouts-how">
          <h3>How payouts work</h3>

          <div className="payouts-steps">
            <div className="payouts-step">
              <ShieldCheck size={20} />
              <div>
                <strong>Connect once</strong>
                <span>
                  Add your bank account through Stripe. Fockis never sees your
                  bank or ID details.
                </span>
              </div>
            </div>

            <div className="payouts-step">
              <Truck size={20} />
              <div>
                <strong>Ship the order</strong>
                <span>
                  When you buy the shipping label, your earnings for that order
                  are released.
                </span>
              </div>
            </div>

            <div className="payouts-step">
              <Banknote size={20} />
              <div>
                <strong>Get paid</strong>
                <span>
                  Stripe deposits your earnings (minus the Fockis fee) to your
                  bank automatically.
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
