import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Booking,
  BookingDocument,
} from "./booking.schema";

import {
  Listing,
  ListingDocument,
} from "../listings/listing.schema";

import { CreateBookingDto } from "./dto";

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookings: Model<BookingDocument>,

    @InjectModel(Listing.name)
    private readonly listings: Model<ListingDocument>,
  ) {}

  async create(
    userId: string,
    dto: CreateBookingDto,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "Authenticated user is required.",
      );
    }

    if (!dto?.listingId) {
      throw new BadRequestException(
        "Listing ID is required.",
      );
    }

    if (!Types.ObjectId.isValid(dto.listingId)) {
      throw new BadRequestException(
        "Invalid listing ID.",
      );
    }

    const listing = await this.listings
      .findById(dto.listingId)
      .exec();

    if (!listing || !listing.active) {
      throw new NotFoundException(
        "Listing not found.",
      );
    }

    if (listing.acceptingBookings === false) {
      throw new BadRequestException(
        "This listing is not currently accepting bookings.",
      );
    }

    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new BadRequestException(
        "Invalid booking dates.",
      );
    }

    if (end <= start) {
      throw new BadRequestException(
        "endAt must be after startAt.",
      );
    }

    const conflict = await this.bookings.exists({
      listingId: listing._id,
      status: {
        $in: [
          "pending",
          "confirmed",
        ],
      },
      startAt: {
        $lt: end,
      },
      endAt: {
        $gt: start,
      },
    });

    if (conflict) {
      throw new BadRequestException(
        "The selected dates/times are no longer available.",
      );
    }

    const quantity =
      Number(dto.quantity) > 0
        ? Number(dto.quantity)
        : 1;

    const guests =
      Number(dto.guests) > 0
        ? Number(dto.guests)
        : 1;

    const milliseconds =
      end.getTime() -
      start.getTime();

    const hours = Math.max(
      1,
      Math.ceil(
        milliseconds / 3600000,
      ),
    );

    const days = Math.max(
      1,
      Math.ceil(
        milliseconds / 86400000,
      ),
    );

    let multiplier = quantity;

    if (listing.priceUnit === "hour") {
      multiplier = hours;
    } else if (listing.priceUnit === "day") {
      multiplier = days;
    } else if (listing.priceUnit === "night") {
      multiplier = days;
    } else if (listing.priceUnit === "person") {
      multiplier = guests;
    }

    const price =
      Number(listing.price) || 0;

    const subtotal =
      Math.round(
        price *
          multiplier *
          100,
      ) / 100;

    const fees =
      Math.round(
        subtotal *
          0.05 *
          100,
      ) / 100;

    const tax =
      Math.round(
        subtotal *
          0.1 *
          100,
      ) / 100;

    const total =
      Math.round(
        (
          subtotal +
          fees +
          tax
        ) *
          100,
      ) / 100;

    const code =
      `FX-${Date.now()
        .toString(36)
        .toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

    return this.bookings.create({
      bookingCode: code,
      userId: String(userId),
      listingId: listing._id,
      type: listing.type,
      startAt: start,
      endAt: end,
      quantity,
      guests,
      currency:
        listing.currency || "USD",
      subtotal,
      fees,
      tax,
      total,
      status: "pending",
      paymentStatus: "unpaid",
      notes:
        dto.notes || undefined,
      snapshot:
        listing.toObject(),
    });
  }

  async listMine(
    userId: string,
  ) {
    return this.bookings
      .find({
        userId: String(userId),
      })
      .sort({
        startAt: -1,
      })
      .populate("listingId")
      .lean()
      .exec();
  }

  async getOne(
    userId: string,
    id: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        "Invalid booking ID.",
      );
    }

    const booking =
      await this.bookings
        .findOne({
          _id: id,
          userId: String(userId),
        })
        .populate("listingId")
        .lean()
        .exec();

    if (!booking) {
      throw new NotFoundException(
        "Booking not found.",
      );
    }

    return booking;
  }

  async cancel(
    userId: string,
    id: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        "Invalid booking ID.",
      );
    }

    const booking =
      await this.bookings
        .findOneAndUpdate(
          {
            _id: id,
            userId: String(userId),
            status: {
              $in: [
                "pending",
                "confirmed",
              ],
            },
          },
          {
            $set: {
              status: "cancelled",
            },
          },
          {
            new: true,
          },
        )
        .lean()
        .exec();

    if (!booking) {
      throw new NotFoundException(
        "Booking not found or cannot be cancelled.",
      );
    }

    return booking;
  }

  private validateUserId(
    userId: string,
  ): Types.ObjectId {
    if (!userId) {
      throw new BadRequestException(
        "Authenticated user is required.",
      );
    }

    const normalizedUserId =
      String(userId).trim();

    if (
      !Types.ObjectId.isValid(
        normalizedUserId,
      )
    ) {
      throw new BadRequestException(
        "Invalid authenticated user ID.",
      );
    }

    return new Types.ObjectId(
      normalizedUserId,
    );
  }

  /**
   * Returns every listing ID owned by the authenticated partner.
   *
   * IMPORTANT: partnerId on the Listing document is sometimes stored as an
   * ObjectId and sometimes as a plain string, depending on how/when the
   * listing was created. We match on BOTH forms so we don't silently miss
   * listings (and therefore miss their bookings) due to a type mismatch.
   */
  private async getOwnerListingIds(
    userId: string,
  ): Promise<Types.ObjectId[]> {
    const ownerUserObjectId =
      this.validateUserId(userId);

    const normalizedUserId =
      ownerUserObjectId.toString();

    const listings =
      await this.listings
        .find({
          $or: [
            { partnerId: ownerUserObjectId },
            { partnerId: normalizedUserId },
          ],
        })
        .select(
          "_id name title partnerId active status",
        )
        .lean()
        .exec();

    console.log(
      "[Travel Partner Reservations] ========================================",
    );

    console.log(
      "[Travel Partner Reservations] Authenticated user:",
      normalizedUserId,
    );

    console.log(
      "[Travel Partner Reservations] Owner listing count:",
      listings.length,
    );

    console.log(
      "[Travel Partner Reservations] Owner listings:",
      listings.map(
        (listing) => ({
          id: String(
            listing._id,
          ),
          name:
            listing.name,
          title:
            listing.title,
          partnerId:
            listing.partnerId
              ? String(
                  listing.partnerId,
                )
              : null,
          active:
            listing.active,
          status:
            listing.status,
        }),
      ),
    );

    console.log(
      "[Travel Partner Reservations] ========================================",
    );

    return listings.map(
      (listing) =>
        listing._id as Types.ObjectId,
    );
  }

  async listOwnerBookings(
    userId: string,
  ) {
    const listingIds =
      await this.getOwnerListingIds(
        userId,
      );

    if (
      listingIds.length === 0
    ) {
      console.log(
        "[Travel Partner Reservations] No owned listings found.",
      );

      return [];
    }

    // Bookings may also store listingId as either an ObjectId or a string,
    // depending on how the booking was created. Match on both forms so we
    // never silently drop valid reservations.
    const listingIdStrings =
      listingIds.map((id) => id.toString());

    console.log(
      "[Travel Partner Reservations] Searching bookings for listing IDs:",
      listingIdStrings,
    );

    const bookings =
      await this.bookings
        .find({
          $or: [
            { listingId: { $in: listingIds } },
            { listingId: { $in: listingIdStrings } },
          ],
        })
        .sort({
          startAt: -1,
        })
        .populate({
          path: "listingId",
          select:
            "name title type category categories city country images price priceUnit currency partnerId",
        })
        .populate({
          path: "userId",
          select:
            "_id username firstName lastName profilePicture avatar email phone fockisId online lastSeen",
        })
        .lean()
        .exec();

    console.log(
      "[Travel Partner Reservations] Matching booking count:",
      bookings.length,
    );

    console.log(
      "[Travel Partner Reservations] Matching bookings:",
      bookings.map(
        (booking: any) => ({
          id: String(
            booking._id,
          ),
          bookingCode:
            booking.bookingCode,
          listingId:
            booking.listingId?._id
              ? String(
                  booking.listingId._id,
                )
              : booking.listingId
                ? String(
                    booking.listingId,
                  )
                : null,
          listingPartnerId:
            booking.listingId?.partnerId
              ? String(
                  booking.listingId.partnerId,
                )
              : null,
          customerId:
            booking.userId?._id
              ? String(
                  booking.userId._id,
                )
              : booking.userId
                ? String(
                    booking.userId,
                  )
                : null,
          status:
            booking.status,
          total:
            booking.total,
        }),
      ),
    );

    return bookings;
  }

  async getOwnerBooking(
    userId: string,
    bookingId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        bookingId,
      )
    ) {
      throw new BadRequestException(
        "Invalid booking ID.",
      );
    }

    const listingIds =
      await this.getOwnerListingIds(
        userId,
      );

    if (
      listingIds.length === 0
    ) {
      throw new NotFoundException(
        "No listings were found for this business.",
      );
    }

    const listingIdStrings =
      listingIds.map((id) => id.toString());

    const booking =
      await this.bookings
        .findOne({
          _id: bookingId,
          $or: [
            { listingId: { $in: listingIds } },
            { listingId: { $in: listingIdStrings } },
          ],
        })
        .populate({
          path: "listingId",
          select:
            "name title type category categories description city state country address postalCode images price priceUnit currency partnerId capacity acceptingBookings",
        })
        .populate({
          path: "userId",
          select:
            "_id username firstName lastName profilePicture avatar email phone fockisId online lastSeen",
        })
        .lean()
        .exec();

    if (!booking) {
      throw new NotFoundException(
        "Reservation not found or you do not have permission to manage it.",
      );
    }

    return booking;
  }

  async updateOwnerBookingStatus(
    userId: string,
    bookingId: string,
    status: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        bookingId,
      )
    ) {
      throw new BadRequestException(
        "Invalid booking ID.",
      );
    }

    const normalizedStatus =
      String(status)
        .trim()
        .toLowerCase();

    const allowedStatuses = [
      "confirmed",
      "cancelled",
      "completed",
    ];

    if (
      !allowedStatuses.includes(
        normalizedStatus,
      )
    ) {
      throw new BadRequestException(
        "Invalid reservation status. Allowed statuses are confirmed, cancelled, and completed.",
      );
    }

    const listingIds =
      await this.getOwnerListingIds(
        userId,
      );

    if (
      listingIds.length === 0
    ) {
      throw new NotFoundException(
        "No listings were found for this business.",
      );
    }

    const listingIdStrings =
      listingIds.map((id) => id.toString());

    const booking =
      await this.bookings
        .findOneAndUpdate(
          {
            _id: bookingId,
            $or: [
              { listingId: { $in: listingIds } },
              { listingId: { $in: listingIdStrings } },
            ],
            status: {
              $in: [
                "pending",
                "confirmed",
              ],
            },
          },
          {
            $set: {
              status:
                normalizedStatus,
            },
          },
          {
            new: true,
          },
        )
        .populate({
          path: "listingId",
          select:
            "name title type category categories city country images price priceUnit currency partnerId",
        })
        .populate({
          path: "userId",
          select:
            "_id username firstName lastName profilePicture avatar email phone fockisId online lastSeen",
        })
        .lean()
        .exec();

    if (!booking) {
      throw new NotFoundException(
        "Reservation not found, is not owned by your business, or cannot be changed from its current status.",
      );
    }

    return booking;
  }

  // ==========================================================================
  // TEMPORARY DEBUG METHOD — REMOVE AFTER DIAGNOSIS
  // Called by GET /travel/partner/bookings/debug/diagnose
  // Dumps your listings (matched two ways), a sample of all listings in the
  // DB, and the most recent bookings, so we can see the raw data and find
  // where the partnerId / listingId link is breaking.
  // ==========================================================================
  async debugDiagnose(userId: string) {
    const ownerObjectId = new Types.ObjectId(userId);

    const myListings = await this.listings
      .find({
        $or: [
          { partnerId: ownerObjectId },
          { partnerId: userId },
        ],
      })
      .select("_id name title partnerId active")
      .lean()
      .exec();

    const allListingsSample = await this.listings
      .find({})
      .select("_id name title partnerId active")
      .limit(20)
      .lean()
      .exec();

    const recentBookings = await this.bookings
      .find({})
      .select("_id bookingCode listingId userId status createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec();

    return {
      yourUserId: userId,
      myListingsCount: myListings.length,
      myListings,
      allListingsSample,
      recentBookings,
    };
  }
}