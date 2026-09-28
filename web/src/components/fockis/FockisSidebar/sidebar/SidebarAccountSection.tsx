import React from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  IconProfile,
  IconSettings,
  IconHelp,
} from "../../FockisIcons";

import SidebarNavItem from "./SidebarNavItem";


/* ============================================================================
   TYPES
============================================================================ */

interface SidebarAccountSectionProps {

  currentUser?: {
    username?: string;
    fullName?: string;
    avatar?: string;
  } | null;

  onNavigate?: () => void;

}


/* ============================================================================
   ACCOUNT SECTION
============================================================================ */

export default function SidebarAccountSection({
  currentUser,
  onNavigate,
}: SidebarAccountSectionProps) {


  const navigate = useNavigate();



  function handleNavigation() {

    if (onNavigate) {

      onNavigate();

    }

  }



  return (

    <div className="fk-sidebar__nav-group">


      <span className="fk-sidebar__section-label">
        Account
      </span>



      {currentUser ? (

        <button
          type="button"
          className="fk-sidebar__nav-item"

          onClick={() => {

            handleNavigation();

            navigate("/profile");

          }}
        >

          <span className="fk-sidebar__nav-icon">

            <IconProfile size={20} />

          </span>


          <span className="fk-sidebar__nav-label">

            Profile

          </span>


        </button>


      ) : (


        <SidebarNavItem

          to="/login"

          label="Login"

          icon={
            <IconProfile size={20} />
          }

          onNavigate={handleNavigation}

        />


      )}




      {currentUser && (

        <SidebarNavItem

          to="/settings"

          label="Settings"

          icon={
            <IconSettings size={20} />
          }

          onNavigate={handleNavigation}

        />

      )}





      <SidebarNavItem

        to="/privacy-policy"

        label="Help & Support"

        icon={
          <IconHelp size={20} />
        }

        onNavigate={handleNavigation}

      />


    </div>

  );

}