import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Wishlist,
  WishlistDocument,
} from './wishlist.schema';

import {
  Listing,
  ListingDocument,
} from '../listings/listing.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name)
    private readonly model: Model<WishlistDocument>,

    @InjectModel(Listing.name)
    private readonly listings: Model<ListingDocument>,
  ) {}

  /* ==========================================================================
     VALIDATION
  ========================================================================== */

  private validateUser(
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        'Authenticated user is required.',
      );
    }
  }

  private validateListingId(
    listingId: string,
  ) {
    if (
      !listingId ||
      !Types.ObjectId.isValid(listingId)
    ) {
      throw new BadRequestException(
        'A valid listing ID is required.',
      );
    }
  }

  /* ==========================================================================
     RESPONSE NORMALIZER
  ========================================================================== */

  private normalize(
    item: any,
  ) {
    if (!item) {
      return null;
    }

    const populatedListing =
      item.listingId &&
      typeof item.listingId === 'object' &&
      !Array.isArray(item.listingId)
        ? item.listingId
        : null;

    const listingId =
      populatedListing?._id
        ? String(populatedListing._id)
        : item.listingId
          ? String(item.listingId)
          : '';

    /*
     * Return both:
     *
     * listingId
     * listing
     *
     * This allows the frontend to work with
     * either representation.
     */

    return {
      _id: item._id
        ? String(item._id)
        : undefined,

      id: item._id
        ? String(item._id)
        : undefined,

      userId: item.userId
        ? String(item.userId)
        : undefined,

      listingId,

      listing: populatedListing
        ? {
            ...populatedListing,
            _id: populatedListing._id
              ? String(populatedListing._id)
              : undefined,
          }
        : null,

      note:
        typeof item.note === 'string'
          ? item.note
          : '',

      createdAt: item.createdAt,
      updatedAt: item.updatedAt,

      /*
       * Convenience fields.
       *
       * These are useful for older frontend components
       * that expect the listing fields directly.
       */

      name:
        populatedListing?.name ??
        populatedListing?.title ??
        undefined,

      title:
        populatedListing?.title ??
        populatedListing?.name ??
        undefined,

      type:
        populatedListing?.type ??
        populatedListing?.category ??
        undefined,

      category:
        populatedListing?.category ??
        undefined,

      image:
        populatedListing?.images?.[0] ??
        undefined,

      images:
        Array.isArray(
          populatedListing?.images,
        )
          ? populatedListing.images
          : [],

      city:
        populatedListing?.city ??
        undefined,

      country:
        populatedListing?.country ??
        undefined,

      price:
        populatedListing?.price ??
        undefined,

      currency:
        populatedListing?.currency ??
        undefined,

      rating:
        populatedListing?.rating ??
        0,

      reviewCount:
        populatedListing?.reviewCount ??
        0,
    };
  }

  /* ==========================================================================
     LIST USER WISHLIST
     
     GET /travel/wishlist
  ========================================================================== */

  async list(
    userId: string,
  ) {
    this.validateUser(userId);

    const items =
      await this.model
        .find({
          userId,
        })
        .populate('listingId')
        .sort({
          createdAt: -1,
        })
        .lean();

    return items
      .map((item) =>
        this.normalize(item),
      )
      .filter(Boolean);
  }

  /* ==========================================================================
     ADD TO WISHLIST

     POST /travel/wishlist/:listingId
  ========================================================================== */

  async add(
    userId: string,
    listingId: string,
    note = '',
  ) {
    this.validateUser(userId);

    this.validateListingId(
      listingId,
    );

    /*
     * Confirm that the Travel listing exists.
     */

    const listing =
      await this.listings
        .findById(listingId)
        .lean();

    if (!listing) {
      throw new NotFoundException(
        'Travel listing not found.',
      );
    }

    /*
     * Normalize note.
     */

    const normalizedNote =
      typeof note === 'string'
        ? note.trim()
        : '';

    /*
     * Upsert:
     *
     * - Creates the wishlist item if missing.
     * - Updates the note if it already exists.
     * - Works safely with the unique user/listing index.
     */

    const item =
      await this.model
        .findOneAndUpdate(
          {
            userId,
            listingId:
              new Types.ObjectId(
                listingId,
              ),
          },
          {
            $set: {
              note: normalizedNote,
            },

            $setOnInsert: {
              userId,
              listingId:
                new Types.ObjectId(
                  listingId,
                ),
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        )
        .populate('listingId')
        .lean();

    return this.normalize(item);
  }

  /* ==========================================================================
     REMOVE FROM WISHLIST

     DELETE /travel/wishlist/:listingId
  ========================================================================== */

  async remove(
    userId: string,
    listingId: string,
  ) {
    this.validateUser(userId);

    this.validateListingId(
      listingId,
    );

    const item =
      await this.model
        .findOneAndDelete({
          userId,
          listingId:
            new Types.ObjectId(
              listingId,
            ),
        })
        .lean();

    if (!item) {
      throw new NotFoundException(
        'Wishlist item not found.',
      );
    }

    return {
      ok: true,
      id: String(item._id),
      listingId,
    };
  }
}