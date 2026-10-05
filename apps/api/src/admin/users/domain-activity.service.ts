import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

const CANDIDATES: Record<string, string[]> = {
  shop: [
    "Order",
    "ShopOrder",
    "ProductOrder",
    "CartOrder",
  ],

  live: [
    "LiveStream",
    "Stream",
    "GiftTransaction",
  ],

  music: [
    "MusicPurchase",
    "PlaylistPurchase",
    "MusicTransaction",
  ],

  travel: [
    "TravelBooking",
    "Booking",
    "TripBooking",
  ],

  realestate: [
    "Property",
    "RealEstateListing",
    "RealEstateProperty",
  ],

  ai: [
    "AiJob",
    "AIJob",
    "AiUsage",
    "AICreditTransaction",
  ],

  finance: [
    "Payment",
    "Transaction",
    "Refund",
    "Payout",
  ],
};

@Injectable()
export class UserDomainActivityService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  // ---------------------------------------------------------------------------
  // ROLE HELPERS
  // ---------------------------------------------------------------------------

  private normalizeRole(value: unknown): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  private isSuperAdmin(actor: any): boolean {
    return (
      actor?.isSuperAdmin === true ||
      this.normalizeRole(actor?.role) ===
        "super_admin" ||
      (Array.isArray(actor?.roles) &&
        actor.roles.some(
          (role: unknown) =>
            this.normalizeRole(role) ===
            "super_admin",
        ))
    );
  }

  private isAdminOrHigher(actor: any): boolean {
    return (
      this.isSuperAdmin(actor) ||
      this.normalizeRole(actor?.role) ===
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

  // ---------------------------------------------------------------------------
  // TARGET USER
  // ---------------------------------------------------------------------------

  private async getTargetUser(userId: string) {
    const UserModel =
      this.connection.models.User;

    if (!UserModel) {
      return null;
    }

    return UserModel.findById(userId)
      .select("_id role isActive")
      .lean()
      .exec();
  }

  // ---------------------------------------------------------------------------
  // ACCESS CONTROL
  // ---------------------------------------------------------------------------

  private async authorize(
    userId: string,
    actor: any,
  ) {
    const targetUserId = String(
      userId ?? "",
    ).trim();

    if (!targetUserId) {
      throw new UnauthorizedException(
        "Target user is required.",
      );
    }

    const actorId =
      this.getActorId(actor);

    if (!actorId) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    if (!this.isAdminOrHigher(actor)) {
      throw new ForbiddenException(
        "Administrator privileges required.",
      );
    }

    const target =
      await this.getTargetUser(
        targetUserId,
      );

    if (!target) {
      throw new ForbiddenException(
        "Target user not found.",
      );
    }

    const targetRole =
      this.normalizeRole(target.role);

    const targetIsAdmin =
      targetRole === "admin";

    const targetIsSuperAdmin =
      targetRole === "super_admin";

    const actorIsSuperAdmin =
      this.isSuperAdmin(actor);

    /*
     * Domain activity can contain sensitive business,
     * financial, communication, AI, purchase, travel,
     * and marketplace information.
     *
     * Only Super Admins may inspect another
     * administrator's domain activity.
     */
    if (
      !actorIsSuperAdmin &&
      (targetIsAdmin ||
        targetIsSuperAdmin)
    ) {
      throw new ForbiddenException(
        "Only a Super Admin may inspect administrator domain activity.",
      );
    }

    return {
      targetUserId,
      target,
      actorIsSuperAdmin,
    };
  }

  // ---------------------------------------------------------------------------
  // DOMAIN SUMMARY
  // ---------------------------------------------------------------------------

  async summary(
    userId: string,
    actor: any,
  ) {
    const { targetUserId } =
      await this.authorize(
        userId,
        actor,
      );

    const result: Record<
      string,
      any
    > = {};

    for (const [
      domain,
      names,
    ] of Object.entries(
      CANDIDATES,
    )) {
      result[domain] =
        await this.countAcrossModels(
          names,
          targetUserId,
        );
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // DOMAIN LIST
  // ---------------------------------------------------------------------------

  async list(
    domain: string,
    userId: string,
    q: any = {},
    actor: any,
  ) {
    const { targetUserId } =
      await this.authorize(
        userId,
        actor,
      );

    const normalizedDomain =
      String(domain ?? "")
        .trim()
        .toLowerCase();

    const names =
      CANDIDATES[
        normalizedDomain
      ] ?? [];

    if (names.length === 0) {
      throw new ForbiddenException(
        `Unsupported activity domain: ${normalizedDomain}`,
      );
    }

    const requestedLimit =
      Number(q?.limit ?? 50);

    const requestedSkip =
      Number(q?.skip ?? 0);

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.isFinite(
          requestedLimit,
        )
          ? Math.floor(
              requestedLimit,
            )
          : 50,
      ),
    );

    const skip = Math.max(
      0,
      Number.isFinite(
        requestedSkip,
      )
        ? Math.floor(
            requestedSkip,
          )
        : 0,
    );

    for (const name of names) {
      const model =
        this.connection.models[
          name
        ];

      if (!model) {
        continue;
      }

      const filter: any = {
        $or: [
          {
            userId:
              targetUserId,
          },
          {
            customerId:
              targetUserId,
          },
          {
            buyerId:
              targetUserId,
          },
          {
            ownerId:
              targetUserId,
          },
          {
            sellerId:
              targetUserId,
          },
        ],
      };

      const [
        items,
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

      return {
        items,
        total,
        page:
          Math.floor(
            skip / limit,
          ) + 1,
        limit,
        pages:
          Math.ceil(
            total / limit,
          ),
        source: name,
      };
    }

    return {
      items: [],
      total: 0,
      page:
        Math.floor(
          skip / limit,
        ) + 1,
      limit,
      pages: 0,
      source: null,
    };
  }

  // ---------------------------------------------------------------------------
  // COUNT
  // ---------------------------------------------------------------------------

  private async countAcrossModels(
    names: string[],
    userId: string,
  ) {
    for (const name of names) {
      const model =
        this.connection.models[
          name
        ];

      if (!model) {
        continue;
      }

      const filter = {
        $or: [
          { userId },
          { customerId: userId },
          { buyerId: userId },
          { ownerId: userId },
          { sellerId: userId },
        ],
      };

      return await model.countDocuments(
        filter,
      );
    }

    return 0;
  }
}