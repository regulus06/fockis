import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Product,
  ProductDocument,
} from "../../fockis-shop/products/schemas/product.schema";

import { Seller } from "../../seller/schemas/seller.schema";

import {
  SellerProfile,
  SellerProfileDocument,
} from "../../seller/seller-profile.schema";

import {
  Store,
  StoreDocument,
} from "../../stores/schemas/store.schema";

@Injectable()
export class FockisShopAdminService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(Seller.name)
    private readonly sellerModel: Model<Seller>,

    @InjectModel(SellerProfile.name)
    private readonly sellerProfileModel: Model<SellerProfileDocument>,

    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,
  ) {}

  private oid(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid id");
    }

    return new Types.ObjectId(id);
  }

  async dashboard() {
    const [
      pendingProducts,
      flaggedProducts,
      pendingSellers,
      suspendedSellers,
      stores,
    ] = await Promise.all([
      this.productModel.countDocuments({
        isActive: false,
      }),

      this.productModel.countDocuments({
        adminFlagged: true,
      }),

      this.sellerProfileModel.countDocuments({
        status: "pending",
      }),

      this.sellerProfileModel.countDocuments({
        status: "suspended",
      }),

      this.storeModel.countDocuments({}),
    ]);

    return {
      pendingProducts,
      flaggedProducts,
      pendingSellers,
      suspendedSellers,
      stores,
    };
  }

  async products(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));

    const limit = Math.min(
      100,
      Math.max(1, Number(query.limit ?? 25)),
    );

    const filter: any = {};

    if (query.status === "pending") {
      filter.isActive = false;
    }

    if (query.status === "approved") {
      filter.isActive = true;
    }

    if (query.status === "flagged") {
      filter.adminFlagged = true;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();

      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          category: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      this.productModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async productAction(
    id: string,
    action: string,
    reason?: string,
  ) {
    const product = await this.productModel.findById(
      this.oid(id),
    );

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const update: any = {
      adminModerationReason: reason ?? "",
    };

    if (action === "approve" || action === "restore") {
      update.isActive = true;
    }

    if (
      ["reject", "suspend", "hide", "block"].includes(action)
    ) {
      update.isActive = false;
    }

    if (action === "flag") {
      update.adminFlagged = true;
    }

    if (action === "approve" || action === "restore") {
      update.adminFlagged = false;
    }

    if (action === "delete") {
      return this.productModel.findByIdAndDelete(
        product._id,
      );
    }

    return this.productModel
      .findByIdAndUpdate(
        product._id,
        {
          $set: update,
        },
        {
          new: true,
        },
      )
      .lean();
  }

  async sellers(status?: string) {
    const filter: any = status
      ? { status }
      : {};

    return this.sellerProfileModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
  }

  async sellerAction(
    id: string,
    action: string,
  ) {
    const profile =
      await this.sellerProfileModel.findById(
        this.oid(id),
      );

    if (!profile) {
      throw new NotFoundException(
        "Seller profile not found",
      );
    }

    if (
      action === "approve" ||
      action === "restore"
    ) {
      profile.status = "active";
      profile.active = true;
    } else if (
      action === "suspend" ||
      action === "block"
    ) {
      profile.status = "suspended";
      profile.active = false;
    } else if (action === "delete") {
      await this.sellerProfileModel.deleteOne({
        _id: profile._id,
      });

      return {
        deleted: true,
      };
    } else {
      throw new BadRequestException(
        "Unsupported seller action",
      );
    }

    return profile.save();
  }

  async stores(status?: string) {
    const filter: any = {};

    if (status === "active") {
      filter.active = true;
    }

    if (status === "inactive") {
      filter.active = false;
    }

    return this.storeModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
  }

  async storeAction(
    id: string,
    action: string,
  ) {
    const store = await this.storeModel.findById(
      this.oid(id),
    );

    if (!store) {
      throw new NotFoundException(
        "Store not found",
      );
    }

    if (
      action === "approve" ||
      action === "restore"
    ) {
      (store as any).active = true;
    } else if (
      ["suspend", "block"].includes(action)
    ) {
      (store as any).active = false;
    } else if (action === "delete") {
      await this.storeModel.deleteOne({
        _id: store._id,
      });

      return {
        deleted: true,
      };
    } else {
      throw new BadRequestException(
        "Unsupported store action",
      );
    }

    return store.save();
  }
}