import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../renderer/icons";
import { formatMoney } from "../renderer/theme";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import type { WebsiteDetail, WebsiteOrder, WebsiteSubmission } from "../types/studio";
import { StudioNav } from "./WebsiteStudioHome";
import DomainSettings from "./DomainSettings";
import WebsiteAnalytics from "./WebsiteAnalytics";
import "../styles/studio.scss";

type Tab = "general" | "domains" | "orders" | "inbox" | "coupons" | "team" | "analytics";
const TABS: [Tab, string, string][] = [
  ["general", "General", "Wrench"],
  ["domains", "Domains", "Network"],
  ["orders", "Orders", "ShoppingBag"],
  ["inbox", "Bookings & Messages", "Mail"],
  ["coupons", "Coupons", "Gift"],
  ["team", "Managers", "Users"],
  ["analytics", "Analytics", "Trophy"],
];

function Orders({ site }: { site: WebsiteDetail }) {
  const [orders, setOrders] = useState<WebsiteOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => websiteStudioApi.orders(site.id).then(setOrders).catch((e) => setError(apiError(e)));
  useEffect(() => void load(), [site.id]);
  const update = async (o: WebsiteOrder, patch: { status?: string; trackingNumber?: string }) => {
    try {
      const next = await websiteStudioApi.updateOrder(site.id, o.id, patch);
      setOrders((prev) => prev?.map((x) => (x.id === o.id ? next : x)) ?? null);
    } catch (e) {
      setError(apiError(e));
    }
  };
  return (
    <div className="wst-settings__panel">
      <h2>Orders</h2>
      <p className="wst-muted">Paid through Fockis Payments. Update status to keep customers informed (they can track orders in “My Account”).</p>
      {error ? <p className="wst-error">{error}</p> : null}
      {!orders ? <p className="wst-muted">Loading…</p> : !orders.length ? <p className="wst-muted">No orders yet.</p> : null}
      {orders?.map((o) => (
        <details key={o.id} className="wst-order">
          <summary>
            <strong>#{o.orderNumber}</strong>
            <span>{o.customer.name}</span>
            <span>{new Date(o.createdAt).toLocaleString()}</span>
            <span className={`wst-status wst-status--${o.status}`}>{o.status.replace(/_/g, " ")}</span>
            <strong>{formatMoney(o.total, o.currency)}</strong>
          </summary>
          <div className="wst-order__body">
            <ul>{o.items.map((it, i) => <li key={i}>{it.quantity} × {it.name} — {formatMoney(it.unitPrice * it.quantity, o.currency)}{it.options ? <small> ({Object.entries(it.options).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ")})</small> : null}</li>)}</ul>
            <p><b>{o.fulfillment.method}</b> {o.fulfillment.date ?? ""} {o.fulfillment.time ?? ""} {o.fulfillment.address ? `· ${o.fulfillment.address}` : ""}</p>
            <p>{o.customer.email} {o.customer.phone ? `· ${o.customer.phone}` : ""}</p>
            <div className="wst-inline">
              <select className="wst-input" value={o.status} onChange={(e) => update(o, { status: e.target.value })} disabled={o.status === "pending_payment"}>
                {["pending_payment", "paid", "processing", "ready", "shipped", "completed", "cancelled"].map((s) => <option key={s} value={s} disabled={s === "pending_payment"}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <input className="wst-input" placeholder="Tracking number" defaultValue={o.trackingNumber} onBlur={(e) => e.target.value !== (o.trackingNumber ?? "") && update(o, { trackingNumber: e.target.value })} />
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function Inbox({ site }: { site: WebsiteDetail }) {
  const [items, setItems] = useState<WebsiteSubmission[] | null>(null);
  const [type, setType] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => void websiteStudioApi.submissions(site.id, type || undefined).then(setItems).catch((e) => setError(apiError(e))), [site.id, type]);
  const setStatus = async (s: WebsiteSubmission, status: string) => {
    const next = await websiteStudioApi.updateSubmission(site.id, s.id, status);
    setItems((prev) => prev?.map((x) => (x.id === s.id ? next : x)) ?? null);
  };
  return (
    <div className="wst-settings__panel">
      <h2>Bookings & Messages</h2>
      <select className="wst-input" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="">Everything</option>
        {["booking", "reservation", "contact", "catering", "lead", "newsletter"].map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {error ? <p className="wst-error">{error}</p> : null}
      {items && !items.length ? <p className="wst-muted">Nothing here yet.</p> : null}
      {items?.map((s) => (
        <div key={s.id} className="wst-msg">
          <div className="wst-msg__head">
            <span className="wst-badge">{s.type}</span>
            <strong>{s.data.name ?? s.data.email}</strong>
            <span className="wst-muted">{new Date(s.createdAt).toLocaleString()} · code {s.confirmationCode}</span>
            <select className="wst-input" value={s.status} onChange={(e) => setStatus(s, e.target.value)}>
              {["new", "confirmed", "completed", "cancelled", "archived"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <dl className="wst-msg__data">
            {Object.entries(s.data).filter(([k]) => k !== "name").map(([k, v]) => (
              <React.Fragment key={k}><dt>{k}</dt><dd>{String(v)}</dd></React.Fragment>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function Coupons({ site }: { site: WebsiteDetail }) {
  const [list, setList] = useState<{ code: string; type: "percent" | "fixed"; value: number; active: boolean; usageCount?: number }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => void websiteStudioApi.coupons(site.id).then(setList).catch(() => undefined), [site.id]);
  const save = async () => {
    try {
      setList(await websiteStudioApi.saveCoupons(site.id, list.map(({ code, type, value, active }) => ({ code, type, value, active }))));
      setMsg("Coupons saved.");
    } catch (e) {
      setMsg(apiError(e));
    }
  };
  return (
    <div className="wst-settings__panel">
      <h2>Coupons</h2>
      {list.map((c, i) => (
        <div key={i} className="wst-inline">
          <input className="wst-input" value={c.code} placeholder="CODE" onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, code: e.target.value.toUpperCase() } : x)))} />
          <select className="wst-input" value={c.type} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, type: e.target.value as any } : x)))}>
            <option value="percent">% off</option>
            <option value="fixed">amount off</option>
          </select>
          <input className="wst-input" type="number" min={0} value={c.value} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))} />
          <label className="wst-check"><input type="checkbox" checked={c.active} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))} /> active</label>
          <span className="wst-muted">used {c.usageCount ?? 0}×</span>
          <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => setList(list.filter((_, j) => j !== i))}><Icon name="Trash2" size={14} /></button>
        </div>
      ))}
      <div className="wst-btnrow">
        <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => setList([...list, { code: "", type: "percent", value: 10, active: true }])}><Icon name="Plus" size={14} /> Add coupon</button>
        <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" onClick={save}>Save coupons</button>
      </div>
      {msg ? <p className="wst-muted">{msg}</p> : null}
    </div>
  );
}

function Team({ site }: { site: WebsiteDetail }) {
  const [list, setList] = useState<{ userId: string; role: string; name: string }[]>([]);
  const [who, setWho] = useState("");
  const [role, setRole] = useState<"editor" | "admin">("editor");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => void websiteStudioApi.managers(site.id).then(setList).catch(() => undefined), [site.id]);
  return (
    <div className="wst-settings__panel">
      <h2>Website managers</h2>
      <p className="wst-muted">Editors can edit and save. Admins can also publish and manage domains, coupons and orders. Only the owner can delete the website or manage access.</p>
      {list.map((m) => (
        <div key={m.userId} className="wst-inline">
          <strong>{m.name}</strong>
          <span className="wst-badge">{m.role}</span>
          {site.role === "owner" ? <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={async () => setList(await websiteStudioApi.removeManager(site.id, m.userId))}>Remove</button> : null}
        </div>
      ))}
      {site.role === "owner" ? (
        <div className="wst-inline">
          <input className="wst-input" placeholder="Fockis username or email" value={who} onChange={(e) => setWho(e.target.value)} />
          <select className="wst-input" value={role} onChange={(e) => setRole(e.target.value as any)}><option value="editor">Editor</option><option value="admin">Admin</option></select>
          <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" disabled={!who.trim()} onClick={async () => { try { setList(await websiteStudioApi.addManager(site.id, who.trim(), role)); setWho(""); setError(null); } catch (e) { setError(apiError(e)); } }}>Add manager</button>
        </div>
      ) : null}
      {error ? <p className="wst-error">{error}</p> : null}
    </div>
  );
}

function General({ site, onChanged }: { site: WebsiteDetail; onChanged: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState(site.name);
  const [msg, setMsg] = useState<string | null>(null);
  const exportSite = async () => {
    const data = await websiteStudioApi.exportWebsite(site.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${site.slug}-fockis-website.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="wst-settings__panel">
      <h2>General</h2>
      <div className="wst-inline">
        <input className="wst-input" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" disabled={!name.trim() || name === site.name} onClick={async () => { try { await websiteStudioApi.updateWebsite(site.id, { name }); setMsg("Saved."); onChanged(); } catch (e) { setMsg(apiError(e)); } }}>Save name</button>
      </div>
      <p>Status: <span className={`wst-status wst-status--${site.status}`}>{site.status}</span> {site.hasUnpublishedChanges && site.status === "published" ? <span className="wst-muted">(unpublished changes)</span> : null}</p>
      <p>Address: <a href={site.url} target="_blank" rel="noreferrer">{site.url}</a></p>
      <p>Design: {site.templateName ?? "Custom"} · Category: {site.categoryName ?? site.categorySlug ?? "—"}</p>
      {msg ? <p className="wst-muted">{msg}</p> : null}
      <h3>Export</h3>
      <p className="wst-muted">Download this website's design and content. You can import it to create a new website.</p>
      <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={exportSite}>Export design (.json)</button>
      {site.role === "owner" ? (
        <>
          <h3>Danger zone</h3>
          <button type="button" className="wst-btn wst-btn--danger wst-btn--sm" onClick={async () => {
            if (window.prompt(`Type the website name to delete it:\n${site.name}`) !== site.name) return;
            await websiteStudioApi.deleteWebsite(site.id);
            navigate("/website-studio/my-websites");
          }}>Delete website</button>
        </>
      ) : null}
    </div>
  );
}

export default function WebsiteSettings() {
  const { websiteId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "general";
  const [site, setSite] = useState<WebsiteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => websiteStudioApi.website(websiteId).then(setSite).catch((e) => setError(apiError(e)));
  useEffect(() => void load(), [websiteId]);
  if (error) return <div className="wst"><StudioNav /><p className="wst-error wst-pad">{error}</p></div>;
  if (!site) return <div className="wst"><StudioNav /><p className="wst-muted wst-pad">Loading…</p></div>;
  return (
    <div className="wst">
      <StudioNav />
      <div className="wst-settings">
        <aside className="wst-settings__nav">
          <Link to={`/website-studio/editor/${site.id}`} className="wst-btn wst-btn--primary wst-btn--block"><Icon name="PenLine" size={16} /> Open editor</Link>
          <h3>{site.name}</h3>
          {TABS.map(([k, l, icon]) => (
            <button type="button" key={k} className={tab === k ? "is-active" : ""} onClick={() => setParams({ tab: k })}><Icon name={icon} size={16} /> {l}</button>
          ))}
        </aside>
        <main>
          {tab === "general" ? <General site={site} onChanged={load} /> : null}
          {tab === "domains" ? <DomainSettings site={site} onChanged={load} /> : null}
          {tab === "orders" ? <Orders site={site} /> : null}
          {tab === "inbox" ? <Inbox site={site} /> : null}
          {tab === "coupons" ? <Coupons site={site} /> : null}
          {tab === "team" ? <Team site={site} /> : null}
          {tab === "analytics" ? <WebsiteAnalytics websiteId={site.id} currency={site.content.settings.currency} /> : null}
        </main>
      </div>
    </div>
  );
}
