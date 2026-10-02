import React from "react";
import { Link } from "react-router-dom";

const SellerFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="seller-footer">
      <div className="seller-footer__inner">
        <div className="seller-footer__brand">
          <Link to="/shop" className="seller-footer__logo">
            <span className="seller-footer__crest">F</span>
            <span>Fockis</span>
            <small>SELLER CENTER</small>
          </Link>

          <p className="seller-footer__description">
            Tools for managing your Fockis store, products, orders, customers,
            and business growth.
          </p>
        </div>

        <div className="seller-footer__column">
          <h3>Fockis</h3>

          <Link to="/about">About Fockis</Link>
          <Link to="/help">Help Center</Link>
          <Link to="/help/contact">Contact Us</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>

        <div className="seller-footer__column">
          <h3>Seller Resources</h3>

          <Link to="/seller/guide">Seller Guide</Link>
          <Link to="/seller/guidelines">Selling Guidelines</Link>
          <Link to="/help/shipping">Shipping &amp; Delivery</Link>
          <Link to="/help/returns">Returns &amp; Refunds</Link>
          <Link to="/seller/payouts">Payments &amp; Payouts</Link>
          <Link to="/seller/policies">Seller Policies</Link>
          <Link to="/seller/support">Seller Support</Link>
        </div>

        <div className="seller-footer__column">
          <h3>Shop</h3>

          <Link to="/shop">Shop Fockis</Link>
          <Link to="/shop/categories">Categories</Link>
          <Link to="/shop/stores">Stores</Link>
          <Link to="/shop/deals">Deals</Link>
          <Link to="/shop/countries">International</Link>
        </div>

        <div className="seller-footer__column">
          <h3>Seller Account</h3>

          <Link to="/seller">Seller Center</Link>
          <Link to="/seller/create-store">Create Store</Link>
          <Link to="/seller/stores">My Stores</Link>
          <Link to="/seller/products">Products</Link>
          <Link to="/seller/orders">Orders</Link>
          <Link to="/seller/messages">Messages</Link>
          <Link to="/seller/analytics">Analytics</Link>
          <Link to="/seller/settings">Settings</Link>
        </div>
      </div>

      <div className="seller-footer__bottom">
        <div className="seller-footer__bottom-inner">
          <span>© {year} Fockis Shop. All rights reserved.</span>

          <div className="seller-footer__bottom-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/seller/policies">Seller Policies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SellerFooter;