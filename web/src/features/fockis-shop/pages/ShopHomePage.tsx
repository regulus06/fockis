import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Globe, Lock, ShoppingBag, Store, Truck } from "lucide-react";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopError } from "../components/common/ShopError";

import { FlashDealHero } from "../components/home/FlashDealHero";
import { HomeDealsPanels } from "../components/home/HomeDealsPanels";
import { WatchAndShop } from "../components/home/WatchAndShop";
import { TopRatedByCategory } from "../components/home/TopRatedByCategory";
import { pickHomeCategories } from "../components/home/CategoryProductRail";
import { CategoryMiniPanels } from "../components/home/CategoryMiniPanels";
import { ShopByCategory } from "../components/home/ShopByCategory";
import { FeaturedStoresRail } from "../components/home/FeaturedStoresRail";
import { ProductRailSection } from "../components/products/ProductRailSection";

import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import { useRecentlyViewedProducts } from "../hooks/useRecentlyViewed";
import { getRealDiscount, getRealRating } from "../utils/productMedia";

import type { Product } from "../types/product.types";

/**
 * ============================================================================
 * FOCKIS SHOP — HOMEPAGE (deals first)
 * ============================================================================
 *
 * Data sources (all real, all existing services):
 *   - newest products  → GET /fockis-shop/products?sort=newest (one pool)
 *   - top rated        → GET /fockis-shop/products?sort=rating
 *   - categories       → existing categoryApi
 *   - stores           → existing storeApi
 *   - recently viewed  → product IDs saved in this browser, loaded live
 *
 * Deals, flash sale, local and international rails are filters over the
 * newest-products pool using real fields (salePrice, shipping flags).
 * Layout follows the "Flash deal" design: red flash banner, pink deals
 * panel + purple new-arrivals panel, category tiles, Watch & Shop,
 * compact product rows, category mini panels, store logos.
 * Below-the-fold category panels load when they scroll into view.
 * ============================================================================
 */

const POOL_SIZE = 60;
const FLASH_MIN_DISCOUNT = 25;

function byDiscountDesc(a: Product, b: Product) {
  return getRealDiscount(b) - getRealDiscount(a);
}

export default function ShopHomePage() {
  const pool = useProducts({ sort: "newest", page: 1, pageSize: POOL_SIZE });
  const rated = useProducts({ sort: "rating", page: 1, pageSize: 24 });
  const { categories, loading: categoriesLoading } = useCategories();
  const recent = useRecentlyViewedProducts({ limit: 12 });

  const poolItems = useMemo(() => pool.data?.items ?? [], [pool.data]);

  const derived = useMemo(() => {
    const deals = poolItems.filter((p) => getRealDiscount(p) > 0);
    const flash = [...deals]
      .filter((p) => getRealDiscount(p) >= FLASH_MIN_DISCOUNT)
      .sort(byDiscountDesc);

    const topRated = (rated.data?.items ?? []).filter((p) => getRealRating(p));

    const viewedIds = new Set(recent.products.map((p) => p.id));
    const recentCats = new Set(recent.recentCategories);
    const personalised = poolItems.filter(
      (p) => recentCats.has(p.categorySlug) && !viewedIds.has(p.id),
    );

    return {
      deals,
      flash,
      topRated,
      newest: poolItems.slice(0, 16),
      international: poolItems.filter((p) => p.shipping?.internationalShipping),
      local: poolItems.filter(
        (p) => p.shipping?.localDelivery || p.shipping?.pickupAvailable,
      ),
      // Personalised when there is browsing history; otherwise the next
      // slice of the catalogue so this row doesn't repeat "Top rated".
      recommended:
        personalised.length >= 4 ? personalised : poolItems.slice(16, 32),
      personalised: personalised.length >= 4,
    };
  }, [poolItems, rated.data, recent.products, recent.recentCategories]);

  const homeCategories = useMemo(() => pickHomeCategories(categories), [categories]);

  const poolLoading = pool.loading;
  const poolError = pool.error;

  return (
    <div className="shop-page-root fk-shop fk-home">
      <ShopHeader />

      <main className="fk-home__main">
        <div className="fk-container fk-home__content">
          {poolError && (
            <ShopError
              title="Products couldn’t load"
              message={poolError}
              onRetry={() => window.location.reload()}
            />
          )}

          {/* ================= FLASH DEAL BANNER ================= */}
          <FlashDealHero
            deals={derived.flash.length > 0 ? derived.flash : derived.deals}
            fallback={derived.newest}
          />

          {/* ============ TODAY'S DEALS + NEW ARRIVALS PANELS ============ */}
          <HomeDealsPanels
            deals={derived.deals}
            newest={derived.newest}
            loading={poolLoading}
          />

          <ShopByCategory
            categories={categories}
            products={poolItems}
            loading={categoriesLoading || poolLoading}
          />

          <WatchAndShop products={poolItems} loading={poolLoading} />

          {/* ============ TODAY'S DEALS | TOP RATED (side by side) ============ */}
          <div className="fk-home__duo">
            <ProductRailSection
              id="todays-deals"
              accent="deal"
              title="Today’s deals"
              subtitle="Discounted products from sellers across the marketplace"
              seeAllTo="/shop/deals"
              products={derived.deals}
              loading={poolLoading}
              emptyTitle="No active deals right now"
              emptyMessage="Check back soon — sellers add new offers regularly."
              emptyIcon={<ShoppingBag size={30} strokeWidth={1.6} />}
              cardVariant="compact"
            />

            <TopRatedByCategory categories={categories} />
          </div>

          {recent.hasHistory && (
            <ProductRailSection
              title="Recently viewed"
              subtitle="Pick up where you left off"
              seeAllTo="/shop/products"
              products={recent.products}
              loading={recent.loading}
              cardVariant="compact"
              hideWhenEmpty
            />
          )}

          <ProductRailSection
            title="New arrivals"
            subtitle="Just listed by Fockis sellers"
            seeAllTo="/shop/products?sort=newest"
            products={derived.newest}
            loading={poolLoading}
            cardVariant="compact"
          />

          {/* Flash sale only shows when real deep discounts exist. */}
          <ProductRailSection
            id="flash-sale"
            accent="flash"
            eyebrow="Flash sale"
            title={`Up to ${
              derived.flash[0] ? getRealDiscount(derived.flash[0]) : 0
            }% off`}
            subtitle="The biggest discounts on Fockis right now"
            seeAllTo="/shop/deals"
            products={derived.flash}
            loading={poolLoading}
            hideWhenEmpty
          />

          <CategoryMiniPanels categories={homeCategories} />

          <ProductRailSection
            title={derived.personalised ? "Recommended for you" : "Picks for you"}
            subtitle={
              derived.personalised
                ? "Based on the categories you’ve been browsing"
                : "More from Fockis sellers — view a few products to personalise this row"
            }
            seeAllTo="/shop/products"
            products={derived.recommended}
            loading={poolLoading || rated.loading}
            cardVariant="compact"
            hideWhenEmpty
          />

          <ProductRailSection
            title="Local delivery & pickup"
            subtitle="Products with local delivery or in-store pickup"
            seeAllTo="/shop/stores?location=local"
            seeAllLabel="Local stores"
            products={derived.local}
            loading={poolLoading}
            cardVariant="compact"
            hideWhenEmpty
          />

          <ProductRailSection
            title="Ships internationally"
            subtitle="Products sellers will ship across borders"
            seeAllTo="/shop/countries"
            seeAllLabel="Shop by country"
            products={derived.international}
            loading={poolLoading}
            cardVariant="compact"
            hideWhenEmpty
          />

          <FeaturedStoresRail variant="logos" />

          <section className="fk-benefits" aria-label="Why shop on Fockis">
            <div>
              <span className="fk-benefits__icon"><Store size={24} aria-hidden="true" /></span>
              <span>
                <strong>Independent sellers</strong>
                <small>Local businesses and global brands</small>
              </span>
            </div>
            <div>
              <span className="fk-benefits__icon"><Lock size={24} aria-hidden="true" /></span>
              <span>
                <strong>Secure checkout</strong>
                <small>Payments processed by Stripe</small>
              </span>
            </div>
            <div>
              <span className="fk-benefits__icon"><Truck size={24} aria-hidden="true" /></span>
              <span>
                <strong>Delivery or pickup</strong>
                <small>Options set by each seller</small>
              </span>
            </div>
            <div>
              <span className="fk-benefits__icon"><Globe size={24} aria-hidden="true" /></span>
              <span>
                <strong>Shop worldwide</strong>
                <small>Stores from many countries</small>
              </span>
            </div>
          </section>

          <section className="fk-sell-band" aria-label="Sell on Fockis">
            <div className="fk-sell-band__copy">
              <h2>Your products deserve to be discovered</h2>
              <p>
                Open a Fockis storefront, list your products and manage
                orders from Seller Center.
              </p>
            </div>
            <div className="fk-sell-band__art" aria-hidden="true">
              <span className="fk-sell-band__box fk-sell-band__box--1">📦</span>
              <span className="fk-sell-band__box fk-sell-band__box--2">📦</span>
              <span className="fk-sell-band__bag">🛍️</span>
            </div>
            <div className="fk-sell-band__actions">
              <Link to="/shop/sell" className="fk-btn fk-btn--yellow">
                Start selling
              </Link>
              <Link to="/seller" className="fk-btn fk-btn--ghost-light">
                Seller Center
              </Link>
            </div>
          </section>
        </div>
      </main>

      <ShopFooter />
    </div>
  );
}
