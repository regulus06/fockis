import React from "react";

import {
  IconFriends,
  IconDiscover,
  IconGroups,
} from "../../FockisIcons";

import SidebarNavItem from "./SidebarNavItem";


interface SidebarConnectSectionProps {
  groupInviteCount?: number;
  onNavigate?: () => void;
}


export default function SidebarConnectSection({
  groupInviteCount = 0,
  onNavigate,
}: SidebarConnectSectionProps) {

  return (
    <div className="fk-sidebar__nav-group">

      <span className="fk-sidebar__section-label">
        Connect
      </span>


      <SidebarNavItem
        to="/friends"
        label="Friends"
        icon={<IconFriends size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/friends/requests"
        label="Friend Requests"
        icon={<IconFriends size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/friends/sent"
        label="Sent Requests"
        icon={<IconFriends size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/friends/suggestions"
        label="Find Friends"
        icon={<IconDiscover size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/groups"
        label="Groups"
        icon={<IconGroups size={20} />}
        badge={groupInviteCount}
        onNavigate={onNavigate}
      />

    </div>
  );
}