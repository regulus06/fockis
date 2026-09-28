import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  AdminRole,
  AdminRoleDocument,
} from './admin-role.schema';

import {
  Model,
  Types,
} from 'mongoose';

import { CreateAdminRoleDto } from './dto/create-admin-role.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';

import {
  ADMIN_PERMISSION_CATALOG,
} from '../rbac/permission-catalog';

import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminRoleService {
  constructor(
    @InjectModel(AdminRole.name)
    private readonly roleModel: Model<AdminRoleDocument>,

    private readonly audit: AuditService,
  ) {}

  private normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private validatePermissions(
    permissions: string[],
  ): string[] {
    const allowed = new Set(
      ADMIN_PERMISSION_CATALOG.map(
        (permission) => permission.key,
      ),
    );

    const invalid = permissions.filter(
      (permission) => !allowed.has(permission),
    );

    if (invalid.length > 0) {
      throw new BadRequestException({
        message: 'Invalid administrator permissions.',
        invalidPermissions: invalid,
      });
    }

    return [...new Set(permissions)];
  }

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

  async getPermissions() {
    return ADMIN_PERMISSION_CATALOG;
  }

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid administrator role ID.',
      );
    }

    const role = await this.roleModel
      .findById(id)
      .lean()
      .exec();

    if (!role) {
      throw new NotFoundException(
        'Administrator role not found.',
      );
    }

    return role;
  }

  async create(
    dto: CreateAdminRoleDto,
    actor: any,
    req: any,
  ) {
    const slug = this.normalizeSlug(
      dto.slug || dto.name,
    );

    if (!slug) {
      throw new BadRequestException(
        'A valid role slug is required.',
      );
    }

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
        'An administrator role with this slug already exists.',
      );
    }

    const actorObjectId =
      this.actorId(actor);

    const role = await this.roleModel.create({
      name: dto.name.trim(),
      slug,
      description:
        dto.description?.trim() ?? '',
      permissions,
      isActive:
        dto.isActive ?? true,
      isSystemRole: false,
      createdBy: actorObjectId,
      updatedBy: actorObjectId,
    });

    await this.audit.log({
      userId: String(actorObjectId),
      action: 'ADMIN_ROLE_CREATED',
      module: 'admin-rbac',
      targetId: String(role._id),
      ip: req?.ip,
      userAgent:
        req?.headers?.['user-agent'],
    });

    return role;
  }

  async update(
    id: string,
    dto: UpdateAdminRoleDto,
    actor: any,
    req: any,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid administrator role ID.',
      );
    }

    const role =
      await this.roleModel.findById(id);

    if (!role) {
      throw new NotFoundException(
        'Administrator role not found.',
      );
    }

    if (role.isSystemRole) {
      throw new BadRequestException(
        'System administrator roles cannot be modified here.',
      );
    }

    if (dto.name !== undefined) {
      role.name = dto.name.trim();
    }

    if (dto.slug !== undefined) {
      const normalizedSlug =
        this.normalizeSlug(dto.slug);

      if (!normalizedSlug) {
        throw new BadRequestException(
          'A valid role slug is required.',
        );
      }

      const duplicate =
        await this.roleModel.findOne({
          slug: normalizedSlug,
          _id: {
            $ne: role._id,
          },
        });

      if (duplicate) {
        throw new BadRequestException(
          'An administrator role with this slug already exists.',
        );
      }

      role.slug = normalizedSlug;
    }

    if (dto.description !== undefined) {
      role.description =
        dto.description.trim();
    }

    if (dto.permissions !== undefined) {
      role.permissions =
        this.validatePermissions(
          dto.permissions,
        );
    }

    if (dto.isActive !== undefined) {
      role.isActive = dto.isActive;
    }

    const actorObjectId =
      this.actorId(actor);

    role.updatedBy =
      actorObjectId;

    await role.save();

    await this.audit.log({
      userId: String(actorObjectId),
      action: 'ADMIN_ROLE_UPDATED',
      module: 'admin-rbac',
      targetId: String(role._id),
      ip: req?.ip,
      userAgent:
        req?.headers?.['user-agent'],
    });

    return role;
  }

  async remove(
    id: string,
    actor: any,
    req: any,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid administrator role ID.',
      );
    }

    const role =
      await this.roleModel.findById(id);

    if (!role) {
      throw new NotFoundException(
        'Administrator role not found.',
      );
    }

    if (role.isSystemRole) {
      throw new BadRequestException(
        'System administrator roles cannot be deleted.',
      );
    }

    await role.deleteOne();

    const actorObjectId =
      this.actorId(actor);

    await this.audit.log({
      userId: String(actorObjectId),
      action: 'ADMIN_ROLE_DELETED',
      module: 'admin-rbac',
      targetId: id,
      ip: req?.ip,
      userAgent:
        req?.headers?.['user-agent'],
    });

    return {
      success: true,
      id,
    };
  }

  /**
   * Resolve the authenticated administrator's
   * MongoDB ObjectId.
   *
   * AdminRole.createdBy and AdminRole.updatedBy
   * are stored as ObjectId values.
   */
  private actorId(actor: any): Types.ObjectId {
    const value =
      actor?.id ??
      actor?._id ??
      actor?.userId ??
      '';

    if (!value) {
      throw new BadRequestException(
        'Authenticated administrator ID is required.',
      );
    }

    if (value instanceof Types.ObjectId) {
      return value;
    }

    if (!Types.ObjectId.isValid(String(value))) {
      throw new BadRequestException(
        'Authenticated administrator ID is invalid.',
      );
    }

    return new Types.ObjectId(
      String(value),
    );
  }
}