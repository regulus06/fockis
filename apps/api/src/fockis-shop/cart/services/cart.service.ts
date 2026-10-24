
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Cart,
  CartDocument,
} from "../schemas/cart.schema";

export interface AddToCartInput {
  productId: string;
  quantity?: number;

  productSlug?: string;
  productName?: string;
  productImageUrl?: string;
  productEmoji?: string;

  sellerId?: string | null;
  sellerName?: string | null;

  storeId?: string | null;
  storeSlug?: string;
  storeName?: string;

  variant?: {
    variantId?: string;
    optionsLabel?: string;
  } | null;

  unitPrice?: number;
  originalPrice?: number | null;
  salePrice?: number | null;

  currency?: string;
  sku?: string | null;
}

export interface UpdateCartInput {
  quantity: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
  ) {}

  private normalizeUserId(userId: string): string {
    if (typeof userId !== "string" || !userId.trim()) {
      throw new BadRequestException(
        "Authenticated user ID is required.",
      );
    }

    const normalized = userId.trim();

    if (!Types.ObjectId.isValid(normalized)) {
      throw new BadRequestException(
        "Invalid authenticated user ID.",
      );
    }

    return normalized;
  }

  private normalizeObjectId(
    value: string | null | undefined,
    fieldName: string,
  ): Types.ObjectId | null {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `Invalid ${fieldName}.`,
      );
    }

    return new Types.ObjectId(value);
  }

  async getOrCreateCart(
    userId: string,
  ): Promise<CartDocument> {
    const normalizedUserId =
      this.normalizeUserId(userId);

    const userObjectId =
      new Types.ObjectId(normalizedUserId);

    try {
      // The schema field is userId, not user.
      let cart = await this.cartModel
        .findOne({ userId: userObjectId })
        .exec();

      if (cart) {
        return cart;
      }

      cart = new this.cartModel({
        userId: userObjectId,
        items: [],
      });

      await cart.save();
      return cart;
    } catch (error: any) {
      // Another request may have created this user's cart
      // between findOne() and save().
      if (error?.code === 11000) {
        const existingCart = await this.cartModel
          .findOne({ userId: userObjectId })
          .exec();

        if (existingCart) {
          return existingCart;
        }
      }

      console.error(
        "[FOCKIS CART] getOrCreateCart failed:",
        error,
      );

      throw new InternalServerErrorException(
        "Unable to load cart.",
      );
    }
  }

  async getCart(
    userId: string,
  ): Promise<CartDocument> {
    return this.getOrCreateCart(userId);
  }

  async addToCart(
    userId: string,
    input: AddToCartInput,
  ): Promise<CartDocument> {
    if (!input?.productId) {
      throw new BadRequestException(
        "productId is required.",
      );
    }

    if (!Types.ObjectId.isValid(input.productId)) {
      throw new BadRequestException(
        "Invalid productId.",
      );
    }

    const quantity = Number(input.quantity ?? 1);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException(
        "quantity must be a positive integer.",
      );
    }

    const cart = await this.getOrCreateCart(userId);
    const productObjectId =
      new Types.ObjectId(input.productId);

    const existingItem = cart.items.find(
      (item: any) =>
        item.productId?.toString() ===
        productObjectId.toString(),
    );

    if (existingItem) {
      existingItem.quantity += quantity;

      if (input.productSlug !== undefined) {
        existingItem.productSlug = input.productSlug;
      }

      if (input.productName !== undefined) {
        existingItem.productName = input.productName;
      }

      if (input.productImageUrl !== undefined) {
        existingItem.productImageUrl =
          input.productImageUrl;
      }

      if (input.productEmoji !== undefined) {
        existingItem.productEmoji = input.productEmoji;
      }

      if (input.sellerId !== undefined) {
        existingItem.sellerId =
          this.normalizeObjectId(
            input.sellerId,
            "sellerId",
          );
      }

      if (input.sellerName !== undefined) {
        existingItem.sellerName = input.sellerName;
      }

      if (input.storeId !== undefined) {
        existingItem.storeId =
          this.normalizeObjectId(
            input.storeId,
            "storeId",
          );
      }

      if (input.storeSlug !== undefined) {
        existingItem.storeSlug = input.storeSlug;
      }

      if (input.storeName !== undefined) {
        existingItem.storeName = input.storeName;
      }

      if (input.variant !== undefined) {
        existingItem.variant = input.variant
          ? {
              variantId:
                input.variant.variantId ?? "",
              optionsLabel:
                input.variant.optionsLabel ?? "",
            }
          : null;
      }

      if (input.unitPrice !== undefined) {
        existingItem.unitPrice =
          Number(input.unitPrice) || 0;
      }

      if (input.originalPrice !== undefined) {
        existingItem.originalPrice =
          input.originalPrice === null
            ? null
            : Number(input.originalPrice);
      }

      if (input.salePrice !== undefined) {
        existingItem.salePrice =
          input.salePrice === null
            ? null
            : Number(input.salePrice);
      }

      if (input.currency !== undefined) {
        existingItem.currency =
          input.currency || "USD";
      }

      if (input.sku !== undefined) {
        existingItem.sku = input.sku;
      }
    } else {
      cart.items.push({
        productId: productObjectId,
        quantity,
        productSlug: input.productSlug ?? "",
        productName: input.productName ?? "",
        productImageUrl: input.productImageUrl ?? "",
        productEmoji: input.productEmoji ?? "",
        sellerId: this.normalizeObjectId(
          input.sellerId,
          "sellerId",
        ),
        sellerName: input.sellerName ?? null,
        storeId: this.normalizeObjectId(
          input.storeId,
          "storeId",
        ),
        storeSlug: input.storeSlug ?? "",
        storeName: input.storeName ?? "",
        variant: input.variant
          ? {
              variantId:
                input.variant.variantId ?? "",
              optionsLabel:
                input.variant.optionsLabel ?? "",
            }
          : null,
        unitPrice: Number(input.unitPrice) || 0,
        originalPrice:
          input.originalPrice == null
            ? null
            : Number(input.originalPrice),
        salePrice:
          input.salePrice == null
            ? null
            : Number(input.salePrice),
        currency: input.currency || "USD",
        sku: input.sku ?? null,
      } as any);
    }

    try {
      await cart.save();
      return cart;
    } catch (error: any) {
      console.error(
        "[FOCKIS CART] addToCart failed:",
        error,
      );

      throw new InternalServerErrorException(
        "Unable to update cart.",
      );
    }
  }

  async update(
    userId: string,
    productId: string,
    input: UpdateCartInput,
  ): Promise<CartDocument> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException(
        "Invalid productId.",
      );
    }

    const quantity = Number(input?.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException(
        "quantity must be a positive integer.",
      );
    }

    const cart = await this.getOrCreateCart(userId);

    const item = cart.items.find(
      (cartItem: any) =>
        cartItem.productId?.toString() === productId,
    );

    if (!item) {
      throw new BadRequestException(
        "Product is not in the cart.",
      );
    }

    item.quantity = quantity;

    try {
      await cart.save();
      return cart;
    } catch (error: any) {
      console.error(
        "[FOCKIS CART] update failed:",
        error,
      );

      throw new InternalServerErrorException(
        "Unable to update cart.",
      );
    }
  }

  async remove(
    userId: string,
    productId: string,
  ): Promise<CartDocument> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException(
        "Invalid productId.",
      );
    }

    const cart = await this.getOrCreateCart(userId);

    cart.items = cart.items.filter(
      (item: any) =>
        item.productId?.toString() !== productId,
    );

    try {
      await cart.save();
      return cart;
    } catch (error: any) {
      console.error(
        "[FOCKIS CART] remove failed:",
        error,
      );

      throw new InternalServerErrorException(
        "Unable to remove cart item.",
      );
    }
  }

  async clear(
    userId: string,
  ): Promise<CartDocument> {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];

    try {
      await cart.save();
      return cart;
    } catch (error: any) {
      console.error(
        "[FOCKIS CART] clear failed:",
        error,
      );

      throw new InternalServerErrorException(
        "Unable to clear cart.",
      );
    }
  }
}
