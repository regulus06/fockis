import React from "react";
import { Link } from "react-router-dom";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchHomePage.scss";

const logo2 = "/Fockis-Logo/fockis2.png";

/**
 * ============================================================
 * FOCKIS ORG ROUTES
 * ============================================================
 */
const organizationRoutes = {
  home: "/church",
  organizations: "/church/organizations",
  newOrganization: "/church/organizations/new",
  memberPortal: "/church/member-portal",
  identity: "/organization-identity",
  admin: "/church/admin",
};

type OrganizationTypeKey =
  | "faithReligion"
  | "education"
  | "nonprofitCharity"
  | "governmentCivic"
  | "politicalAdvocacy"
  | "businessProfessional"
  | "sportsRecreation"
  | "artsCultureMedia"
  | "communitySocial"
  | "technology"
  | "international"
  | "other";

const organizationTypes: Array<{
  icon: string;
  key: OrganizationTypeKey;
  category: string;
}> = [
  {
    icon: "⛪",
    key: "faithReligion",
    category: "Faith & Religion",
  },
  {
    icon: "🏫",
    key: "education",
    category: "Education",
  },
  {
    icon: "❤️",
    key: "nonprofitCharity",
    category: "Nonprofit & Charity",
  },
  {
    icon: "🏛️",
    key: "governmentCivic",
    category: "Government & Civic",
  },
  {
    icon: "🗳️",
    key: "politicalAdvocacy",
    category: "Political & Advocacy",
  },
  {
    icon: "💼",
    key: "businessProfessional",
    category: "Business & Professional",
  },
  {
    icon: "⚽",
    key: "sportsRecreation",
    category: "Sports & Recreation",
  },
  {
    icon: "🎨",
    key: "artsCultureMedia",
    category: "Arts, Culture & Media",
  },
  {
    icon: "🤝",
    key: "communitySocial",
    category: "Community & Social",
  },
  {
    icon: "💻",
    key: "technology",
    category: "Technology",
  },
  {
    icon: "🌎",
    key: "international",
    category: "International",
  },
  {
    icon: "✨",
    key: "other",
    category: "Other",
  },
];

type FeatureKey =
  | "discover"
  | "members"
  | "groups"
  | "events"
  | "communication"
  | "mediaLive"
  | "organizationTools"
  | "administration";

const features: Array<{
  icon: string;
  key: FeatureKey;
}> = [
  {
    icon: "🔎",
    key: "discover",
  },
  {
    icon: "👥",
    key: "members",
  },
  {
    icon: "🧩",
    key: "groups",
  },
  {
    icon: "📅",
    key: "events",
  },
  {
    icon: "💬",
    key: "communication",
  },
  {
    icon: "🎥",
    key: "mediaLive",
  },
  {
    icon: "📊",
    key: "organizationTools",
  },
  {
    icon: "⚙️",
    key: "administration",
  },
];

export default function ChurchHomePage() {
  const { t } = useFockisTranslation();

  return (
    <div className="church-home-page">
      {/* ============================================================
          HEADER
      ============================================================ */}
      <header className="church-home-header">
        <div className="church-home-header-inner">
          <Link
            to={organizationRoutes.home}
            className="church-brand"
            aria-label="Fockis Org"
          >
            <img
              src={logo2}
              alt="Fockis"
              className="church-brand-logo"
            />

            <div className="church-brand-text">
              <strong>{t("church.home.brand")}</strong>

              <span>
                {t("church.home.tagline")}
              </span>
            </div>
          </Link>

          <nav
            className="church-main-nav"
            aria-label={t("church.home.navigation")}
          >
            <Link to={organizationRoutes.home}>
              {t("church.home.nav.home")}
            </Link>

            <Link to={organizationRoutes.organizations}>
              {t("church.home.nav.organizations")}
            </Link>

            <Link to={organizationRoutes.memberPortal}>
              {t("church.home.nav.myOrganizations")}
            </Link>
          </nav>

          <div className="church-home-header-actions">
            <LanguageSelector />

            <Link
              to={organizationRoutes.newOrganization}
              className="church-header-button"
            >
              {t("church.home.createOrganization")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ============================================================
            ORGANIZATION IDENTITY
        ============================================================ */}
        <section className="church-identity-section">
          <div className="church-section-container">
            <Link
              to={organizationRoutes.identity}
              className="church-identity-card"
            >
              <div className="church-identity-icon">
                🪪
              </div>

              <div className="church-identity-content">
                <span className="church-eyebrow">
                  {t("church.home.identity.eyebrow")}
                </span>

                <h2>
                  {t("church.home.identity.title")}
                </h2>

                <p>
                  {t("church.home.identity.description")}
                </p>

                <span className="church-identity-link">
                  {t("church.home.identity.manage")} →
                </span>
              </div>

              <div
                className="church-identity-arrow"
                aria-hidden="true"
              >
                →
              </div>
            </Link>
          </div>
        </section>

        {/* ============================================================
            HERO
        ============================================================ */}
        <section className="church-hero">
          <div className="church-hero-overlay" />

          <div className="church-hero-content">
            <span className="church-eyebrow">
              {t("church.home.hero.eyebrow")}
            </span>

            <h1>
              {t("church.home.hero.title")}
              <br />
              <strong>
                {t("church.home.hero.titleStrong")}
              </strong>
            </h1>

            <p>
              {t("church.home.hero.description")}
            </p>

            <div className="church-hero-actions">
              <Link
                to={organizationRoutes.organizations}
                className="church-primary-button"
              >
                {t("church.home.browseOrganizations")}
              </Link>

              <Link
                to={organizationRoutes.newOrganization}
                className="church-secondary-button"
              >
                {t("church.home.createOrganization")}
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================
            DISCOVERY
        ============================================================ */}
        <section className="church-section church-discovery-section">
          <div className="church-section-container">
            <div className="church-section-heading compact">
              <div>
                <span className="church-eyebrow">
                  {t("church.home.discovery.eyebrow")}
                </span>

                <h2>
                  {t("church.home.discovery.title")}
                </h2>
              </div>

              <Link
                to={organizationRoutes.organizations}
                className="church-section-link"
              >
                {t("church.home.discovery.viewAll")} →
              </Link>
            </div>

            {/* SEARCH BAR */}
            <Link
              to={organizationRoutes.organizations}
              className="church-search-box"
            >
              <span>
                🔎
              </span>

              <div>
                <strong>
                  {t("church.home.discovery.searchTitle")}
                </strong>

                <small>
                  {t("church.home.discovery.searchDescription")}
                </small>
              </div>

              <span className="church-search-arrow">
                →
              </span>
            </Link>

            {/* ORGANIZATION TYPE GRID */}
            <div className="church-organization-type-grid">
              {organizationTypes.map((type) => (
                <Link
                  key={type.key}
                  to={`${organizationRoutes.organizations}?category=${encodeURIComponent(
                    type.category,
                  )}`}
                  className="church-organization-type"
                >
                  <div className="church-organization-type-icon">
                    {type.icon}
                  </div>

                  <div className="church-organization-type-content">
                    <h3>
                      {t(
                        `church.home.organizationTypes.${type.key}.title`,
                      )}
                    </h3>

                    <p>
                      {t(
                        `church.home.organizationTypes.${type.key}.description`,
                      )}
                    </p>

                    <span>
                      {t(
                        `church.home.organizationTypes.${type.key}.categories`,
                      )}
                    </span>
                  </div>

                  <strong className="church-type-arrow">
                    →
                  </strong>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================
            PLATFORM
        ============================================================ */}
        <section className="church-section church-platform-section">
          <div className="church-section-container">
            <div className="church-section-heading compact centered">
              <span className="church-eyebrow">
                {t("church.home.platform.eyebrow")}
              </span>

              <h2>
                {t("church.home.platform.title")}
              </h2>

              <p>
                {t("church.home.platform.description")}
              </p>
            </div>

            <div className="church-feature-grid">
              {features.map((feature) => (
                <article
                  key={feature.key}
                  className="church-feature-card"
                >
                  <div className="church-feature-icon">
                    {feature.icon}
                  </div>

                  <div>
                    <h3>
                      {t(
                        `church.home.features.${feature.key}.title`,
                      )}
                    </h3>

                    <p>
                      {t(
                        `church.home.features.${feature.key}.description`,
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================
            MY ORGANIZATIONS
        ============================================================ */}
        <section className="church-member-section">
          <div className="church-section-container">
            <div className="church-member-panel">
              <div className="church-member-content">
                <span className="church-eyebrow">
                  {t("church.home.myOrganizations.eyebrow")}
                </span>

                <h2>
                  {t("church.home.myOrganizations.title")}
                  <br />
                  {t("church.home.myOrganizations.titleSecond")}
                </h2>

                <p>
                  {t("church.home.myOrganizations.description")}
                </p>

                <Link
                  to={organizationRoutes.memberPortal}
                  className="church-primary-button"
                >
                  {t("church.home.myOrganizations.open")}
                </Link>
              </div>

              <div className="church-member-visual">
                <div className="church-member-circle">
                  👥
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            ADMIN
        ============================================================ */}
        <section className="church-admin-section">
          <div className="church-section-container">
            <Link
              to={organizationRoutes.admin}
              className="church-admin-panel"
            >
              <div className="church-admin-icon">
                ⚙️
              </div>

              <div className="church-admin-content">
                <span className="church-eyebrow">
                  {t("church.home.admin.eyebrow")}
                </span>

                <h2>
                  {t("church.home.admin.title")}
                </h2>

                <p>
                  {t("church.home.admin.description")}
                </p>

                <span className="church-admin-link">
                  {t("church.home.admin.open")} →
                </span>
              </div>

              <div className="church-admin-arrow">
                →
              </div>
            </Link>
          </div>
        </section>

        {/* ============================================================
            CREATE
        ============================================================ */}
        <section className="church-create-section">
          <div className="church-create-panel">
            <div>
              <span className="church-eyebrow">
                {t("church.home.create.eyebrow")}
              </span>

              <h2>
                {t("church.home.create.title")}
              </h2>

              <p>
                {t("church.home.create.description")}
              </p>
            </div>

            <div className="church-create-actions">
              <Link
                to={organizationRoutes.newOrganization}
                className="church-primary-button"
              >
                {t("church.home.createOrganization")}
              </Link>

              <Link
                to={organizationRoutes.organizations}
                className="church-secondary-button"
              >
                {t("church.home.browseOrganizations")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================
          FOOTER
      ============================================================ */}
      <footer className="church-home-footer">
        <div className="church-footer-inner">
          <div className="church-footer-brand">
            <Link
              to={organizationRoutes.home}
              className="church-brand"
            >
              <img
                src={logo2}
                alt="Fockis"
                className="church-brand-logo"
              />

              <div className="church-brand-text">
                <strong>
                  {t("church.home.brand")}
                </strong>

                <span>
                  {t("church.home.tagline")}
                </span>
              </div>
            </Link>

            <p>
              {t("church.home.footer.description")}
            </p>
          </div>

          <div className="church-footer-column">
            <h4>
              {t("church.home.footer.organizations")}
            </h4>

            <Link to={organizationRoutes.organizations}>
              {t("church.home.browseOrganizations")}
            </Link>

            <Link to={organizationRoutes.memberPortal}>
              {t("church.home.nav.myOrganizations")}
            </Link>

            <Link to={organizationRoutes.newOrganization}>
              {t("church.home.createOrganization")}
            </Link>

            <Link to={organizationRoutes.identity}>
              {t("church.home.identity.title")}
            </Link>
          </div>

          <div className="church-footer-column">
            <h4>
              {t("church.home.footer.discover")}
            </h4>

            <Link
              to={`${organizationRoutes.organizations}?category=Faith%20%26%20Religion`}
            >
              {t(
                "church.home.organizationTypes.faithReligion.title",
              )}
            </Link>

            <Link
              to={`${organizationRoutes.organizations}?category=Education`}
            >
              {t(
                "church.home.organizationTypes.education.title",
              )}
            </Link>

            <Link
              to={`${organizationRoutes.organizations}?category=Nonprofit%20%26%20Charity`}
            >
              {t(
                "church.home.organizationTypes.nonprofitCharity.title",
              )}
            </Link>

            <Link
              to={`${organizationRoutes.organizations}?category=Business%20%26%20Professional`}
            >
              {t(
                "church.home.organizationTypes.businessProfessional.title",
              )}
            </Link>
          </div>
        </div>

        <div className="church-footer-bottom">
          <span>
            © {new Date().getFullYear()} Fockis
          </span>

          <span>
            {t("church.home.brand")}
          </span>
        </div>
      </footer>
    </div>
  );
}