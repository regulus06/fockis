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
export class UserPaymentsService {
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

    const role = this.normalizeRole(actor.role);

    return (
      this.isSuperAdmin(actor) ||
      role === "admin"
    );
  }

  private getActorId(actor: any): string {
    return String(
      actor?._id ?? actor?.id ?? "",
    ).trim();
  }

  private async authorize(
    userId: string,
    actor: any,
  ): Promise<void> {
    const actorId = this.getActorId(actor);

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

    /*
     * Look up the target user's role directly from
     * the database so the authorization decision does
     * not rely only on client-supplied data.
     */
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

    const targetRole = this.normalizeRole(
      target.role,
    );

    /*
     * Only Super Admins can inspect payment
     * information belonging to Admin or Super Admin
     * accounts.
     */
    if (
      !this.isSuperAdmin(actor) &&
      (targetRole === "admin" ||
        targetRole === "super_admin")
    ) {
      throw new ForbiddenException(
        "Only Super Admins can view Admin or Super Admin payment information.",
      );
    }
  }

  async list(
    userId: string,
    q: any = {},
    actor: any,
  ) {
    await this.authorize(userId, actor);

    const names = [
      "Payment",
      "Transaction",
      "PaymentIntent",
      "ShopPayment",
    ];

    const limit = Math.min(
      Math.max(
        Number(limitValue(q?.limit)) || 25,
        1,
      ),
      100,
    );

    const requestedPage = Math.max(
      Number(pageValue(q?.page)) || 1,
      1,
    );

    const requestedSkip = Number(
      q?.skip,
    );

    const skip =
      Number.isFinite(requestedSkip) &&
      requestedSkip >= 0
        ? Math.floor(requestedSkip)
        : (requestedPage - 1) * limit;

    for (const name of names) {
      const model =
        this.connection.models[name];

      if (!model) continue;

      const filter: any = {
        $or: [
          { userId },
          { customerId: userId },
          { payerId: userId },
          { buyerId: userId },
        ],
      };

      if (q?.status) {
        filter.status = String(
          q.status,
        ).trim();
      }

      const [docs, total] =
        await Promise.all([
          model
            .find(filter)
            .sort({
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),

          model.countDocuments(filter),
        ]);

      const items = docs.map(
        (x: any) => ({
          id: String(x._id),
          _id: String(x._id),

          userId: String(
            x.userId ?? userId,
          ),

          amount: Number(
            x.amount ??
              x.total ??
              x.amountReceived ??
              0,
          ),

          currency:
            x.currency ?? "USD",

          status:
            x.status ?? "unknown",

          paymentMethod:
            x.paymentMethod ??
            x.method,

          provider:
            x.provider ?? "stripe",

          providerPaymentId:
            x.providerPaymentId ??
            x.stripePaymentIntentId,

          stripePaymentIntentId:
            x.stripePaymentIntentId,

          description:
            x.description,

          metadata:
            x.metadata ?? {},

          createdAt:
            x.createdAt,

          updatedAt:
            x.updatedAt,
        }),
      );

      return {
        items,
        payments: items,
        total,
        page:
          Math.floor(skip / limit) + 1,
        limit,
        pages: Math.ceil(
          total / limit,
        ),
      };
    }

    return {
      items: [],
      payments: [],
      total: 0,
      page: 1,
      limit,
      pages: 0,
    };
  }
}