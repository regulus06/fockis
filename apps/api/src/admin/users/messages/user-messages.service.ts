import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

import { limitValue, pageValue } from "../user-admin-utils";

@Injectable()
export class UserMessagesService {
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
    return (
      actor?.isSuperAdmin === true ||
      this.normalizeRole(actor?.role) === "super_admin" ||
      (Array.isArray(actor?.roles) &&
        actor.roles.some(
          (role: unknown) =>
            this.normalizeRole(role) === "super_admin",
        ))
    );
  }

  private isAdminOrHigher(actor: any): boolean {
    const role = this.normalizeRole(actor?.role);

    return (
      this.isSuperAdmin(actor) ||
      role === "admin"
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

  private async getTargetUser(userId: string): Promise<{
    _id: unknown;
    role?: unknown;
    isActive?: boolean;
  } | null> {
    const UserModel = this.connection.models.User;

    if (!UserModel) {
      return null;
    }

    return UserModel.findById(userId)
      .select("_id role isActive")
      .lean()
      .exec() as Promise<{
      _id: unknown;
      role?: unknown;
      isActive?: boolean;
    } | null>;
  }

  async list(userId: string, q: any = {}, actor: any = undefined) {
    const targetUserId = String(userId ?? "").trim();

    if (!targetUserId) {
      throw new UnauthorizedException("Target user is required.");
    }

    const actorId = this.getActorId(actor);

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

    const targetUser = await this.getTargetUser(targetUserId);

    if (!targetUser) {
      throw new ForbiddenException(
        "Target user not found.",
      );
    }

    const targetRole = this.normalizeRole(targetUser.role);
    const targetIsSuperAdmin =
      targetRole === "super_admin";

    const actorIsSuperAdmin = this.isSuperAdmin(actor);

    /*
     * Protect administrator accounts.
     *
     * Only a Super Admin may inspect messages belonging
     * to another Admin or Super Admin.
     */
    if (
      !actorIsSuperAdmin &&
      (targetIsSuperAdmin || targetRole === "admin")
    ) {
      throw new ForbiddenException(
        "You cannot view messages for another administrator.",
      );
    }

    /*
     * Prevent a regular Admin from using this endpoint
     * to inspect their own protected administrative account
     * through another identifier.
     */
    if (
      !actorIsSuperAdmin &&
      targetRole === "admin" &&
      actorId !== targetUserId
    ) {
      throw new ForbiddenException(
        "Only a Super Admin may inspect administrator messages.",
      );
    }

    const candidates = [
      "Conversation",
      "ChatConversation",
      "MessageThread",
    ];

    const limit = limitValue(q.limit);

    const requestedPage = pageValue(q.page);
    const requestedSkip = Number(q.skip);

    const skip =
      Number.isFinite(requestedSkip) &&
      requestedSkip >= 0
        ? Math.floor(requestedSkip)
        : Math.max(0, requestedPage - 1) * limit;

    for (const name of candidates) {
      const model = this.connection.models[name];

      if (!model) {
        continue;
      }

      const filter: any = {
        $or: [
          { participantIds: targetUserId },
          { participants: targetUserId },
          { userIds: targetUserId },
          { "participants.userId": targetUserId },
        ],
      };

      const [docs, total] = await Promise.all([
        model
          .find(filter)
          .sort({
            updatedAt: -1,
            lastMessageAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),

        model.countDocuments(filter),
      ]);

      const items = docs.map((d: any) => {
        const participants =
          d.participantIds ??
          d.participants ??
          d.userIds ??
          [];

        const participantId = Array.isArray(participants)
          ? participants.find(
              (x: any) =>
                String(
                  x?.userId ??
                    x?._id ??
                    x,
                ) !== targetUserId,
            )
          : "";

        return {
          conversationId: String(d._id),

          participantId: String(
            participantId?.userId ??
              participantId?._id ??
              participantId ??
              "",
          ),

          participantName:
            d.participantName,

          participantFockisId:
            d.participantFockisId,

          lastMessage:
            d.lastMessage?.text ??
            d.lastMessageText ??
            d.lastMessage,

          lastMessageAt:
            d.lastMessageAt ??
            d.updatedAt,

          messageCount: Number(
            d.messageCount ?? 0,
          ),

          unreadCount: Number(
            d.unreadCount ?? 0,
          ),

          status: d.status,
        };
      });

      return {
        items,
        conversations: items,
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        pages: Math.ceil(total / limit),
      };
    }

    return {
      items: [],
      conversations: [],
      total: 0,
      page: 1,
      limit,
      pages: 0,
    };
  }
}