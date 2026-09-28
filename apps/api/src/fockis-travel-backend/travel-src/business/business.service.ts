import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import {
  Booking,
  BookingDocument,
} from '../bookings/booking.schema';

import {
  Trip,
  TripDocument,
} from '../trips/trip.schema';

@Injectable()
export class BusinessService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookings: Model<BookingDocument>,

    @InjectModel(Trip.name)
    private readonly trips: Model<TripDocument>,
  ) {}

  /**
   * ==========================================================================
   * BUSINESS DASHBOARD
   * ==========================================================================
   *
   * GET /travel/business/dashboard
   *
   * Returns:
   *
   * {
   *   stats: {
   *     travelingEmployees: number,
   *     quarterlySpend: number,
   *     policyCompliance: number,
   *     activePolicies: number
   *   },
   *   employees: [],
   *   currentTrip: object | null,
   *   policy: object | null
   * }
   */
  async dashboard(userId: string) {
    if (!userId) {
      throw new BadRequestException(
        'Authenticated user is required.',
      );
    }

    const now = new Date();

    /**
     * ------------------------------------------------------------------------
     * CURRENT QUARTER
     * ------------------------------------------------------------------------
     */

    const currentMonth = now.getMonth();

    const quarterStartMonth =
      Math.floor(currentMonth / 3) * 3;

    const quarterStart = new Date(
      now.getFullYear(),
      quarterStartMonth,
      1,
      0,
      0,
      0,
      0,
    );

    /**
     * ------------------------------------------------------------------------
     * USER BOOKINGS
     * ------------------------------------------------------------------------
     */

    const bookings = await this.bookings
      .find({
        userId,
        status: {
          $in: [
            'pending',
            'confirmed',
            'completed',
          ],
        },
      })
      .populate('listingId')
      .sort({
        startAt: 1,
      })
      .lean();

    /**
     * ------------------------------------------------------------------------
     * QUARTERLY SPENDING
     * ------------------------------------------------------------------------
     */

    const quarterlyBookings = bookings.filter(
      (booking: any) => {
        const bookingDate =
          booking.createdAt
            ? new Date(booking.createdAt)
            : booking.startAt
              ? new Date(booking.startAt)
              : null;

        if (!bookingDate) {
          return false;
        }

        return (
          bookingDate >= quarterStart &&
          bookingDate <= now
        );
      },
    );

    const quarterlySpend =
      quarterlyBookings.reduce(
        (total: number, booking: any) => {
          const amount =
            typeof booking.total === 'number'
              ? booking.total
              : 0;

          return total + amount;
        },
        0,
      );

    /**
     * ------------------------------------------------------------------------
     * CURRENT TRIP
     * ------------------------------------------------------------------------
     */

    const currentTrip =
      await this.trips
        .findOne({
          userId,
          status: {
            $in: [
              'planning',
              'booked',
            ],
          },
          $or: [
            {
              startDate: {
                $lte: now,
              },
              endDate: {
                $gte: now,
              },
            },
            {
              startDate: {
                $gte: now,
              },
            },
          ],
        })
        .sort({
          startDate: 1,
          createdAt: -1,
        })
        .lean();

    /**
     * ------------------------------------------------------------------------
     * CURRENT TRIP ITEMS
     * ------------------------------------------------------------------------
     */

    let tripItems: Array<{
      label: string;
      amount: number;
    }> = [];

    if (
      currentTrip &&
      Array.isArray(currentTrip.bookingIds) &&
      currentTrip.bookingIds.length > 0
    ) {
      const tripBookings =
        await this.bookings
          .find({
            _id: {
              $in: currentTrip.bookingIds,
            },
            userId,
          })
          .populate('listingId')
          .lean();

      tripItems = tripBookings.map(
        (booking: any) => {
          const listing =
            booking.listingId &&
            typeof booking.listingId === 'object'
              ? booking.listingId
              : null;

          const label =
            listing?.title ||
            listing?.name ||
            booking.snapshot?.title ||
            booking.snapshot?.name ||
            booking.type ||
            'Travel booking';

          return {
            label,
            amount:
              typeof booking.total === 'number'
                ? booking.total
                : 0,
          };
        },
      );
    }

    /**
     * ------------------------------------------------------------------------
     * FALLBACK TO ITEMS STORED DIRECTLY ON TRIP
     * ------------------------------------------------------------------------
     */

    if (
      tripItems.length === 0 &&
      currentTrip &&
      Array.isArray(currentTrip.items)
    ) {
      tripItems = currentTrip.items.map(
        (item: any) => {
          let label = 'Travel booking';

          if (
            typeof item?.title === 'string' &&
            item.title.trim()
          ) {
            label = item.title;
          } else if (
            typeof item?.name === 'string' &&
            item.name.trim()
          ) {
            label = item.name;
          } else if (
            typeof item?.kind === 'string' &&
            item.kind.trim()
          ) {
            label = item.kind;
          }

          let amount = 0;

          if (
            typeof item?.amount === 'number'
          ) {
            amount = item.amount;
          } else if (
            typeof item?.price === 'number'
          ) {
            amount = item.price;
          } else if (
            typeof item?.total === 'number'
          ) {
            amount = item.total;
          }

          return {
            label,
            amount,
          };
        },
      );
    }

    /**
     * ------------------------------------------------------------------------
     * CURRENT TRIP RESPONSE
     * ------------------------------------------------------------------------
     */

    const normalizedTrip =
      currentTrip
        ? {
            destination:
              currentTrip.destination ||
              'Business trip',

            startDate:
              currentTrip.startDate
                ? new Date(
                    currentTrip.startDate,
                  ).toISOString()
                : '',

            endDate:
              currentTrip.endDate
                ? new Date(
                    currentTrip.endDate,
                  ).toISOString()
                : '',

            items: tripItems,
          }
        : null;

    /**
     * ------------------------------------------------------------------------
     * EMPLOYEES
     * ------------------------------------------------------------------------
     *
     * The current Travel backend does not yet contain
     * a company employee collection.
     *
     * Return an empty array rather than generating fake employees.
     */

    const employees: Array<{
      id: string;
      name: string;
      trip: string;
      status: string;
    }> = [];

    /**
     * ------------------------------------------------------------------------
     * BUSINESS STATISTICS
     * ------------------------------------------------------------------------
     *
     * There is currently no BusinessPolicy model or
     * employee membership model in the backend.
     */

    const travelingEmployees =
      currentTrip ? 1 : 0;

    const activePolicies = 0;

    const policyCompliance = 0;

    /**
     * ------------------------------------------------------------------------
     * POLICY
     * ------------------------------------------------------------------------
     */

    const policy = null;

    /**
     * ------------------------------------------------------------------------
     * FINAL RESPONSE
     * ------------------------------------------------------------------------
     */

    return {
      stats: {
        travelingEmployees,
        quarterlySpend,
        policyCompliance,
        activePolicies,
      },

      employees,

      currentTrip: normalizedTrip,

      policy,
    };
  }
}