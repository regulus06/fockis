import { Link } from "react-router-dom";

import "../styles/shop-original.css";
import "../styles/shop-extensions.css";
import "../styles/shop-marketplace-density.css";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";

import { ShopHero } from "../components/home/ShopHero";
import { PromoCarousel } from "../components/home/PromoCarousel";
import { CategoryGrid } from "../components/home/CategoryGrid";
import { LocalMarketplace } from "../components/home/LocalMarketplace";
import { TrendingProducts } from "../components/home/TrendingProducts";
import { WorldStores } from "../components/home/WorldStores";
import { FeaturedStores } from "../components/home/FeaturedStores";
import { DealsSection } from "../components/home/DealsSection";
import { NewArrivals } from "../components/home/NewArrivals";
import { DeliveryProgress } from "../components/home/DeliveryProgress";
import { BundleSection } from "../components/home/BundleSection";
import { RecommendedProducts } from "../components/home/RecommendedProducts";
import { TopRatedStores } from "../components/home/TopRatedStores";
import { InternationalCommerce } from "../components/home/InternationalCommerce";
import { SellOnFockis } from "../components/home/SellOnFockis";
import { SellerCenterPreview } from "../components/home/SellerCenterPreview";
import { TrustSafety } from "../components/home/TrustSafety";

/**
 * Fockis Shop homepage.
 *
 * Layout philosophy (marketplace, not landing page):
 *  - Sections are grouped into three dense "shelves": Discover (browse +
 *    merchandise), Marketplace (stores + deals + product discovery), and
 *    Sell/Trust (seller acquisition + trust signals + close).
 *  - Groups are separated with a thin hairline instead of large empty
 *    sections, so the page reads as one continuous marketplace surface.
 *  - All spacing/grid density changes live in shop-marketplace-density.css
 *    (additive — see that file). No existing selectors were redefined.
 */
export default function ShopHomePage() {
  return (
    <div className="shop-page-root">
      <div className="demo-banner">FOCKIS SHOP — LIVE MARKETPLACE</div>

      <ShopHeader />

      <div className="mp-shell">
        {/* ---------------------------------------------------------------
            SHELF 1 — DISCOVER
            Compact hero, category browse, and top merchandising row.
            Goal: header + hero + categories + first product row visible
            without scrolling through empty space.
        --------------------------------------------------------------- */}
        <ShopHero />

        <CategoryGrid />

        <PromoCarousel />

        <hr className="mp-divider" />

        {/* ---------------------------------------------------------------
            SHELF 2 — MARKETPLACE
            Store discovery, product discovery, deals, and merchandising
            blocks. This is the bulk of the page's density.
        --------------------------------------------------------------- */}
        <LocalMarketplace />

        <TrendingProducts />

        <WorldStores />

        <FeaturedStores />

        <DealsSection />

        <NewArrivals />

        <DeliveryProgress />

        <BundleSection />

        <RecommendedProducts />

        <TopRatedStores />

        <InternationalCommerce />

        <hr className="mp-divider" />

        {/* ---------------------------------------------------------------
            SHELF 3 — SELL & TRUST
            Seller acquisition, seller dashboard preview, trust strip,
            and the closing CTA — all compact, none full-viewport.
        --------------------------------------------------------------- */}
        <SellOnFockis />

        <SellerCenterPreview />

        <TrustSafety />

        <section className="closing-band">
          <div className="wrap">
            <div
              className="sec-label"
              style={{
                justifyContent: "center",
                color: "var(--brass-light)",
              }}
            >
              <span
                className="num"
                style={{
                  borderColor: "var(--brass-light)",
                  color: "var(--brass-light)",
                }}
              >
                17
              </span>
              THE FOCKIS MARKETPLACE
            </div>

            <h2>From local business to global customer.</h2>

            <p>
              Fockis connects sellers and shoppers everywhere — one
              storefront at a time.
            </p>

            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                marginTop: 22,
                flexWrap: "wrap",
              }}
            >
              <Link to="/shop/products" className="btn btn-brass">
                Start Shopping
              </Link>
              <Link to="/seller/entry" className="btn btn-outline-light">
                Open a Store
              </Link>
            </div>
          </div>
        </section>
      </div>

      <ShopFooter />
    </div>
  );
}