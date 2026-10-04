import type { LandingPage } from "../types/mailchimp.types";

/** Renders a landing page's sections. Shared by the builder and preview. */
export function LandingPagePreview({ page }: { page: LandingPage }) {
  return (
    <div className="fm-lp" style={{ ["--lp-accent" as string]: page.accent }}>
      <div className="fm-lp__nav"><span className="fm-lp__brand">Fockis</span><span>fockis.com/p/{page.slug}</span></div>
      {page.sections.map((s) => (
        <section key={s.id} className={`fm-lp__section is-${s.kind}`}>
          <h2>{s.heading}</h2>
          {s.body && <p>{s.body}</p>}
          {s.kind === "features" && (
            <div className="fm-lp__features">
              {["Fast setup", "Secure payments", "Built-in audience"].map((f) => <div key={f}><strong>{f}</strong><span>Explained in a sentence.</span></div>)}
            </div>
          )}
          {s.kind === "products" && (
            <div className="fm-lp__features">
              {["Featured item", "Best seller", "New arrival"].map((f) => <div key={f}><span className="fm-lp__thumb" /><strong>{f}</strong></div>)}
            </div>
          )}
          {s.kind === "form" && (
            <div className="fm-lp__form"><span className="fm-lp__input">Email address</span><span className="fm-lp__btn">{s.buttonLabel || "Sign up"}</span></div>
          )}
          {s.kind !== "form" && s.buttonLabel && <span className="fm-lp__btn">{s.buttonLabel}</span>}
        </section>
      ))}
    </div>
  );
}
