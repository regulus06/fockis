import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  RecentlyViewed,
  RecentlyViewedDocument,
} from "../recently-view/recently-viewed.schema";

import {
  Product,
  ProductDocument,
} from "../products/schemas/product.schema";


@Injectable()
export class RecentlyViewedService {

  constructor(
    @InjectModel(
      RecentlyViewed.name,
    )
    private readonly recentlyViewedModel:
      Model<RecentlyViewedDocument>,

    @InjectModel(
      Product.name,
    )
    private readonly productModel:
      Model<ProductDocument>,
  ) {}


  // ============================================================
  // ADD PRODUCT TO RECENTLY VIEWED
  // ============================================================

  async addRecentlyViewed(
    userId: string,
    productId: string,
  ) {

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new NotFoundException(
        "Invalid user ID.",
      );
    }

    if (
      !Types.ObjectId.isValid(
        productId,
      )
    ) {
      throw new NotFoundException(
        "Invalid product ID.",
      );
    }

    const product =
      await this.productModel.findById(
        productId,
      );

    if (!product) {
      throw new NotFoundException(
        "Product not found.",
      );
    }

    return this.recentlyViewedModel.findOneAndUpdate(

      {
        userId:
          new Types.ObjectId(
            userId,
          ),

        productId:
          new Types.ObjectId(
            productId,
          ),
      },

      {
        $set: {
          lastViewedAt:
            new Date(),
        },
      },

      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },

    ).exec();
  }


  // ============================================================
  // GET RECENTLY VIEWED PRODUCTS
  // ============================================================

  async getRecentlyViewed(
    userId: string,
  ) {

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      return [];
    }

    const recentlyViewed =
      await this.recentlyViewedModel

        .find({
          userId:
            new Types.ObjectId(
              userId,
            ),
        })

        .sort({
          lastViewedAt: -1,
        })

        .limit(20)

        .populate({
          path: "productId",
        })

        .exec();

    return recentlyViewed

      .map(
        (
          item: RecentlyViewedDocument,
        ) =>
          item.productId,
      )

      .filter(
        (
          product: any,
        ) =>
          product &&
          product._id,
      );
  }


  // ============================================================
  // CLEAR RECENTLY VIEWED PRODUCTS
  // ============================================================

  async clearRecentlyViewed(
    userId: string,
  ) {

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      return {
        message:
          "Recently viewed products cleared.",
      };
    }

    await this.recentlyViewedModel.deleteMany(
      {
        userId:
          new Types.ObjectId(
            userId,
          ),
      },
    );

    return {
      message:
        "Recently viewed products cleared.",
    };
  }
}