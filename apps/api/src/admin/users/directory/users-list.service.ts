import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  User,
  UserDocument,
} from "../../../users/user.schema";

import {
  bool,
  escapeRegex,
  limitValue,
  normalizeUser,
  pageValue,
} from "../user-admin-utils";

@Injectable()
export class UserDirectoryService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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
      this.normalizeRole(actor.role) === "super_admin" ||
      (Array.isArray(actor.roles) &&
        actor.roles.some(
          (role: unknown) =>
            this.normalizeRole(role) === "super_admin",
        ))
    );
  }

  private isAdminOrHigher(actor: any): boolean {
    if (!actor) return false;

    return (
      this.isSuperAdmin(actor) ||
      this.normalizeRole(actor.role) === "admin"
    );
  }

  private requireAdmin(actor: any): void {
    const actorId = String(
      actor?._id ?? actor?.id ?? "",
    ).trim();

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
  }

  async list(
    q: any = {},
    actor: any,
  ) {
    this.requireAdmin(actor);

    const page = Math.max(
      pageValue(q?.page),
      1,
    );

    const limit = Math.min(
      Math.max(
        limitValue(q?.limit),
        1,
      ),
      100,
    );

    const skip =
      (page - 1) * limit;

    const filter: any = {};
    const and: any[] = [];

    const search = String(
      q?.search ?? "",
    ).trim();

    if (search) {
      const r = new RegExp(
        escapeRegex(search),
        "i",
      );

      and.push({
        $or: [
          { email: r },
          { username: r },
          { firstName: r },
          { lastName: r },
          { name: r },
          { fockisId: r },
        ],
      });
    }

    if (
      q?.status &&
      q.status !== "all"
    ) {
      filter.status = q.status;
    }

    if (
      q?.role &&
      q.role !== "all"
    ) {
      filter.role = q.role;
    }

    if (
      q?.accountType &&
      q.accountType !== "all"
    ) {
      filter.accountType =
        q.accountType;
    }

    const booleanFilters: Array<
      [string, string]
    > = [
      ["verified", "verified"],
      ["premium", "premium"],
      [
        "fockisIdAccessPaid",
        "fockisIdAccessPaid",
      ],
      [
        "sellerApproved",
        "sellerApproved",
      ],
      ["online", "online"],
      ["locked", "locked"],
    ];

    for (const [
      key,
      field,
    ] of booleanFilters) {
      const value = bool(q?.[key]);

      if (value === undefined) {
        continue;
      }

      if (field === "locked") {
        and.push({
          $or: [
            { status: "locked" },
            {
              lockedUntil: {
                $gt: new Date(),
              },
            },
          ],
        });
      } else {
        and.push({
          [field]: value,
        });
      }
    }

    if (q?.countryCode) {
      filter.countryCode =
        String(
          q.countryCode,
        ).toUpperCase();
    }

    if (
      q?.createdFrom ||
      q?.createdTo
    ) {
      filter.createdAt = {
        ...(q.createdFrom
          ? {
              $gte: new Date(
                q.createdFrom,
              ),
            }
          : {}),
        ...(q.createdTo
          ? {
              $lte: new Date(
                q.createdTo,
              ),
            }
          : {}),
      };
    }

    if (
      q?.lastActiveFrom ||
      q?.lastActiveTo
    ) {
      const range = {
        ...(q.lastActiveFrom
          ? {
              $gte: new Date(
                q.lastActiveFrom,
              ),
            }
          : {}),
        ...(q.lastActiveTo
          ? {
              $lte: new Date(
                q.lastActiveTo,
              ),
            }
          : {}),
      };

      and.push({
        $or: [
          {
            lastActiveAt: range,
          },
          {
            lastSeen: range,
          },
        ],
      });
    }

    if (and.length > 0) {
      filter.$and = and;
    }

    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "lastActiveAt",
        "lastLoginAt",
        "username",
        "email",
        "followersCount",
        "postsCount",
      ]);

    const sortBy =
      allowedSortFields.has(
        q?.sortBy,
      )
        ? q.sortBy
        : "createdAt";

    const sortDirection =
      q?.sortDirection === "asc"
        ? 1
        : -1;

    const [
      users,
      total,
    ] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          "-password -passwordHash",
        )
        .sort({
          [sortBy]:
            sortDirection,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      this.userModel.countDocuments(
        filter,
      ),
    ]);

    const items =
      users.map(normalizeUser);

    return {
      items,
      users: items,
      total,
      page,
      limit,
      skip,
      pages: Math.ceil(
        total / limit,
      ),
    };
  }

  async getById(
    id: string,
    actor: any,
  ) {
    this.requireAdmin(actor);

    const user =
      await this.userModel
        .findById(id)
        .select(
          "-password -passwordHash",
        )
        .lean()
        .exec();

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    return normalizeUser(user);
  }
}