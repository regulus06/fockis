import {
  BadRequestException,
  ConflictException,
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
  Review,
  ReviewDocument,
} from './review.schema';

import {
  Listing,
  ListingDocument,
} from '../listings/listing.schema';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviews:
      Model<ReviewDocument>,

    @InjectModel(Listing.name)
    private readonly listings:
      Model<ListingDocument>,
  ) {}

  /* ==========================================================================
     HELPERS
  ========================================================================== */

  private validateUserId(
    userId: string,
  ): Types.ObjectId {
    if (!userId) {
      throw new BadRequestException(
        'Authenticated user is required.',
      );
    }

    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        'Invalid authenticated user ID.',
      );
    }

    return new Types.ObjectId(userId);
  }

  private validateObjectId(
    value: unknown,
    fieldName: string,
  ): Types.ObjectId {
    if (
      typeof value !== 'string' ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new BadRequestException(
        `${fieldName} must be a valid ID.`,
      );
    }

    return new Types.ObjectId(value);
  }

  /* ==========================================================================
     LIST REVIEWS
  ========================================================================== */

  async list(
    listingId: string,
  ) {
    const listingObjectId =
      this.validateObjectId(
        listingId,
        'listingId',
      );

    return this.reviews
      .find({
        listingId:
          listingObjectId,
      })
      .populate(
        'userId',
        'name email',
      )
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  /* ==========================================================================
     CREATE REVIEW
  ========================================================================== */

  async create(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const ownerId =
      this.validateUserId(userId);

    /* ------------------------------------------------------------------------
       LISTING
    ------------------------------------------------------------------------ */

    const listingId =
      this.validateObjectId(
        data.listingId,
        'listingId',
      );

    const listing =
      await this.listings
        .findById(listingId)
        .lean();

    if (!listing) {
      throw new NotFoundException(
        'Travel listing not found.',
      );
    }

    /* ------------------------------------------------------------------------
       BOOKING
    ------------------------------------------------------------------------ */

    const bookingId =
      this.validateObjectId(
        data.bookingId,
        'bookingId',
      );

    /* ------------------------------------------------------------------------
       RATING
    ------------------------------------------------------------------------ */

    const rating =
      Number(data.rating);

    if (
      !Number.isFinite(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      throw new BadRequestException(
        'Rating must be between 1 and 5.',
      );
    }

    /* ------------------------------------------------------------------------
       TEXT
    ------------------------------------------------------------------------ */

    const text =
      typeof data.text === 'string'
        ? data.text.trim()
        : '';

    if (!text) {
      throw new BadRequestException(
        'Review text is required.',
      );
    }

    if (text.length > 5000) {
      throw new BadRequestException(
        'Review text cannot exceed 5000 characters.',
      );
    }

    /* ------------------------------------------------------------------------
       IMAGES
    ------------------------------------------------------------------------ */

    let images: string[] = [];

    if (Array.isArray(data.images)) {
      images = data.images
        .filter(
          (
            image,
          ): image is string =>
            typeof image === 'string' &&
            image.trim().length > 0,
        )
        .map(
          (image) =>
            image.trim(),
        );
    }

    /* ------------------------------------------------------------------------
       CHECK FOR EXISTING REVIEW
    ------------------------------------------------------------------------ */

    const existing =
      await this.reviews.findOne({
        bookingId,
      });

    if (existing) {
      throw new ConflictException(
        'This booking already has a review.',
      );
    }

    /* ------------------------------------------------------------------------
       CREATE
       
       verified is controlled by the backend.
    ------------------------------------------------------------------------ */

    let review:
      | ReviewDocument
      | null = null;

    try {
      review =
        await this.reviews.create({
          userId: ownerId,
          listingId,
          bookingId,
          rating,
          text,
          images,
          verified: true,
        });
    } catch (error: any) {
      /*
       * Protect against a race condition where two requests attempt to
       * review the same booking at exactly the same time.
       */

      if (
        error?.code === 11000
      ) {
        throw new ConflictException(
          'This booking already has a review.',
        );
      }

      throw error;
    }

    /* ------------------------------------------------------------------------
       RECALCULATE LISTING RATING
    ------------------------------------------------------------------------ */

    const aggregate =
      await this.reviews.aggregate([
        {
          $match: {
            listingId,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: {
              $avg: '$rating',
            },
            reviewCount: {
              $sum: 1,
            },
          },
        },
      ]);

    const averageRating =
      aggregate[0]
        ?.averageRating ?? 0;

    const reviewCount =
      aggregate[0]
        ?.reviewCount ?? 0;

    await this.listings.findByIdAndUpdate(
      listingId,
      {
        $set: {
          rating:
            Math.round(
              averageRating * 10,
            ) / 10,

          reviewCount,
        },
      },
    );

    /* ------------------------------------------------------------------------
       RETURN POPULATED REVIEW
    ------------------------------------------------------------------------ */

    const result =
      await this.reviews
        .findById(review._id)
        .populate(
          'userId',
          'name email',
        )
        .populate(
          'listingId',
          'name title type city country images rating reviewCount',
        )
        .lean();

    return result;
  }
}