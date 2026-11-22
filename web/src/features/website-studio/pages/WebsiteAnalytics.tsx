import React, { useEffect, useState } from "react";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import { formatMoney } from "../renderer/theme";

type Data = Awaited<ReturnType<typeof websiteStudioApi.analytics>>;

export default function WebsiteAnalytics({ websiteId, currency = "USD" }: { websiteId: string; currency?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => void websiteStudioApi.analytics(websiteId).then(setData).catch((e) => setError(apiError(e))), [websiteId]);
  if (error) return <p className="wst-error">{error}</p>;
  if (!data) return <p className="wst-muted">Loading analytics…</p>;
  const max = Math.max(1, ...data.days.map((d) => d.views));
  return (
    <div className="wst-settings__panel">
      <h2>Last 30 days</h2>
      <div className="wst-kpis">
        <div><strong>{data.totalViews.toLocaleString()}</strong><span>Page views</span></div>
        <div><strong>{data.orders}</strong><span>Paid orders</span></div>
        <div><strong>{formatMoney(data.revenue, currency)}</strong><span>Revenue (all time)</span></div>
        <div><strong>{data.submissions}</strong><span>Messages & bookings</span></div>
      </div>
      <div className="wst-bars" role="img" aria-label="Daily page views for the last 30 days">
        {data.days.map((d) => (
          <div key={d.date} className="wst-bars__bar" title={`${d.date}: ${d.views} views`}>
            <span style={{ height: `${(d.views / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="wst-bars__axis"><span>{data.days[0]?.date}</span><span>{data.days.at(-1)?.date}</span></div>
      <h3>Top pages</h3>
      <table className="wst-table">
        <thead><tr><th>Page</th><th>Views</th></tr></thead>
        <tbody>
          {data.topPaths.map((p) => <tr key={p.path}><td>{p.path}</td><td>{p.views}</td></tr>)}
          {!data.topPaths.length ? <tr><td colSpan={2} className="wst-muted">No visits yet. Publish your website and share the link.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
