
import React from "react";
import { Link } from "react-router-dom";
import legalPolicies from "./legalPolicies";
import "../../styles/FockisLegalPages.scss";

export default function CopyrightPolicyPage() {
  const policy = legalPolicies.find(
    (item) => item.slug === "copyright"
  );

  if (!policy) {
    return (
      <main className="fockis-legal">
        <div className="fockis-legal__container">
          <h1>Copyright and Intellectual Property Policy</h1>
          <p>
            The copyright policy could not be found.
          </p>
          <Link to="/">Return to Fockis</Link>
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
            COPYRIGHT &amp; INTELLECTUAL PROPERTY
          </p>

          <h1>{policy.title}</h1>

          <p className="fockis-legal__effective">
            Effective date: {policy.effectiveDate}
          </p>

          <p className="fockis-legal__intro">
            Fockis respects intellectual property rights. This
            policy explains the expectations for content shared,
            uploaded, published, or sold on Fockis and how to
            contact us about suspected copyright or intellectual
            property infringement.
          </p>
        </header>

        <div className="fockis-legal__layout">
          <aside
            className="fockis-legal__sidebar"
            aria-label="Legal pages"
          >
            <h2>Legal pages</h2>

            <nav className="fockis-legal__nav">
              {legalPolicies.map((item) => (
                <Link
                  key={item.slug}
                  to={`/${item.slug}`}
                  className={
                    item.slug === policy.slug
                      ? "is-active"
                      : ""
                  }
                  aria-current={
                    item.slug === policy.slug
                      ? "page"
                      : undefined
                  }
                >
                  {item.title}
                </Link>
              ))}
            </nav>

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
                {section.heading && (
                  <h2>{section.heading}</h2>
                )}

                {section.paragraphs.map(
                  (block, blockIndex) => {
                    if (block.kind === "bullet") {
                      return (
                        <ul key={blockIndex}>
                          <li>{block.text}</li>
                        </ul>
                      );
                    }

                    if (block.kind === "number") {
                      return (
                        <ol key={blockIndex}>
                          <li>{block.text}</li>
                        </ol>
                      );
                    }

                    return (
                      <p key={blockIndex}>{block.text}</p>
                    );
                  }
                )}
              </section>
            ))}

            <section className="fockis-legal__contact-card">
              <h2>Report copyright infringement</h2>

              <p>
                If you believe content on Fockis infringes your
                copyright or other intellectual property rights,
                contact our support team. Include enough
                information to identify the material and explain
                the basis of your concern.
              </p>

              <p>
                Email:{" "}
                <a href="mailto:info@fockis.com">
                  info@fockis.com
                </a>
              </p>

              <p>
                Phone:{" "}
                <a href="tel:+17407290687">
                  (740) 729-0687
                </a>
              </p>

              <p>
                Please provide accurate information when
                submitting an infringement report.
              </p>
            </section>

            <div className="fockis-legal__back">
              <Link to="/">
                <span aria-hidden="true">←</span>{" "}
                Back to Fockis
              </Link>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
