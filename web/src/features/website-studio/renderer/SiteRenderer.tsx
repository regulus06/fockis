import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Section, SiteContent, SitePage } from "../types/content";
import { CartProvider, useCart } from "../runtime/cart";
import CheckoutDialog from "../runtime/CheckoutDialog";
import { RenderContext, SectionProvider, type EditBridge, type RenderContextValue, type RenderMode, type SiteRuntime } from "./context";
import { Icon } from "./icons";
import { SECTION_COMPONENTS } from "./sections";
import { ProductDetail } from "./sections/CommerceSections";
import { ensureFonts, fontsForContent, formatMoney, sectionCss, themeVars } from "./theme";
import "../styles/site.scss";

export interface SectionFrameProps {
  section: Section;
  index: number;
  area: "header" | "page" | "footer";
  count: number;
  children: React.ReactNode;
}

export interface SiteRendererProps {
  content: SiteContent;
  pageSlug: string;
  mode: RenderMode;
  runtime: SiteRuntime;
  edit?: EditBridge | null;
  /** Editor/preview navigation handler. Live sites use the router. */
  onNavigate?: (slug: string, query: string) => void;
  SectionFrame?: React.ComponentType<SectionFrameProps>;
  className?: string;
}

export function findPage(content: SiteContent, slug: string, includeHidden: boolean): SitePage | undefined {
  const home = content.pages.find((p) => p.isHomepage) ?? content.pages[0];
  if (!slug || slug === "home") return home;
  const page = content.pages.find((p) => p.slug === slug);
  if (page && (page.visibility === "public" || includeHidden)) return page;
  return undefined;
}

export function parseHref(href: string): { slug: string; query: string } | null {
  if (!href.startsWith("page:")) return null;
  const rest = href.slice(5);
  const qi = rest.search(/[?#]/);
  return qi === -1 ? { slug: rest, query: "" } : { slug: rest.slice(0, qi), query: rest.slice(qi) };
}

function SectionView({ section, area, index, count, Frame }: { section: Section; area: SectionFrameProps["area"]; index: number; count: number; Frame?: React.ComponentType<SectionFrameProps> }) {
  const Comp = SECTION_COMPONENTS[section.type];
  if (!Comp) return null;
  const anim = section.style?.animation && section.style.animation !== "none" ? section.style.animation : undefined;
  const Tag = area === "header" ? "header" : area === "footer" ? "footer" : "section";
  const node = (
    <Tag
      className={`ws-section ws-s-${section.type}${section.variant ? ` ws-v-${section.variant}` : ""}${section.style?.fullWidth ? " is-full" : ""}`}
      data-ws-s={section.id}
      data-ws-anim={anim}
      id={`s-${section.id}`}
    >
      <SectionProvider section={section}>
        <Comp />
      </SectionProvider>
    </Tag>
  );
  if (Frame) {
    return (
      <Frame section={section} area={area} index={index} count={count}>
        {node}
      </Frame>
    );
  }
  if (section.style?.hidden) return null;
  return node;
}

function MiniCart({ onCheckout, canCheckout }: { onCheckout: () => void; canCheckout: boolean }) {
  const cart = useCart();
  const ctx = React.useContext(RenderContext)!;
  const currency = ctx.content.settings.currency;
  if (!cart.open) return null;
  return (
    <div className="ws-drawer ws-drawer--right" onClick={() => cart.setOpen(false)}>
      <aside className="ws-minicart" onClick={(e) => e.stopPropagation()} aria-label="Shopping cart">
        <div className="ws-minicart__head">
          <h3>Your Cart ({cart.count})</h3>
          <button type="button" className="ws-icon-btn" onClick={() => cart.setOpen(false)} aria-label="Close cart">
            <Icon name="X" size={22} />
          </button>
        </div>
        {cart.lastAdded ? <p className="ws-ok">Added: {cart.lastAdded}</p> : null}
        <div className="ws-minicart__lines">
          {!cart.items.length ? <p className="ws-muted">Your cart is empty.</p> : null}
          {cart.items.map((l) => (
            <div key={l.key} className="ws-cart-line">
              {l.image ? <img src={l.image} alt="" /> : <span className="ws-cart-line__ph"><Icon name="CakeSlice" size={22} /></span>}
              <div className="ws-cart-line__info">
                <strong>{l.name}</strong>
                <span>{formatMoney(l.unitPrice, currency)}</span>
              </div>
              <div className="ws-qty">
                <button type="button" onClick={() => cart.setQuantity(l.key, l.quantity - 1)} aria-label="Decrease"><Icon name="Minus" size={14} /></button>
                <span>{l.quantity}</span>
                <button type="button" onClick={() => cart.setQuantity(l.key, l.quantity + 1)} aria-label="Increase"><Icon name="Plus" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="ws-minicart__foot">
          <div className="ws-sum-totals"><div className="is-total"><span>Subtotal</span><span>{formatMoney(cart.subtotal, currency)}</span></div></div>
          {canCheckout ? (
            <button type="button" className="ws-btn ws-btn--primary ws-btn--block" disabled={!cart.items.length} onClick={onCheckout}>
              <span>Checkout</span>
              <Icon name="ArrowRight" size={18} />
            </button>
          ) : (
            <p className="ws-muted">Checkout is available on the published website.</p>
          )}
          <button type="button" className="ws-btn ws-btn--outline ws-btn--block" onClick={() => (cart.setOpen(false), ctx.navigate("page:cart"))}>
            <span>View Cart</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

function RendererBody(props: SiteRendererProps) {
  const { content, pageSlug, mode, runtime, edit, onNavigate, SectionFrame, className } = props;
  const routerNavigate = useNavigate();
  const cart = useCart();
  const [checkout, setCheckout] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const productId = pageSlug === "product" ? runtime.query.get("id") ?? "" : "";
  const page = productId ? undefined : findPage(content, pageSlug, mode !== "live");
  const effectivePage = page ?? findPage(content, "", true)!;
  const homeSlug = (content.pages.find((p) => p.isHomepage) ?? content.pages[0])?.slug;

  useEffect(() => {
    ensureFonts(fontsForContent(content), rootRef.current?.ownerDocument ?? document);
  }, [content]);

  // Reveal-on-scroll animations on live/preview sites.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-ws-anim]"));
    if (mode === "edit" || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-visible"), io.unobserve(e.target))),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [mode, content, pageSlug]);

  const resolveHref = (href: string): string => {
    const parsed = parseHref(href);
    if (!parsed) return href || "#";
    const slug = !parsed.slug || parsed.slug === homeSlug ? "" : parsed.slug;
    return `${runtime.basePath}/${slug}${parsed.query}`.replace(/\/{2,}/g, "/") || "/";
  };

  const navigate = (href: string) => {
    if (!href) return;
    if (href.startsWith("#")) {
      rootRef.current?.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const parsed = parseHref(href);
    if (!parsed) {
      if (/^https?:/.test(href) && mode !== "edit") window.open(href, "_blank", "noopener");
      return;
    }
    if (onNavigate) {
      onNavigate(parsed.slug || homeSlug || "home", parsed.query);
      return;
    }
    routerNavigate(resolveHref(href));
    window.scrollTo({ top: 0 });
  };

  const css = useMemo(() => {
    const all = [content.header, content.footer, ...effectivePage.sections];
    return all.map((s) => sectionCss(s, mode === "edit")).join("\n");
  }, [content.header, content.footer, effectivePage.sections, mode]);

  const value: RenderContextValue = {
    content,
    page: effectivePage,
    mode,
    runtime,
    edit: edit ?? null,
    navigate,
    resolveHref,
  };

  const sections = effectivePage.sections;
  const canCheckout = mode === "live" && runtime.kind === "website" && !!runtime.siteId;

  return (
    <RenderContext.Provider value={value}>
      <div
        ref={rootRef}
        className={`ws-site ws-skin-${content.theme.skin || "modern"} ws-mode-${mode}${className ? ` ${className}` : ""}`}
        style={themeVars(content.theme)}
        data-breakpoint={edit?.breakpoint}
        // Customer content is shown exactly as the owner wrote it: opt out of the app-wide auto-translator.
        data-no-translate=""
        translate="no"
      >
        <style>{css}</style>
        <SectionView section={content.header} area="header" index={0} count={1} Frame={SectionFrame} />
        <main className="ws-main">
          {productId ? (
            <ProductDetail productId={productId} />
          ) : (
            sections.map((s, i) => <SectionView key={s.id} section={s} area="page" index={i} count={sections.length} Frame={SectionFrame} />)
          )}
          {!productId && !sections.length && mode === "edit" ? (
            <div className="ws-empty-page">
              <Icon name="LayoutGrid" size={34} />
              <p>This page is empty. Add a section from the left panel.</p>
            </div>
          ) : null}
        </main>
        <SectionView section={content.footer} area="footer" index={0} count={1} Frame={SectionFrame} />
        {mode !== "edit" ? <MiniCart canCheckout={canCheckout} onCheckout={() => (cart.setOpen(false), setCheckout(true))} /> : null}
        {checkout && canCheckout ? <CheckoutDialog siteId={runtime.siteId!} content={content} onClose={() => setCheckout(false)} /> : null}
      </div>
    </RenderContext.Provider>
  );
}

export default function SiteRenderer(props: SiteRendererProps) {
  return (
    <CartProvider siteId={props.runtime.siteId} persist={props.mode === "live"}>
      <RendererBody {...props} />
    </CartProvider>
  );
}
