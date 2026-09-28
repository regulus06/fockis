import {
  BadRequestException,
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
  Product,
  ProductDocument,
} from "../schemas/product.schema";

import {
  Store,
  StoreDocument,
} from "../../../stores/schemas/store.schema";

import {
  InventoryService,
} from "../../inventory/inventory.service";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,

    private readonly inventoryService: InventoryService,
  ) {}

  // =====================================================
  // CREATE PRODUCT
  // =====================================================

  async create(
    data: any,
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "User required",
      );
    }

    if (!data.storeId) {
      throw new BadRequestException(
        "Store required",
      );
    }

    if (
      !Types.ObjectId.isValid(
        data.storeId,
      )
    ) {
      throw new BadRequestException(
        "Invalid store id",
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user id",
      );
    }

    const store =
      await this.storeModel.findOne({
        _id: new Types.ObjectId(
          data.storeId,
        ),
        ownerId: new Types.ObjectId(
          userId,
        ),
        active: true,
      });

    if (!store) {
      throw new BadRequestException(
        "You do not own this store",
      );
    }

    const locations =
      Array.isArray(
        data.displayLocations,
      )
        ? data.displayLocations
        : ["marketplace"];

    const now = new Date();

    const product =
      await this.productModel.create({
        name: String(
          data.name ?? "",
        ).trim(),

        description:
          data.description || "",

        price:
          Number(data.price),

        discount:
          Number(
            data.discount ?? 0,
          ),

        stock:
          Number(
            data.stock ?? 0,
          ),

        category:
          String(
            data.category ?? "",
          ).trim().toLowerCase(),

        brand:
          data.brand || "",

        location:
          data.location || "",

        images:
          Array.isArray(
            data.images,
          )
            ? data.images
            : [],

        seller:
          new Types.ObjectId(
            userId,
          ),

        storeId:
          store._id,

        displayLocations:
          locations,

        feedExpiresAt:
          locations.includes("feed")
            ? new Date(
                now.getTime() +
                  Number(
                    data.feedDays ?? 3,
                  ) *
                    86400000,
              )
            : null,

        storyExpiresAt:
          locations.includes("story")
            ? new Date(
                now.getTime() +
                  86400000,
              )
            : null,

        isActive: true,
      });

    await this.inventoryService.add(
      product._id.toString(),
      userId,
      Number(
        data.stock ?? 0,
      ),
    );

    return this.getById(
      product._id.toString(),
    );
  }

  // =====================================================
  // MARKETPLACE PRODUCTS
  // =====================================================

  async getMarketplaceProducts(
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      categoryId?: string;
      sort?: string;
    },
  ) {
    const {
      page = 1,
      pageSize = 20,
      search,
      categoryId,
      sort = "newest",
    } = options;

    const filter: any = {
      isActive: true,

      displayLocations: {
        $in: ["marketplace"],
      },
    };

    // =====================================================
    // SEARCH
    // =====================================================

    if (
      search &&
      search.trim()
    ) {
      const searchText =
        search.trim();

      const escapedSearch =
        searchText.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

      filter.$or = [
        {
          name: {
            $regex:
              escapedSearch,
            $options: "i",
          },
        },

        {
          description: {
            $regex:
              escapedSearch,
            $options: "i",
          },
        },

        {
          category: {
            $regex:
              escapedSearch,
            $options: "i",
          },
        },

        {
          brand: {
            $regex:
              escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    // =====================================================
    // CATEGORY
    //
    // Product.category stores the category slug.
    //
    // Example:
    //
    // electronics
    // clothing-fashion
    // home-living
    //
    // =====================================================

    if (
      categoryId &&
      categoryId !== "all"
    ) {
      const normalizedCategory =
        String(
          categoryId,
        )
          .trim()
          .toLowerCase();

      filter.category =
        normalizedCategory;
    }

    // =====================================================
    // PAGINATION
    // =====================================================

    const safePage =
      Math.max(
        1,
        Number(page) || 1,
      );

    const safePageSize =
      Math.min(
        100,
        Math.max(
          1,
          Number(pageSize) || 20,
        ),
      );

    const skip =
      (safePage - 1) *
      safePageSize;

    // =====================================================
    // SORT
    // =====================================================

    let sortOption: any = {
      createdAt: -1,
    };

    switch (
      String(sort ?? "newest")
        .trim()
        .toLowerCase()
    ) {
      case "price-low":
      case "price_asc":
        sortOption = {
          price: 1,
          createdAt: -1,
        };
        break;

      case "price-high":
      case "price_desc":
        sortOption = {
          price: -1,
          createdAt: -1,
        };
        break;

      case "rating":
        sortOption = {
          rating: -1,
          totalReviews: -1,
          createdAt: -1,
        };
        break;

      case "newest":
        sortOption = {
          createdAt: -1,
        };
        break;

      case "bestselling":
        sortOption = {
          salesCount: -1,
          createdAt: -1,
        };
        break;

      case "relevance":
        sortOption = {
          createdAt: -1,
        };
        break;

      default:
        sortOption = {
          createdAt: -1,
        };
        break;
    }

    // =====================================================
    // FETCH
    // =====================================================

    const [
      products,
      total,
    ] = await Promise.all([
      this.productModel
        .find(filter)
        .populate(
          "seller",
          "username profilePicture",
        )
        .populate(
          "storeId",
          "name logo slug",
        )
        .sort(sortOption)
        .skip(skip)
        .limit(safePageSize)
        .lean(),

      this.productModel.countDocuments(
        filter,
      ),
    ]);

    return {
      items: products,

      page: safePage,

      pageSize:
        safePageSize,

      total,

      pages:
        Math.ceil(
          total /
            safePageSize,
        ),
    };
  }

  // =====================================================
  // AUTOCOMPLETE SEARCH
  // =====================================================

  async autocompleteProducts(
    search: string,
    limit = 8,
  ) {
    const searchText =
      String(
        search ?? "",
      ).trim();

    if (!searchText) {
      return [];
    }

    const escapedSearch =
      searchText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

    const safeLimit =
      Math.min(
        20,
        Math.max(
          1,
          Number(limit) || 8,
        ),
      );

    return this.productModel
      .find({
        isActive: true,

        displayLocations: {
          $in: ["marketplace"],
        },

        name: {
          $regex:
            `^${escapedSearch}`,

          $options: "i",
        },
      })

      .populate(
        "seller",
        "username profilePicture",
      )

      .populate(
        "storeId",
        "name logo slug",
      )

      .sort({
        name: 1,
      })

      .limit(
        safeLimit,
      )

      .lean();
  }

  // =====================================================
  // ALL SELLER PRODUCTS
  // =====================================================

  async getSellerProducts(
    userId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user id",
      );
    }

    return this.productModel
      .find({
        seller:
          new Types.ObjectId(
            userId,
          ),
      })

      .populate(
        "storeId",
        "name logo slug",
      )

      .sort({
        createdAt: -1,
      })

      .lean();
  }

  // =====================================================
  // SELLER STORE PRODUCTS
  // =====================================================

  async getSellerStoreProducts(
    storeId: string,
    userId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        storeId,
      )
    ) {
      throw new BadRequestException(
        "Invalid store id",
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user id",
      );
    }

    const store =
      await this.storeModel.findOne({
        _id:
          new Types.ObjectId(
            storeId,
          ),

        ownerId:
          new Types.ObjectId(
            userId,
          ),
      });

    if (!store) {
      throw new NotFoundException(
        "Store not found",
      );
    }

    return this.productModel
      .find({
        storeId:
          store._id,

        isActive: true,
      })

      .populate(
        "storeId",
        "name logo slug",
      )

      .sort({
        createdAt: -1,
      })

      .lean();
  }

  // =====================================================
  // PUBLIC STORE PRODUCTS
  // =====================================================

  async getStoreProducts(
    storeId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        storeId,
      )
    ) {
      throw new BadRequestException(
        "Invalid store id",
      );
    }

    return this.productModel
      .find({
        storeId:
          new Types.ObjectId(
            storeId,
          ),

        isActive: true,
      })

      .populate(
        "storeId",
        "name logo slug",
      )

      .sort({
        createdAt: -1,
      })

      .lean();
  }

  // =====================================================
  // GET PRODUCT
  // =====================================================

  async getById(
    id: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        id,
      )
    ) {
      throw new NotFoundException(
        "Product not found",
      );
    }

    const product =
      await this.productModel
        .findById(id)

        .populate(
          "seller",
          "username profilePicture",
        )

        .populate(
          "storeId",
          "name logo slug",
        )

        .lean();

    if (!product) {
      throw new NotFoundException(
        "Product not found",
      );
    }

    return product;
  }

  // =====================================================
  // UPDATE PRODUCT
  // =====================================================

  async update(
    id: string,
    data: any,
    userId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        id,
      )
    ) {
      throw new NotFoundException(
        "Product not found",
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user id",
      );
    }

    const {
      storeId,
      seller,
      ...safeData
    } = data;

    if (
      safeData.name !==
      undefined
    ) {
      safeData.name =
        String(
          safeData.name,
        ).trim();
    }

    if (
      safeData.category !==
      undefined
    ) {
      safeData.category =
        String(
          safeData.category,
        )
          .trim()
          .toLowerCase();
    }

    const product =
      await this.productModel.findOneAndUpdate(
        {
          _id: id,

          seller:
            new Types.ObjectId(
              userId,
            ),
        },

        {
          $set:
            safeData,
        },

        {
          new: true,
        },
      );

    if (!product) {
      throw new NotFoundException(
        "Product not found",
      );
    }

    return product;
  }

  // =====================================================
  // DELETE PRODUCT
  // =====================================================

  async delete(
    id: string,
    userId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        id,
      )
    ) {
      throw new NotFoundException(
        "Product not found",
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user id",
      );
    }

    const product =
      await this.productModel.findOneAndDelete({
        _id: id,

        seller:
          new Types.ObjectId(
            userId,
          ),
      });

    if (!product) {
      throw new NotFoundException(
        "Product not found",
      );
    }

    return {
      message:
        "Product deleted successfully",
    };
  }
}