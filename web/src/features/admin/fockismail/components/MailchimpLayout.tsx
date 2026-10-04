import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { MailchimpSidebar } from "./MailchimpSidebar";
import { MailchimpHeader } from "./MailchimpHeader";
import { Drawer } from "./ui/Overlay";
import { Icon } from "./ui/Icon";
import { MOBILE_NAV } from "./navigation";
import { useMailchimp } from "../hooks/useMailchimp";
import { useMarketingWorkspace } from "../hooks/useMarketingWorkspace";
import { useCredits } from "../hooks/useCredits";
import { levelOf } from "../utils/credits";
import { Skeleton } from "./ui/Feedback";
import { Link } from "react-router-dom";
import { cx } from "../utils/format";

const COLLAPSE_KEY = "fockis-marketing:sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function PageLoading() {
  return (
    <div className="fm-page" role="status" aria-label="Loading workspace">
      <Skeleton width={260} height={30} />
      <Skeleton height={140} className="fm-mt-16" />
    </div>
  );
}

/** Thin workspace-wide warning when email or SMS credits are low or gone. */
function LowCreditBanner() {
  const { currentBusiness } = useMarketingWorkspace();
  const { pathname } = useLocation();
  const credits = useCredits(currentBusiness?.id);
  if (!credits.data || pathname.startsWith("/marketing/billing")) return null;
  const email = levelOf(credits.data, "email", credits.thresholds);
  const sms = levelOf(credits.data, "sms", credits.thresholds);
  const worst = email === "critical" || sms === "critical" ? "critical" : email === "low" || sms === "low" ? "low" : "normal";
  if (worst === "normal") return null;
  const which = [email !== "normal" && "email", sms !== "normal" && "SMS"].filter(Boolean).join(" and ");
  return (
    <div className={cx("fm-creditbar", `is-${worst}`)} role="status">
      <Icon name="alert" size={14} />
      <span>
        {currentBusiness?.name}: {which} credits {worst === "critical" ? "are exhausted for at least one channel" : "are running low"}.
      </span>
      <Link to="/marketing/billing">Review credits</Link>
    </div>
  );
}

/** App shell: sidebar + header + routed content + mobile bottom nav. */
export function MailchimpLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const { isMock } = useMailchimp();
  const { currentBusiness } = useMarketingWorkspace();
  const isBuilder = /\/(compose|journeys)/.test(pathname);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  return (
    <div className={cx("fm-theme fm-app", collapsed && "is-collapsed")}>
      <a href="#fm-main" className="fm-skip">Skip to content</a>
      <aside className="fm-app__side">
        <MailchimpSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>
      <div className="fm-app__main">
        <MailchimpHeader onOpenMenu={() => setDrawer(true)} />
        {isMock && (
          <div className="fm-mockbar" role="note">
            <Icon name="alert" size={14} />
            <span>
              You're viewing demo data. Set <code>VITE_MARKETING_API_URL</code> to connect the marketing backend.
            </span>
          </div>
        )}
        <LowCreditBanner />
        <main id="fm-main" className={cx("fm-content", isBuilder && "is-wide")} tabIndex={-1}>
          {/* Remount pages on workspace switch so every page refetches for the new business. */}
          <div key={currentBusiness?.id ?? "none"} className="fm-content__inner">
            {currentBusiness ? <Outlet /> : <PageLoading />}
          </div>
        </main>
      </div>

      <nav className="fm-bottomnav" aria-label="Marketing quick navigation">
        {MOBILE_NAV.map((item) => (
          <NavLink key={item.label} to={item.path} end={item.end} className={({ isActive }) => cx(isActive && "is-active")}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={() => setDrawer(true)}>
          <Icon name="menu" />
          <span>More</span>
        </button>
      </nav>

      <Drawer open={drawer} title="Fockis Marketing" onClose={() => setDrawer(false)} side="left" width={300}>
        <MailchimpSidebar collapsed={false} onToggle={() => undefined} onNavigate={() => setDrawer(false)} inDrawer />
      </Drawer>
    </div>
  );
}
