import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  AdminRole,
  AdminRoleDocument,
} from "./admin-role.schema";

import {
  Model,
  Types,
} from "mongoose";

import { CreateAdminRoleDto } from "./dto/create-admin-role.dto";
import { UpdateAdminRoleDto } from "./dto/update-admin-role.dto";

import {
  ADMIN_PERMISSION_CATALOG,
} from "../rbac/permission-catalog";

import { AuditService } from "../audit/audit.service";

@Injectable()
export class AdminRoleService {
  constructor(
    @InjectModel(AdminRole.name)
    private readonly roleModel: Model<AdminRoleDocument>,

    private readonly audit: AuditService,
  ) {}

  /**
   * These are permanent system roles.
   *
   * A Super Admin may create CUSTOM roles,
   * but may never create a custom role that
   * attempts to become one of these roles.
   */
  private readonly PROTECTED_SYSTEM_ROLE_SLUGS =
    new Set([
      "user",
      "moderator",
      "admin",
      "super-admin",
      "super_admin",
      "superadmin",
    ]);

  /**
   * These permissions are reserved for the
   * protected Super Admin boundary.
   *
   * A custom role must never receive these
   * through the custom-role API.
   */
  private readonly PROTECTED_PERMISSIONS =
    new Set([
      "delete:db",
      "system:cleanup",
    ]);

  /**
   * Normalize a role slug.
   */
  private normalizeSlug(value: string): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
  }

  /**
   * Normalize role names for comparison.
   */
  private normalizeRoleName(value: string): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  /**
   * Verify that the authenticated actor is
   * actually a Super Admin.
   *
   * This is defense-in-depth.
   *
   * The controller already uses SuperAdminGuard,
   * but the service must not assume that every
   * caller has passed through that controller.
   */
  private assertSuperAdmin(actor: any): void {
    if (!actor) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    const normalizedRole =
      this.normalizeRoleName(actor.role);

    const isSuperAdmin =
      actor.isSuperAdmin === true ||
      normalizedRole === "super_admin";

    if (!isSuperAdmin) {
      throw new ForbiddenException(
        "Only a super admin can manage administrator roles.",
      );
    }
  }

  /**
   * Validate custom-role name and slug.
   *
   * Custom roles cannot impersonate the four
   * protected system roles.
   */
  private validateCustomRoleIdentity(
    name: string,
    slug: string,
  ): void {
    const normalizedName =
      this.normalizeRoleName(name);

    const normalizedSlug =
      this.normalizeSlug(slug);

    if (
      this.PROTECTED_SYSTEM_ROLE_SLUGS.has(
        normalizedSlug,
      )
    ) {
      throw new ForbiddenException(
        "Protected system roles cannot be created as custom roles.",
      );
    }

    if (
      normalizedName === "user" ||
      normalizedName === "moderator" ||
      normalizedName === "admin" ||
      normalizedName === "super_admin" ||
      normalizedName === "superadmin"
    ) {
      throw new ForbiddenException(
        "A custom role cannot use a protected system role name.",
      );
    }
  }

  /**
   * Validate and normalize permissions.
   *
   * Permissions must exist in the existing
   * Fockis administrator permission catalog.
   */
  private validatePermissions(
    permissions: string[],
  ): string[] {
    if (!Array.isArray(permissions)) {
      throw new BadRequestException(
        "Permissions must be an array.",
      );
    }

    const allowed = new Set(
      ADMIN_PERMISSION_CATALOG.map(
        (permission) => permission.key,
      ),
    );

    const normalized = permissions
      .map((permission) =>
        String(permission ?? "").trim(),
      )
      .filter(Boolean);

    const uniquePermissions = [
      ...new Set(normalized),
    ];

    const invalid =
      uniquePermissions.filter(
        (permission) =>
          !allowed.has(permission),
      );

    if (invalid.length > 0) {
      throw new BadRequestException({
        message:
          "Invalid administrator permissions.",
        invalidPermissions: invalid,
      });
    }

    const protectedPermissions =
      uniquePermissions.filter((permission) =>
        this.PROTECTED_PERMISSIONS.has(
          permission,
        ),
      );

    if (protectedPermissions.length > 0) {
      throw new ForbiddenException({
        message:
          "One or more requested permissions are reserved for Super Admin operations.",
        protectedPermissions,
      });
    }

    return uniquePermissions;
  }

  /**
   * List all administrator roles.
   */
  async list() {
    return this.roleModel
      .find()
      .sort({
        isSystemRole: -1,
        name: 1,
      })
      .lean()
      .exec();
  }

  /**
   * Return the existing Fockis permission catalog.
   */
  async getPermissions() {
    return ADMIN_PERMISSION_CATALOG;
  }

  /**
   * Get a role by MongoDB ID.
   */
  async getById(id: string) {
    this.assertObjectId(id);

    const role =
      await this.roleModel
        .findById(id)
        .lean()
        .exec();

    if (!role) {
      throw new NotFoundException(
        "Administrator role not found.",
      );
    }

    return role;
  }

  /**
   * Create a CUSTOM administrator role.
   *
   * IMPORTANT:
   * - Only Super Admin can reach this method.
   * - isSystemRole is ALWAYS false.
   * - Protected system roles cannot be impersonated.
   * - Protected permissions cannot be assigned.
   */
  async create(
    dto: CreateAdminRoleDto,
    actor: any,
    req: any,
  ) {
    this.assertSuperAdmin(actor);

    const name =
      String(dto.name ?? "").trim();

    if (!name) {
      throw new BadRequestException(
        "Administrator role name is required.",
      );
    }

    const requestedSlug =
      dto.slug || name;

    const slug =
      this.normalizeSlug(requestedSlug);

    if (!slug) {
      throw new BadRequestException(
        "A valid role slug is required.",
      );
    }

    this.validateCustomRoleIdentity(
      name,
      slug,
    );

    const permissions =
      this.validatePermissions(
        dto.permissions ?? [],
      );

    const existing =
      await this.roleModel.findOne({
        slug,
      });

    if (existing) {
      throw new BadRequestException(
        "An administrator role with this slug already exists.",
      );
    }

    const actorObjectId =
      this.actorId(actor);

    const role =
      await this.roleModel.create({
        name,
        slug,
        description:
          dto.description?.trim() ?? "",
        permissions,

        isActive:
          dto.isActive ?? true,

        /**
         * NEVER accept this value from the
         * frontend. Custom roles are always
         * non-system roles.
         */
        isSystemRole: false,

        createdBy:
          actorObjectId,

        updatedBy:
          actorObjectId,
      });

    await this.audit.log({
      userId:
        String(actorObjectId),

      action:
        "ADMIN_ROLE_CREATED",

      module:
        "admin-rbac",

      targetId:
        String(role._id),

      ip:
        req?.ip,

      userAgent:
        req?.headers?.["user-agent"],
    });

    return role;
  }

  /**
   * Update a CUSTOM administrator role.
   */
  async update(
    id: string,
    dto: UpdateAdminRoleDto,
    actor: any,
    req: any,
  ) {
    this.assertSuperAdmin(actor);

    this.assertObjectId(id);

    const role =
      await this.roleModel.findById(id);

    if (!role) {
      throw new NotFoundException(
        "Administrator role not found.",
      );
    }

    /**
     * System roles are permanently protected.
     */
    if (role.isSystemRole) {
      throw new ForbiddenException(
        "System administrator roles cannot be modified here.",
      );
    }

    const nextName =
      dto.name !== undefined
        ? String(dto.name).trim()
        : role.name;

    if (!nextName) {
      throw new BadRequestException(
        "Administrator role name cannot be empty.",
      );
    }

    const nextSlug =
      dto.slug !== undefined
        ? this.normalizeSlug(dto.slug)
        : role.slug;

    if (!nextSlug) {
      throw new BadRequestException(
        "A valid role slug is required.",
      );
    }

    /**
     * A custom role can never be renamed into
     * a protected system role.
     */
    this.validateCustomRoleIdentity(
      nextName,
      nextSlug,
    );

    if (dto.name !== undefined) {
      role.name = nextName;
    }

    if (dto.slug !== undefined) {
      const duplicate =
        await this.roleModel.findOne({
          slug: nextSlug,
          _id: {
            $ne: role._id,
          },
        });

      if (duplicate) {
        throw new BadRequestException(
          "An administrator role with this slug already exists.",
        );
      }

      role.slug = nextSlug;
    }

    if (
      dto.description !== undefined
    ) {
      role.description =
        dto.description.trim();
    }

    if (
      dto.permissions !== undefined
    ) {
      role.permissions =
        this.validatePermissions(
          dto.permissions,
        );
    }

    if (
      dto.isActive !== undefined
    ) {
      role.isActive =
        dto.isActive;
    }

    const actorObjectId =
      this.actorId(actor);

    role.updatedBy =
      actorObjectId;

    await role.save();

    await this.audit.log({
      userId:
        String(actorObjectId),

      action:
        "ADMIN_ROLE_UPDATED",

      module:
        "admin-rbac",

      targetId:
        String(role._id),

      ip:
        req?.ip,

      userAgent:
        req?.headers?.["user-agent"],
    });

    return role;
  }

  /**
   * Delete a CUSTOM administrator role.
   */
  async remove(
    id: string,
    actor: any,
    req: any,
  ) {
    this.assertSuperAdmin(actor);

    this.assertObjectId(id);

    const role =
      await this.roleModel.findById(id);

    if (!role) {
      throw new NotFoundException(
        "Administrator role not found.",
      );
    }

    /**
     * System roles can never be deleted.
     */
    if (role.isSystemRole) {
      throw new ForbiddenException(
        "System administrator roles cannot be deleted.",
      );
    }

    await role.deleteOne();

    const actorObjectId =
      this.actorId(actor);

    await this.audit.log({
      userId:
        String(actorObjectId),

      action:
        "ADMIN_ROLE_DELETED",

      module:
        "admin-rbac",

      targetId:
        id,

      ip:
        req?.ip,

      userAgent:
        req?.headers?.["user-agent"],
    });

    return {
      success: true,
      id,
    };
  }

  /**
   * Validate a MongoDB ObjectId.
   */
  private assertObjectId(
    id: string,
  ): void {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new BadRequestException(
        "Invalid administrator role ID.",
      );
    }
  }

  /**
   * Resolve the authenticated administrator's
   * MongoDB ObjectId.
   */
  private actorId(
    actor: any,
  ): Types.ObjectId {
    const value =
      actor?.id ??
      actor?._id ??
      actor?.userId ??
      "";

    if (!value) {
      throw new BadRequestException(
        "Authenticated administrator ID is required.",
      );
    }

    if (
      value instanceof Types.ObjectId
    ) {
      return value;
    }

    if (
      !Types.ObjectId.isValid(
        String(value),
      )
    ) {
      throw new BadRequestException(
        "Authenticated administrator ID is invalid.",
      );
    }

    return new Types.ObjectId(
      String(value),
    );
  }
}