import {
  Link,
} from "react-router-dom";

import DomainStats from "../components/DomainStats";

import useDomainAdmin from "../hooks/useDomainAdmin";

import "../styles/DomainAdminDashboard.scss";

export default function DomainAdminDashboard() {
  const {
    stats,
    campaigns,
    authorizations,
    loading,
    error,
    refresh,
  } = useDomainAdmin();

  return (
    <div className="domain-admin-page">
      <header className="domain-admin-header">
        <div>
          <span className="domain-eyebrow">
            Super App Administration
          </span>

          <h1>
            Fockis Domains
          </h1>

          <p>
            Control domain pricing, free
            domain policies, promotions,
            authorizations, and ownership.
          </p>
        </div>

        <button
          type="button"
          className="domain-secondary-button"
          onClick={() =>
            void refresh()
          }
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </header>

      {error && (
        <div
          className="domain-admin-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <DomainStats stats={stats} />

      <section className="domain-admin-grid">
        <Link
          className="domain-admin-card"
          to="/admin/domains/settings"
        >
          <span className="domain-admin-card__icon">
            ⚙
          </span>

          <h2>
            Domain Settings
          </h2>

          <p>
            Change how many free domains
            users and organizations receive
            and control additional-domain
            pricing.
          </p>

          <strong>
            Manage settings →
          </strong>
        </Link>

        <Link
          className="domain-admin-card"
          to="/admin/domains/campaigns"
        >
          <span className="domain-admin-card__icon">
            🎁
          </span>

          <h2>
            Free Domain Campaigns
          </h2>

          <p>
            Run promotions such as
            "1,000 free domains this month."
          </p>

          <strong>
            {campaigns.length} campaigns →
          </strong>
        </Link>

        <Link
          className="domain-admin-card"
          to="/admin/domains/authorizations"
        >
          <span className="domain-admin-card__icon">
            👑
          </span>

          <h2>
            Authorizations
          </h2>

          <p>
            Give specific users or businesses
            additional free-domain access.
          </p>

          <strong>
            {authorizations.length} authorizations →
          </strong>
        </Link>

        <Link
          className="domain-admin-card"
          to="/admin/domains/manage"
        >
          <span className="domain-admin-card__icon">
            🌐
          </span>

          <h2>
            Domain Management
          </h2>

          <p>
            Search and manage every Fockis
            domain and its ownership.
          </p>

          <strong>
            Manage domains →
          </strong>
        </Link>
      </section>

      <section className="domain-admin-info">
        <h2>
          How your domain system works
        </h2>

        <div className="domain-admin-info__steps">
          <div>
            <span>1</span>
            <strong>
              Global Policy
            </strong>
            <p>
              Set the default number of free
              domains and prices.
            </p>
          </div>

          <div>
            <span>2</span>
            <strong>
              Campaigns
            </strong>
            <p>
              Create temporary promotions
              with a fixed number of free
              domains.
            </p>
          </div>

          <div>
            <span>3</span>
            <strong>
              Overrides
            </strong>
            <p>
              Give selected users or
              organizations special free
              access.
            </p>
          </div>

          <div>
            <span>4</span>
            <strong>
              Domain Ownership
            </strong>
            <p>
              Every domain remains uniquely
              assigned to one owner.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}