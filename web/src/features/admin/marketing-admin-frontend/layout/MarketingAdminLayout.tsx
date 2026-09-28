import React from "react";
import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";

import "../styles/marketingAdmin.scss";

const navigation = [
  {
    label: "Overview",
    path: "/admin/marketing-admin",
    icon: "📊",
  },
  {
    label: "Campaigns",
    path: "/admin/marketing-admin/campaigns",
    icon: "📢",
  },
  {
    label: "Ads",
    path: "/admin/marketing-admin/ads",
    icon: "📣",
  },
  {
    label: "Pending Review",
    path: "/admin/marketing-admin/pending-review",
    icon: "⏳",
  },
  {
    label: "Analytics",
    path: "/admin/marketing-admin/analytics",
    icon: "📈",
  },
  {
    label: "Advertisers",
    path: "/admin/marketing-admin/advertisers",
    icon: "👤",
  },
  {
    label: "Workflow & Settings",
    path: "/admin/marketing-admin/workflow",
    icon: "⚙️",
  },
  {
    label: "Marketing Audit",
    path: "/admin/marketing-admin/audit",
    icon: "📋",
  },
];

/*
 * Fockis theme: navy sidebar, amber accent, serif title.
 * Only the values below were restyled; the markup is unchanged.
 */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#eef2f7",
    color: "#0f172a",
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    textAlign: "left",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "16px 28px",
  },

  headerInner: {
    maxWidth: "1600px",
    margin: "0 auto",
  },

  eyebrow: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#e39520",
    marginBottom: "4px",
  },

  title: {
    margin: 0,
    fontFamily: '"Fraunces", Georgia, "Times New Roman", serif',
    fontSize: "24px",
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#0f172a",
  },

  user: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px",
    fontSize: "14px",
    color: "#0f172a",
  },

  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
  },

  avatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#133a5e",
    border: "2px solid #f2a93b",
    color: "#f2a93b",
    fontFamily: '"Fraunces", Georgia, serif',
    fontWeight: 800,
    boxSizing: "border-box",
  },

  backLink: {
    marginLeft: "auto",
    padding: "7px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "none",
  },

  // Sidebar sits beside the content on wide screens and moves
  // above it on narrow ones (the content's large flex-grow does this).
  body: {
    display: "flex",
    flexWrap: "wrap",
    minHeight: "calc(100vh - 120px)",
    maxWidth: "1600px",
    margin: "0 auto",
  },

  sidebar: {
    flex: "1 0 250px",
    background: "linear-gradient(180deg, #0a1220 0%, #0d2238 100%)",
    padding: "22px 14px",
    boxSizing: "border-box",
  },

  sidebarTitle: {
    padding: "0 12px 12px",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "rgba(255, 255, 255, 0.45)",
  },

  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minHeight: "42px",
    padding: "0 12px",
    borderRadius: "10px",
    color: "rgba(255, 255, 255, 0.74)",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    boxSizing: "border-box",
  },

  navIcon: {
    width: "22px",
    textAlign: "center",
    fontSize: "16px",
  },

  content: {
    flex: "999 1 320px",
    minWidth: 0,
    padding: "24px 28px 56px",
    boxSizing: "border-box",
    overflowX: "auto",
  },
};

export default function MarketingAdminLayout(): React.ReactElement {
  const location = useLocation();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.eyebrow}>
            Fockis Administration
          </div>

          <h1 style={styles.title}>
            Marketing Admin
          </h1>

          <div style={styles.user}>
            <span style={styles.icon}>
              🔔
            </span>

            <span style={styles.icon}>
              🔑
            </span>

            <span style={styles.avatar}>
              A
            </span>

            <strong>
              AdministratorAdmin
            </strong>

            <NavLink
              to="/admin"
              style={styles.backLink}
            >
              ← Fockis
            </NavLink>
          </div>
        </div>
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTitle}>
            Marketing
          </div>

          <nav style={styles.navigation}>
            {navigation.map((item) => {
              const isOverview =
                item.path ===
                "/admin/marketing-admin";

              const active = isOverview
                ? location.pathname === item.path
                : location.pathname.startsWith(
                    item.path,
                  );

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={{
                    ...styles.navItem,
                    ...(active
                      ? {
                          background: "rgba(242, 169, 59, 0.14)",
                          color: "#f2a93b",
                          fontWeight: 600,
                        }
                      : {}),
                  }}
                >
                  <span style={styles.navIcon}>
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}