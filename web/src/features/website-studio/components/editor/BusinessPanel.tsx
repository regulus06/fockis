import React, { useState } from "react";
import { Icon } from "../../renderer/icons";
import { useEditorStore, uid } from "../../store/websiteEditorStore";
import type { CatalogProduct, CatalogService, SiteContent, SiteFeatures, StaffMember } from "../../types/content";
import { ImageField, NumberInput, Row } from "./FieldEditors";

type Sub = "info" | "features" | "products" | "services" | "staff" | "orders";

const FEATURES: [keyof SiteFeatures, string, string][] = [
  ["cart", "Online store & cart", "Sell products with Fockis Payments"],
  ["pickup", "Pickup", "Customers collect orders"],
  ["delivery", "Local delivery", "Deliver to an address"],
  ["shipping", "Shipping", "Ship orders"],
  ["customCakes", "Custom orders", "Cake/product customization"],
  ["booking", "Appointments", "Online booking with availability"],
  ["reservations", "Reservations", "Restaurant table reservations"],
  ["wishlist", "Wishlist", "Save favorite products"],
  ["accounts", "Customer accounts", "Order history & tracking"],
];

function ProductEditor({ p, onChange, onDelete, categories, websiteId }: { p: CatalogProduct; onChange: (p: CatalogProduct) => void; onDelete: () => void; categories: string[]; websiteId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`wse-list__item${open ? " is-open" : ""}`}>
      <div className="wse-list__head">
        <button type="button" className="wse-list__title" onClick={() => setOpen(!open)}>
          {p.image ? <img src={p.image} alt="" className="wse-thumb" /> : <Icon name="ShoppingBag" size={16} />}
          <span>{p.name}</span>
          <small>${p.price.toFixed(2)}{p.inventory !== null && p.inventory !== undefined ? ` · ${p.inventory} in stock` : ""}</small>
        </button>
        <button type="button" className="wse-icon-btn" onClick={onDelete} title="Delete product"><Icon name="Trash2" size={14} /></button>
      </div>
      {open ? (
        <div className="wse-list__body">
          <Row label="Name"><input className="wse-input" value={p.name} onChange={(e) => onChange({ ...p, name: e.target.value })} /></Row>
          <Row label="Description"><textarea className="wse-input" rows={3} value={p.description} onChange={(e) => onChange({ ...p, description: e.target.value })} /></Row>
          <div className="wse-grid2">
            <Row label="Price"><NumberInput value={p.price} min={0} step={0.01} onChange={(v) => onChange({ ...p, price: v ?? 0 })} /></Row>
            <Row label="Compare-at price"><NumberInput value={p.compareAtPrice ?? undefined} min={0} step={0.01} onChange={(v) => onChange({ ...p, compareAtPrice: v ?? null })} /></Row>
            <Row label="Inventory (blank = unlimited)"><NumberInput value={p.inventory ?? undefined} min={0} onChange={(v) => onChange({ ...p, inventory: v ?? null })} /></Row>
            <Row label="Category">
              <input className="wse-input" list="ws-cats" value={p.category} onChange={(e) => onChange({ ...p, category: e.target.value })} />
              <datalist id="ws-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Row>
          </div>
          <Row label="Image"><ImageField value={p.image} websiteId={websiteId} onChange={(v) => onChange({ ...p, image: v })} /></Row>
          <Row label="Tags (comma separated: new, bestseller)"><input className="wse-input" value={(p.tags ?? []).join(", ")} onChange={(e) => onChange({ ...p, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></Row>
          <Row label="Badge"><input className="wse-input" value={p.badge ?? ""} onChange={(e) => onChange({ ...p, badge: e.target.value })} /></Row>
          <Row label="Variations (e.g. Size: S, M, L)">
            <textarea className="wse-input" rows={2} value={(p.variants ?? []).map((v) => `${v.name}: ${v.options.join(", ")}`).join("\n")} onChange={(e) => onChange({ ...p, variants: e.target.value.split("\n").map((line) => { const [name, opts] = line.split(":"); return { name: (name ?? "").trim(), options: (opts ?? "").split(",").map((x) => x.trim()).filter(Boolean) }; }).filter((v) => v.name && v.options.length) })} />
          </Row>
          <label className="wse-toggle"><input type="checkbox" checked={!!p.featured} onChange={(e) => onChange({ ...p, featured: e.target.checked })} /><span>Featured</span></label>
          <label className="wse-toggle"><input type="checkbox" checked={p.active !== false} onChange={(e) => onChange({ ...p, active: e.target.checked })} /><span>Available for sale</span></label>
        </div>
      ) : null}
    </div>
  );
}

export default function BusinessPanel({ websiteId, kind }: { websiteId: string | null; kind: "website" | "template" }) {
  const content = useEditorStore((s) => s.content)!;
  const mutate = useEditorStore((s) => s.mutate);
  const [sub, setSub] = useState<Sub>("info");
  const s = content.settings;
  const set = (fn: (d: SiteContent) => void, key?: string) => mutate(fn, key);

  return (
    <div className="wse-tab">
      <div className="wse-seg wse-seg--wrap">
        {(["info", "features", "products", "services", "staff", "orders"] as Sub[]).map((x) => (
          <button type="button" key={x} className={sub === x ? "is-active" : ""} onClick={() => setSub(x)}>{x === "orders" ? "Payments" : x[0].toUpperCase() + x.slice(1)}</button>
        ))}
      </div>

      {sub === "info" ? (
        <>
          <Row label="Business name"><input className="wse-input" value={s.businessName} onChange={(e) => set((d) => (d.settings.businessName = e.target.value), "biz-name")} /></Row>
          <Row label="Tagline"><input className="wse-input" value={s.tagline} onChange={(e) => set((d) => (d.settings.tagline = e.target.value), "biz-tag")} /></Row>
          <Row label="Phone"><input className="wse-input" value={s.phone} onChange={(e) => set((d) => (d.settings.phone = e.target.value), "biz-phone")} /></Row>
          <Row label="Email"><input className="wse-input" value={s.email} onChange={(e) => set((d) => (d.settings.email = e.target.value), "biz-email")} /></Row>
          <Row label="Address"><input className="wse-input" value={s.address} onChange={(e) => set((d) => (d.settings.address = e.target.value), "biz-addr")} /></Row>
          <Row label="Opening hours">
            <div className="wse-strings">
              {s.hours.map((h, i) => (
                <div key={i} className="wse-strings__row">
                  <input className="wse-input" value={h.label} onChange={(e) => set((d) => (d.settings.hours[i].label = e.target.value), `h-l-${i}`)} />
                  <input className="wse-input" value={h.value} onChange={(e) => set((d) => (d.settings.hours[i].value = e.target.value), `h-v-${i}`)} />
                  <button type="button" className="wse-icon-btn" onClick={() => set((d) => d.settings.hours.splice(i, 1))}><Icon name="Trash2" size={13} /></button>
                </div>
              ))}
              <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => set((d) => d.settings.hours.push({ label: "Day", value: "9:00 AM – 5:00 PM" }))}><Icon name="Plus" size={13} /> Add hours</button>
            </div>
          </Row>
          <h4 className="wse-subtitle">Social links</h4>
          {(["facebook", "instagram", "tiktok", "youtube", "twitter", "linkedin"] as const).map((k) => (
            <Row key={k} label={k}><input className="wse-input" placeholder="https://" value={s.social[k] ?? ""} onChange={(e) => set((d) => (d.settings.social[k] = e.target.value), `soc-${k}`)} /></Row>
          ))}
          <h4 className="wse-subtitle">Search engines</h4>
          <Row label="Site title"><input className="wse-input" value={s.seo.siteTitle} onChange={(e) => set((d) => (d.settings.seo.siteTitle = e.target.value), "seo-title")} /></Row>
          <Row label="Site description"><textarea className="wse-input" rows={3} value={s.seo.description} onChange={(e) => set((d) => (d.settings.seo.description = e.target.value), "seo-desc")} /></Row>
          <Row label="Social sharing image"><ImageField value={s.seo.ogImage} websiteId={websiteId} onChange={(v) => set((d) => (d.settings.seo.ogImage = v))} /></Row>
          <label className="wse-toggle"><input type="checkbox" checked={s.seo.allowIndexing} onChange={(e) => set((d) => (d.settings.seo.allowIndexing = e.target.checked))} /><span>Allow search engines to index this website</span></label>
        </>
      ) : null}

      {sub === "features" ? (
        <>
          {FEATURES.map(([k, label, desc]) => (
            <label key={k} className="wse-feature">
              <input type="checkbox" checked={!!s.features[k]} onChange={(e) => set((d) => (d.settings.features[k] = e.target.checked))} />
              <span><strong>{label}</strong><small>{desc}</small></span>
            </label>
          ))}
          <h4 className="wse-subtitle">Booking & reservations</h4>
          <div className="wse-grid2">
            <Row label="Opens"><input type="time" className="wse-input" value={s.booking.openTime} onChange={(e) => set((d) => (d.settings.booking.openTime = e.target.value))} /></Row>
            <Row label="Closes"><input type="time" className="wse-input" value={s.booking.closeTime} onChange={(e) => set((d) => (d.settings.booking.closeTime = e.target.value))} /></Row>
            <Row label="Slot length (min)"><NumberInput value={s.booking.slotMinutes} min={10} max={240} onChange={(v) => set((d) => (d.settings.booking.slotMinutes = v ?? 30))} /></Row>
            <Row label="Max party size"><NumberInput value={s.booking.maxPartySize} min={1} max={100} onChange={(v) => set((d) => (d.settings.booking.maxPartySize = v ?? 10))} /></Row>
          </div>
          <Row label="Open days">
            <div className="wse-seg wse-seg--wrap">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                <button type="button" key={day} className={s.booking.daysOpen.includes(i) ? "is-active" : ""} onClick={() => set((d) => (d.settings.booking.daysOpen = d.settings.booking.daysOpen.includes(i) ? d.settings.booking.daysOpen.filter((x) => x !== i) : [...d.settings.booking.daysOpen, i].sort()))}>{day}</button>
              ))}
            </div>
          </Row>
          <h4 className="wse-subtitle">Shipping, delivery & tax</h4>
          <div className="wse-grid2">
            <Row label="Shipping flat rate"><NumberInput value={s.shipping.flatRate} min={0} step={0.01} onChange={(v) => set((d) => (d.settings.shipping.flatRate = v ?? 0))} /></Row>
            <Row label="Free shipping over"><NumberInput value={s.shipping.freeOver} min={0} step={0.01} onChange={(v) => set((d) => (d.settings.shipping.freeOver = v ?? 0))} /></Row>
            <Row label="Delivery fee"><NumberInput value={s.shipping.deliveryFee} min={0} step={0.01} onChange={(v) => set((d) => (d.settings.shipping.deliveryFee = v ?? 0))} /></Row>
            <Row label="Tax rate (%)"><NumberInput value={s.shipping.taxRate} min={0} max={30} step={0.01} onChange={(v) => set((d) => (d.settings.shipping.taxRate = v ?? 0))} /></Row>
          </div>
          <Row label="Currency"><input className="wse-input" maxLength={3} value={s.currency} onChange={(e) => set((d) => (d.settings.currency = e.target.value.toUpperCase()))} /></Row>
          {s.features.customCakes ? (
            <>
              <h4 className="wse-subtitle">Custom order options</h4>
              <Row label="Sizes (one per line: Label = price)">
                <textarea className="wse-input" rows={4} value={s.cakeOptions.sizes.map((x) => `${x.label} = ${x.price}`).join("\n")} onChange={(e) => set((d) => (d.settings.cakeOptions.sizes = e.target.value.split("\n").map((l) => { const [label, price] = l.split("="); return { label: (label ?? "").trim(), price: Number(price) || 0 }; }).filter((x) => x.label)))} />
              </Row>
              {(["flavors", "fillings", "frostings"] as const).map((k) => (
                <Row key={k} label={`${k[0].toUpperCase() + k.slice(1)} (comma separated)`}>
                  <input className="wse-input" value={s.cakeOptions[k].join(", ")} onChange={(e) => set((d) => (d.settings.cakeOptions[k] = e.target.value.split(",").map((x) => x.trim()).filter(Boolean)), `cake-${k}`)} />
                </Row>
              ))}
              <div className="wse-grid2">
                <Row label="Decoration fee"><NumberInput value={s.cakeOptions.decorationFee} min={0} onChange={(v) => set((d) => (d.settings.cakeOptions.decorationFee = v ?? 0))} /></Row>
                <Row label="Notice (days)"><NumberInput value={s.cakeOptions.leadTimeDays} min={0} max={60} onChange={(v) => set((d) => (d.settings.cakeOptions.leadTimeDays = v ?? 0))} /></Row>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {sub === "products" ? (
        <>
          <Row label="Product categories (comma separated)">
            <input className="wse-input" value={content.catalog.productCategories.join(", ")} onChange={(e) => set((d) => (d.catalog.productCategories = e.target.value.split(",").map((x) => x.trim()).filter(Boolean)), "pcats")} />
          </Row>
          <button type="button" className="wse-btn wse-btn--primary wse-btn--block" onClick={() => set((d) => d.catalog.products.unshift({ id: uid("prod"), name: "New product", description: "", price: 10, image: "", category: d.catalog.productCategories[0] ?? "General", inventory: null, tags: [], featured: true, active: true }))}><Icon name="Plus" size={14} /> Add product</button>
          <div className="wse-list">
            {content.catalog.products.map((p, i) => (
              <ProductEditor key={p.id} p={p} websiteId={websiteId} categories={content.catalog.productCategories} onChange={(np) => set((d) => (d.catalog.products[i] = np), `prod-${p.id}`)} onDelete={() => window.confirm(`Delete ${p.name}?`) && set((d) => d.catalog.products.splice(i, 1))} />
            ))}
          </div>
        </>
      ) : null}

      {sub === "services" ? (
        <>
          <button type="button" className="wse-btn wse-btn--primary wse-btn--block" onClick={() => set((d) => d.catalog.services.push({ id: uid("svc"), name: "New service", description: "", price: 50, durationMinutes: 60, image: "", category: "Services", icon: "Sparkles" }))}><Icon name="Plus" size={14} /> Add service</button>
          {content.catalog.services.map((sv: CatalogService, i) => (
            <div key={sv.id} className="wse-card-lite">
              <input className="wse-input" value={sv.name} onChange={(e) => set((d) => (d.catalog.services[i].name = e.target.value), `svc-n-${sv.id}`)} />
              <textarea className="wse-input" rows={2} value={sv.description} onChange={(e) => set((d) => (d.catalog.services[i].description = e.target.value), `svc-d-${sv.id}`)} />
              <div className="wse-grid2">
                <Row label="Price"><NumberInput value={sv.price} min={0} step={0.01} onChange={(v) => set((d) => (d.catalog.services[i].price = v ?? 0))} /></Row>
                <Row label="Duration (min)"><NumberInput value={sv.durationMinutes} min={5} max={1440} onChange={(v) => set((d) => (d.catalog.services[i].durationMinutes = v ?? 30))} /></Row>
              </div>
              <ImageField value={sv.image} websiteId={websiteId} onChange={(v) => set((d) => (d.catalog.services[i].image = v))} />
              <button type="button" className="wse-btn wse-btn--danger wse-btn--sm" onClick={() => set((d) => d.catalog.services.splice(i, 1))}>Delete service</button>
            </div>
          ))}
        </>
      ) : null}

      {sub === "staff" ? (
        <>
          <button type="button" className="wse-btn wse-btn--primary wse-btn--block" onClick={() => set((d) => d.catalog.staff.push({ id: uid("st"), name: "Team member", role: "Specialist", bio: "", image: "", serviceIds: [] }))}><Icon name="Plus" size={14} /> Add team member</button>
          {content.catalog.staff.map((m: StaffMember, i) => (
            <div key={m.id} className="wse-card-lite">
              <input className="wse-input" value={m.name} onChange={(e) => set((d) => (d.catalog.staff[i].name = e.target.value), `st-n-${m.id}`)} />
              <input className="wse-input" value={m.role} onChange={(e) => set((d) => (d.catalog.staff[i].role = e.target.value), `st-r-${m.id}`)} placeholder="Role" />
              <textarea className="wse-input" rows={2} value={m.bio} onChange={(e) => set((d) => (d.catalog.staff[i].bio = e.target.value), `st-b-${m.id}`)} placeholder="Short bio" />
              <ImageField value={m.image} websiteId={websiteId} onChange={(v) => set((d) => (d.catalog.staff[i].image = v))} />
              <Row label="Services offered">
                <div className="wse-seg wse-seg--wrap">
                  {content.catalog.services.map((sv) => {
                    const on = (m.serviceIds ?? []).includes(sv.id);
                    return <button type="button" key={sv.id} className={on ? "is-active" : ""} onClick={() => set((d) => (d.catalog.staff[i].serviceIds = on ? (m.serviceIds ?? []).filter((x) => x !== sv.id) : [...(m.serviceIds ?? []), sv.id]))}>{sv.name}</button>;
                  })}
                </div>
              </Row>
              <button type="button" className="wse-btn wse-btn--danger wse-btn--sm" onClick={() => set((d) => d.catalog.staff.splice(i, 1))}>Remove</button>
            </div>
          ))}
        </>
      ) : null}

      {sub === "orders" ? (
        <div className="wse-card-lite">
          <p><Icon name="ShieldCheck" size={16} /> Payments on this website are processed securely by <b>Fockis Payments</b> (Stripe). Customers sign in with their Fockis account at checkout.</p>
          {kind === "website" && websiteId ? (
            <a className="wse-btn wse-btn--primary wse-btn--block" href={`/website-studio/websites/${websiteId}/settings?tab=orders`} target="_blank" rel="noreferrer">Open orders, bookings & messages</a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
