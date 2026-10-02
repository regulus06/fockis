import React from "react";
import type { AdminUserStats } from "../types/adminUsers.types";

interface UserStatsCardsProps {
stats: AdminUserStats | null;
loading?: boolean;
}

interface StatCardProps {
label: string;
value: number | string;
icon: string;
description: string;
loading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
label,
value,
icon,
description,
loading,
}) => {
return ( <article
   className="admin-user-stat-card"
   aria-label={label}
 > <div
     className="admin-user-stat-card__icon"
     aria-hidden="true"
   >
{icon} </div>

```
  <div className="admin-user-stat-card__body">
    <span className="admin-user-stat-card__label">
      {label}
    </span>

    {loading ? (
      <span
        className="admin-user-stat-card__skeleton"
        aria-label={"Loading " + label}
      />
    ) : (
      <strong className="admin-user-stat-card__value">
        {typeof value === "number"
          ? value.toLocaleString()
          : value}
      </strong>
    )}

    {!loading && (
      <span className="admin-user-stat-card__description">
        {description}
      </span>
    )}
  </div>
</article>

);
};

const UserStatsCards: React.FC<UserStatsCardsProps> = ({
stats,
loading = false,
}) => {
const getValue = (value: unknown): number => {
return typeof value === "number" ? value : 0;
};

return ( <section
   className="admin-user-stats-grid"
   aria-label="User statistics"
 > <StatCard
     label="Total Users"
     value={getValue(stats?.totalUsers)}
     icon="👥"
     description="All registered users"
     loading={loading}
   />
  <StatCard
    label="Active Users"
    value={getValue(stats?.activeUsers)}
    icon="●"
    description="Active accounts"
    loading={loading}
  />

  <StatCard
    label="Verified Users"
    value={getValue(stats?.verifiedUsers)}
    icon="✓"
    description="Verified accounts"
    loading={loading}
  />

  <StatCard
    label="Locked Users"
    value={getValue(stats?.lockedUsers)}
    icon="🔒"
    description="Currently locked"
    loading={loading}
  />

  <StatCard
    label="Premium Users"
    value={getValue(stats?.premiumUsers)}
    icon="★"
    description="Premium accounts"
    loading={loading}
  />

  <StatCard
    label="Fockis ID Paid"
    value={getValue(stats?.fockisIdAccessPaid)}
    icon="✓"
    description="Paid Fockis ID access"
    loading={loading}
  />

  <StatCard
    label="New This Month"
    value={getValue(stats?.newUsersThisMonth)}
    icon="+"
    description="New registered users"
    loading={loading}
  />
</section>

);
};

export { UserStatsCards };
export default UserStatsCards;
