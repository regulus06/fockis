import React, { useEffect, useState } from "react";
import { Icon } from "../renderer/icons";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import type { WebsiteDetail, WebsiteDomain } from "../types/studio";

export default function DomainSettings({ site, onChanged }: { site: WebsiteDetail; onChanged: () => void }) {
  const [domains, setDomains] = useState<WebsiteDomain[]>([]);
  const [domain, setDomain] = useState("");
  const [slug, setSlug] = useState(site.slug);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => websiteStudioApi.domains(site.id).then(setDomains).catch((e) => setError(apiError(e)));
  useEffect(() => void load(), [site.id]);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    setError(null);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(ok);
      await load();
      onChanged();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="wst-settings__panel">
      <h2>Website address</h2>
      <p className="wst-muted">Your free Fockis address. Changing it breaks old links.</p>
      <div className="wst-inline">
        <input className="wst-input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
        <span className="wst-muted">→ {site.url.includes("/s/") ? `…/s/${slug}` : `${slug}.fockis.com`}</span>
        <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" disabled={slug === site.slug || slug.length < 3 || busy === "slug"} onClick={() => run("slug", () => websiteStudioApi.updateWebsite(site.id, { slug }), "Address updated.")}>Save</button>
      </div>

      <h2>Custom domains</h2>
      <p className="wst-muted">Connect a domain you own, like www.mybusiness.com.</p>
      <div className="wst-inline">
        <input className="wst-input" placeholder="www.mybusiness.com" value={domain} onChange={(e) => setDomain(e.target.value.trim())} />
        <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" disabled={!domain || busy === "add"} onClick={() => run("add", async () => { await websiteStudioApi.addDomain(site.id, domain); setDomain(""); }, "Domain added. Add the DNS records below, then click Verify.")}>Add domain</button>
      </div>
      {msg ? <p className="wst-ok">{msg}</p> : null}
      {error ? <p className="wst-error">{error}</p> : null}
      {domains.map((d) => (
        <div key={d.id} className="wst-domain">
          <div className="wst-domain__head">
            <strong>{d.domain}</strong>
            <span className={`wst-status wst-status--${d.verificationStatus}`}>{d.verificationStatus}</span>
            <span className={`wst-status wst-status--${d.sslStatus}`}>SSL: {d.sslStatus}</span>
            {d.isPrimary ? <span className="wst-badge">Primary</span> : null}
          </div>
          <table className="wst-dns">
            <thead><tr><th>Type</th><th>Host / Name</th><th>Value</th><th>Purpose</th></tr></thead>
            <tbody>
              <tr><td>{d.verificationRecord.type}</td><td><code>{d.verificationRecord.host}</code></td><td><code>{d.verificationRecord.value}</code></td><td>Proves you own the domain</td></tr>
              <tr><td>{d.routingRecord.type}</td><td><code>{d.routingRecord.host}</code></td><td><code>{d.routingRecord.value}</code></td><td>Points visitors to your website (HTTPS is issued automatically)</td></tr>
            </tbody>
          </table>
          {d.lastError ? <p className="wst-warning">{d.lastError}</p> : null}
          <div className="wst-btnrow">
            <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" disabled={busy === d.id} onClick={() => run(d.id, () => websiteStudioApi.verifyDomain(site.id, d.id))}>{busy === d.id ? "Checking DNS…" : "Verify"}</button>
            <button type="button" className="wst-btn wst-btn--danger wst-btn--sm" onClick={() => window.confirm(`Disconnect ${d.domain}?`) && run(`rm-${d.id}`, () => websiteStudioApi.removeDomain(site.id, d.id))}><Icon name="Trash2" size={14} /> Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}
