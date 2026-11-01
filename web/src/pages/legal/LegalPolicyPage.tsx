import { Link, useLocation, useParams } from "react-router-dom";

import { policyCenterApi } from "../../features/user-policy/api/policyCenterApi";
import { PolicyBody } from "../../features/user-policy/components/PolicyUi";
import { fmtDate, useLoad } from "../../features/user-policy/components/policyUtils";
import "../../styles/FockisLegalPages.scss";

interface LegalPolicyPageProps {
  slug?: string;
}

/**
 * Public policy pages (/policies/:slug and the older short links such as
 * /privacy). The text comes from the published version in the Policy &
 * Compliance admin — nothing is hard-coded here.
 */
export default function LegalPolicyPage({ slug }: LegalPolicyPageProps) {
  const params = useParams();
  const location = useLocation();
  const currentSlug = (slug ?? params.slug ?? location.pathname.replace(/^\/+|\/+$/g, "").replace(/^policies\/?/, "")).toLowerCase();

  const list = useLoad(() => policyCenterApi.publicPolicies());
  const policy = useLoad(() => (currentSlug ? policyCenterApi.publicPolicy(currentSlug) : Promise.resolve(null)), [currentSlug]);
  const activeSlug = policy.data?.slug ?? currentSlug;

  const nav = (
    <nav className="fockis-legal__nav" aria-label="Fockis policies">
      {(list.data ?? []).map((item) => (
        <Link key={item.slug} to={`/policies/${item.slug}`} className={item.slug === activeSlug ? "is-active" : ""} aria-current={item.slug === activeSlug ? "page" : undefined}>
          {item.title}
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <Link to="/" className="fockis-legal__brand" aria-label="Fockis home">
      <span className="fockis-legal__brand-mark">F</span>
      <span>Fockis</span>
    </Link>
  );

  // Index: /policies
  if (!currentSlug) {
    return (
      <main className="fockis-legal">
        <div className="fockis-legal__container">
          <header className="fockis-legal__hero">
            {brand}
            <p className="fockis-legal__eyebrow">POLICIES &amp; SAFETY</p>
            <h1>Fockis Policies &amp; Guidelines</h1>
            <p className="fockis-legal__intro">The policies currently in effect on Fockis.</p>
          </header>
          <article className="fockis-legal__article">
            {list.loading && !list.data ? (
              <p>Loading policies…</p>
            ) : list.error ? (
              <p role="alert">{list.error}</p>
            ) : (
              <ul className="fockis-legal__index">
                {(list.data ?? []).map((p) => (
                  <li key={p.slug}>
                    <Link to={`/policies/${p.slug}`}>
                      <strong>{p.title}</strong>
                    </Link>
                    <span>
                      Version {p.version} · Effective {fmtDate(p.effectiveDate)}
                    </span>
                    {p.description && <p>{p.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </main>
    );
  }

  if (policy.loading && !policy.data) {
    return (
      <main className="fockis-legal">
        <div className="fockis-legal__container">
          {brand}
          <p role="status">Loading policy…</p>
        </div>
      </main>
    );
  }

  if (!policy.data) {
    return (
      <main className="fockis-legal">
        <div className="fockis-legal__container">
          {brand}
          <p className="fockis-legal__eyebrow">FOCKIS • LEGAL</p>
          <h1>Policy not found</h1>
          <p>{policy.error && !/not found/i.test(policy.error) ? policy.error : "This policy page could not be found. Please choose a policy below."}</p>
          {nav}
        </div>
      </main>
    );
  }

  const p = policy.data;

  return (
    <main className="fockis-legal">
      <div className="fockis-legal__container">
        <header className="fockis-legal__hero">
          {brand}
          <p className="fockis-legal__eyebrow">POLICIES &amp; SAFETY</p>
          <h1>{p.title}</h1>
          <p className="fockis-legal__effective">
            Version {p.version} · Effective date: {fmtDate(p.effectiveDate)}
            {p.updatedAt ? ` · Last updated ${fmtDate(p.updatedAt)}` : ""}
          </p>
          {p.description && <p className="fockis-legal__intro">{p.description}</p>}
        </header>

        <div className="fockis-legal__layout">
          <aside className="fockis-legal__sidebar" aria-label="Fockis policies">
            <h2>Policies</h2>
            {nav}
            <div className="fockis-legal__contact">
              <strong>Need help?</strong>
              <a href="mailto:info@fockis.com">info@fockis.com</a>
              <a href="tel:+17407290687">(740) 729-0687</a>
              <Link to="/help/contact">Contact Fockis Support</Link>
              <Link to="/settings/policy">Policy, Privacy &amp; Safety</Link>
            </div>
          </aside>

          <article className="fockis-legal__article">
            {p.sections.map((section, index) => (
              <section className="fockis-legal__section" key={`${section.heading}-${index}`}>
                {section.heading && <h2>{section.heading}</h2>}
                <PolicyBody text={section.body} />
              </section>
            ))}

            <div className="fockis-legal__contact-card">
              <h2>Questions about this policy?</h2>
              <p>
                Contact the Fockis support team from <Link to="/help/contact">Help &amp; Support</Link>. Signed-in members can review and accept updates in <Link to="/settings/policy">Policy, Privacy &amp; Safety</Link>.
              </p>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
