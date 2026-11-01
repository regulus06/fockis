import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

import FockisSidebar from "../../../components/fockis/FockisSidebar/FockisSidebar";
import FockisTopBar from "../../../components/fockis/FockisTopBar";
import { buildFockisUploadUrl } from "../../../config/fockisConfig";
import { useFockisTheme } from "../../../context/ThemeContext";
import { helpDisplayName, useHelpUser } from "../hooks/useHelpUser";
import HelpToaster from "./HelpToaster";

import "../styles/HelpSupport.scss";

/**
 * Help & Support frame: the existing Fockis sidebar and top bar, re-skinned
 * for /help only (all styles are scoped to .fk-help).
 */
export default function HelpShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { theme } = useFockisTheme();
  const { user } = useHelpUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const name = helpDisplayName(user);
  const picture = user?.profilePicture || "";

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMobileNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  return (
    <div className="fk-help" data-theme={theme}>
      {mobileNavOpen && (
        <button type="button" className="fk-help__backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />
      )}

      <FockisSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="fk-help__main">
        <div className="fk-help__topbar">
          <button
            type="button"
            className="fk-help__menu"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={22} />
          </button>
          <FockisTopBar
            showPlaylists={false}
            onMessagesClick={() => navigate("/messages")}
            profile={
              name
                ? {
                    name,
                    avatarUrl: picture ? buildFockisUploadUrl(picture) : undefined,
                    onClick: () => navigate("/profile"),
                  }
                : undefined
            }
          />
        </div>

        <main className="fk-help__content" id="help-main">
          {children}
        </main>
      </div>

      <HelpToaster />
    </div>
  );
}
