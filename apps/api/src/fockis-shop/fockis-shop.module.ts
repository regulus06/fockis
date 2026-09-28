import { Module } from "@nestjs/common";

import { ProductsModule } from "./products/products.module";
import { CategoriesModule } from "./categories/categories.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";

import { StoresModule } from "../stores/stores.module";
import { InventoryModule } from "./inventory/inventory.module";

import { ReturnsModule } from "./returns/returns.module";
import { DisputesModule } from "./disputes/disputes.module";

import { SellerModule } from "../seller/seller.module";

import { ShippingModule } from "./shipping/shipping.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { CouponsModule } from "./coupons/coupons.module";

import { AnalyticsModule } from "./analytics/analytics.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
imports: [
ProductsModule,
CategoriesModule,
CartModule,
OrdersModule,
StoresModule,
InventoryModule,

ReturnsModule,
DisputesModule,

SellerModule,

ShippingModule,
ReviewsModule,
WishlistModule,
CouponsModule,

AnalyticsModule,
NotificationsModule,
],

exports: [
ProductsModule,
CategoriesModule,
CartModule,
OrdersModule,
ShippingModule,
SellerModule,
],
})
export class FockisShopModule {}
