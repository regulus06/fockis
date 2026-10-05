import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { UserDirectoryService } from "../directory/users-list.service";

@Injectable()
export class UsersExportService {
  constructor(
    private readonly directory: UserDirectoryService,
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

  async csv(
    q: any = {},
    actor: any,
  ) {
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

    const result =
      await this.directory.list(
        {
          ...q,
          page: 1,
          limit: 100,
        },
        actor,
      );

    const headers = [
      "id",
      "username",
      "email",
      "displayName",
      "role",
      "accountType",
      "verified",
      "isActive",
      "online",
      "premium",
      "sellerApproved",
      "fockisId",
      "fockisIdAccessPaid",
      "createdAt",
      "lastActiveAt",
    ];

    const esc = (value: any) =>
      `"${String(value ?? "").replace(
        /"/g,
        '""',
      )}"`;

    return [
      headers.join(","),
      ...result.items.map(
        (user: any) =>
          headers
            .map((header) =>
              esc(user[header]),
            )
            .join(","),
      ),
    ].join("\n");
  }
}