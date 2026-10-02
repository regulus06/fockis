import type {
  DomainStats as DomainStatsType,
} from "../types/domainAdmin.types";

interface Props {
  stats: DomainStatsType | null;
}

export default function DomainStats({
  stats,
}: Props) {
  if (!stats) {
    return (
      <div className="domain-stats-grid">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <div
            className="domain-stat-card domain-stat-card--loading"
            key={index}
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Domains",
      value: stats.totalDomains,
    },
    {
      label: "Active Domains",
      value: stats.activeDomains,
    },
    {
      label: "Available",
      value: stats.availableDomains,
    },
    {
      label: "Free Domains",
      value: stats.freeDomains,
    },
    {
      label: "Paid Domains",
      value: stats.paidDomains,
    },
    {
      label: "Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
    },
  ];

  return (
    <div className="domain-stats-grid">
      {cards.map((card) => (
        <div
          className="domain-stat-card"
          key={card.label}
        >
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
    </div>
  );
}