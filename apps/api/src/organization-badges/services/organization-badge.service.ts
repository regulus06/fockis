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

import { createHash, createHmac, randomBytes } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import { join, resolve } from 'path';

import {
  BADGE_DESIGN_DEFAULTS,
  BADGE_TEMPLATES,
  OrganizationBadgeDesign,
  OrganizationBadgeDesignDocument,
} from '../schemas/organization-badge-design.schema';

import {
  OrganizationBadgeVerification,
  OrganizationBadgeVerificationDocument,
} from '../schemas/organization-badge-verification.schema';

import { Branch } from '../../org/branches/schemas/branch.schema';

/** Roles and permissions that may manage badges (besides the owner). */
const BADGE_ADMIN_ROLES = new Set(['owner', 'administrator', 'pastor_director', 'admin', 'pastor', 'director']);
/** Suspend, revoke, reactivate and new QR codes: the owner and administrator roles only. */
const BADGE_STATUS_ROLES = new Set(['administrator', 'pastor_director']);

export type BadgeVerifyState = 'verified' | 'pending' | 'suspended' | 'membership_inactive' | 'revoked' | 'expired' | 'not_member';

export const BADGE_PHOTO_SHAPES = ['circle', 'rounded', 'square', 'rectangle', 'oval', 'custom'] as const;

const VERIFY_TONE: Record<BadgeVerifyState, 'green' | 'yellow' | 'red'> = {
  verified: 'green',
  pending: 'yellow',
  suspended: 'yellow',
  membership_inactive: 'yellow',
  revoked: 'red',
  expired: 'red',
  not_member: 'red',
};

/** "Chrome on Windows" — enough to recognise a device in the scan log. */
function deviceLabel(ua?: string | null): string {
  const s = String(ua || '');
  if (!s) return '';
  const browser = /Edg\//.test(s) ? 'Edge' : /SamsungBrowser/.test(s) ? 'Samsung Internet' : /Firefox\/|FxiOS/.test(s) ? 'Firefox' : /Chrome\/|CriOS/.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Browser';
  const os = /Windows/.test(s) ? 'Windows' : /iPhone|iPad|iPod/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /Mac OS X/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'device';
  return `${browser} on ${os}`;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
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

    @InjectModel(OrganizationBadgeVerification.name)
    private readonly verificationModel: Model<OrganizationBadgeVerificationDocument>,

    @InjectModel(Branch.name)
    private readonly branchModel: Model<any>,
  ) {}

  /* ==========================================================================
     QR TOKENS
     The token in the QR link is HMAC(secret, badgeId + nonce). Only its
     SHA-256 hash is stored, so the database alone cannot produce QR links.
     ========================================================================== */

  private tokenSecret(): string {
    const secret = (process.env.BADGE_TOKEN_SECRET || process.env.JWT_SECRET || '').trim();
    if (secret.length < 16) throw new Error('BADGE_TOKEN_SECRET (or JWT_SECRET) must be set.');
    return secret;
  }

  private deriveToken(badgeId: string, nonce: string): string {
    return createHmac('sha256', this.tokenSecret()).update(`fockis-badge:${badgeId}:${nonce}`).digest('base64url').slice(0, 32);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private currentToken(badge: OrganizationBadgeDocument): string | null {
    return badge.tokenNonce ? this.deriveToken(String(badge._id), badge.tokenNonce) : null;
  }

  /** New QR token: the old QR code stops working (it then reads "not found"). */
  private assignNewToken(badge: OrganizationBadgeDocument): void {
    const nonce = randomBytes(16).toString('hex');
    badge.tokenNonce = nonce;
    badge.verifyTokenHash = this.hashToken(this.deriveToken(String(badge._id), nonce));
    badge.tokenIssuedAt = new Date();
  }

  private async mainLocation(organizationId: Types.ObjectId): Promise<string | null> {
    const branches = await this.branchModel
      .find({ organizationId })
      .select('isMainLocation address')
      .sort({ isMainLocation: -1, createdAt: 1 })
      .limit(1)
      .lean<any[]>()
      .exec();
    const a = branches[0]?.address;
    if (!a) return null;
    const parts = [a.city, a.country].map((x: unknown) => String(x ?? '').trim()).filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }

  private verifyState(badge: OrganizationBadgeDocument, membershipStatus: string | null): BadgeVerifyState {
    if (badge.badgeStatus === 'revoked') return 'revoked';
    if (badge.expiresAt && new Date(badge.expiresAt).getTime() < Date.now()) return 'expired';
    if (!membershipStatus || membershipStatus === MembershipStatus.Archived) return 'not_member';
    if (badge.badgeStatus === 'suspended') return 'suspended';
    if (membershipStatus === MembershipStatus.Pending) return 'pending';
    if (membershipStatus !== MembershipStatus.Active || !badge.active) return 'membership_inactive';
    return 'verified';
  }

  private effectiveMinistry(badge: OrganizationBadgeDocument): string | null {
    if (badge.ministryName === '') return null;
    return badge.ministryName || badge.departmentNames?.[0] || null;
  }

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
        badge.customName || badge.displayName,

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
        this.currentToken(badge),

      memberName:
        badge.displayName,

      customName:
        badge.customName ?? null,

      customTitle:
        badge.customTitle ?? null,

      ministryName:
        badge.ministryName ?? null,

      ministry:
        this.effectiveMinistry(badge),

      organizationLocation:
        badge.organizationLocation ?? null,

      organizationBannerUrl:
        badge.organizationBannerUrl ?? null,

      badgeStatus:
        badge.badgeStatus ?? 'active',

      statusReason:
        badge.statusReason ?? null,

      statusChangedAt:
        badge.statusChangedAt ?? null,

      expiresAt:
        badge.expiresAt ?? null,

      verifyState:
        this.verifyState(badge, badge.status ?? null),

      tokenIssuedAt:
        badge.tokenIssuedAt ?? null,

      photo:
        badge.photo
          ? {
              originalUrl: badge.photo.originalUrl ?? null,
              shape: badge.photo.shape ?? 'circle',
              cornerRadius: badge.photo.cornerRadius ?? 24,
              x: badge.photo.x ?? 0,
              y: badge.photo.y ?? 0,
              zoom: badge.photo.zoom ?? 1,
              rotation: badge.photo.rotation ?? 0,
              aspect: badge.photo.aspect ?? 1,
              fit: badge.photo.fit ?? 'fill',
              cropX: badge.photo.cropX ?? 0,
              cropY: badge.photo.cropY ?? 0,
              cropWidth: badge.photo.cropWidth ?? 0,
              cropHeight: badge.photo.cropHeight ?? 0,
              outputWidth: badge.photo.outputWidth ?? 0,
              outputHeight: badge.photo.outputHeight ?? 0,
            }
          : null,

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

    const organizationLocation =
      await this.mainLocation(
        organization._id as Types.ObjectId,
      );

    const organizationBannerUrl =
      (organization as any).bannerMediaType === 'video'
        ? null
        : organization.bannerUrl ?? null;

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

              organizationLocation,

              organizationBannerUrl,

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

    // Hashed QR token. Older badges keep their first (plain) token working
    // until a manager makes a new QR code.
    let changed = false;
    if (!badge.tokenNonce || !badge.verifyTokenHash) {
      this.assignNewToken(badge);
      changed = true;
    }
    if (!badge.history || badge.history.length === 0) {
      badge.history = [{ at: badge.issuedAt ?? new Date(), action: 'issued', note: '', actorUserId: null, actorName: 'Fockis' }];
      changed = true;
    }
    if (changed) await badge.save();

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
    const badge = await this.createOrUpdateForMembership(membershipId);
    return { ...badge, access: await this.accessFor(organizationId, actorUserId, badge.userId) };
  }

  async rebuildBadgeFor(organizationId: string, membershipId: string, actorUserId: string) {
    await this.requireBadgeAdmin(organizationId, actorUserId);
    const existing = await this.badgeModel.findOne({ membershipId: this.toObjectId(membershipId, 'membershipId') }).select('_id').lean().exec();
    const membership = await this.membershipModel
      .findOne({
        _id: this.toObjectId(membershipId, 'membershipId'),
        organizationId: this.toObjectId(organizationId, 'organizationId'),
      })
      .select('_id')
      .lean()
      .exec();
    if (!membership) throw new NotFoundException('Member not found.');
    const badge = await this.createOrUpdateForMembership(membershipId);
    const doc = await this.badgeModel.findById(badge.id).exec();
    if (doc) {
      this.pushHistory(doc, existing ? 'refreshed' : 'issued_manually', '', actorUserId, await this.actorName(organizationId, actorUserId));
      await doc.save();
    }
    return badge;
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
      allowMemberPhotoEdit: design.allowMemberPhotoEdit !== false,
      showPhotoOnVerify: design.showPhotoOnVerify !== false,
      showMinistryOnVerify: design.showMinistryOnVerify !== false,
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
    for (const key of ['showRole', 'showMemberSince', 'showDepartments', 'showGroups', 'showMemberDomain', 'allowMemberPhotoEdit', 'showPhotoOnVerify', 'showMinistryOnVerify']) {
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
   * Public: what someone sees after scanning a badge. Only what is printed on
   * the badge (and allowed by the church's settings), plus whether it is valid
   * right now. Never contact details, addresses or notes.
   */
  async verify(token: string, userAgent?: string) {
    const clean = String(token ?? '').trim();
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(clean)) throw new NotFoundException('This badge was not found.');
    const badge =
      (await this.badgeModel.findOne({ verifyTokenHash: this.hashToken(clean) }).exec()) ??
      // Badges printed before hashed tokens: still valid until a new QR code is made.
      (await this.badgeModel.findOne({ verifyToken: clean }).exec());
    if (!badge) throw new NotFoundException('This badge was not found.');

    const [membership, design] = await Promise.all([
      this.membershipModel.findById(badge.membershipId).select('status').lean<any>().exec(),
      this.designFor(String(badge.organizationId)),
    ]);
    const state = this.verifyState(badge, membership?.status ?? null);

    await this.verificationModel
      .create({ badgeId: badge._id, organizationId: badge.organizationId, result: state, device: deviceLabel(userAgent) })
      .catch(() => undefined);

    const number = String(badge.memberNumber ?? '');
    const dash = number.indexOf('-');
    const maskedNumber = number.length > 4 ? `${dash > 0 ? number.slice(0, dash + 1) : ''}••${number.slice(-4)}` : number;

    return {
      valid: state === 'verified',
      state,
      tone: VERIFY_TONE[state],
      displayName: badge.customName || badge.displayName,
      avatarUrl: design.showPhotoOnVerify !== false ? (badge.avatarUrl ?? null) : null,
      photoShape: badge.photo?.shape ?? 'circle',
      memberNumber: maskedNumber,
      role: badge.role,
      title: badge.customTitle ?? null,
      membershipType: design.badgeTitle || 'Member',
      ministry: design.showMinistryOnVerify !== false ? this.effectiveMinistry(badge) : null,
      organizationId: String(badge.organizationId),
      organizationName: badge.organizationName,
      organizationLogoUrl: badge.organizationLogoUrl ?? null,
      organizationType: badge.organizationType ?? null,
      organizationLocation: badge.organizationLocation ?? null,
      memberSince: badge.joinedAt ?? null,
      issuedAt: badge.issuedAt,
      expiresAt: badge.expiresAt ?? null,
      checkedAt: new Date(),
    };
  }

  /* ==========================================================================
     ACCESS FLAGS sent with a badge
  ========================================================================== */

  async canManageStatus(organizationId: string, userId: string): Promise<boolean> {
    const orgId = this.toObjectId(organizationId, 'organizationId');
    const organization = await this.organizationModel.findById(orgId).select('createdByUserId').lean<any>().exec();
    if (!organization) throw new NotFoundException('Organization not found.');
    if (organization.createdByUserId && String(organization.createdByUserId) === String(userId)) return true;
    if (!Types.ObjectId.isValid(userId)) return false;
    const m = await this.membershipModel
      .findOne({ organizationId: orgId, userId: new Types.ObjectId(userId) })
      .select('status role')
      .lean<any>()
      .exec();
    return Boolean(m && m.status === MembershipStatus.Active && BADGE_STATUS_ROLES.has(String(m.role).toLowerCase()));
  }

  private async isOwner(organizationId: string, userId: string): Promise<boolean> {
    const organization = await this.organizationModel
      .findById(this.toObjectId(organizationId, 'organizationId'))
      .select('createdByUserId')
      .lean<any>()
      .exec();
    return Boolean(organization?.createdByUserId && String(organization.createdByUserId) === String(userId));
  }

  async accessFor(organizationId: string, actorUserId: string, badgeUserId: string) {
    const [admin, manager, design] = await Promise.all([
      this.isBadgeAdmin(organizationId, actorUserId),
      this.canManageStatus(organizationId, actorUserId),
      this.designFor(organizationId),
    ]);
    const isSelf = String(badgeUserId) === String(actorUserId);
    return {
      isSelf,
      canEdit: admin,
      canEditPhoto: admin || (isSelf && design.allowMemberPhotoEdit !== false),
      canManageStatus: manager,
    };
  }

  /** My badge plus what I may change on it. */
  async getMyBadgeWithAccess(organizationId: string, userId: string) {
    const badge = await this.getMyBadge(organizationId, userId);
    return { ...badge, access: await this.accessFor(organizationId, userId, badge.userId) };
  }

  /* ==========================================================================
     BADGE MANAGEMENT (admins)
  ========================================================================== */

  private async actorName(organizationId: string, userId: string): Promise<string> {
    if (!Types.ObjectId.isValid(userId)) return '';
    const m = await this.membershipModel
      .findOne({ organizationId: this.toObjectId(organizationId, 'organizationId'), userId: new Types.ObjectId(userId) })
      .select('profile.displayName')
      .lean<any>()
      .exec();
    if (m?.profile?.displayName) return String(m.profile.displayName);
    return (await this.isOwner(organizationId, userId)) ? 'Organization owner' : 'Administrator';
  }

  /** The badge document of a member of this organization (created if the member is active). */
  private async badgeDoc(organizationId: string, membershipId: string): Promise<OrganizationBadgeDocument> {
    const membership = await this.membershipModel
      .findOne({
        _id: this.toObjectId(membershipId, 'membershipId'),
        organizationId: this.toObjectId(organizationId, 'organizationId'),
      })
      .select('status')
      .lean<any>()
      .exec();
    if (!membership) throw new NotFoundException('Member not found.');
    if (membership.status === MembershipStatus.Active) await this.createOrUpdateForMembership(membershipId);
    const badge = await this.badgeModel.findOne({ membershipId: this.toObjectId(membershipId, 'membershipId') }).exec();
    if (!badge) throw new NotFoundException('This member has no badge yet. Badges are issued to active members.');
    return badge;
  }

  private pushHistory(badge: OrganizationBadgeDocument, action: string, note: string, actorUserId: string, actorName: string) {
    badge.history = [
      ...(badge.history ?? []),
      { at: new Date(), action, note: note.slice(0, 300), actorUserId: Types.ObjectId.isValid(actorUserId) ? new Types.ObjectId(actorUserId) : null, actorName },
    ].slice(-200);
  }

  async getManage(organizationId: string, membershipId: string, actorUserId: string) {
    await this.requireBadgeAdmin(organizationId, actorUserId);
    const badge = await this.badgeDoc(organizationId, membershipId);
    const verifications = await this.verificationModel
      .find({ badgeId: badge._id })
      .sort({ at: -1 })
      .limit(50)
      .lean<any[]>()
      .exec();
    return {
      badge: { ...this.toResponse(badge), access: await this.accessFor(organizationId, actorUserId, String(badge.userId)) },
      history: [...(badge.history ?? [])]
        .reverse()
        .map((h) => ({ at: h.at, action: h.action, note: h.note ?? '', actorName: h.actorName ?? '' })),
      verifications: verifications.map((v) => ({ id: String(v._id), at: v.at, result: v.result, device: v.device ?? '' })),
      ministryOptions: badge.departmentNames ?? [],
    };
  }

  async updateDetails(organizationId: string, membershipId: string, actorUserId: string, body: Record<string, unknown>) {
    await this.requireBadgeAdmin(organizationId, actorUserId);
    const badge = await this.badgeDoc(organizationId, membershipId);
    const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : undefined);
    const changed: string[] = [];

    if (body.customName !== undefined) {
      const v = body.customName === null ? null : text(body.customName, 80) || null;
      if (v !== (badge.customName ?? null)) changed.push('name');
      badge.customName = v;
    }
    if (body.customTitle !== undefined) {
      const v = body.customTitle === null ? null : text(body.customTitle, 60) || null;
      if (v !== (badge.customTitle ?? null)) changed.push('title');
      badge.customTitle = v;
    }
    if (body.ministryName !== undefined) {
      // null = the member's first ministry, "" = no ministry, text = that ministry.
      const v = body.ministryName === null ? null : (text(body.ministryName, 80) ?? null);
      if (v !== (badge.ministryName ?? null)) changed.push('ministry');
      badge.ministryName = v;
    }
    if (body.expiresAt !== undefined) {
      if (body.expiresAt !== null && !(typeof body.expiresAt === 'string' && DATE_ONLY.test(body.expiresAt))) {
        throw new BadRequestException('Expiry date must look like 2027-12-31.');
      }
      const v = body.expiresAt ? new Date(`${body.expiresAt}T23:59:59.999Z`) : null;
      if (String(v?.getTime() ?? '') !== String(badge.expiresAt ? new Date(badge.expiresAt).getTime() : '')) changed.push('expiry date');
      badge.expiresAt = v;
    }
    if (!changed.length) return { ...this.toResponse(badge), access: await this.accessFor(organizationId, actorUserId, String(badge.userId)) };

    this.pushHistory(badge, 'details_updated', `Changed ${changed.join(', ')}`, actorUserId, await this.actorName(organizationId, actorUserId));
    await badge.save();
    return { ...this.toResponse(badge), access: await this.accessFor(organizationId, actorUserId, String(badge.userId)) };
  }

  async setStatus(organizationId: string, membershipId: string, actorUserId: string, action: unknown, reason: unknown) {
    if (!(await this.canManageStatus(organizationId, actorUserId))) {
      throw new ForbiddenException('Only the owner or an administrator can suspend, revoke or reactivate badges.');
    }
    const badge = await this.badgeDoc(organizationId, membershipId);
    const note = typeof reason === 'string' ? reason.trim().slice(0, 300) : '';
    const name = await this.actorName(organizationId, actorUserId);

    if (action === 'suspend' || action === 'revoke') {
      if (note.length < 3) throw new BadRequestException('Give a short reason.');
      if (action === 'suspend' && badge.badgeStatus === 'revoked') throw new BadRequestException('This badge is revoked. Reactivate it first.');
      badge.badgeStatus = action === 'suspend' ? 'suspended' : 'revoked';
      badge.statusReason = note;
      badge.statusChangedAt = new Date();
      if (action === 'revoke') badge.revokedAt = new Date();
      this.pushHistory(badge, action === 'suspend' ? 'suspended' : 'revoked', note, actorUserId, name);
    } else if (action === 'reactivate') {
      if (badge.badgeStatus === 'active') throw new BadRequestException('This badge is already active.');
      if (badge.badgeStatus === 'revoked' && !(await this.isOwner(organizationId, actorUserId))) {
        throw new ForbiddenException('Only the organization owner can reactivate a revoked badge.');
      }
      badge.badgeStatus = 'active';
      badge.statusReason = null;
      badge.statusChangedAt = new Date();
      badge.revokedAt = null;
      this.pushHistory(badge, 'reactivated', note, actorUserId, name);
    } else {
      throw new BadRequestException('Unknown action.');
    }
    await badge.save();
    return { ...this.toResponse(badge), access: await this.accessFor(organizationId, actorUserId, String(badge.userId)) };
  }

  async regenerateToken(organizationId: string, membershipId: string, actorUserId: string) {
    if (!(await this.canManageStatus(organizationId, actorUserId))) {
      throw new ForbiddenException('Only the owner or an administrator can make a new QR code.');
    }
    const badge = await this.badgeDoc(organizationId, membershipId);
    this.assignNewToken(badge);
    badge.verifyToken = undefined; // the old printed QR code stops working
    this.pushHistory(badge, 'qr_regenerated', 'Old QR code no longer works', actorUserId, await this.actorName(organizationId, actorUserId));
    await badge.save();
    return { ...this.toResponse(badge), access: await this.accessFor(organizationId, actorUserId, String(badge.userId)) };
  }

  /* ==========================================================================
     BADGE PHOTO — the member themself (if the church allows it) or a badge admin
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
    } else if (!(await this.isBadgeAdmin(organizationId, actorUserId))) {
      const design = await this.designFor(organizationId);
      if (design.allowMemberPhotoEdit === false) {
        throw new ForbiddenException('Your church manages badge photos. Ask an administrator to change yours.');
      }
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

  private async savePhotoFile(membershipId: string, file: UploadedBadgePhoto, allowGif: boolean): Promise<string> {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a photo to upload.');
    if (file.size > MAX_BADGE_PHOTO_BYTES) throw new BadRequestException('The photo is too large. The limit is 8 MB.');
    const extension = badgePhotoExtension(file.buffer);
    if (!extension || (!allowGif && extension === 'gif')) throw new BadRequestException('Use a JPG, PNG or WebP picture.');
    await fs.mkdir(BADGE_PHOTO_DIRECTORY, { recursive: true });
    const filename = `${membershipId}-${randomBytes(16).toString('hex')}.${extension}`;
    await fs.writeFile(join(BADGE_PHOTO_DIRECTORY, filename), file.buffer);
    return `${BADGE_PHOTO_ROUTE}/${filename}`;
  }

  private parsePhotoSettings(raw: unknown) {
    if (raw === undefined || raw === null || raw === '') return null;
    let v: any;
    try {
      v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      throw new BadRequestException('Photo settings are not valid.');
    }
    const num = (x: unknown, min: number, max: number, d: number) => {
      const n = Number(x);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
    };
    const shape = (BADGE_PHOTO_SHAPES as readonly string[]).includes(String(v?.shape)) ? String(v.shape) : 'circle';
    return {
      shape,
      cornerRadius: num(v?.cornerRadius, 0, 50, 24),
      x: num(v?.x, -10000, 10000, 0),
      y: num(v?.y, -10000, 10000, 0),
      zoom: num(v?.zoom, 1, 5, 1),
      rotation: num(v?.rotation, -360, 360, 0),
      aspect: num(v?.aspect, 0.5, 2, 1),
      fit: v?.fit === 'fit' ? 'fit' : 'fill',
      cropX: num(v?.cropX, 0, 100000, 0),
      cropY: num(v?.cropY, 0, 100000, 0),
      cropWidth: num(v?.cropWidth, 0, 100000, 0),
      cropHeight: num(v?.cropHeight, 0, 100000, 0),
      outputWidth: num(v?.outputWidth, 0, 4000, 0),
      outputHeight: num(v?.outputHeight, 0, 4000, 0),
    };
  }

  /**
   * file      the edited picture shown on the badge (required)
   * original  the untouched upload, kept so it can be cropped again (optional:
   *           left out when re-cropping the photo already on file)
   * settings  JSON crop settings from the photo editor (optional)
   */
  async uploadPhoto(
    organizationId: string,
    membershipId: string,
    actorUserId: string,
    file: UploadedBadgePhoto | undefined,
    original?: UploadedBadgePhoto,
    settingsRaw?: unknown,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a photo to upload.');
    const settings = this.parsePhotoSettings(settingsRaw);
    const membership = await this.photoMembership(organizationId, membershipId, actorUserId);
    const id = String(membership._id);
    const badgeBefore = await this.badgeModel.findOne({ membershipId: membership._id }).exec();
    const previousOriginal = badgeBefore?.photo?.originalUrl ?? null;
    const previousEdited = membership.profile?.avatarUrl ?? null;

    const url = await this.savePhotoFile(id, file, !settings);
    let originalUrl: string | null = previousOriginal;
    if (original?.buffer?.length) originalUrl = await this.savePhotoFile(id, original, false);
    else if (!settings) originalUrl = url; // simple upload: the picture is its own original

    await this.membershipModel.updateOne({ _id: membership._id }, { $set: { 'profile.avatarUrl': url } }).exec();

    // Old files nobody points to any more.
    const keep = new Set([url, originalUrl].filter(Boolean));
    for (const old of [previousEdited, previousOriginal]) if (old && !keep.has(old)) await this.removeOwnPhotoFile(old);

    const response = await this.badgeAfterPhotoChange(membershipId, membership.status);
    const badge = await this.badgeModel.findOne({ membershipId: membership._id }).exec();
    if (badge) {
      badge.photo = {
        originalUrl,
        ...(settings ?? { shape: badge.photo?.shape ?? 'circle', cornerRadius: badge.photo?.cornerRadius ?? 24, x: 0, y: 0, zoom: 1, rotation: 0, aspect: 1, fit: 'fill', cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0, outputWidth: 0, outputHeight: 0 }),
        updatedAt: new Date(),
      };
      this.pushHistory(badge, 'photo_updated', settings ? `Shape: ${settings.shape}` : '', actorUserId, await this.actorName(organizationId, actorUserId));
      await badge.save();
      return { avatarUrl: url, badge: { ...this.toResponse(badge), access: await this.accessFor(organizationId, actorUserId, String(badge.userId)) } };
    }
    return { avatarUrl: url, badge: response };
  }

  async removePhoto(organizationId: string, membershipId: string, actorUserId: string) {
    const membership = await this.photoMembership(organizationId, membershipId, actorUserId);
    const badgeBefore = await this.badgeModel.findOne({ membershipId: membership._id }).exec();
    await this.membershipModel.updateOne({ _id: membership._id }, { $set: { 'profile.avatarUrl': null } }).exec();
    await this.removeOwnPhotoFile(membership.profile?.avatarUrl);
    if (badgeBefore?.photo?.originalUrl && badgeBefore.photo.originalUrl !== membership.profile?.avatarUrl) {
      await this.removeOwnPhotoFile(badgeBefore.photo.originalUrl);
    }
    await this.badgeAfterPhotoChange(membershipId, membership.status);
    const badge = await this.badgeModel.findOne({ membershipId: membership._id }).exec();
    if (badge) {
      badge.photo = null;
      this.pushHistory(badge, 'photo_removed', '', actorUserId, await this.actorName(organizationId, actorUserId));
      await badge.save();
      return { avatarUrl: null, badge: { ...this.toResponse(badge), access: await this.accessFor(organizationId, actorUserId, String(badge.userId)) } };
    }
    return { avatarUrl: null, badge: null };
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
