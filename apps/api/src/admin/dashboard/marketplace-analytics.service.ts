import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@Injectable()
export class MarketplaceAnalyticsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  // ==========================================================================
  // COLLECTIONS
  // ==========================================================================

  private get ordersCollection() {
    return this.connection.collection("orders");
  }

  private get productsCollection() {
    return this.connection.collection("products");
  }

  // ==========================================================================
  // MAIN DASHBOARD METRICS
  // ==========================================================================

  async getMarketplaceMetrics() {
    const now = new Date();

    const last24h = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    );

    const [
      totalOrders,
      orders24h,
      totalProducts,
      revenueResult,
      topProducts,
      categoryStats,
    ] = await Promise.all([
      // ----------------------------------------------------------------------
      // TOTAL ORDERS
      // ----------------------------------------------------------------------

      this.ordersCollection.countDocuments(),

      // ----------------------------------------------------------------------
      // ORDERS LAST 24 HOURS
      // ----------------------------------------------------------------------

      this.ordersCollection.countDocuments({
        createdAt: {
          $gte: last24h,
        },
      }),

      // ----------------------------------------------------------------------
      // TOTAL PRODUCTS
      // ----------------------------------------------------------------------

      this.productsCollection.countDocuments(),

      // ----------------------------------------------------------------------
      // REVENUE
      // ONLY DELIVERED ORDERS
      // ----------------------------------------------------------------------

      this.ordersCollection
        .aggregate([
          {
            $match: {
              status: "delivered",
            },
          },
          {
            $group: {
              _id: null,
              revenue: {
                $sum: {
                  $ifNull: [
                    "$totalAmount",
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),

      // ----------------------------------------------------------------------
      // TOP PRODUCTS
      // ----------------------------------------------------------------------

      this.ordersCollection
        .aggregate([
          {
            $unwind: "$items",
          },
          {
            $group: {
              _id:
                "$items.productId",
              totalSold: {
                $sum: {
                  $ifNull: [
                    "$items.quantity",
                    0,
                  ],
                },
              },
              revenue: {
                $sum: {
                  $multiply: [
                    {
                      $ifNull: [
                        "$items.price",
                        0,
                      ],
                    },
                    {
                      $ifNull: [
                        "$items.quantity",
                        1,
                      ],
                    },
                  ],
                },
              },
            },
          },
          {
            $sort: {
              totalSold: -1,
            },
          },
          {
            $limit: 5,
          },
        ])
        .toArray(),

      // ----------------------------------------------------------------------
      // CATEGORY PERFORMANCE
      // ----------------------------------------------------------------------

      this.productsCollection
        .aggregate([
          {
            $group: {
              _id: {
                $ifNull: [
                  "$category",
                  "Uncategorized",
                ],
              },

              totalProducts: {
                $sum: 1,
              },

              avgPrice: {
                $avg: {
                  $ifNull: [
                    "$price",
                    0,
                  ],
                },
              },

              totalSales: {
                $sum: {
                  $ifNull: [
                    "$salesCount",
                    0,
                  ],
                },
              },
            },
          },
          {
            $sort: {
              totalSales: -1,
            },
          },
        ])
        .toArray(),
    ]);

    // ==========================================================================
    // RESPONSE
    // ==========================================================================

    return {
      overview: {
        totalOrders,
        orders24h,
        totalProducts,
        revenue:
          revenueResult[0]?.revenue ?? 0,
      },

      insights: {
        topProducts,
        categoryStats,
      },

      system: {
        timestamp: new Date(),
      },
    };
  }
}