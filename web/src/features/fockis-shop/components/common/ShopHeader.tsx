import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ChevronDown,
  Heart,
  MapPin,
  Menu,
  ShoppingCart,
  User,
  X,
} from "lucide-react";

import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import { useShop } from "../../hooks/useShop";
import { useCategories } from "../../hooks/useCategories";

import { FockisLogo } from "./FockisLogo";
import { ShopSearch } from "./ShopSearch";
import { AddedToCartToast } from "./AddedToCartToast";

/**
 * ============================================================================
 * FOCKIS SHOP — HEADER
 * ============================================================================
 *
 * Main row:  logo · deliver-to · search · account · orders · wishlist · cart
 * Second row: category navigation (real categories from the API) plus the
 *             marketplace sections that already have routes.
 *
 * Auth: the app keeps the session token in localStorage("token") — the same
 * key SellerEntryPage checks. A parent can still force the state through the
 * `isAuthenticated` prop.
 * ============================================================================
 */

interface ShopHeaderProps {
  isAuthenticated?: boolean;
  signInHref?: string;
}

const SECTION_LINKS = [
  { label: "Today's Deals", to: "/shop/deals" },
  { label: "All Products", to: "/shop/products" },
  { label: "Stores", to: "/shop/stores" },
  { label: "Local", to: "/shop/stores?location=local" },
  { label: "International", to: "/shop/countries" },
];

function readAuthToken(): boolean {
  try {
    return Boolean(window.localStorage.getItem("token"));
  } catch {
    return false;
  }
}

const NAV_CATEGORY_PATTERNS = [/fashion|cloth|apparel/i, /electronic/i, /home|kitchen/i];

function splitCountryLabel(label: string): { flag: string; name: string } {
  const [flag = "", ...rest] = label.split(" ");
  return { flag, name: rest.join(" ") || label };
}

export function ShopHeader({
  isAuthenticated,
  signInHref = "/login",
}: ShopHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { totals } = useCart();
  const { productIds } = useWishlist();
  const { deliverToCountryLabel } = useShop();
  const { categories } = useCategories();

  const signedIn = isAuthenticated ?? readAuthToken();
  const deliver = splitCountryLabel(deliverToCountryLabel);
  const cartCount = totals.itemCount;

  const currentQuery =
    location.pathname === "/shop/search"
      ? (searchParams.get("q") ?? "")
      : "";

  // Close the drawer and the "More" menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [location.pathname, location.search]);

  // Close the "More" menu on outside click or Escape.
  useEffect(() => {
    if (!moreOpen) return;
    function onPointer(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // Lock page scroll while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const topLevel = categories.filter((category) => !category.parentSlug);

  // Three headline categories in the nav (Fashion · Electronics · Home when
  // they exist), everything else goes under "More".
  const navCategories = NAV_CATEGORY_PATTERNS.map((pattern) =>
    topLevel.find((c) => pattern.test(c.slug) || pattern.test(c.name)),
  ).filter((c): c is (typeof topLevel)[number] => Boolean(c));
  for (const category of topLevel) {
    if (navCategories.length >= 3) break;
    if (!navCategories.includes(category)) navCategories.push(category);
  }
  const moreCategories = topLevel.filter((c) => !navCategories.includes(c));

  return (
    <div className="fk-header-shell">
      <header className="fk-header">
        <div className="fk-header__main">
          <button
            type="button"
            className="fk-header__menu-btn"
            aria-label="Open shop menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={24} />
          </button>

          <Link to="/shop" className="fk-header__brand" aria-label="Fockis Shop home">
            <FockisLogo size={42} wordmark label="SHOP" tone="light" />
          </Link>

          <div className="fk-header__search">
            <ShopSearch variant="header" initialValue={currentQuery} />
          </div>

          <nav className="fk-header__actions" aria-label="Account and cart">
            <Link
              to={signedIn ? "/shop/orders" : signInHref}
              className="fk-header__icon-action fk-header__icon-action--account"
              aria-label={signedIn ? "Your account and orders" : "Sign in"}
              title={signedIn ? "Account & orders" : "Sign in"}
            >
              <User size={24} aria-hidden="true" />
            </Link>

            <Link
              to="/shop/wishlist"
              className="fk-header__icon-action"
              aria-label={`Wishlist, ${productIds.length} saved`}
              title="Wishlist"
            >
              <Heart size={24} aria-hidden="true" />
              {productIds.length > 0 && (
                <span className="fk-header__count">{productIds.length}</span>
              )}
            </Link>

            <Link
              to="/shop/cart"
              className="fk-header__icon-action fk-header__cart"
              aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
              title="Cart"
            >
              <ShoppingCart size={25} aria-hidden="true" />
              <span className="fk-header__count fk-header__count--cart">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            </Link>
          </nav>
        </div>

        <div className="fk-header__search-mobile">
          <ShopSearch variant="header" initialValue={currentQuery} />
        </div>
      </header>

      <nav className="fk-catbar" aria-label="Shop categories">
        <div className="fk-catbar__inner">
          <div className="fk-catbar__scroll">
            <button
              type="button"
              className="fk-catbar__deliver"
              onClick={() => navigate("/shop/countries")}
              aria-label={`Deliver to ${deliver.name}. Change delivery country`}
            >
              <MapPin size={16} aria-hidden="true" />
              <span className="fk-catbar__flag">{deliver.flag}</span> {deliver.name}
            </button>

            {SECTION_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  isActive ? "fk-catbar__link is-active" : "fk-catbar__link"
                }
              >
                {link.label}
              </NavLink>
            ))}

            {navCategories.map((category) => (
              <NavLink
                key={category.id}
                to={`/shop/category/${category.slug}`}
                className={({ isActive }) =>
                  isActive ? "fk-catbar__link is-active" : "fk-catbar__link"
                }
              >
                {category.name.split(/\s*&\s*/)[0]}
              </NavLink>
            ))}
          </div>

          <div className="fk-catbar__more" ref={moreRef}>
            <button
              type="button"
              className="fk-catbar__link"
              aria-haspopup="true"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
            >
              More <ChevronDown size={15} aria-hidden="true" />
            </button>

            {moreOpen && (
              <div className="fk-catbar__menu" role="menu">
                {moreCategories.map((category) => (
                  <Link
                    key={category.id}
                    role="menuitem"
                    to={`/shop/category/${category.slug}`}
                  >
                    <span aria-hidden="true">{category.icon}</span> {category.name}
                  </Link>
                ))}
                <Link role="menuitem" to="/shop/categories">
                  All categories
                </Link>
                <Link role="menuitem" to="/shop/orders">
                  Orders &amp; returns
                </Link>
                <Link role="menuitem" to="/shop/sell" className="is-sell">
                  Sell on Fockis
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <AddedToCartToast />

      {menuOpen && (
        <div className="fk-drawer" role="dialog" aria-modal="true" aria-label="Shop menu">
          <button
            type="button"
            className="fk-drawer__backdrop"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />

          <div className="fk-drawer__panel">
            <div className="fk-drawer__head">
              <FockisLogo size={34} wordmark label="SHOP" tone="light" />
              <button
                type="button"
                className="fk-drawer__close"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="fk-drawer__body">
              <Link
                to={signedIn ? "/shop/orders" : signInHref}
                className="fk-drawer__account"
              >
                <User size={18} aria-hidden="true" />
                {signedIn ? "Your account" : "Sign in"}
              </Link>

              <h3>Shop</h3>
              <Link to="/shop">Home</Link>
              {SECTION_LINKS.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}

              <h3>Shop by category</h3>
              {categories.length === 0 ? (
                <Link to="/shop/categories">All categories</Link>
              ) : (
                <>
                  {categories
                    .filter((category) => !category.parentSlug)
                    .map((category) => (
                      <Link
                        key={category.id}
                        to={`/shop/category/${category.slug}`}
                      >
                        <span aria-hidden="true">{category.icon}</span>{" "}
                        {category.name}
                      </Link>
                    ))}
                  <Link to="/shop/categories">See all categories</Link>
                </>
              )}

              <h3>Your shopping</h3>
              <Link to="/shop/cart">Cart ({cartCount})</Link>
              <Link to="/shop/wishlist">Wishlist ({productIds.length})</Link>
              <Link to="/shop/orders">Orders &amp; returns</Link>

              <h3>Sell</h3>
              <Link to="/shop/sell">Sell on Fockis</Link>
              <Link to="/seller">Seller Center</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
