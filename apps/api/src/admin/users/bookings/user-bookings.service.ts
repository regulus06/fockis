import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

import {
  limitValue,
  pageValue,
} from "../user-admin-utils";

@Injectable()
export class UserBookingsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  private normalizeRole(value: unknown): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  private isSuperAdmin(actor: any): boolean {
    if (!actor) return false;

    if (actor.isSuperAdmin === true) {
      return true;
    }

    return (
      this.normalizeRole(actor.role) ===
        "super_admin" ||
      (Array.isArray(actor.roles) &&
        actor.roles.some(
          (role: unknown) =>
            this.normalizeRole(role) ===
            "super_admin",
        ))
    );
  }

  private isAdminOrHigher(actor: any): boolean {
    if (!actor) return false;

    return (
      this.isSuperAdmin(actor) ||
      this.normalizeRole(actor.role) ===
        "admin"
    );
  }

  private getActorId(actor: any): string {
    return String(
      actor?._id ??
        actor?.id ??
        actor?.userId ??
        actor?.sub ??
        "",
    ).trim();
  }

  private async authorize(
    userId: string,
    actor: any,
  ): Promise<void> {
    const actorId =
      this.getActorId(actor);

    if (!actorId) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    if (!this.isAdminOrHigher(actor)) {
      throw new ForbiddenException(
        "Admin privileges required.",
      );
    }

    const userModel =
      this.connection.models["User"];

    if (!userModel) {
      throw new ForbiddenException(
        "User model is unavailable.",
      );
    }

    const target = await userModel
      .findById(userId)
      .select("_id role isActive")
      .lean()
      .exec();

    if (!target) {
      throw new ForbiddenException(
        "User not found.",
      );
    }

    const targetRole =
      this.normalizeRole(
        target.role,
      );

    /*
     * Only Super Admins can inspect booking
     * information belonging to Admin or
     * Super Admin accounts.
     */
    if (
      !this.isSuperAdmin(actor) &&
      (targetRole === "admin" ||
        targetRole === "super_admin")
    ) {
      throw new ForbiddenException(
        "Only Super Admins can view Admin or Super Admin booking information.",
      );
    }
  }

  async list(
    userId: string,
    q: any = {},
    actor: any,
  ) {
    await this.authorize(
      userId,
      actor,
    );

    const names = [
      "Booking",
      "TravelBooking",
      "Reservation",
    ];

    const limit = Math.min(
      Math.max(
        Number(
          limitValue(q?.limit),
        ) || 25,
        1,
      ),
      100,
    );

    const requestedPage =
      Math.max(
        Number(
          pageValue(q?.page),
        ) || 1,
        1,
      );

    const requestedSkip =
      Number(q?.skip);

    const skip =
      Number.isFinite(
        requestedSkip,
      ) &&
      requestedSkip >= 0
        ? Math.floor(
            requestedSkip,
          )
        : (requestedPage - 1) *
          limit;

    for (const name of names) {
      const model =
        this.connection.models[name];

      if (!model) continue;

      const filter: any = {
        $or: [
          { userId },
          { customerId: userId },
          { travelerId: userId },
          { guestId: userId },
        ],
      };

      if (q?.status) {
        filter.status = String(
          q.status,
        ).trim();
      }

      if (q?.type) {
        filter.type = String(
          q.type,
        ).trim();
      }

      const [
        documents,
        total,
      ] = await Promise.all([
        model
          .find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),

        model.countDocuments(
          filter,
        ),
      ]);

      const items =
        documents.map(
          (x: any) => ({
            ...x,

            id: String(
              x._id,
            ),

            userId: String(
              x.userId ??
                userId,
            ),

            bookingCode:
              String(
                x.bookingCode ??
                  x.code ??
                  x._id,
              ),

            listingId:
              String(
                x.listingId ??
                  x.propertyId ??
                  x.tripId ??
                  "",
              ),

            type:
              x.type ??
              "booking",

            startAt:
              x.startAt ??
              x.startDate ??
              x.checkIn,

            endAt:
              x.endAt ??
              x.endDate ??
              x.checkOut,

            quantity: Number(
              x.quantity ?? 1,
            ),

            guests: Number(
              x.guests ??
                x.guestCount ??
                1,
            ),

            currency:
              x.currency ??
              "USD",

            subtotal: Number(
              x.subtotal ?? 0,
            ),

            fees: Number(
              x.fees ??
                x.serviceFee ??
                0,
            ),

            tax: Number(
              x.tax ?? 0,
            ),

            total: Number(
              x.total ??
                x.amount ??
                0,
            ),

            status:
              x.status ??
              "pending",

            paymentStatus:
              x.paymentStatus ??
              "unknown",

            notes: x.notes,

            createdAt:
              x.createdAt,

            updatedAt:
              x.updatedAt,
          }),
        );

      return {
        items,
        bookings: items,
        total,
        page:
          Math.floor(
            skip / limit,
          ) + 1,
        limit,
        pages: Math.ceil(
          total / limit,
        ),
      };
    }

    return {
      items: [],
      bookings: [],
      total: 0,
      page: 1,
      limit,
      pages: 0,
    };
  }
}