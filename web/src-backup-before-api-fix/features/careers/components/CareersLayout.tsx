import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "../styles/CareersLayout.module.scss";

const PRIMARY_NAV = [
  { to: "/careers", label: "Careers", end: true },
  { to: "/careers/search", label: "Find Jobs" },
  { to: "/careers/internships", label: "Internships" },
  { to: "/careers/co-ops", label: "Co-ops" },
  { to: "/careers/search", label: "Companies" }, // no company directory page yet — points at search for now
  { to: "/careers/resources", label: "Resources" },
  { to: "/careers/dashboard", label: "My Applications" },
];

const MOBILE_TABS = [
  { to: "/careers", label: "Home", icon: "⌂", end: true },
  { to: "/careers/search", label: "Jobs", icon: "⌕" },
  { to: "/careers/internships", label: "Interns", icon: "🎓" },
  { to: "/careers/dashboard", label: "Applied", icon: "▤" },
  { to: "/careers/employer", label: "Post", icon: "＋" },
];

export function CareersLayout() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={styles.root}>
      {/* ================= DESKTOP TOPBAR ================= */}
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.logo}>
            <div className={styles.mark}>F</div>
            Fockis <span className={styles.sub}>careers</span>
          </div>

          <nav className={styles.primaryNav}>
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.topbarActions}>
            <button
              className={styles.btnGhost}
              onClick={() => navigate("/careers/dashboard")}
            >
              Saved Jobs
            </button>

            <button
              className={styles.btnOutline}
              onClick={() => navigate("/careers/employer")}
            >
              Post a Job
            </button>

            <button
              className={styles.btnPrimary}
              onClick={() => navigate("/careers/dashboard")}
            >
              Dashboard
            </button>

            <div className={styles.avatar} title="Your account">
              ME
            </div>

            <button
              className={styles.burger}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* ================= MOBILE DRAWER ================= */}
      {drawerOpen && (
        <div
          className={styles.mobileDrawer}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div className={styles.sheet}>
            <div className={styles.logo}>
              <div className={styles.mark}>F</div>
              Fockis
            </div>

            <div className={styles.drawerLinks}>
              {PRIMARY_NAV.map((item) => (
                <button
                  key={item.label}
                  className={styles.btnGhost}
                  onClick={() => {
                    navigate(item.to);
                    setDrawerOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
              <button
                className={styles.btnGhost}
                onClick={() => {
                  navigate("/careers/employer");
                  setDrawerOpen(false);
                }}
              >
                Employer / Post a Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PAGE CONTENT ================= */}
      <main className={styles.content}>
        <Outlet />
      </main>

      {/* ================= MOBILE TAB BAR ================= */}
      <nav className={styles.mobileTabbar}>
        <div className={styles.row}>
          {MOBILE_TABS.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                isActive ? styles.active : undefined
              }
            >
              <span className={styles.ic}>{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}