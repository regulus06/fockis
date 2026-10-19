import { Link } from "react-router-dom";
import { ChevronUp } from "lucide-react";

import { FockisLogo } from "./FockisLogo";

const footerGroups = [
  {
    title: "Shop",
    links: [
      { label: "Today's deals", to: "/shop/deals" },
      { label: "All products", to: "/shop/products" },
      { label: "Categories", to: "/shop/categories" },
      { label: "Stores", to: "/shop/stores" },
      { label: "International", to: "/shop/countries" },
    ],
  },
  {
    title: "Sell on Fockis",
    links: [
      { label: "Open a store", to: "/shop/sell" },
      { label: "Seller Center", to: "/seller" },
      { label: "Shipping settings", to: "/seller/shipping" },
      { label: "Store settings", to: "/seller/settings" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Your orders", to: "/shop/orders" },
      { label: "Your cart", to: "/shop/cart" },
      { label: "Wishlist", to: "/shop/wishlist" },
      { label: "Returns", to: "/help/returns" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Help center", to: "/help" },
      { label: "Contact us", to: "/help/contact" },
      { label: "Trust & safety", to: "/trust-safety" },
    ],
  },
  {
    title: "About Fockis",
    links: [{ label: "Fockis", to: "/about" }],
  },
];

export function ShopFooter() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="fk-footer">
      <button type="button" className="fk-footer__top" onClick={scrollToTop}>
        <ChevronUp size={16} aria-hidden="true" /> Back to top
      </button>

      <div className="fk-footer__inner">
        <div className="fk-footer__brand">
          <Link to="/shop" aria-label="Fockis Shop home">
            <FockisLogo size={44} wordmark label="SHOP" tone="light" />
          </Link>

          <p>
            Products from independent sellers, local businesses and stores
            around the world — in one place.
          </p>
        </div>

        <nav className="fk-footer__nav" aria-label="Shop footer">
          {footerGroups.map((group) => (
            <div className="fk-footer__group" key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="fk-footer__bottom">
        <div className="fk-footer__bottom-inner">
          <span>© {new Date().getFullYear()} Fockis Shop. All rights reserved.</span>
          <span className="fk-footer__bottom-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default ShopFooter;
