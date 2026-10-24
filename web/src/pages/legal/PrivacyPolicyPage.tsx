
import React from "react";
import { Link } from "react-router-dom";
import legalPolicies from "./legalPolicies";
import "../../styles/FockisLegalPages.scss";

export default function PrivacyPolicyPage() {
  const policy = legalPolicies.find(
    (item) => item.slug === "privacy"
  );

  if (!policy) {
    return (
      <main className="fockis-legal">
        <div className="fockis-legal__container">
          <h1>Privacy Policy</h1>
          <p>The Privacy Policy could not be found.</p>
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
            PRIVACY &amp; DATA PROTECTION
          </p>

          <h1>{policy.title}</h1>

          <p className="fockis-legal__effective">
            Effective date: {policy.effectiveDate}
          </p>

          <p className="fockis-legal__intro">
            This Privacy Policy explains how Fockis may collect,
            use, share, and protect information when you use our
            social platform, including profiles, posts, photos,
            videos, stories, Waves, messages, live streams,
            business pages, and shop features.
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
                    item.slug === policy.slug ? "is-active" : ""
                  }
                  aria-current={
                    item.slug === policy.slug ? "page" : undefined
                  }
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            <div className="fockis-legal__contact">
              <strong>Privacy questions?</strong>
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

                  return <p key={blockIndex}>{block.text}</p>;
                })}
              </section>
            ))}

            <div className="fockis-legal__contact-card">
              <h2>Questions about your privacy?</h2>
              <p>
                Contact our support team if you have questions
                about your personal information or this policy.
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
          </article>
        </div>
      </div>
    </main>
  );
}
