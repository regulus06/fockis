import React from "react";
import type { AdminUser } from "../types/adminUsers.types";

interface UserStatusBadgeProps {
user?: AdminUser;
status?: string;
label?: string;
size?: "sm" | "md";
showIcon?: boolean;
}

interface StatusConfig {
label: string;
className: string;
icon: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
active: {
label: "Active",
className: "is-active",
icon: "●",
},
online: {
label: "Online",
className: "is-online",
icon: "●",
},
inactive: {
label: "Inactive",
className: "is-inactive",
icon: "●",
},
locked: {
label: "Locked",
className: "is-locked",
icon: "🔒",
},
suspended: {
label: "Suspended",
className: "is-suspended",
icon: "●",
},
banned: {
label: "Banned",
className: "is-banned",
icon: "●",
},
verified: {
label: "Verified",
className: "is-verified",
icon: "✓",
},
unverified: {
label: "Unverified",
className: "is-unverified",
icon: "○",
},
premium: {
label: "Premium",
className: "is-premium",
icon: "★",
},
paid: {
label: "Paid",
className: "is-paid",
icon: "✓",
},
unpaid: {
label: "Unpaid",
className: "is-unpaid",
icon: "○",
},
pending: {
label: "Pending",
className: "is-pending",
icon: "●",
},
unknown: {
label: "Unknown",
className: "is-unknown",
icon: "●",
},
};

const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({
user,
status,
label,
size = "md",
showIcon = true,
}) => {
let normalizedStatus = "unknown";

if (status && status.trim().length > 0) {
normalizedStatus = status
.trim()
.toLowerCase()
.replace(/\s+/g, "_");
} else if (user) {
if (user.lockedUntil) {
const lockedUntil = new Date(user.lockedUntil);

  if (
    !Number.isNaN(lockedUntil.getTime()) &&
    lockedUntil.getTime() > Date.now()
  ) {
    normalizedStatus = "locked";
  } else if (user.isActive === false) {
    normalizedStatus = "inactive";
  } else if (user.online) {
    normalizedStatus = "online";
  } else {
    normalizedStatus = "active";
  }
} else if (user.isActive === false) {
  normalizedStatus = "inactive";
} else if (user.online) {
  normalizedStatus = "online";
} else {
  normalizedStatus = "active";
}

}

const config =
STATUS_CONFIG[normalizedStatus] ?? STATUS_CONFIG.unknown;

const displayLabel = label || config.label;

const className = [
"admin-user-status-badge",
config.className,
`size-${size}`,
]
.filter(Boolean)
.join(" ");

return ( <span
   className={className}
   title={displayLabel}
   aria-label={displayLabel}
 >
{showIcon ? ( <span
       className="admin-user-status-badge__icon"
       aria-hidden="true"
     >
{config.icon} </span>
) : null}

  <span className="admin-user-status-badge__label">
    {displayLabel}
  </span>
</span>

);
};

export default UserStatusBadge;
