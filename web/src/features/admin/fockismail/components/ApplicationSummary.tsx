import type { ReactNode } from "react";
import type { ApplicationDraft, ApplicationStatus, MarketingApplication } from "../types/platform.types";
import {
  APPLICATION_FLOW,
  APPLICATION_STATUS_LABELS,
  BUDGET_LABELS,
  BUSINESS_TYPE_LABELS,
  CHANNEL_LABELS,
  CONTACT_METHOD_LABELS,
  GOAL_LABELS,
  INTEGRATION_LABELS,
  SERVICE_INFO,
  TIMELINE_LABELS,
} from "../utils/platformLabels";
import { Icon } from "./ui/Icon";
import { cx, formatDateTime } from "../utils/format";

export type SummarySectionKey =
  | "business" | "contact" | "goals" | "services" | "products" | "customers"
  | "marketing" | "branding" | "budget" | "timeline" | "integrations";

const dash = (v: string) => (v && v.trim() ? v : "—");
const list = (v: string[]) => (v.length ? v.join(", ") : "—");

function Rows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="fm-deflist">
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
}

/** Full application readout. Used by the review step, the success page, and agency review. */
export function ApplicationSummary({ app, onEdit }: { app: ApplicationDraft; onEdit?: (section: SummarySectionKey) => void }) {
  const sections: Array<{ key: SummarySectionKey; title: string; body: ReactNode }> = [
    { key: "business", title: "Business information", body: <Rows rows={[["Business", app.business.name], ["Type", BUSINESS_TYPE_LABELS[app.business.type]], ["Website", dash(app.business.website)], ["Email", dash(app.business.email)], ["Phone", dash(app.business.phone)], ["Address", dash(app.business.address)], ["Service area", dash(app.business.serviceArea)], ["About", dash(app.business.description)]]} /> },
    { key: "contact", title: "Contact person", body: <Rows rows={[["Name", app.contact.fullName], ["Title", dash(app.contact.jobTitle)], ["Email", app.contact.email], ["Phone", dash(app.contact.phone)], ["Prefers", CONTACT_METHOD_LABELS[app.contact.preferredMethod]]]} /> },
    { key: "goals", title: "Marketing goals", body: <Rows rows={[["Goals", list(app.goals.map((g) => GOAL_LABELS[g]))], ["In their words", dash(app.goalsDetail)]]} /> },
    { key: "services", title: "Services requested", body: app.services.length ? <ul className="fm-chipset">{app.services.map((s) => <li key={s} className="fm-chip">{SERVICE_INFO[s].label}</li>)}</ul> : <p className="fm-muted">—</p> },
    { key: "products", title: "Products & services", body: <Rows rows={[["Main products", dash(app.products.mainProducts)], ["Main services", dash(app.products.mainServices)], ["Best sellers", dash(app.products.bestSellers)], ["New offerings", dash(app.products.newOfferings)], ["Current promotions", dash(app.products.currentPromotions)], ["Average purchase", dash(app.products.averagePurchase)], ["What makes them different", dash(app.products.advantages)], ["Notes", dash(app.products.notes)]]} /> },
    { key: "customers", title: "Target customers", body: <Rows rows={[["Ideal customer", dash(app.targetCustomers.idealCustomer)], ["Age range", dash(app.targetCustomers.ageRange)], ["Location", dash(app.targetCustomers.location)], ["Customer type", dash(app.targetCustomers.customerType)], ["Sells to", app.targetCustomers.market === "b2b" ? "Businesses (B2B)" : app.targetCustomers.market === "b2c" ? "Consumers (B2C)" : "Both"], ["Interests", dash(app.targetCustomers.interests)], ["More", dash(app.targetCustomers.additional)]]} /> },
    { key: "marketing", title: "Current marketing", body: <Rows rows={[["Doing now", list(app.currentMarketing.channels.map((c) => CHANNEL_LABELS[c]))], ["What worked", dash(app.currentMarketing.whatWorked)], ["What didn't", dash(app.currentMarketing.whatDidNot)], ["Has an agency", app.currentMarketing.hasAgency === "yes" ? "Yes" : app.currentMarketing.hasAgency === "no" ? "No" : "Not sure"]]} /> },
    { key: "branding", title: "Branding", body: (
      <>
        <Rows rows={[["Colors", app.branding.colors.length ? <span className="fm-row fm-row--tight">{app.branding.colors.map((c) => <span key={c} className="fm-swatchdot" style={{ background: c }} title={c} />)}</span> : "—"], ["Fonts", dash(app.branding.fonts)], ["Files", app.branding.uploads.length ? `${app.branding.uploads.length} file${app.branding.uploads.length === 1 ? "" : "s"}` : "None yet"]]} />
        {app.branding.uploads.length > 0 && <ul className="fm-filelist">{app.branding.uploads.map((u) => <li key={u.id}><Icon name="doc" size={14} /> {u.name}</li>)}</ul>}
      </>
    ) },
    { key: "budget", title: "Budget", body: <Rows rows={[["Monthly budget", BUDGET_LABELS[app.budget]], ["Current ad spend", dash(app.currentAdSpend)]]} /> },
    { key: "timeline", title: "Timeline", body: <p>{TIMELINE_LABELS[app.timeline]}</p> },
    { key: "integrations", title: "Integrations", body: <p>{list(app.integrations.map((i) => INTEGRATION_LABELS[i].label))}</p> },
  ];
  return (
    <div className="fm-appsummary">
      {sections.map((s) => (
        <section key={s.key} className="fm-appsummary__section">
          <header>
            <h3>{s.title}</h3>
            {onEdit && <button type="button" className="fm-linkbtn" onClick={() => onEdit(s.key)}>Edit</button>}
          </header>
          {s.body}
        </section>
      ))}
    </div>
  );
}

/** Visual status timeline. Rejections and info requests show inline. */
export function StatusTimeline({ app }: { app: Pick<MarketingApplication, "status" | "statusHistory"> }) {
  const reached = new Map<ApplicationStatus, string>();
  app.statusHistory.forEach((h) => reached.set(h.status, h.at));
  const offPath = app.status === "REJECTED" || app.status === "MORE_INFORMATION_NEEDED";
  const steps: ApplicationStatus[] = offPath
    ? [...APPLICATION_FLOW.slice(0, 2), app.status]
    : APPLICATION_FLOW;
  const currentIndex = steps.indexOf(app.status);
  return (
    <ol className="fm-statusline" aria-label="Application status">
      {steps.map((st, i) => {
        const done = i < currentIndex || (i === currentIndex && st === "CONVERTED_TO_CLIENT");
        const current = i === currentIndex;
        return (
          <li key={st} className={cx(done && "is-done", current && "is-current", st === "REJECTED" && "is-rejected", st === "MORE_INFORMATION_NEEDED" && "is-waiting")} aria-current={current ? "step" : undefined}>
            <span className="fm-statusline__dot">{done ? <Icon name="check" size={12} /> : st === "REJECTED" ? <Icon name="x" size={12} /> : i + 1}</span>
            <span className="fm-statusline__text">
              <strong>{st === "NEW" ? "Submitted" : APPLICATION_STATUS_LABELS[st]}</strong>
              <small>{reached.has(st) ? formatDateTime(reached.get(st)) : "Pending"}</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
