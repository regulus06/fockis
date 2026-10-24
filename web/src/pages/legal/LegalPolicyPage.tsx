import React from "react";
import { Link, useLocation } from "react-router-dom";
import legalPolicies from "./legalPolicies";
import "../../styles/FockisLegalPages.scss";

interface LegalPolicyPageProps {
  slug?: string;
}

export default function LegalPolicyPage({
  slug,
}: LegalPolicyPageProps) {
  const location = useLocation();

  // Normalize the slug from the prop or current URL.
  const currentSlug = (
    slug ?? location.pathname.replace(/^\/+|\/+$/g, "")
  ).toLowerCase();

  // Find the matching policy without requiring a specific slug format.
  const policy = legalPolicies.find(
    (item) => item.slug.toLowerCase() === currentSlug
  );

  if (!policy) {
    return (
      <main className="fockis-legal">
        <div className="fockis-legal__container">
          <Link
            to="/"
            className="fockis-legal__brand"
            aria-label="Fockis home"
          >
            <span className="fockis-legal__brand-mark">F</span>
            <span>Fockis</span>
          </Link>

          <p className="fockis-legal__eyebrow">FOCKIS • LEGAL</p>

          <h1>Policy not found</h1>

          <p>
            The policy page could not be found. Please choose a policy below.
          </p>

          <LegalNavigation activeSlug={currentSlug} />
        </div>
      </main>
    );
  }

  return (
    <main className="fockis-legal">
      <div className="fockis-legal__container">
        <header className="fockis-legal__hero">
          <Link
            to="/"
            className="fockis-legal__brand"
            aria-label="Fockis home"
          >
            <span className="fockis-legal__brand-mark">F</span>
            <span>Fockis</span>
          </Link>

          <p className="fockis-legal__eyebrow">
            POLICIES &amp; SAFETY
          </p>

          <h1>{policy.title}</h1>

          <p className="fockis-legal__effective">
            Effective date: {policy.effectiveDate}
          </p>

          <p className="fockis-legal__intro">
            Fockis standard accounts are for people age 13 or older.
            Higher age limits may apply where required by law or for
            specific features.
          </p>
        </header>

        <div className="fockis-legal__layout">
          <aside
            className="fockis-legal__sidebar"
            aria-label="Legal pages"
          >
            <h2>Legal pages</h2>

            <LegalNavigation activeSlug={policy.slug} />

            <div className="fockis-legal__contact">
              <strong>Need help?</strong>
              <a href="mailto:info@fockis.com">
                info@fockis.com
              </a>
              <a href="tel:+17407290687">
                (740) 729-0687
              </a>
            </div>
          </aside>

          <article className="fockis-legal__article">
            {policy.items.map((section, index) => (
              <section
                className="fockis-legal__section"
                key={`${section.heading}-${index}`}
              >
                {section.heading && <h2>{section.heading}</h2>}

                {section.paragraphs.map((block, blockIndex) => {
                  const key = `${section.heading}-${blockIndex}`;

                  if (block.kind === "bullet") {
                    return (
                      <ul key={key}>
                        <li>{block.text}</li>
                      </ul>
                    );
                  }

                  if (block.kind === "number") {
                    return (
                      <ol key={key}>
                        <li>{block.text}</li>
                      </ol>
                    );
                  }

                  return <p key={key}>{block.text}</p>;
                })}
              </section>
            ))}

            <div className="fockis-legal__contact-card">
              <h2>Contact Fockis</h2>

              <p>
                For questions about this policy, contact the Fockis
                support team.
              </p>

              <p>
                <a href="mailto:info@fockis.com">
                  info@fockis.com
                </a>
                {" · "}
                <a href="tel:+17407290687">
                  (740) 729-0687
                </a>
              </p>
            </div>

            <p className="fockis-legal__disclaimer">
              These policies describe intended rules and practices.
              Fockis must ensure its actual product behavior and data
              practices match the statements published here.
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}

function LegalNavigation({
  activeSlug,
}: {
  activeSlug: string;
}) {
  return (
    <nav className="fockis-legal__nav" aria-label="Legal policies">
      {legalPolicies.map((item) => (
        <Link
          key={item.slug}
          to={`/${item.slug}`}
          className={item.slug === activeSlug ? "is-active" : ""}
          aria-current={
            item.slug === activeSlug ? "page" : undefined
          }
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}