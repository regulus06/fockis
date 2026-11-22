import React, { useState } from "react";
import { Icon, SOCIAL_ICON } from "../icons";
import { useRender, useSection } from "../context";
import { EditableButton, EditableImage, EditableText, SiteLink } from "../editable";
import { useCart } from "../../runtime/cart";
import type { NavLink } from "../../types/content";

function Logo() {
  const section = useSection();
  const { content } = useRender();
  const p = section.props;
  const style = p.logoStyle ?? "simple";
  const logoUrl = p.logoUrl || content.settings.logoUrl;
  if (logoUrl) {
    return (
      <SiteLink href="page:home" className="ws-logo ws-logo--image">
        <EditableImage path="logoUrl" alt={content.settings.businessName} className="ws-logo__img" loading="eager" />
      </SiteLink>
    );
  }
  const icon =
    style === "barber" ? (
      <Icon name="BarberPole" size={64} />
    ) : style === "retail" ? (
      <span className="ws-logo__bag">
        <Icon name="ShoppingBag" size={58} strokeWidth={2.2} />
        <b>{(p.logoText || "F").trim().charAt(0)}</b>
      </span>
    ) : (
      <Icon name={p.logoIcon} size={style === "restaurant" ? 54 : style === "bakery" ? 34 : 44} strokeWidth={style === "restaurant" ? 1.6 : 1.5} />
    );
  return (
    <SiteLink href="page:home" className={`ws-logo ws-logo--${style}`}>
      <span className="ws-logo__icon">{icon}</span>
      <span className="ws-logo__text">
        <EditableText path="logoText" className="ws-logo__name" />
        <EditableText path="logoSubtext" className="ws-logo__sub" />
      </span>
    </SiteLink>
  );
}

function isActive(link: NavLink, currentSlug: string) {
  if (!link.href.startsWith("page:")) return false;
  const slug = link.href.slice(5).split(/[?#]/)[0];
  if (link.href.includes("?")) return false;
  return slug === currentSlug;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { content, page } = useRender();
  return (
    <>
      {content.navigation.map((link) => (
        <div key={link.id} className={`ws-nav__item${link.children?.length ? " has-children" : ""}`}>
          <SiteLink href={link.href} className={`ws-nav__link${isActive(link, page.slug) ? " is-active" : ""}`} onClick={onNavigate}>
            {link.label}
            {link.children?.length ? <Icon name="ChevronDown" size={16} /> : null}
          </SiteLink>
          {link.children?.length ? (
            <div className="ws-nav__dropdown">
              {link.children.map((c) => (
                <SiteLink key={c.id} href={c.href} className="ws-nav__dropdown-link" onClick={onNavigate}>
                  {c.label}
                </SiteLink>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}

function Socials({ size = 22 }: { size?: number }) {
  const { content } = useRender();
  const social = content.settings.social ?? {};
  return (
    <>
      {Object.entries(social)
        .filter(([, url]) => !!url)
        .map(([k, url]) => (
          <a key={k} href={url === "#" ? undefined : url} target="_blank" rel="noopener noreferrer" aria-label={k} className="ws-social">
            <Icon name={SOCIAL_ICON[k]} size={size} />
          </a>
        ))}
    </>
  );
}

function HeaderIcons({ retail }: { retail?: boolean }) {
  const section = useSection();
  const { navigate, mode } = useRender();
  const cart = useCart();
  const p = section.props;
  const openCart = () => (mode === "edit" ? navigate("page:cart") : cart.setOpen(true));
  if (retail) {
    return (
      <div className="ws-header__actions ws-header__actions--retail">
        {p.showAccount ? (
          <SiteLink href="page:account" className="ws-header__action">
            <Icon name="User" size={30} strokeWidth={1.6} />
            <span className="ws-header__action-text">
              <small>Sign In</small>
              <span>
                My Account <Icon name="ChevronDown" size={14} />
              </span>
            </span>
          </SiteLink>
        ) : null}
        {p.showWishlist ? (
          <SiteLink href="page:account" className="ws-header__action">
            <Icon name="Heart" size={30} strokeWidth={1.6} />
            <span className="ws-header__action-label">Wishlist</span>
          </SiteLink>
        ) : null}
        {p.showCart ? (
          <button type="button" className="ws-header__action" onClick={openCart}>
            <span className="ws-cart-icon">
              <Icon name="ShoppingCart" size={32} strokeWidth={1.6} />
              <span className="ws-badge">{cart.count}</span>
            </span>
            <span className="ws-header__action-label">Cart</span>
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="ws-header__actions">
      {p.showSearch ? (
        <SiteLink href="page:shop" className="ws-header__icon" >
          <Icon name="Search" size={26} strokeWidth={1.7} />
        </SiteLink>
      ) : null}
      {p.showAccount ? (
        <SiteLink href="page:account" className="ws-header__icon">
          <Icon name="User" size={26} strokeWidth={1.7} />
        </SiteLink>
      ) : null}
      {p.showCart ? (
        <button type="button" className="ws-header__icon ws-cart-icon" onClick={openCart} aria-label="Cart">
          <Icon name="ShoppingCart" size={27} strokeWidth={1.7} />
          <span className="ws-badge">{cart.count}</span>
        </button>
      ) : null}
    </div>
  );
}

export default function HeaderSection() {
  const section = useSection();
  const { navigate, edit } = useRender();
  const p = section.props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const retail = p.layout === "retail";

  const topBar = p.showTopBar ? (
    <div className="ws-topbar">
      <div className="ws-container ws-topbar__inner">
        <div className="ws-topbar__left">
          {(p.topBarLeft ?? []).map((it: any, i: number) => (
            <span className="ws-topbar__item" key={i}>
              {it.icon ? <Icon name={it.icon} size={19} /> : null}
              <EditableText path={`topBarLeft.${i}.text`} />
            </span>
          ))}
        </div>
        <div className="ws-topbar__right">
          {(p.topBarRight ?? []).map((it: any, i: number) => (
            <span className="ws-topbar__item" key={i}>
              {it.icon ? <Icon name={it.icon} size={19} /> : null}
              {it.href ? (
                <SiteLink href={it.href}>
                  <EditableText path={`topBarRight.${i}.text`} />
                </SiteLink>
              ) : (
                <>
                  <EditableText path={`topBarRight.${i}.text`} />
                  {it.text === "USD" ? <Icon name="ChevronDown" size={14} /> : null}
                </>
              )}
            </span>
          ))}
          {p.showSocialInTopBar ? (
            <span className="ws-topbar__social">
              <Socials size={22} />
              <span className="ws-topbar__follow">
                <EditableText path="socialLabel" />
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  const mobileToggle = (
    <button type="button" className="ws-header__burger" aria-label="Open menu" onClick={() => setOpen((v) => !v)}>
      <Icon name={open ? "X" : "Menu"} size={26} />
    </button>
  );

  const drawer = open ? (
    <div className="ws-drawer" onClick={() => setOpen(false)}>
      <nav className="ws-drawer__panel" onClick={(e) => e.stopPropagation()}>
        <NavLinks onNavigate={() => setOpen(false)} />
        {p.cta?.label ? <EditableButton path="cta" className="ws-drawer__cta" /> : null}
      </nav>
    </div>
  ) : null;

  if (retail) {
    return (
      <div className="ws-header ws-header--retail">
        {topBar}
        <div className="ws-header__main">
          <div className="ws-container ws-header__row">
            {mobileToggle}
            <Logo />
            {p.showSearch ? (
              <form
                className="ws-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!edit) navigate(`page:shop?q=${encodeURIComponent(q)}`);
                }}
              >
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={p.searchPlaceholder || "Search products…"} aria-label="Search" />
                <button type="submit" aria-label="Search">
                  <Icon name="Search" size={26} strokeWidth={2} />
                </button>
              </form>
            ) : null}
            <HeaderIcons retail />
          </div>
        </div>
        <nav className="ws-header__navbar">
          <div className="ws-container ws-header__navbar-inner">
            <SiteLink href="page:shop" className="ws-catmenu">
              <Icon name="Menu" size={26} />
              <EditableText path="categoryMenuLabel" />
              <Icon name="ChevronDown" size={18} />
            </SiteLink>
            <div className="ws-nav">
              <NavLinks />
            </div>
          </div>
        </nav>
        {drawer}
      </div>
    );
  }

  return (
    <div className={`ws-header ws-header--${section.variant ?? "simple"}`}>
      {topBar}
      <div className="ws-header__main">
        <div className="ws-container ws-header__row">
          {mobileToggle}
          <Logo />
          <nav className="ws-nav">
            <NavLinks />
          </nav>
          <HeaderIcons />
          {p.cta?.label ? <EditableButton path="cta" className="ws-header__cta" /> : null}
        </div>
      </div>
      {drawer}
    </div>
  );
}

export { Socials };
