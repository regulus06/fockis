import { Link } from "react-router-dom";

const ACADEMY_LINKS = {
  about: "/academy/about",
  admissions: "/academy/admissions",
  financialAid: "/academy/financial-aid",
  programs: "/academy/programs",
  onlineLearning: "/academy/online-learning",
  library: "/academy/library",
  calendar: "/academy/calendar",
  portal: "/academy/portal",
  lms: "/academy/lms",
  studentLife: "/academy/student-life",
  career: "/academy/career",
  contact: "/academy/contact",
};

export default function AcademyFooter() {
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
              FOCKIS ACADEMY
            </Link>

            <p
              style={{
                color: "#9BAAB8",
                fontSize: 13.5,
                maxWidth: 280,
              }}
            >
              Career-focused education for a
              technology-driven world. Learn.
              Build. Connect. Succeed.
            </p>
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
                <Link to={ACADEMY_LINKS.lms}>
                  Fockis Learn
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
            © {new Date().getFullYear()} Fockis
            Academy. All rights reserved.
          </span>

          <div
            className="socials"
            aria-label="Social media"
          >
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              FB
            </a>

            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              IG
            </a>

            <a
              href="https://www.youtube.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              YT
            </a>

            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              IN
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}