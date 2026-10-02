import React from 'react';

import type { MessageAdminStats } from '../types/messageAdmin.types';

interface MessageStatsProps {
  stats: MessageAdminStats | null;
  loading?: boolean;
}

interface StatItem {
  label: string;
  value: number;
  description: string;
}

export default function MessageStats({
  stats,
  loading = false,
}: MessageStatsProps) {
  const items: StatItem[] = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      description: 'Users registered for messaging',
    },
    {
      label: 'Fockis IDs',
      value: stats?.usersWithFockisId ?? 0,
      description: 'Users with a Fockis ID',
    },
    {
      label: 'Conversations',
      value: stats?.activeConversations ?? 0,
      description: 'Active conversations',
    },
    {
      label: 'Messages',
      value: stats?.totalMessages ?? 0,
      description: 'Total messages',
    },
    {
      label: 'Today',
      value: stats?.messagesToday ?? 0,
      description: 'Messages sent today',
    },
    {
      label: 'Active Calls',
      value: stats?.activeCalls ?? 0,
      description: 'Currently active calls',
    },
    {
      label: 'Reports',
      value: stats?.reportedMessages ?? 0,
      description: 'Messages awaiting review',
    },
  ];

  return (
    <section className="message-admin-stats">
      {items.map((item) => (
        <article
          className="message-admin-stat-card"
          key={item.label}
        >
          <div className="message-admin-stat-card__label">
            {item.label}
          </div>

          <div className="message-admin-stat-card__value">
            {loading ? '—' : item.value.toLocaleString()}
          </div>

          <div className="message-admin-stat-card__description">
            {item.description}
          </div>
        </article>
      ))}
    </section>
  );
}