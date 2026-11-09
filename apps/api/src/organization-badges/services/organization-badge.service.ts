/**
 * organization-badge.service.ts
 * -----------------------------------------------------------------------------
 * Generic Fockis Organization Badge service.
 *
 * Responsibilities:
 *
 *   - Automatically create a badge for active memberships.
 *   - Update an existing badge instead of creating duplicates.
 *   - Read department/group names from their real models.
 *   - Keep organization/member information synchronized.
 *   - Rebuild badges when needed.
 *   - Deactivate badges when memberships become inactive.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

/* ============================================================================
   BADGE
============================================================================ */

import {
  OrganizationBadge,
  OrganizationBadgeDocument,
} from '../schemas/organization-badge.schema';

/* ============================================================================
   ORGANIZATION
============================================================================ */

import {
  Organization,
  OrganizationDocument,
} from '../../org/organizations/schemas/organization.schema';

/* ============================================================================
   MEMBERSHIP
============================================================================ */

import {
  Membership,
  MembershipDocument,
} from '../../org/members/schemas/membership.schema';

/* ============================================================================
   DEPARTMENT
============================================================================ */

import {
  Department,
  DepartmentDocument,
} from '../../org/departments/schemas/department.schema';

/* ============================================================================
   GROUP
============================================================================ */

import {
  ChurchGroup,
  ChurchGroupDocument,
} from '../../org/groups/schemas/church-group.schema';

/* ============================================================================
   ENUM
============================================================================ */

import { MembershipStatus } from '../../org/enums/membership-status.enum';

import { randomBytes } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import { join, resolve } from 'path';

import {
  BADGE_DESIGN_DEFAULTS,
  BADGE_TEMPLATES,
  OrganizationBadgeDesign,
  OrganizationBadgeDesignDocument,
} from '../schemas/organization-badge-design.schema';

/** Roles and permissions that may manage badges (besides the owner). */
const BADGE_ADMIN_ROLES = new Set(['owner', 'administrator', 'admin', 'pastor', 'director']);
const BADGE_ADMIN_PERMISSIONS = ['manage_settings', 'update_organization', 'manage_members', 'add_member', 'update_member'];

/* ============================================================================
   BADGE PHOTOS
   Saved on this server like organization covers: uploads/organization-badge-photos.
   File names are random, so a photo can only be opened by someone who has its link.
============================================================================ */
export const BADGE_PHOTO_DIRECTORY = resolve(process.cwd(), 'uploads', 'organization-badge-photos');
export const BADGE_PHOTO_ROUTE = '/badges/photos';
export const MAX_BADGE_PHOTO_BYTES = 8 * 1024 * 1024;
const BADGE_PHOTO_NAME = /^[a-f0-9]{24}-[a-f0-9]{32}\.(jpg|png|webp|gif)$/;
export const BADGE_PHOTO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export interface UploadedBadgePhoto {
  buffer: Buffer;
  size: number;
  mimetype?: string;
}

/** Works out the picture type from the file's first bytes, not from its name. */
function badgePhotoExtension(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  return null;
}

function ownBadgePhotoName(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith(BADGE_PHOTO_ROUTE + '/')) return null;
  const name = url.slice(BADGE_PHOTO_ROUTE.length + 1);
  return BADGE_PHOTO_NAME.test(name) ? name : null;
}

@Injectable()
export class OrganizationBadgeService {
  constructor(
    @InjectModel(
      OrganizationBadge.name,
    )
    private readonly badgeModel:
      Model<OrganizationBadgeDocument>,

    @InjectModel(
      Organization.name,
    )
    private readonly organizationModel:
      Model<OrganizationDocument>,

    @InjectModel(
      Membership.name,
    )
    private readonly membershipModel:
      Model<MembershipDocument>,

    @InjectModel(
      Department.name,
    )
    private readonly departmentModel:
      Model<DepartmentDocument>,

    @InjectModel(
      ChurchGroup.name,
    )
    private readonly groupModel:
      Model<ChurchGroupDocument>,

    @InjectModel(
      OrganizationBadgeDesign.name,
    )
    private readonly designModel:
      Model<OrganizationBadgeDesignDocument>,
  ) {}

  /* ==========================================================================
     OBJECT ID
     ========================================================================== */

  private toObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (
      !value ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new BadRequestException(
        `${fieldName} is invalid.`,
      );
    }

    return new Types.ObjectId(value);
  }

  /* ==========================================================================
     MEMBER NUMBER
     ========================================================================== */

  private buildMemberNumber(
    membership: MembershipDocument,
    prefix = 'ORG',
  ): string {
    /**
     * We do not use a nonexistent membership.memberId field.
     *
     * The actual membership schema identifies the member through:
     *
     *   membership._id
     *
     * The final six characters give us a short human-readable identifier.
     */
    const suffix =
      String(membership._id)
        .slice(-6)
        .toUpperCase();

    return `${prefix}-${suffix}`;
  }

  /* ==========================================================================
     QR CODE
     ========================================================================== */

  private buildQrCodeValue(
    organizationId: string,
    membershipId: string,
  ): string {
    return [
      'fockis',
      'organization-badge',
      organizationId,
      membershipId,
    ].join(':');
  }

  /* ==========================================================================
     DEPARTMENT NAMES
     ========================================================================== */

  private async getDepartmentNames(
    membership: MembershipDocument,
  ): Promise<string[]> {
    if (
      !membership.departmentIds ||
      membership.departmentIds.length === 0
    ) {
      return [];
    }

    const departments =
      await this.departmentModel
        .find({
          _id: {
            $in:
              membership.departmentIds,
          },

          organizationId:
            membership.organizationId,

          isArchived: {
            $ne: true,
          },
        })
        .select({
          name: 1,
        })
        .lean()
        .exec();

    return departments
      .map(
        (
          department,
        ) => department.name,
      )
      .filter(
        (
          name,
        ): name is string =>
          Boolean(name),
      );
  }

  /* ==========================================================================
     GROUP NAMES
     ========================================================================== */

  private async getGroupNames(
    membership: MembershipDocument,
  ): Promise<string[]> {
    if (
      !membership.groupIds ||
      membership.groupIds.length === 0
    ) {
      return [];
    }

    const groups =
      await this.groupModel
        .find({
          _id: {
            $in:
              membership.groupIds,
          },

          organizationId:
            membership.organizationId,

          isArchived: {
            $ne: true,
          },
        })
        .select({
          name: 1,
        })
        .lean()
        .exec();

    return groups
      .map(
        (
          group,
        ) => group.name,
      )
      .filter(
        (
          name,
        ): name is string =>
          Boolean(name),
      );
  }

  /* ==========================================================================
     RESPONSE
     ========================================================================== */

  private toResponse(
    badge: OrganizationBadgeDocument,
  ) {
    return {
      id:
        String(badge._id),

      organizationId:
        String(
          badge.organizationId,
        ),

      membershipId:
        String(
          badge.membershipId,
        ),

      userId:
        String(
          badge.userId,
        ),

      memberNumber:
        badge.memberNumber,

      displayName:
        badge.displayName,

      avatarUrl:
        badge.avatarUrl ??
        null,

      organizationName:
        badge.organizationName,

      organizationLogoUrl:
        badge.organizationLogoUrl ??
        null,

      organizationType:
        badge.organizationType ??
        null,

      role:
        badge.role,

      status:
        badge.status,

      joinedAt:
        badge.joinedAt ??
        null,

      departmentNames:
        badge.departmentNames ??
        [],

      groupNames:
        badge.groupNames ??
        [],

      qrCodeValue:
        badge.qrCodeValue,

      verifyToken:
        badge.verifyToken ??
        null,

      memberDomain:
        badge.memberDomain ??
        null,

      active:
        badge.active,

      issuedAt:
        badge.issuedAt,

      createdAt:
        badge.createdAt,

      updatedAt:
        badge.updatedAt,
    };
  }

  /* ==========================================================================
     CREATE OR UPDATE
     ========================================================================== */

  async createOrUpdateForMembership(
    membershipId: string,
  ) {
    const membershipObjectId =
      this.toObjectId(
        membershipId,
        'membershipId',
      );

    const membership =
      await this.membershipModel
        .findById(
          membershipObjectId,
        )
        .exec();

    if (!membership) {
      throw new NotFoundException(
        'Membership not found.',
      );
    }

    /**
     * Only active members receive an active badge.
     */
    if (
      membership.status !==
      MembershipStatus.Active
    ) {
      throw new ForbiddenException(
        'An organization badge can only be issued to an active member.',
      );
    }

    const organization =
      await this.organizationModel
        .findById(
          membership.organizationId,
        )
        .exec();

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    const organizationId =
      String(
        organization._id,
      );

    const membershipIdValue =
      String(
        membership._id,
      );

    const displayName =
      membership.profile
        ?.displayName
        ?.trim() ||
      'Organization Member';

    const avatarUrl =
      membership.profile
        ?.avatarUrl ??
      null;

    const design =
      await this.designFor(
        organizationId,
      );

    const memberNumber =
      this.buildMemberNumber(
        membership,
        this.prefixFor(
          design.numberPrefix,
          organization.name,
        ),
      );

    const [
      departmentNames,
      groupNames,
    ] =
      await Promise.all([
        this.getDepartmentNames(
          membership,
        ),

        this.getGroupNames(
          membership,
        ),
      ]);

    const qrCodeValue =
      this.buildQrCodeValue(
        organizationId,
        membershipIdValue,
      );

    /**
     * IMPORTANT:
     *
     * findOneAndUpdate + upsert makes this operation idempotent.
     *
     * If the badge exists:
     *
     *   UPDATE
     *
     * If it doesn't:
     *
     *   CREATE
     */
    const badge =
      await this.badgeModel
        .findOneAndUpdate(
          {
            membershipId:
              membership._id,
          },

          {
            $set: {
              organizationId:
                organization._id,

              membershipId:
                membership._id,

              userId:
                membership.userId,

              memberNumber,

              displayName,

              avatarUrl,

              organizationName:
                organization.name,

              organizationLogoUrl:
                organization.logoUrl ??
                null,

              organizationType:
                organization.organizationType ??
                null,

              role:
                membership.role,

              status:
                membership.status,

              joinedAt:
                membership.joinedAt ??
                null,

              departmentNames,

              groupNames,

              qrCodeValue,

              memberDomain:
                (membership as any).domain ??
                null,

              active: true,
            },

            $setOnInsert: {
              issuedAt:
                new Date(),
            },
          },

          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();

    if (!badge) {
      throw new Error(
        'Unable to create organization badge.',
      );
    }

    // Badges made before QR links existed get their code now.
    if (!badge.verifyToken) {
      badge.verifyToken =
        this.newVerifyToken();

      await badge.save();
    }

    return this.toResponse(
      badge,
    );
  }

  /* ==========================================================================
     GET MY BADGE
     ========================================================================== */

  async getMyBadge(
    organizationId: string,
    userId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const userObjectId =
      this.toObjectId(
        userId,
        'userId',
      );

    const membership =
      await this.membershipModel
        .findOne({
          organizationId:
            organizationObjectId,

          userId:
            userObjectId,
        })
        .exec();

    if (!membership) {
      throw new NotFoundException(
        'Organization membership not found.',
      );
    }

    if (
      membership.status !==
      MembershipStatus.Active
    ) {
      throw new ForbiddenException(
        'You must be an active organization member to view your badge.',
      );
    }

    /**
     * If the badge does not exist for an old member,
     * automatically create it now.
     */
    return this.createOrUpdateForMembership(
      String(
        membership._id,
      ),
    );
  }

  /* ==========================================================================
     GET MEMBER BADGE
     ========================================================================== */

  async getMemberBadge(
    organizationId: string,
    membershipId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const membershipObjectId =
      this.toObjectId(
        membershipId,
        'membershipId',
      );

    const badge =
      await this.badgeModel
        .findOne({
          organizationId:
            organizationObjectId,

          membershipId:
            membershipObjectId,
        })
        .exec();

    if (!badge) {
      return null;
    }

    return this.toResponse(
      badge,
    );
  }

  /* ==========================================================================
     REBUILD
     ========================================================================== */

  async rebuildBadge(
    membershipId: string,
  ) {
    return this.createOrUpdateForMembership(
      membershipId,
    );
  }

  /* ==========================================================================
     DEACTIVATE
     ========================================================================== */

  async deactivateForMembership(
    membershipId: string,
  ) {
    const membershipObjectId =
      this.toObjectId(
        membershipId,
        'membershipId',
      );

    const badge =
      await this.badgeModel
        .findOneAndUpdate(
          {
            membershipId:
              membershipObjectId,
          },

          {
            $set: {
              active: false,
            },
          },

          {
            new: true,
          },
        )
        .exec();

    return badge
      ? this.toResponse(badge)
      : null;
  }

  /* ==========================================================================
     DELETE ORGANIZATION BADGES
     ========================================================================== */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    await this.badgeModel
      .deleteMany({
        organizationId:
          organizationObjectId,
      })
      .exec();
  }

  /* ==========================================================================
     TEMPLATES, PERMISSIONS, LISTS AND PUBLIC CHECK
     ========================================================================== */

  private newVerifyToken(): string {
    return randomBytes(18).toString('base64url');
  }

  /** Initials of the organization name ("Grace Community Church" → "GCC"). */
  private prefixFor(prefix: string | undefined, organizationName: string): string {
    const clean = String(prefix ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (clean) return clean;
    const initials = String(organizationName ?? '')
      .split(/\s+/)
      .filter((w) => /^[A-Za-z0-9]/.test(w))
      .map((w) => w[0].toUpperCase())
      .join('')
      .slice(0, 4);
    return initials || 'ORG';
  }

  async designFor(organizationId: string) {
    const doc = await this.designModel
      .findOne({ organizationId: this.toObjectId(organizationId, 'organizationId') })
      .lean<OrganizationBadgeDesign>()
      .exec();
    return {
      ...BADGE_DESIGN_DEFAULTS,
      numberPrefix: '',
      ...(doc ?? {}),
    };
  }

  /** Owner, an administrator role, or a member/settings-management permission. */
  async isBadgeAdmin(organizationId: string, userId: string): Promise<boolean> {
    const orgId = this.toObjectId(organizationId, 'organizationId');
    const organization = await this.organizationModel.findById(orgId).select('createdByUserId').lean<any>().exec();
    if (!organization) throw new NotFoundException('Organization not found.');
    if (organization.createdByUserId && String(organization.createdByUserId) === String(userId)) return true;
    if (!Types.ObjectId.isValid(userId)) return false;
    const membership = await this.membershipModel
      .findOne({ organizationId: orgId, userId: new Types.ObjectId(userId) })
      .select('status role permissions')
      .lean<any>()
      .exec();
    if (!membership || membership.status !== MembershipStatus.Active) return false;
    if (BADGE_ADMIN_ROLES.has(String(membership.role).toLowerCase())) return true;
    const perms: string[] = Array.isArray(membership.permissions) ? membership.permissions : [];
    return BADGE_ADMIN_PERMISSIONS.some((p) => perms.includes(p));
  }

  async requireBadgeAdmin(organizationId: string, userId: string): Promise<void> {
    if (!(await this.isBadgeAdmin(organizationId, userId))) {
      throw new ForbiddenException('Only the owner or an admin can manage member badges.');
    }
  }

  /** A member can see their own badge; admins can see everyone's. */
  async getMemberBadgeFor(organizationId: string, membershipId: string, actorUserId: string) {
    const membership = await this.membershipModel
      .findOne({
        _id: this.toObjectId(membershipId, 'membershipId'),
        organizationId: this.toObjectId(organizationId, 'organizationId'),
      })
      .select('userId status')
      .lean<any>()
      .exec();
    if (!membership) throw new NotFoundException('Member not found.');
    if (String(membership.userId) !== String(actorUserId)) {
      await this.requireBadgeAdmin(organizationId, actorUserId);
    }
    if (membership.status !== MembershipStatus.Active) return null;
    return this.createOrUpdateForMembership(membershipId);
  }

  async rebuildBadgeFor(organizationId: string, membershipId: string, actorUserId: string) {
    await this.requireBadgeAdmin(organizationId, actorUserId);
    const membership = await this.membershipModel
      .findOne({
        _id: this.toObjectId(membershipId, 'membershipId'),
        organizationId: this.toObjectId(organizationId, 'organizationId'),
      })
      .select('_id')
      .lean()
      .exec();
    if (!membership) throw new NotFoundException('Member not found.');
    return this.createOrUpdateForMembership(membershipId);
  }

  async getDesign(organizationId: string, actorUserId: string) {
    const design = await this.designFor(organizationId);
    const organization = await this.organizationModel
      .findById(this.toObjectId(organizationId, 'organizationId'))
      .select('name')
      .lean<any>()
      .exec();
    return {
      template: design.template,
      accentColor: design.accentColor,
      badgeTitle: design.badgeTitle,
      numberPrefix: design.numberPrefix ?? '',
      effectivePrefix: this.prefixFor(design.numberPrefix, organization?.name ?? ''),
      showRole: design.showRole,
      showMemberSince: design.showMemberSince,
      showDepartments: design.showDepartments,
      showGroups: design.showGroups,
      showMemberDomain: design.showMemberDomain,
      footerText: design.footerText ?? '',
      templates: BADGE_TEMPLATES,
      canEdit: await this.isBadgeAdmin(organizationId, actorUserId),
    };
  }

  async saveDesign(organizationId: string, actorUserId: string, body: Record<string, unknown>) {
    await this.requireBadgeAdmin(organizationId, actorUserId);
    const orgId = this.toObjectId(organizationId, 'organizationId');
    const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
    const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

    const update: Record<string, unknown> = {
      updatedByUserId: Types.ObjectId.isValid(actorUserId) ? new Types.ObjectId(actorUserId) : null,
    };
    if (body.template !== undefined) {
      if (!(BADGE_TEMPLATES as readonly string[]).includes(String(body.template))) {
        throw new BadRequestException('Unknown badge template.');
      }
      update.template = body.template;
    }
    const color = text(body.accentColor, 7);
    if (color !== undefined) {
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new BadRequestException('Pick a colour like #005a8d.');
      update.accentColor = color.toLowerCase();
    }
    const title = text(body.badgeTitle, 30);
    if (title !== undefined) update.badgeTitle = title || BADGE_DESIGN_DEFAULTS.badgeTitle;
    const prefix = text(body.numberPrefix, 12);
    if (prefix !== undefined) update.numberPrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const footer = text(body.footerText, 80);
    if (footer !== undefined) update.footerText = footer;
    for (const key of ['showRole', 'showMemberSince', 'showDepartments', 'showGroups', 'showMemberDomain']) {
      const b = bool(body[key]);
      if (b !== undefined) update[key] = b;
    }

    await this.designModel
      .updateOne({ organizationId: orgId }, { $set: update, $setOnInsert: { organizationId: orgId } }, { upsert: true })
      .exec();

    // A new prefix renumbers every badge: <PREFIX>-<last 6 characters of the membership id>.
    if (update.numberPrefix !== undefined) {
      const organization = await this.organizationModel.findById(orgId).select('name').lean<any>().exec();
      const effective = this.prefixFor(update.numberPrefix as string, organization?.name ?? '');
      await this.badgeModel
        .updateMany({ organizationId: orgId }, [
          {
            $set: {
              memberNumber: {
                $concat: [effective, '-', { $toUpper: { $substrCP: [{ $toString: '$membershipId' }, 18, 6] } }],
              },
            },
          },
        ])
        .exec();
    }

    return this.getDesign(organizationId, actorUserId);
  }

  /** Admin list for printing: every active member's badge (made on the fly if missing). */
  async listBadges(organizationId: string, actorUserId: string, query: { q?: string; page?: number; pageSize?: number }) {
    await this.requireBadgeAdmin(organizationId, actorUserId);
    const orgId = this.toObjectId(organizationId, 'organizationId');
    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(query.pageSize) || 24)));
    const filter: Record<string, unknown> = { organizationId: orgId, status: MembershipStatus.Active };
    const q = String(query.q ?? '').trim().slice(0, 60);
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ 'profile.displayName': re }, { domain: re }];
    }
    const [total, memberships] = await Promise.all([
      this.membershipModel.countDocuments(filter),
      this.membershipModel
        .find(filter)
        .sort({ 'profile.displayName': 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select('_id')
        .lean()
        .exec(),
    ]);
    const items: Awaited<ReturnType<OrganizationBadgeService['createOrUpdateForMembership']>>[] = [];
    for (const m of memberships) items.push(await this.createOrUpdateForMembership(String(m._id)));
    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }

  /** Make or refresh badges for every active member (members who joined before badges existed). */
  async issueAll(organizationId: string, actorUserId: string) {
    await this.requireBadgeAdmin(organizationId, actorUserId);
    const memberships = await this.membershipModel
      .find({ organizationId: this.toObjectId(organizationId, 'organizationId'), status: MembershipStatus.Active })
      .select('_id')
      .limit(5000)
      .lean()
      .exec();
    let issued = 0;
    for (const m of memberships) {
      try {
        await this.createOrUpdateForMembership(String(m._id));
        issued++;
      } catch {
        /* skip one bad membership, keep going */
      }
    }
    return { issued, total: memberships.length };
  }

  /**
   * Public: what someone sees after scanning a badge — only what is printed
   * on the badge, plus whether it is still valid.
   */
  async verify(token: string) {
    const clean = String(token ?? '').trim();
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(clean)) throw new NotFoundException('This badge was not found.');
    const badge = await this.badgeModel.findOne({ verifyToken: clean }).exec();
    if (!badge) throw new NotFoundException('This badge was not found.');
    const membership = await this.membershipModel.findById(badge.membershipId).select('status').lean<any>().exec();
    const valid = Boolean(badge.active && membership && membership.status === MembershipStatus.Active);
    return {
      valid,
      displayName: badge.displayName,
      avatarUrl: badge.avatarUrl ?? null,
      memberNumber: badge.memberNumber,
      role: badge.role,
      organizationId: String(badge.organizationId),
      organizationName: badge.organizationName,
      organizationLogoUrl: badge.organizationLogoUrl ?? null,
      organizationType: badge.organizationType ?? null,
      memberSince: badge.joinedAt ?? null,
      issuedAt: badge.issuedAt,
      checkedAt: new Date(),
    };
  }

  /* ==========================================================================
     BADGE PHOTO — the member themself or a badge admin
  ========================================================================== */

  private async photoMembership(organizationId: string, membershipId: string, actorUserId: string) {
    const membership = await this.membershipModel
      .findOne({
        _id: this.toObjectId(membershipId, 'membershipId'),
        organizationId: this.toObjectId(organizationId, 'organizationId'),
      })
      .select('userId status profile')
      .lean<any>()
      .exec();
    if (!membership) throw new NotFoundException('Member not found.');
    if (String(membership.userId) !== String(actorUserId)) {
      await this.requireBadgeAdmin(organizationId, actorUserId);
    }
    return membership;
  }

  private async removeOwnPhotoFile(url: unknown): Promise<void> {
    const name = ownBadgePhotoName(url);
    if (!name) return;
    await fs.unlink(join(BADGE_PHOTO_DIRECTORY, name)).catch(() => undefined);
  }

  private async badgeAfterPhotoChange(membershipId: string, status: unknown) {
    if (status !== MembershipStatus.Active) return null;
    return this.createOrUpdateForMembership(membershipId);
  }

  async uploadPhoto(organizationId: string, membershipId: string, actorUserId: string, file: UploadedBadgePhoto | undefined) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a photo to upload.');
    if (file.size > MAX_BADGE_PHOTO_BYTES) throw new BadRequestException('The photo is too large. The limit is 8 MB.');
    const extension = badgePhotoExtension(file.buffer);
    if (!extension) throw new BadRequestException('Use a JPG, PNG, WebP or GIF picture.');

    const membership = await this.photoMembership(organizationId, membershipId, actorUserId);

    await fs.mkdir(BADGE_PHOTO_DIRECTORY, { recursive: true });
    const filename = `${String(membership._id)}-${randomBytes(16).toString('hex')}.${extension}`;
    await fs.writeFile(join(BADGE_PHOTO_DIRECTORY, filename), file.buffer);
    const url = `${BADGE_PHOTO_ROUTE}/${filename}`;

    await this.membershipModel.updateOne({ _id: membership._id }, { $set: { 'profile.avatarUrl': url } }).exec();
    await this.removeOwnPhotoFile(membership.profile?.avatarUrl);

    const badge = await this.badgeAfterPhotoChange(membershipId, membership.status);
    return { avatarUrl: url, badge };
  }

  async removePhoto(organizationId: string, membershipId: string, actorUserId: string) {
    const membership = await this.photoMembership(organizationId, membershipId, actorUserId);
    await this.membershipModel.updateOne({ _id: membership._id }, { $set: { 'profile.avatarUrl': null } }).exec();
    await this.removeOwnPhotoFile(membership.profile?.avatarUrl);
    const badge = await this.badgeAfterPhotoChange(membershipId, membership.status);
    return { avatarUrl: null, badge };
  }

  /** Path of a saved badge photo, or null when the name is not one of ours. */
  badgePhotoPath(filename: string): { path: string; mimeType: string } | null {
    if (!BADGE_PHOTO_NAME.test(filename)) return null;
    const path = join(BADGE_PHOTO_DIRECTORY, filename);
    if (!existsSync(path)) return null;
    const extension = filename.slice(filename.lastIndexOf('.') + 1);
    return { path, mimeType: BADGE_PHOTO_MIME[extension] };
  }
}
