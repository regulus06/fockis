import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Users,
  CalendarDays,
  Mail,
  Phone,
  User,
} from "lucide-react";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchPlanVisitPage.scss";

const LOGO = "/Fockis-Logo/fockis2.png";

interface VisitForm {
  campus: string;
  date: string;
  serviceTime: string;
  adults: string;
  children: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accessibility: string;
  notes: string;
}

const INITIAL_FORM: VisitForm = {
  campus: "",
  date: "",
  serviceTime: "",
  adults: "1",
  children: "0",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  accessibility: "",
  notes: "",
};

const CAMPUSES = [{ id: "downtown" }, { id: "north" }, { id: "south" }] as const;

const SERVICE_TIMES = [
  { id: "9am", value: "9:00 AM" },
  { id: "11am", value: "11:00 AM" },
] as const;

/* ============================================================================
   SHARED BRAND BLOCK
   Used in the success header, the main header, and the footer — factored out
   once instead of being duplicated three times.
========================================================================== */

interface PlanVisitBrandProps {
  t: (key: string) => string;
  className: string;
  logoClassName?: string;
  textClassName?: string;
}

function PlanVisitBrand({
  t,
  className,
  logoClassName = "church-plan-brand__logo",
  textClassName = "church-plan-brand__text",
}: PlanVisitBrandProps): React.JSX.Element {
  return (
    <Link to="/church" className={className} aria-label={t("church.planVisit.footer.brand")}>
      <img src={LOGO} alt="Fockis" className={logoClassName} />

      <div className={textClassName}>
        <strong>{t("church.planVisit.footer.brand")}</strong>

        <span>{t("church.planVisit.footer.tagline")}</span>
      </div>
    </Link>
  );
}

export default function ChurchPlanVisitPage(): React.JSX.Element {
  const { t, language } = useFockisTranslation();

  const [form, setForm] = useState<VisitForm>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);

  const updateForm = <K extends keyof VisitForm>(
    field: K,
    value: VisitForm[K],
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSubmitted(true);
  };

  const today = new Date().toISOString().split("T")[0];

  const formatVisitDate = (value: string): string => {
    if (!value) {
      return t("church.planVisit.success.selectedDate");
    }

    const localeMap: Record<string, string> = {
      en: "en-US",
      fr: "fr-FR",
      ht: "ht-HT",
      es: "es-ES",
    };

    return new Date(value + "T12:00:00").toLocaleDateString(
      localeMap[language] ?? "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      },
    );
  };

  /* ==========================================================================
     SUCCESS STATE
  ========================================================================== */

  if (submitted) {
    return (
      <div className="church-plan-page">
        <header className="church-plan-header">
          <div className="church-plan-header__inner">
            <PlanVisitBrand t={t} className="church-plan-brand" />

            <div className="church-plan-header-actions">
              <LanguageSelector />

              <Link to="/church" className="church-plan-back">
                <ArrowLeft size={17} />

                {t("church.planVisit.backToChurch")}
              </Link>
            </div>
          </div>
        </header>

        <main className="church-plan-success">
          <div className="church-plan-success__card">
            <div className="church-plan-success__icon">
              <Check size={32} />
            </div>

            <span className="church-plan-eyebrow">
              {t("church.planVisit.success.eyebrow")}
            </span>

            <h1>{t("church.planVisit.success.title")}</h1>

            <p>{t("church.planVisit.success.description")}</p>

            <div className="church-plan-success__details">
              <div>
                <MapPin size={18} />

                <span>
                  {form.campus || t("church.planVisit.success.selectedCampus")}
                </span>
              </div>

              <div>
                <CalendarDays size={18} />

                <span>{formatVisitDate(form.date)}</span>
              </div>

              <div>
                <Clock size={18} />

                <span>
                  {form.serviceTime ||
                    t("church.planVisit.success.selectedService")}
                </span>
              </div>
            </div>

            <div className="church-plan-success__actions">
              <Link to="/church" className="church-plan-button">
                {t("church.planVisit.success.returnToChurch")}
              </Link>

              <button
                type="button"
                className="church-plan-button church-plan-button--secondary"
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setSubmitted(false);
                }}
              >
                {t("church.planVisit.success.planAnother")}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ==========================================================================
     MAIN FORM
  ========================================================================== */

  return (
    <div className="church-plan-page">
      <header className="church-plan-header">
        <div className="church-plan-header__inner">
          <PlanVisitBrand t={t} className="church-plan-brand" />

          <nav
            className="church-plan-nav"
            aria-label={t("church.planVisit.navigationLabel")}
          >
            <Link to="/church">{t("church.planVisit.nav.home")}</Link>

            <Link to="/church#about">{t("church.planVisit.nav.about")}</Link>

            <Link to="/church#ministries">
              {t("church.planVisit.nav.ministries")}
            </Link>

            <Link to="/church#events">{t("church.planVisit.nav.events")}</Link>

            <Link to="/church#sermons">
              {t("church.planVisit.nav.sermons")}
            </Link>

            <Link to="/church/live">
              {t("church.planVisit.nav.livestream")}
            </Link>

            <Link to="/church#locations">
              {t("church.planVisit.nav.locations")}
            </Link>

            <Link to="/church#explore">
              {t("church.planVisit.nav.explore")}
            </Link>

            <Link to="/church#give">{t("church.planVisit.nav.give")}</Link>
          </nav>

          <div className="church-plan-header-actions">
            <LanguageSelector />

            <Link to="/profile" className="church-plan-member">
              {t("church.planVisit.memberPortal")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="church-plan-hero">
          <div className="church-plan-container">
            <Link to="/church" className="church-plan-hero__back">
              <ArrowLeft size={16} />

              {t("church.planVisit.backToChurch")}
            </Link>

            <div className="church-plan-hero__content">
              <span className="church-plan-eyebrow">
                {t("church.planVisit.hero.eyebrow")}
              </span>

              <h1>{t("church.planVisit.hero.title")}</h1>

              <p>{t("church.planVisit.hero.description")}</p>
            </div>
          </div>
        </section>

        <section className="church-plan-main">
          <div className="church-plan-container">
            <div className="church-plan-layout">
              <form className="church-plan-form" onSubmit={handleSubmit}>
                {/* ============================================================
                    01 · LOCATION
                ============================================================ */}

                <section className="church-plan-section">
                  <div className="church-plan-section__heading">
                    <span className="church-plan-section__number">01</span>

                    <div>
                      <span className="church-plan-section__eyebrow">
                        {t("church.planVisit.sections.location.eyebrow")}
                      </span>

                      <h2>
                        {t("church.planVisit.sections.location.title")}
                      </h2>

                      <p>
                        {t(
                          "church.planVisit.sections.location.description",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="church-plan-campus-grid">
                    {CAMPUSES.map((campus) => {
                      const campusName = t(
                        `church.planVisit.campuses.${campus.id}.name`,
                      );

                      return (
                        <label
                          key={campus.id}
                          className={`church-plan-campus ${
                            form.campus === campusName ? "is-selected" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="campus"
                            value={campusName}
                            checked={form.campus === campusName}
                            onChange={(event) =>
                              updateForm("campus", event.target.value)
                            }
                            required
                          />

                          <div className="church-plan-campus__icon">
                            <MapPin size={20} />
                          </div>

                          <div>
                            <strong>{campusName}</strong>

                            <span>
                              {t(
                                `church.planVisit.campuses.${campus.id}.address`,
                              )}
                            </span>

                            <small>
                              {t(
                                `church.planVisit.campuses.${campus.id}.description`,
                              )}
                            </small>
                          </div>

                          <span className="church-plan-campus__check">
                            <Check size={15} />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                {/* ============================================================
                    02 · SERVICE
                ============================================================ */}

                <section className="church-plan-section">
                  <div className="church-plan-section__heading">
                    <span className="church-plan-section__number">02</span>

                    <div>
                      <span className="church-plan-section__eyebrow">
                        {t("church.planVisit.sections.service.eyebrow")}
                      </span>

                      <h2>{t("church.planVisit.sections.service.title")}</h2>

                      <p>
                        {t(
                          "church.planVisit.sections.service.description",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="church-plan-form-grid">
                    <label className="church-plan-field">
                      <span>
                        <CalendarDays size={16} />

                        {t("church.planVisit.fields.visitDate")}
                      </span>

                      <input
                        type="date"
                        required
                        value={form.date}
                        min={today}
                        onChange={(event) =>
                          updateForm("date", event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="church-plan-service-grid">
                    {SERVICE_TIMES.map((service) => (
                      <label
                        key={service.id}
                        className={`church-plan-service ${
                          form.serviceTime === service.value
                            ? "is-selected"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="serviceTime"
                          value={service.value}
                          checked={form.serviceTime === service.value}
                          onChange={(event) =>
                            updateForm("serviceTime", event.target.value)
                          }
                          required
                        />

                        <Clock size={20} />

                        <div>
                          <strong>{service.value}</strong>

                          <span>
                            {t(
                              "church.planVisit.serviceTimes.morningService",
                            )}
                          </span>
                        </div>

                        <span className="church-plan-service__check">
                          <Check size={15} />
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* ============================================================
                    03 · GROUP
                ============================================================ */}

                <section className="church-plan-section">
                  <div className="church-plan-section__heading">
                    <span className="church-plan-section__number">03</span>

                    <div>
                      <span className="church-plan-section__eyebrow">
                        {t("church.planVisit.sections.group.eyebrow")}
                      </span>

                      <h2>{t("church.planVisit.sections.group.title")}</h2>

                      <p>
                        {t("church.planVisit.sections.group.description")}
                      </p>
                    </div>
                  </div>

                  <div className="church-plan-people-grid">
                    <label className="church-plan-field">
                      <span>
                        <Users size={16} />

                        {t("church.planVisit.fields.adults")}
                      </span>

                      <select
                        value={form.adults}
                        onChange={(event) =>
                          updateForm("adults", event.target.value)
                        }
                      >
                        {Array.from({ length: 10 }, (_, index) => index + 1).map(
                          (number) => (
                            <option key={number} value={String(number)}>
                              {number}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="church-plan-field">
                      <span>
                        <Users size={16} />

                        {t("church.planVisit.fields.children")}
                      </span>

                      <select
                        value={form.children}
                        onChange={(event) =>
                          updateForm("children", event.target.value)
                        }
                      >
                        {Array.from({ length: 11 }, (_, index) => index).map(
                          (number) => (
                            <option key={number} value={String(number)}>
                              {number}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                </section>

                {/* ============================================================
                    04 · CONTACT
                ============================================================ */}

                <section className="church-plan-section">
                  <div className="church-plan-section__heading">
                    <span className="church-plan-section__number">04</span>

                    <div>
                      <span className="church-plan-section__eyebrow">
                        {t("church.planVisit.sections.contact.eyebrow")}
                      </span>

                      <h2>{t("church.planVisit.sections.contact.title")}</h2>

                      <p>
                        {t(
                          "church.planVisit.sections.contact.description",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="church-plan-form-grid">
                    <label className="church-plan-field">
                      <span>
                        <User size={16} />

                        {t("church.planVisit.fields.firstName")}
                      </span>

                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(event) =>
                          updateForm("firstName", event.target.value)
                        }
                        placeholder={t(
                          "church.planVisit.placeholders.firstName",
                        )}
                      />
                    </label>

                    <label className="church-plan-field">
                      <span>
                        <User size={16} />

                        {t("church.planVisit.fields.lastName")}
                      </span>

                      <input
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(event) =>
                          updateForm("lastName", event.target.value)
                        }
                        placeholder={t(
                          "church.planVisit.placeholders.lastName",
                        )}
                      />
                    </label>

                    <label className="church-plan-field">
                      <span>
                        <Mail size={16} />

                        {t("church.planVisit.fields.email")}
                      </span>

                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) =>
                          updateForm("email", event.target.value)
                        }
                        placeholder={t(
                          "church.planVisit.placeholders.email",
                        )}
                      />
                    </label>

                    <label className="church-plan-field">
                      <span>
                        <Phone size={16} />

                        {t("church.planVisit.fields.phone")}

                        <small>{t("church.planVisit.optional")}</small>
                      </span>

                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(event) =>
                          updateForm("phone", event.target.value)
                        }
                        placeholder={t(
                          "church.planVisit.placeholders.phone",
                        )}
                      />
                    </label>
                  </div>
                </section>

                {/* ============================================================
                    05 · NOTES
                ============================================================ */}

                <section className="church-plan-section">
                  <div className="church-plan-section__heading">
                    <span className="church-plan-section__number">05</span>

                    <div>
                      <span className="church-plan-section__eyebrow">
                        {t("church.planVisit.sections.notes.eyebrow")}
                      </span>

                      <h2>{t("church.planVisit.sections.notes.title")}</h2>

                      <p>
                        {t("church.planVisit.sections.notes.description")}
                      </p>
                    </div>
                  </div>

                  <label className="church-plan-field">
                    <span>{t("church.planVisit.fields.accessibility")}</span>

                    <textarea
                      rows={4}
                      value={form.accessibility}
                      onChange={(event) =>
                        updateForm("accessibility", event.target.value)
                      }
                      placeholder={t(
                        "church.planVisit.placeholders.accessibility",
                      )}
                    />
                  </label>

                  <label className="church-plan-field">
                    <span>{t("church.planVisit.fields.notes")}</span>

                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(event) =>
                        updateForm("notes", event.target.value)
                      }
                      placeholder={t("church.planVisit.placeholders.notes")}
                    />
                  </label>
                </section>

                <div className="church-plan-form-footer">
                  <p>{t("church.planVisit.formFooter.disclaimer")}</p>

                  <button type="submit" className="church-plan-submit">
                    {t("church.planVisit.formFooter.submit")}

                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>

              <aside className="church-plan-sidebar">
                <div className="church-plan-sidebar__card">
                  <span className="church-plan-sidebar__eyebrow">
                    {t("church.planVisit.sidebar.eyebrow")}
                  </span>

                  <h2>{t("church.planVisit.sidebar.title")}</h2>

                  <p>{t("church.planVisit.sidebar.description")}</p>

                  <div className="church-plan-expect">
                    <div>
                      <span>01</span>

                      <div>
                        <strong>
                          {t(
                            "church.planVisit.sidebar.steps.findCampus.title",
                          )}
                        </strong>

                        <p>
                          {t(
                            "church.planVisit.sidebar.steps.findCampus.description",
                          )}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span>02</span>

                      <div>
                        <strong>
                          {t(
                            "church.planVisit.sidebar.steps.getWelcomed.title",
                          )}
                        </strong>

                        <p>
                          {t(
                            "church.planVisit.sidebar.steps.getWelcomed.description",
                          )}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span>03</span>

                      <div>
                        <strong>
                          {t(
                            "church.planVisit.sidebar.steps.findCommunity.title",
                          )}
                        </strong>

                        <p>
                          {t(
                            "church.planVisit.sidebar.steps.findCommunity.description",
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="church-plan-sidebar__contact">
                  <MapPin size={19} />

                  <div>
                    <strong>
                      {t("church.planVisit.sidebar.contact.title")}
                    </strong>

                    <p>{t("church.planVisit.sidebar.contact.description")}</p>

                    <Link to="/church#locations">
                      {t("church.planVisit.sidebar.contact.link")}
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <footer className="church-plan-footer">
        <div className="church-plan-container">
          <div className="church-plan-footer__main">
            <PlanVisitBrand
              t={t}
              className="church-plan-footer__brand"
              logoClassName=""
              textClassName=""
            />

            <div className="church-plan-footer__links">
              <Link to="/church">{t("church.planVisit.nav.home")}</Link>

              <Link to="/church#about">
                {t("church.planVisit.nav.about")}
              </Link>

              <Link to="/church#events">
                {t("church.planVisit.nav.events")}
              </Link>

              <Link to="/church#sermons">
                {t("church.planVisit.nav.sermons")}
              </Link>

              <Link to="/church/live">
                {t("church.planVisit.nav.livestream")}
              </Link>

              <Link to="/church#give">{t("church.planVisit.nav.give")}</Link>
            </div>
          </div>

          <div className="church-plan-footer__bottom">
            <span>
              {t("church.planVisit.footer.copyright").replace(
                "{{year}}",
                String(new Date().getFullYear()),
              )}
            </span>

            <span>{t("church.planVisit.footer.poweredBy")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}