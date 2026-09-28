import { Link } from 'react-router-dom';

export function ShopFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="logo" style={{ color: '#fff' }}>
              <span className="crest" style={{ borderColor: '#fff', color: '#fff' }}>F</span>Fockis{' '}
              <small style={{ color: 'rgba(255,255,255,0.5)' }}>SHOP</small>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 14, maxWidth: 220, lineHeight: 1.6 }}>
              Shop the world. Sell the world.
            </p>
          </div>
          <div>
            <h5>Shop</h5>
            <Link to="/shop/categories">Categories</Link>
            <Link to="/shop/stores">Stores</Link>
            <Link to="/shop/deals">Deals</Link>
            <Link to="/shop/countries">International</Link>
          </div>
          <div>
            <h5>Sell</h5>
            <Link to="/shop/sell">Open a store</Link>
            <Link to="/shop/seller/dashboard">Seller Center</Link>
            <Link to="/shop/seller/shipping">Shipping &amp; delivery</Link>
            <Link to="/shop/seller/settings">Seller policies</Link>
          </div>
          <div>
            <h5>Company</h5>
            <Link to="/about">About</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/press">Press</Link>
            <Link to="/trust-safety">Trust &amp; safety</Link>
          </div>
          <div>
            <h5>Support</h5>
            <Link to="/help">Help center</Link>
            <Link to="/shop/orders">Track an order</Link>
            <Link to="/help/returns">Returns</Link>
            <Link to="/help/contact">Contact us</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Fockis Shop.</span>
          <span>Global marketplace for local and international sellers.</span>
        </div>
      </div>
    </footer>
  );
}
