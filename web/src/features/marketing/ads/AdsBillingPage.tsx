/* ============================================================================
   FOCKIS ADS — BILLING
   Budget overview per campaign. Budgets are edited per campaign through
   the existing GET/PUT /marketing/billing/campaign/:id endpoints.
============================================================================ */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Wallet } from "lucide-react";

import {
  adsPaths,
  computeTotals,
  formatMoney,
  sortByRecent,
} from "./adsModel";
import { StatusChip } from "./AdsTiles";
import { useAdsData } from "./useAdsData";

export default function AdsBillingPage() {
  const data = useAdsData();
  const totals = useMemo(() => computeTotals(data.campaigns), [data.campaigns]);
  const rows = useMemo(() => sortByRecent(data.campaigns), [data.campaigns]);

  const committed = data.campaigns
    .filter((c) => c.status === "ACTIVE" || c.status === "PAUSED" || c.status === "PENDING_REVIEW")
    .reduce((sum, c) => sum + Math.max(0, c.totalBudget - c.spent), 0);

  return (
    <div className="fk-ads-page">
      <header className="fk-ads-pagehead">
        <div>
          <span className="fk-ads-eyebrow">Fockis Ads</span>
          <h1>Billing</h1>
          <p>Budgets cap how much each campaign can spend. Delivery stops when a budget is used up.</p>
        </div>
      </header>

      {data.error && (
        <div className="fk-ads-alert" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{data.error}</span>
          <button type="button" className="fk-ads-btn fk-ads-btn--sm fk-ads-btn--ghost" onClick={() => void data.reload()}>
            Try again
          </button>
        </div>
      )}

      {data.campaigns.length > 0 && (
        <dl className="fk-ads-card fk-ads-kpi-grid">
          <div>
            <dt>Spent to date</dt>
            <dd>{formatMoney(totals.spent)}</dd>
          </div>
          <div>
            <dt>Remaining on live campaigns</dt>
            <dd>{formatMoney(committed)}</dd>
          </div>
          <div>
            <dt>Campaigns</dt>
            <dd>{totals.campaignCount}</dd>
          </div>
        </dl>
      )}

      {!data.loading && !data.error && data.campaigns.length === 0 && (
        <div className="fk-ads-empty fk-ads-empty--page">
          <Wallet size={28} aria-hidden="true" />
          <strong>No budgets yet</strong>
          <p>Each campaign has its own daily and total budget. Create a campaign to set one.</p>
          <Link to={adsPaths.create} className="fk-ads-btn fk-ads-btn--primary">
            Create campaign
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <section className="fk-ads-card fk-ads-table-card" aria-labelledby="fk-ads-budget-title">
          <div className="fk-ads-card__head">
            <h2 id="fk-ads-budget-title">Campaign budgets</h2>
          </div>
          <div className="fk-ads-table-wrap">
            <table className="fk-ads-table">
              <thead>
                <tr>
                  <th scope="col">Campaign</th>
                  <th scope="col" className="is-num">Daily</th>
                  <th scope="col" className="is-num">Total</th>
                  <th scope="col" className="is-num">Spent</th>
                  <th scope="col">Used</th>
                  <th scope="col">
                    <span className="fk-ads-sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((campaign) => {
                  const used =
                    campaign.totalBudget > 0
                      ? Math.min(1, campaign.spent / campaign.totalBudget)
                      : 0;

                  return (
                    <tr key={campaign.id}>
                      <th scope="row">
                        <Link to={adsPaths.campaign(campaign.id)}>{campaign.name}</Link>
                        <StatusChip status={campaign.status} />
                      </th>
                      <td className="is-num">{formatMoney(campaign.dailyBudget)}</td>
                      <td className="is-num">{formatMoney(campaign.totalBudget)}</td>
                      <td className="is-num">{formatMoney(campaign.spent)}</td>
                      <td>
                        <div
                          className={`fk-ads-meter${used >= 0.85 ? " is-high" : ""}`}
                          role="meter"
                          aria-label={`Budget used for ${campaign.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(used * 100)}
                        >
                          <span style={{ width: `${used * 100}%` }} />
                        </div>
                      </td>
                      <td>
                        <Link className="fk-ads-link" to={adsPaths.campaignBudget(campaign.id)}>
                          Adjust
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
