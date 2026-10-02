import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, UserDocument } from '../../../users/user.schema';
import {
  AdminRole,
  AdminRoleDocument,
} from '../../roles/admin-role.schema';

import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';

const SYSTEM_ROLES = new Set([
  'user',
  'moderator',
  'admin',
  'super_admin',
]);

@Injectable()
export class UserRoleService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(AdminRole.name)
    private readonly adminRoleModel: Model<AdminRoleDocument>,

    private readonly audit: AuditService,
  ) {}

  /**
   * Update a user's system role or custom admin role.
   *
   * System roles:
   *   user
   *   moderator
   *   admin
   *   super_admin
   *
   * Custom roles:
   *   Real Estate Agent
   *   Career Recruiter
   *   Marketplace Moderator
   *   etc.
   */
  async update(
    id: string,
    body: any,
    actor: any,
    req: any,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID.');
    }

    if (!actor) {
      throw new UnauthorizedException('Authentication required.');
    }

    const targetUser = await this.userModel
      .findById(id)
      .select('_id role adminRoleId')
      .exec();

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    const requestedRole = String(body?.role ?? '')
      .trim()
      .toLowerCase();

    const customRoleId = String(body?.adminRoleId ?? '').trim();

    /*
     * ------------------------------------------------------------
     * CUSTOM ROLE
     * ------------------------------------------------------------
     *
     * If adminRoleId is supplied, use the AdminRole collection.
     */
    if (customRoleId) {
      if (!Types.ObjectId.isValid(customRoleId)) {
        throw new BadRequestException('Invalid custom role ID.');
      }

      const adminRole = await this.adminRoleModel
        .findById(customRoleId)
        .lean()
        .exec();

      if (!adminRole) {
        throw new NotFoundException('Custom role not found.');
      }

      if (adminRole.isSystemRole) {
        throw new ForbiddenException(
          'System roles cannot be assigned as custom roles.',
        );
      }

      if (!adminRole.isActive) {
        throw new ForbiddenException(
          'This custom role is inactive and cannot be assigned.',
        );
      }

      /*
       * Only Super Admin can assign custom roles.
       */
      await this.assertSuperAdmin(actor);

      const update: Record<string, unknown> = {};

      setIfPresent(
        this.userModel,
        update,
        'adminRoleId',
        new Types.ObjectId(customRoleId),
      );

      /*
       * A user receiving a custom role remains a normal system user
       * unless they separately have one of the permanent system roles.
       */
      if (
        !SYSTEM_ROLES.has(String(targetUser.role ?? '').toLowerCase())
      ) {
        update.role = 'user';
      }

      const user = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .select('-password -passwordHash')
        .lean()
        .exec();

      if (!user) {
        throw new NotFoundException('User not found.');
      }

      await this.audit.log({
        userId: String(actor?._id ?? actor?.id),
        action: 'USER_CUSTOM_ROLE_ASSIGNED',
        module: 'users',
        targetId: id,
        metadata: {
          roleId: String(adminRole._id),
          roleName: adminRole.name,
          roleSlug: adminRole.slug,
          previousRoleId: targetUser.adminRoleId
            ? String(targetUser.adminRoleId)
            : null,
          reason: body?.reason ?? null,
        },
        ip: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      return normalizeUser(user);
    }

    /*
     * ------------------------------------------------------------
     * SYSTEM ROLE
     * ------------------------------------------------------------
     */
    if (!SYSTEM_ROLES.has(requestedRole)) {
      throw new ForbiddenException(
        'Invalid system role. Use a valid custom role ID for custom roles.',
      );
    }

    /*
     * Only Super Admin can create/promote someone to Super Admin.
     */
    if (requestedRole === 'super_admin') {
      await this.assertSuperAdmin(actor);
    }

    /*
     * Assigning administrator-level system roles should also require
     * Super Admin authority.
     */
    if (
      requestedRole === 'admin' &&
      !this.isSuperAdmin(actor)
    ) {
      throw new ForbiddenException(
        'Super admin privileges are required to assign the admin role.',
      );
    }

    /*
     * Moderator can be assigned by an Admin or Super Admin.
     */
    if (
      requestedRole === 'moderator' &&
      !this.isAdminOrSuperAdmin(actor)
    ) {
      throw new ForbiddenException(
        'Administrator privileges are required to assign the moderator role.',
      );
    }

    const update: Record<string, unknown> = {};

    setIfPresent(
      this.userModel,
      update,
      'role',
      requestedRole,
    );

    /*
     * A system role assignment removes any custom role assignment.
     *
     * This prevents a user from accidentally carrying an unrelated
     * custom administrative role at the same time.
     */
    update.adminRoleId = null;

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select('-password -passwordHash')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.audit.log({
      userId: String(actor?._id ?? actor?.id),
      action: 'USER_ROLE_UPDATED',
      module: 'users',
      targetId: id,
      metadata: {
        role: requestedRole,
        previousRole: targetUser.role,
        previousCustomRoleId: targetUser.adminRoleId
          ? String(targetUser.adminRoleId)
          : null,
        reason: body?.reason ?? null,
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return normalizeUser(user);
  }

  /**
   * Determine whether the actor is a Super Admin.
   *
   * This is intentionally strict. The final JWT strategy should
   * populate isSuperAdmin from the database user record.
   */
  private isSuperAdmin(actor: any): boolean {
    if (actor?.isSuperAdmin === true) {
      return true;
    }

    return (
      String(actor?.role ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_') === 'super_admin'
    );
  }

  private isAdminOrSuperAdmin(actor: any): boolean {
    const role = String(actor?.role ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    return (
      role === 'admin' ||
      role === 'super_admin' ||
      actor?.isSuperAdmin === true
    );
  }

  private async assertSuperAdmin(actor: any): Promise<void> {
    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException(
        'Super admin privileges are required.',
      );
    }
  }
}