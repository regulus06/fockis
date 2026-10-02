import React from "react";

import {
  IconWaves,
  IconPlus,
  IconDiscover,
} from "../../FockisIcons";

import SidebarNavItem from "./SidebarNavItem";

interface SidebarLiveSectionProps {
  onNavigate?: () => void;
}

export default function SidebarLiveSection({
  onNavigate,
}: SidebarLiveSectionProps) {
  return (
    <div>
      {/* ================================================================== */}
      {/* SECTION LABEL                                                      */}
      {/* ================================================================== */}

      <span className="fk-sidebar__section-label">
        LIVE
      </span>

      {/* ================================================================== */}
      {/* LIVE DISCOVERY                                                     */}
      {/* ================================================================== */}

      <SidebarNavItem
        to="/live"
        label="Live"
        icon={
          <IconWaves size={20} />
        }
        end
        onNavigate={onNavigate}
      />

      {/* ================================================================== */}
      {/* GO LIVE                                                            */}
      {/* ================================================================== */}

      <SidebarNavItem
        to="/live/create"
        label="Go Live"
        icon={
          <IconPlus size={20} />
        }
        end
        onNavigate={onNavigate}
      />

      {/* ================================================================== */}
      {/* LIVE STUDIO                                                        */}
      {/* ================================================================== */}

      <SidebarNavItem
        to="/live/create"
        label="Live Studio"
        icon={
          <IconDiscover size={20} />
        }
        end
        onNavigate={onNavigate}
      />
    </div>
  );
}