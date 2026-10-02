import React, {
useEffect,
useState,
} from "react";

import {
NavLink,
useNavigate,
} from "react-router-dom";

import {
IconMessages,
} from "../FockisIcons";

import {
useNotifications,
} from "../../../features/notifications/hooks/useNotifications";

import {
groupsApi,
} from "../../../features/groups/services/groupsApi";

import {
savedApi,
} from "../../../features/saved/services/savedApi";

import {
useFockisProfile,
} from "../../../features/fockisprofile/hooks/useFockisProfile";

import SidebarMainSection from "./sidebar/SidebarMainSection";
import SidebarAccountSection from "./sidebar/SidebarAccountSection";
import SidebarAdminSection from "./sidebar/SidebarAdminSection";
import SidebarProfileCard from "./sidebar/SidebarProfileCard";

export interface FockisSidebarProps {
collapsed?: boolean;
mobileOpen?: boolean;
onCreatePost?: () => void;
onClose?: () => void;
}

export default function FockisSidebar({
collapsed = false,
mobileOpen = false,
onClose,
}: FockisSidebarProps) {
const navigate = useNavigate();

const {
profile,
} = useFockisProfile();

const currentUser =
profile?.user;

useNotifications();

const [
groupInviteCount,
setGroupInviteCount,
] = useState(0);

const [
savedCount,
setSavedCount,
] = useState(0);

/* ============================================================
LOAD COUNTS

```
 These counts are retained for compatibility with existing
 services. They are not used to render navigation links.
```

============================================================ */

useEffect(() => {
async function loadCounts() {
try {
const invites =
groupsApi.getPendingInviteCount
? await groupsApi.getPendingInviteCount()
: 0;
    const saved =
      await savedApi.getSaved();

    setGroupInviteCount(
      Number(invites) || 0,
    );

    if (Array.isArray(saved)) {
      setSavedCount(
        saved.length,
      );
    } else if (
      saved &&
      typeof saved === "object"
    ) {
      const data =
        saved as {
          items?: unknown[];
          data?: unknown[];
        };

      setSavedCount(
        data.items?.length ||
          data.data?.length ||
          0,
      );
    }
  } catch (error) {
    console.error(
      "[FockisSidebar] Sidebar count error:",
      error,
    );
  }
}

void loadCounts();

}, []);

/* ============================================================
MOBILE NAVIGATION
============================================================ */

function handleNavigation() {
if (
mobileOpen &&
onClose
) {
onClose();
}
}

/* ============================================================
LOGOUT
============================================================ */

function handleLogout() {
try {
localStorage.removeItem(
"token",
);

  localStorage.removeItem(
    "userId",
  );

  localStorage.removeItem(
    "user",
  );

  localStorage.removeItem(
    "currentUser",
  );

  sessionStorage.removeItem(
    "token",
  );

  sessionStorage.removeItem(
    "userId",
  );

  sessionStorage.removeItem(
    "user",
  );

  sessionStorage.removeItem(
    "currentUser",
  );

  console.log(
    "[FockisSidebar] User logged out.",
  );
} catch (error) {
  console.error(
    "[FockisSidebar] Logout cleanup failed:",
    error,
  );
}

if (
  mobileOpen &&
  onClose
) {
  onClose();
}

navigate(
  "/login",
  {
    replace: true,
  },
);

}

return (
<aside
className={[
"fk-sidebar",

    collapsed
      ? "fk-sidebar--collapsed"
      : "",

    mobileOpen
      ? "fk-sidebar--mobile-open"
      : "",
  ]
    .filter(Boolean)
    .join(" ")}
>
  <div className="fk-sidebar__brand">
    <NavLink
      to="/fockis-preview"
      className="fk-sidebar__logo"
      onClick={
        handleNavigation
      }
      aria-label="Fockis Feed"
    >
      <span className="fk-sidebar__logo-mark">
        F
      </span>

      <span className="fk-sidebar__logo-text">
        Fockis
      </span>
    </NavLink>
  </div>

  <nav
    className="fk-sidebar__nav"
    aria-label="Fockis main navigation"
  >
    <SidebarMainSection
      onNavigate={
        handleNavigation
      }
    />

    <SidebarAccountSection
      currentUser={
        currentUser
      }
      onNavigate={
        handleNavigation
      }
    />

    <SidebarAdminSection
      onNavigate={
        handleNavigation
      }
    />
  </nav>

  <NavLink
    to="/messages"
    className={({ isActive }) =>
      [
        "fk-sidebar__messages-link",

        isActive
          ? "fk-sidebar__messages-link--active"
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    }
    onClick={
      handleNavigation
    }
    aria-label="Messages"
  >
    <IconMessages
      size={19}
    />

    <span>
      Messages
    </span>
  </NavLink>

  <SidebarProfileCard
    currentUser={
      currentUser
    }
    onNavigate={
      handleNavigation
    }
  />

  <div className="fk-sidebar__logout-container">
    <button
      type="button"
      className="fk-sidebar__logout-button"
      onClick={
        handleLogout
      }
      aria-label="Log out"
    >
      <span
        className="fk-sidebar__logout-icon"
        aria-hidden="true"
      >
        ↪
      </span>

      <span>
        Log out
      </span>
    </button>
  </div>
</aside>

);
}
