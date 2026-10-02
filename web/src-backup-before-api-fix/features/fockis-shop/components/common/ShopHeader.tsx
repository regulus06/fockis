import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useShop } from '../../hooks/useShop';

// TODO(backend/auth): replace with the app's real auth context.
// Expected shape: { isAuthenticated: boolean, user: { name, avatarUrl } | null }
interface ShopHeaderProps {
  isAuthenticated?: boolean;
  signInHref?: string;
}

const NAV_LINKS = [
  { label: 'Shop', to: '/shop', end: true },
  { label: 'Categories', to: '/shop/categories' },
  { label: 'Stores', to: '/shop/stores' },
  { label: 'Deals', to: '/shop/deals' },
  { label: 'International', to: '/shop/countries' },
  { label: 'Local', to: '/shop/stores?location=local' },
];

export function ShopHeader({ isAuthenticated = false, signInHref = '/login' }: ShopHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { totals } = useCart();
  const { productIds } = useWishlist();
  const { deliverToCountryLabel } = useShop();

  return (
    <>
      <div className="top-bar">
        <div className="wrap">
          <div className="top-links">
            <Link to="/shop/sell">Sell on Fockis</Link>
            <Link to="/help">Help Center</Link>
            <Link to="/shop/orders">Track Order</Link>
          </div>
          <div className="top-links">
            <span>English (US)</span>
            <span>USD $</span>
          </div>
        </div>
      </div>

      <header>
        <div className="header-inner">
          <Link to="/shop" className="logo">
            <span className="crest">F</span>Fockis <small>SHOP</small>
          </Link>

          <nav className="main-nav">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.label} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-right">
            <button className="deliver-chip" type="button" onClick={() => navigate('/shop/countries')}>
              <span>{deliverToCountryLabel.split(' ')[0]}</span>
              <div>
                <div className="lbl">Deliver to</div>
                <div>{deliverToCountryLabel.split(' ').slice(1).join(' ')}</div>
              </div>
            </button>
            <Link to="/shop/wishlist" className="icon-link" aria-label="Wishlist">
              ♡{productIds.length > 0 && <span className="badge-dot">{productIds.length}</span>}
            </Link>
            <Link to="/shop/cart" className="icon-link" aria-label="Cart">
              🛒{totals.itemCount > 0 && <span className="badge-dot">{totals.itemCount}</span>}
            </Link>
            {isAuthenticated ? (
              <Link to="/shop/orders" className="btn btn-outline">My Account</Link>
            ) : (
              <Link to={signInHref} className="btn btn-outline">Sign In</Link>
            )}
          </div>

          <button className="mobile-toggle" aria-label="Menu" type="button" onClick={() => setMobileOpen((v) => !v)}>
            ☰
          </button>
        </div>

        {mobileOpen && (
          <nav className="mobile-nav" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.label} to={link.to} end={link.end} onClick={() => setMobileOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            <Link to="/shop/wishlist" onClick={() => setMobileOpen(false)}>Wishlist</Link>
            <Link to="/shop/cart" onClick={() => setMobileOpen(false)}>Cart ({totals.itemCount})</Link>
            <Link to={isAuthenticated ? '/shop/orders' : signInHref} onClick={() => setMobileOpen(false)}>
              {isAuthenticated ? 'My Account' : 'Sign In'}
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
