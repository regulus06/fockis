import { Link } from "react-router-dom";

import FockisMark from "../../../components/fockis/FockisMark";
import { SOCIALS, useSiteInfo } from "../../lib/siteInfo";
const ACADEMY_LINKS = {
  about: "/academy/about",
  admissions: "/academy/admissions",
  financialAid: "/academy/financial-aid",
  programs: "/academy/programs",
  onlineLearning: "/academy/online-learning",
  library: "/academy/library",
  calendar: "/academy/calendar",
  portal: "/academy/portal",
  studentLife: "/academy/student-life",
  career: "/academy/career",
  contact: "/academy/contact",
};

/**
 * Academy footer. Name, tagline and social links come from
 * Admin → Settings → Institution (useSiteInfo); unset items are hidden.
 */
export default function AcademyFooter() {
  const { info } = useSiteInfo();
  const name = info.name || "Fockis Academy";
  const socials = SOCIALS.filter((x) => info[x.key]);

  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Link
              className="logo"
              style={{
                color: "#fff",
                marginBottom: 14,
              }}
              to="/academy"
            >
              <FockisMark size={30} className="academy-footer-mark" />
              {name.toUpperCase()}
            </Link>

            {info.tagline && (
              <p
                style={{
                  color: "#9BAAB8",
                  fontSize: 13.5,
                  maxWidth: 280,
                  whiteSpace: "pre-line",
                }}
              >
                {info.tagline}
              </p>
            )}
          </div>

          <div>
            <h4>Fockis Academy</h4>

            <ul>
              <li>
                <Link to={ACADEMY_LINKS.about}>
                  About
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.about}>
                  Leadership
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.about}>
                  Accreditation
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.career}>
                  Careers
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.contact}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Admissions</h4>

            <ul>
              <li>
                <Link to={ACADEMY_LINKS.admissions}>
                  Apply
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.admissions}>
                  Requirements
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.financialAid}>
                  Tuition
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.financialAid}>
                  Financial Aid
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.financialAid}>
                  Scholarships
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Academics</h4>

            <ul>
              <li>
                <Link to={ACADEMY_LINKS.programs}>
                  Programs
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.programs}>
                  Departments
                </Link>
              </li>

              <li>
                <Link
                  to={
                    ACADEMY_LINKS.onlineLearning
                  }
                >
                  Online Learning
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.library}>
                  Library
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.calendar}>
                  Academic Calendar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Students</h4>

            <ul>
              <li>
                <Link to={ACADEMY_LINKS.portal}>
                  Student Portal
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.portal}>
                  My Learning
                </Link>
              </li>

              <li>
                <Link
                  to={ACADEMY_LINKS.studentLife}
                >
                  Student Life
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.career}>
                  Career Center
                </Link>
              </li>

              <li>
                <Link to={ACADEMY_LINKS.contact}>
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {name}. All rights reserved.
          </span>

          {socials.length > 0 && (
            <div
              className="socials"
              aria-label="Social media"
            >
              {socials.map((x) => (
                <a
                  key={x.key}
                  href={info[x.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={x.label}
                >
                  {x.short}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}