import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons";
import { useRender, useSection } from "../context";
import { EditableText, SectionHeading, SiteLink } from "../editable";
import { formatMoney } from "../theme";
import { useCart } from "../../runtime/cart";
import { getToken } from "../../../../utils/auth";
import { websiteStudioApi, apiError } from "../../services/websiteStudioApi";
import type { CatalogProduct } from "../../types/content";
import type { WebsiteOrder, WebsiteSubmission } from "../../types/studio";

export function Stars({ rating = 0, count }: { rating?: number; count?: number }) {
  return (
    <span className="ws-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`ws-star${rating >= n - 0.25 ? " is-full" : rating >= n - 0.75 ? " is-half" : ""}`}>
          ★
        </span>
      ))}
      {count !== undefined ? <span className="ws-stars__count">({count.toLocaleString()})</span> : null}
    </span>
  );
}

function matchesFilter(p: CatalogProduct, filter?: string) {
  if (!filter || filter === "all") return true;
  if (filter === "featured") return !!p.featured;
  if (filter === "sale") return !!p.compareAtPrice && p.compareAtPrice > p.price;
  return (p.tags ?? []).includes(filter);
}

export function useAddToCart() {
  const { content, mode } = useRender();
  const cart = useCart();
  return (p: CatalogProduct, options?: Record<string, string>, quantity = 1) => {
    if (mode === "edit") return;
    cart.add({ kind: "product", productId: p.id, name: p.name, image: p.image, unitPrice: p.price, quantity, options });
    void content;
  };
}

export function ProductCard({ product, variant, showRatings, showWishlist, buttonLabel }: { product: CatalogProduct; variant: string; showRatings?: boolean; showWishlist?: boolean; buttonLabel?: string }) {
  const { content, mode } = useRender();
  const cart = useCart();
  const add = useAddToCart();
  const currency = content.settings.currency;
  const onSale = !!product.compareAtPrice && product.compareAtPrice > product.price;
  const pct = onSale ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100) : 0;
  const soldOut = product.inventory !== null && product.inventory !== undefined && product.inventory <= 0;
  const needsOptions = (product.variants ?? []).length > 0;
  const wished = cart.wishlist.includes(product.id);
  const canBuy = content.settings.features.cart;

  const detailHref = `page:product?id=${encodeURIComponent(product.id)}`;
  const action = () => {
    if (needsOptions) return;
    add(product);
  };

  return (
    <article className={`ws-product ws-product--${variant}`}>
      <div className="ws-product__media">
        {onSale && variant === "retail" ? <span className="ws-product__badge">-{pct}%</span> : product.badge ? <span className="ws-product__badge">{product.badge}</span> : null}
        {showWishlist ? (
          <button type="button" className={`ws-product__wish${wished ? " is-active" : ""}`} aria-label="Add to wishlist" onClick={() => mode !== "edit" && cart.toggleWishlist(product.id)}>
            <Icon name="Heart" size={24} strokeWidth={1.6} />
          </button>
        ) : null}
        <SiteLink href={detailHref}>
          <img src={product.image} alt={product.name} loading="lazy" className="ws-product__img" />
        </SiteLink>
      </div>
      <div className="ws-product__body">
        <SiteLink href={detailHref} className="ws-product__name">
          {product.name}
        </SiteLink>
        {variant === "menu" ? <p className="ws-product__desc">{product.description}</p> : null}
        {showRatings ? <Stars rating={product.rating} count={product.reviewCount} /> : null}
        <div className="ws-product__price">
          <span className={onSale ? "is-sale" : ""}>{formatMoney(product.price, currency)}</span>
          {onSale ? <s>{formatMoney(product.compareAtPrice as number, currency)}</s> : null}
        </div>
      </div>
      {canBuy ? (
        needsOptions ? (
          <SiteLink href={detailHref} className="ws-btn ws-btn--primary ws-product__btn">
            <Icon name="ShoppingCart" size={20} />
            <span>Choose Options</span>
          </SiteLink>
        ) : (
          <button type="button" className="ws-btn ws-btn--primary ws-product__btn" disabled={soldOut} onClick={action}>
            <Icon name={variant === "menu" ? "Plus" : "ShoppingCart"} size={20} />
            <span>{soldOut ? "Sold Out" : buttonLabel || "Add to Cart"}</span>
          </button>
        )
      ) : null}
    </article>
  );
}

export function ProductGrid() {
  const section = useSection();
  const { content } = useRender();
  const p = section.props;
  const tabs: { label: string; filter: string }[] = p.tabs ?? [];
  const [tab, setTab] = useState(0);
  const filter = tabs.length ? tabs[tab]?.filter : p.filter;
  const products = content.catalog.products.filter((x) => x.active !== false && matchesFilter(x, filter)).slice(0, p.limit || 8);
  return (
    <div className="ws-container">
      <div className={`ws-grid-head${tabs.length ? " has-tabs" : ""}`}>
        <SectionHeading styleOverride={tabs.length ? "plain" : undefined} />
        {tabs.length ? (
          <div className="ws-tabs" role="tablist">
            {tabs.map((t, i) => (
              <button type="button" role="tab" aria-selected={i === tab} key={i} className={i === tab ? "is-active" : ""} onClick={() => setTab(i)}>
                {t.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="ws-products">
        {products.map((prod) => (
          <ProductCard key={prod.id} product={prod} variant={section.variant ?? "retail"} showRatings={p.showRatings} showWishlist={p.showWishlist} buttonLabel={p.buttonLabel} />
        ))}
        {!products.length ? <p className="ws-empty">No products match this filter yet. Add products in Store settings.</p> : null}
      </div>
    </div>
  );
}

export function ProductCatalog() {
  const section = useSection();
  const { content, runtime, mode } = useRender();
  const p = section.props;
  const q0 = mode === "edit" ? "" : runtime.query.get("q") ?? "";
  const cat0 = mode === "edit" ? "" : runtime.query.get("category") ?? "";
  const tag0 = mode === "edit" ? p.filterTag || "" : runtime.query.get("tag") ?? p.filterTag ?? "";
  const [q, setQ] = useState(q0);
  const [cat, setCat] = useState(cat0);
  const [tag, setTag] = useState(tag0);
  const [sort, setSort] = useState("featured");
  useEffect(() => {
    setQ(q0);
    setCat(cat0);
    setTag(tag0);
  }, [q0, cat0, tag0]);

  const categories = content.catalog.productCategories.length ? content.catalog.productCategories : [...new Set(content.catalog.products.map((x) => x.category))];
  const list = useMemo(() => {
    let out = content.catalog.products.filter((x) => x.active !== false);
    if (cat) out = out.filter((x) => x.category === cat);
    if (tag) out = out.filter((x) => matchesFilter(x, tag));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter((x) => `${x.name} ${x.description} ${x.category}`.toLowerCase().includes(needle));
    }
    const sorted = [...out];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "rating") sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "featured") sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [content.catalog.products, cat, tag, q, sort]);

  const layout = p.layout === "list" ? "menu" : section.variant ?? "retail";
  const grouped = layout === "menu" && !cat && !q;

  return (
    <div className="ws-container">
      <div className="ws-catalog__toolbar">
        {p.showSearch ? (
          <label className="ws-catalog__search">
            <Icon name="Search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search products" />
          </label>
        ) : null}
        {p.showCategories ? (
          <div className="ws-chips">
            <button type="button" className={!cat ? "is-active" : ""} onClick={() => setCat("")}>
              All
            </button>
            {categories.map((c) => (
              <button type="button" key={c} className={cat === c ? "is-active" : ""} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        ) : null}
        {p.showSort ? (
          <select className="ws-catalog__sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Top rated</option>
            <option value="name">Name</option>
          </select>
        ) : null}
        {tag ? (
          <button type="button" className="ws-chip-clear" onClick={() => setTag("")}>
            {tag === "sale" ? "On sale" : tag === "new" ? "New arrivals" : tag === "bestseller" ? "Best sellers" : tag} <Icon name="X" size={14} />
          </button>
        ) : null}
      </div>
      {grouped ? (
        categories.map((c) => {
          const items = list.filter((x) => x.category === c);
          if (!items.length) return null;
          return (
            <div key={c} className="ws-menu-group">
              <h3 className="ws-menu-group__title">{c}</h3>
              <div className="ws-products ws-products--menu">
                {items.map((prod) => (
                  <ProductCard key={prod.id} product={prod} variant="menu" buttonLabel="Add" />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className={`ws-products ws-products--${layout}`}>
          {list.map((prod) => (
            <ProductCard key={prod.id} product={prod} variant={layout} showRatings={p.showRatings} showWishlist={p.showWishlist} buttonLabel={layout === "menu" ? "Add" : undefined} />
          ))}
        </div>
      )}
      {!list.length ? <p className="ws-empty">No products found.</p> : null}
    </div>
  );
}

/** Built-in product detail page (rendered for page:product?id=...). */
export function ProductDetail({ productId }: { productId: string }) {
  const { content, navigate } = useRender();
  const add = useAddToCart();
  const product = content.catalog.products.find((x) => x.id === productId);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  if (!product) {
    return (
      <div className="ws-container ws-pad">
        <p className="ws-empty">This product is no longer available.</p>
      </div>
    );
  }
  const currency = content.settings.currency;
  const variants = product.variants ?? [];
  const ready = variants.every((v) => options[v.name]);
  const soldOut = product.inventory !== null && product.inventory !== undefined && product.inventory <= 0;
  const reviews = content.catalog.reviews.filter((r) => r.productId === product.id);
  return (
    <div className="ws-container ws-pad ws-pdp">
      <button type="button" className="ws-link-btn" onClick={() => navigate("page:shop")}>
        <Icon name="ChevronLeft" size={16} /> Back to shop
      </button>
      <div className="ws-pdp__grid">
        <div className="ws-pdp__media">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="ws-pdp__info">
          <p className="ws-pdp__cat">{product.category}</p>
          <h1 className="ws-pdp__name">{product.name}</h1>
          {product.rating ? <Stars rating={product.rating} count={product.reviewCount} /> : null}
          <div className="ws-product__price ws-pdp__price">
            <span className={product.compareAtPrice ? "is-sale" : ""}>{formatMoney(product.price, currency)}</span>
            {product.compareAtPrice ? <s>{formatMoney(product.compareAtPrice, currency)}</s> : null}
          </div>
          <p className="ws-pdp__desc">{product.description}</p>
          {variants.map((v) => (
            <div key={v.name} className="ws-pdp__variant">
              <span>{v.name}</span>
              <div className="ws-chips">
                {v.options.map((o) => (
                  <button type="button" key={o} className={options[v.name] === o ? "is-active" : ""} onClick={() => setOptions({ ...options, [v.name]: o })}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {product.inventory !== null && product.inventory !== undefined ? (
            <p className={`ws-stock${soldOut ? " is-out" : ""}`}>{soldOut ? "Out of stock" : product.inventory < 10 ? `Only ${product.inventory} left` : "In stock"}</p>
          ) : null}
          {content.settings.features.cart ? (
            <div className="ws-pdp__buy">
              <div className="ws-qty">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">
                  <Icon name="Minus" size={16} />
                </button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty(Math.min(99, qty + 1))} aria-label="Increase">
                  <Icon name="Plus" size={16} />
                </button>
              </div>
              <button type="button" className="ws-btn ws-btn--primary" disabled={!ready || soldOut} onClick={() => add(product, variants.length ? options : undefined, qty)}>
                <Icon name="ShoppingCart" size={20} />
                <span>{ready ? "Add to Cart" : `Select ${variants.find((v) => !options[v.name])?.name}`}</span>
              </button>
            </div>
          ) : null}
          <ul className="ws-pdp__perks">
            {content.settings.features.shipping ? <li><Icon name="Truck" size={18} /> Free shipping over {formatMoney(content.settings.shipping.freeOver, currency)}</li> : null}
            {content.settings.features.pickup ? <li><Icon name="Store" size={18} /> Local pickup available</li> : null}
            <li><Icon name="ShieldCheck" size={18} /> Secure checkout</li>
          </ul>
        </div>
      </div>
      {reviews.length ? (
        <div className="ws-pdp__reviews">
          <h2>Customer Reviews</h2>
          {reviews.map((r) => (
            <div key={r.id} className="ws-review">
              <Stars rating={r.rating} />
              <p>{r.text}</p>
              <small>— {r.name}</small>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CartSection() {
  const section = useSection();
  const { content, mode, navigate } = useRender();
  const cart = useCart();
  const currency = content.settings.currency;
  const p = section.props;
  return (
    <div className="ws-container ws-cart">
      <EditableText as="h1" path="title" className="ws-cart__title" />
      {!cart.items.length ? (
        <div className="ws-cart__empty">
          <Icon name="ShoppingCart" size={42} />
          <EditableText as="p" path="emptyText" />
          <button type="button" className="ws-btn ws-btn--primary" onClick={() => navigate(p.continueHref || "page:home")}>
            <span>{p.continueLabel || "Continue Shopping"}</span>
          </button>
        </div>
      ) : (
        <div className="ws-cart__grid">
          <div className="ws-cart__lines">
            {cart.items.map((l) => (
              <div key={l.key} className="ws-cart-line">
                {l.image ? <img src={l.image} alt="" /> : <span className="ws-cart-line__ph"><Icon name="CakeSlice" size={26} /></span>}
                <div className="ws-cart-line__info">
                  <strong>{l.name}</strong>
                  {l.options ? <small>{Object.entries(l.options).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ")}</small> : null}
                  <span>{formatMoney(l.unitPrice, currency)}</span>
                </div>
                <div className="ws-qty">
                  <button type="button" onClick={() => cart.setQuantity(l.key, l.quantity - 1)} aria-label="Decrease"><Icon name="Minus" size={16} /></button>
                  <span>{l.quantity}</span>
                  <button type="button" onClick={() => cart.setQuantity(l.key, l.quantity + 1)} aria-label="Increase"><Icon name="Plus" size={16} /></button>
                </div>
                <button type="button" className="ws-icon-btn" onClick={() => cart.remove(l.key)} aria-label="Remove"><Icon name="Trash2" size={18} /></button>
              </div>
            ))}
          </div>
          <aside className="ws-cart__summary">
            <div className="ws-sum-totals">
              <div className="is-total"><span>Subtotal</span><span>{formatMoney(cart.subtotal, currency)}</span></div>
            </div>
            <p className="ws-muted">Shipping, delivery, discounts and taxes are calculated at checkout.</p>
            <button type="button" className="ws-btn ws-btn--primary ws-btn--block" onClick={() => mode !== "edit" && cart.setOpen(true)}>
              <span>Checkout</span>
              <Icon name="ArrowRight" size={18} />
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

export function AccountSection() {
  const { runtime, mode, content } = useRender();
  const [data, setData] = useState<{ orders: WebsiteOrder[]; bookings: WebsiteSubmission[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loggedIn = Boolean(getToken());
  useEffect(() => {
    if (mode !== "live" || !loggedIn || !runtime.siteId) return;
    websiteStudioApi.myOrders(runtime.siteId).then(setData).catch((e) => setError(apiError(e)));
  }, [mode, loggedIn, runtime.siteId]);
  const currency = content.settings.currency;
  return (
    <div className="ws-container ws-account">
      <EditableText as="h1" path="title" className="ws-cart__title" />
      <EditableText as="p" path="text" className="ws-muted" multiline />
      {!loggedIn || mode !== "live" ? (
        <a className="ws-btn ws-btn--primary" href={mode === "live" ? `/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}` : undefined}>
          <Icon name="User" size={18} />
          <span>Sign in with Fockis</span>
        </a>
      ) : error ? (
        <p className="ws-form-error">{error}</p>
      ) : !data ? (
        <p className="ws-muted">Loading your orders…</p>
      ) : (
        <div className="ws-account__lists">
          <h3>Orders</h3>
          {!data.orders.length ? <p className="ws-muted">No orders yet.</p> : null}
          {data.orders.map((o) => (
            <div key={o.id} className="ws-order-row">
              <div>
                <strong>#{o.orderNumber}</strong>
                <small>{new Date(o.createdAt).toLocaleString()}</small>
              </div>
              <span className={`ws-status ws-status--${o.status}`}>{o.status.replace(/_/g, " ")}</span>
              <span>{formatMoney(o.total, o.currency || currency)}</span>
              {o.trackingNumber ? <small>Tracking: {o.trackingNumber}</small> : null}
            </div>
          ))}
          {data.bookings.length ? <h3>Bookings & reservations</h3> : null}
          {data.bookings.map((b) => (
            <div key={b.id} className="ws-order-row">
              <div>
                <strong>{b.data.serviceName || (b.type === "reservation" ? `Table for ${b.data.partySize}` : b.type)}</strong>
                <small>{b.data.date} {b.data.time}</small>
              </div>
              <span className={`ws-status ws-status--${b.status}`}>{b.status}</span>
              <small>Code {b.confirmationCode}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
