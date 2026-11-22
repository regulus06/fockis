import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { NotificationsService } from "../../../notifications/notifications.service";

// ============================================================================
// SECURITY NOTIFICATIONS
//
// Uses the existing Fockis in-app notification system. A notification counts
// as delivered only when the notification record has been saved (the socket
// push is best-effort, like every other Fockis notification).
//
// Messages never contain passwords, codes, tokens or full IP addresses.
// ============================================================================

export const SECURITY_NOTIFICATION_TYPE = "SECURITY";

@Injectable()
export class SecurityNotificationsService {
  private readonly logger = new Logger(SecurityNotificationsService.name);

  constructor(
    private readonly notifications: NotificationsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /** Returns true only when the notification was stored. */
  async notifyUser(
    userId: string,
    title: string,
    message: string,
    link = "/settings/security",
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(String(userId))) return false;

    try {
      await this.notifications.create({
        recipientId: String(userId),
        type: SECURITY_NOTIFICATION_TYPE,
        title: title.slice(0, 120),
        message: message.slice(0, 500),
        entityType: "security",
        link,
      } as any);

      return true;
    } catch (error) {
      this.logger.warn(
        `Security notification for ${userId} was not stored: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return false;
    }
  }

  /** Notify several users; returns how many notifications were stored. */
  async notifyMany(
    userIds: string[],
    title: string,
    message: string,
    link?: string,
  ): Promise<number> {
    let delivered = 0;

    for (const id of Array.from(new Set(userIds)).slice(0, 50)) {
      if (await this.notifyUser(id, title, message, link)) delivered += 1;
    }

    return delivered;
  }

  /**
   * Platform administrators who can see security information:
   * super administrators and administrators.
   */
  async platformSecurityAdminIds(): Promise<string[]> {
    const users = await this.connection
      .collection("users")
      .find(
        {
          isActive: { $ne: false },
          $or: [
            { role: { $in: ["super_admin", "superadmin", "admin"] } },
            { isSuperAdmin: true },
          ],
        },
        { projection: { _id: 1 } },
      )
      .limit(50)
      .toArray();

    return users.map((user) => String(user._id));
  }

  /** Owner and active administrators of an organization. */
  async organizationAdminIds(organizationId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(organizationId)) return [];

    const orgId = new Types.ObjectId(organizationId);

    const [organization, members] = await Promise.all([
      this.connection
        .collection("church_organizations")
        .findOne({ _id: orgId }, { projection: { createdByUserId: 1 } }),
      this.connection
        .collection("church_members")
        .find(
          {
            organizationId: orgId,
            status: "active",
            role: { $in: ["administrator"] },
          },
          { projection: { userId: 1 } },
        )
        .limit(50)
        .toArray(),
    ]);

    const ids = members
      .map((member) => member.userId)
      .filter(Boolean)
      .map(String);

    if (organization?.createdByUserId) {
      ids.unshift(String(organization.createdByUserId));
    }

    return Array.from(new Set(ids));
  }
}
