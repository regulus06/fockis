/**
 * organizations.service.ts
 * -----------------------------------------------------------------------------
 * FOCKIS CHURCH — ORGANIZATION SERVICE
 *
 * Production-grade organization business logic and authorization.
 *
 * SECURITY MODEL
 * -----------------------------------------------------------------------------
 *
 * Organization.createdByUserId is the ONLY permanent ownership source.
 *
 * Membership is NOT ownership.
 *
 * OWNER
 * -----
 * - Full organization authority.
 * - Owner membership is automatically repaired.
 * - ACTIVE + ADMINISTRATOR.
 * - Cannot leave.
 * - Cannot be removed.
 * - Cannot be demoted.
 * - Cannot have ownership changed through normal update APIs.
 *
 * NON-OWNER
 * ---------
 * - Must have an ACTIVE membership.
 * - Must possess the exact ChurchPermission required by the operation.
 *
 * IMPORTANT
 * ---------
 * Frontend permissions are never trusted.
 *
 * Backend feature services must independently call MembersService permission
 * enforcement.
 *
 * FOCKIS ORGANIZATION DOMAIN
 * --------------------------
 *
 * Every newly created organization MUST have a permanent Fockis domain.
 *
 * Supported domains:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 *   springfieldchurch.fockis.net
 *   springfieldchurch.fockis.edu
 *   springfieldchurch.fockis.church
 *   springfieldchurch.fockis.co
 *   springfieldchurch.fockis.io
 *
 * Invalid:
 *
 *   fockis.com
 *   springfieldchurch.com
 *   springfieldchurch.org
 *   springfieldchurch.example.com
 *   unsupported.fockis.xyz
 *
 * The complete normalized domain is stored on the Organization document.
 *
 * The domain is treated as a Fockis logical namespace. This service does NOT
 * claim to register public DNS records.
 *
 * MEMBER DOMAIN EXAMPLE
 * ---------------------
 *
 * An organization:
 *
 *   springfieldchurch.fockis.com
 *
 * may later have member identities such as:
 *
 *   john.springfieldchurch.fockis.com
 *
 * Member domains are NOT stored on the Organization document.
 *
 * ORGANIZATION COVER MEDIA
 * ------------------------
 * Covers may be:
 *
 *   1. Uploaded image
 *   2. Uploaded video
 *   3. External image URL
 *   4. External video URL
 *
 * Uploaded media is stored on the application server.
 * MongoDB stores only the URL/path and metadata.
 *
 * The physical uploaded file is automatically removed when:
 *
 *   - The cover is replaced
 *   - The cover is deleted
 *   - The organization is deleted
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  existsSync,
  promises as fs,
  createReadStream,
} from 'fs';

import {
  extname,
  basename,
  dirname,
  join,
  resolve,
} from 'path';

import {
  Organization,
  OrganizationDocument,
  FOCKIS_ORGANIZATION_DOMAIN_SUFFIXES,
  type OrganizationBannerMediaSource,
  type OrganizationBannerMediaType,
} from '../schemas/organization.schema';

import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

import { OrganizationStatus } from '../../enums/organization-status.enum';
import { OrganizationType } from '../../enums/organization-type.enum';
import { MembershipStatus } from '../../enums/membership-status.enum';

import { ChurchPermission } from '../../enums/permission.enum';

import { LeadershipService } from '../../leadership/services/leadership.service';
import { BranchesService } from '../../branches/services/branches.service';

import {
  MembersService,
  type AuthUser,
} from '../../members/services/members.service';

import {
  Department,
  DepartmentDocument,
} from '../../departments/schemas/department.schema';

import {
  ChurchGroup,
  ChurchGroupDocument,
} from '../../groups/schemas/church-group.schema';

import {
  ChurchEvent,
  ChurchEventDocument,
} from '../../events/schemas/church-event.schema';

import { DepartmentsService } from '../../departments/services/departments.service';
import { ChurchGroupsService } from '../../groups/services/church-groups.service';
import { ChurchEventsService } from '../../events/services/church-events.service';

import { ChurchLiveService } from '../../live/services/church-live.service';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { ChurchCommunicationService } from '../../communication/services/church-communication.service';
import { ChurchMediaService } from '../../media/services/church-media.service';

/* ============================================================================
   QUERY
============================================================================ */

export interface ListOrganizationsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  organizationType?: OrganizationType;
  mine?: boolean;
}

/* ============================================================================
   COVER MEDIA TYPES
============================================================================ */

export type OrganizationCoverMediaType =
  OrganizationBannerMediaType;

export type OrganizationCoverMediaSource =
  OrganizationBannerMediaSource;

/* ============================================================================
   INTERNAL TYPES
============================================================================ */

type OrganizationFilter = {
  status?: {
    $ne: OrganizationStatus;
  };

  organizationType?: OrganizationType;

  $text?: {
    $search: string;
  };

  _id?: {
    $in: Types.ObjectId[];
  };
};

type UploadedOrganizationCoverFile = {
  fieldname?: string;
  originalname?: string;
  encoding?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
};

/* ============================================================================
   SLUG
============================================================================ */

function slugify(
  name: string,
): string {
  const slug =
    name
      .toLowerCase()
      .trim()
      .replace(
        /[^a-z0-9]+/g,
        '-',
      )
      .replace(
        /(^-|-$)/g,
        '',
      );

  return (
    slug ||
    `organization-${Date.now()}`
  );
}

/* ============================================================================
   FOCKIS DOMAIN
============================================================================ */

/**
 * Normalizes a user-supplied organization domain.
 *
 * Examples:
 *
 *   SpringfieldChurch.fockis.com
 *     -> springfieldchurch.fockis.com
 *
 *   https://springfieldchurch.fockis.com/
 *     -> springfieldchurch.fockis.com
 *
 *   www.springfieldchurch.fockis.com
 *     -> springfieldchurch.fockis.com
 */
function normalizeOrganizationDomain(
  value: unknown,
): string {
  let domain =
    String(
      value ?? '',
    )
      .trim()
      .toLowerCase();

  if (!domain) {
    return '';
  }

  domain =
    domain
      .replace(
        /^https?:\/\//i,
        '',
      )
      .replace(
        /^www\./i,
        '');

  domain =
    domain.split('/')[0];

  domain =
    domain.split('?')[0];

  domain =
    domain.split('#')[0];

  domain =
    domain.replace(
      /\.$/,
      '',
    );

  return domain;
}

/**
 * Returns true when the complete domain ends in one of the supported
 * Fockis organization suffixes.
 */
function isFockisOrganizationDomain(
  domain: string,
): boolean {
  const normalized =
    normalizeOrganizationDomain(
      domain,
    );

  if (!normalized) {
    return false;
  }

  return FOCKIS_ORGANIZATION_DOMAIN_SUFFIXES.some(
    (suffix) =>
      normalized.endsWith(
        suffix,
      ),
  );
}

/**
 * Extracts the organization prefix from a complete Fockis domain.
 *
 * Example:
 *
 *   springfieldchurch.fockis.com
 *
 * becomes:
 *
 *   springfieldchurch
 */
function getFockisDomainPrefix(
  domain: string,
): string {
  const normalized =
    normalizeOrganizationDomain(
      domain,
    );

  const suffix =
    FOCKIS_ORGANIZATION_DOMAIN_SUFFIXES.find(
      (item) =>
        normalized.endsWith(
          item,
        ),
    );

  if (!suffix) {
    return '';
  }

  return normalized.slice(
    0,
    normalized.length -
      suffix.length,
  );
}

/**
 * Validates a complete Fockis organization domain.
 *
 * Rules:
 *
 *   - Required
 *   - Lowercase after normalization
 *   - Prefix must exist
 *   - Prefix 2–63 characters
 *   - Prefix may contain a-z, 0-9, hyphen
 *   - Prefix cannot start with hyphen
 *   - Prefix cannot end with hyphen
 *   - Suffix must be one of the seven supported Fockis namespaces
 *
 * This intentionally validates the organization namespace only.
 *
 * It does NOT perform public DNS registration.
 */
function validateFockisOrganizationDomain(
  value: unknown,
): string {
  const domain =
    normalizeOrganizationDomain(
      value,
    );

  if (!domain) {
    throw new BadRequestException(
      'Fockis organization domain is required.',
    );
  }

  if (
    !isFockisOrganizationDomain(
      domain,
    )
  ) {
    throw new BadRequestException(
      'Organization domain must use a supported Fockis domain such as springfieldchurch.fockis.com.',
    );
  }

  const prefix =
    getFockisDomainPrefix(
      domain,
    );

  if (!prefix) {
    throw new BadRequestException(
      'A Fockis organization domain must include an organization prefix.',
    );
  }

  if (
    prefix.length < 2 ||
    prefix.length > 63
  ) {
    throw new BadRequestException(
      'Fockis organization domain prefix must be between 2 and 63 characters.',
    );
  }

  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      prefix,
    )
  ) {
    throw new BadRequestException(
      'Fockis organization domain prefix may contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.',
    );
  }

  /**
   * Protect against accidental nested namespace forms.
   *
   * Valid:
   *
   *   springfieldchurch.fockis.com
   *
   * Invalid:
   *
   *   john.springfieldchurch.fockis.com
   *
   * for the organization root domain.
   */
  if (
    prefix.includes('.')
  ) {
    throw new BadRequestException(
      'Organization domain prefix cannot contain additional dots.',
    );
  }

  /**
   * Explicitly reject a root Fockis namespace.
   *
   * Normally the prefix validation above already catches this because
   * `fockis.com` does not contain a prefix before `.fockis.com`.
   */
  if (
    domain === 'fockis.com' ||
    domain === 'fockis.org' ||
    domain === 'fockis.net' ||
    domain === 'fockis.edu' ||
    domain === 'fockis.church' ||
    domain === 'fockis.co' ||
    domain === 'fockis.io'
  ) {
    throw new BadRequestException(
      'The Fockis root domain cannot be used as an organization domain.',
    );
  }

  return domain;
}

/* ============================================================================
   ROLE HELPERS
============================================================================ */

function normalizedRole(
  role: unknown,
): string {
  return String(
    role ?? '',
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      '_',
    );
}

function isAdministratorRole(
  role: unknown,
): boolean {
  const value =
    normalizedRole(
      role,
    );

  return (
    value ===
      'administrator' ||
    value === 'admin'
  );
}

function isPastorDirectorRole(
  role: unknown,
): boolean {
  const value =
    normalizedRole(
      role,
    );

  return (
    value ===
      'pastor_director' ||
    value ===
      'pastordirector'
  );
}

function isManagementRole(
  role: unknown,
): boolean {
  return (
    isAdministratorRole(
      role,
    ) ||
    isPastorDirectorRole(
      role,
    )
  );
}

/* ============================================================================
   COVER MEDIA HELPERS
============================================================================ */

const ORGANIZATION_COVER_DIRECTORY =
  resolve(
    process.cwd(),
    'uploads',
    'church-organization-covers',
  );

const ORGANIZATION_COVER_ROUTE_PREFIX =
  '/church/organizations';

const MAX_COVER_FILE_SIZE =
  100 * 1024 * 1024;

const IMAGE_EXTENSIONS =
  new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.avif',
    '.bmp',
    '.svg',
  ]);

const VIDEO_EXTENSIONS =
  new Set([
    '.mp4',
    '.webm',
    '.mov',
    '.m4v',
    '.avi',
    '.mkv',
    '.ogv',
  ]);

function normalizeMediaType(
  value: unknown,
): OrganizationCoverMediaType {
  if (
    value !== 'image' &&
    value !== 'video'
  ) {
    throw new BadRequestException(
      'Cover media type must be image or video.',
    );
  }

  return value;
}

function normalizeMediaSource(
  value: unknown,
): OrganizationCoverMediaSource {
  if (
    value !== 'upload' &&
    value !== 'url'
  ) {
    throw new BadRequestException(
      'Cover media source must be upload or url.',
    );
  }

  return value;
}

function extensionFromOriginalName(
  originalName: string,
): string {
  const extension =
    extname(
      originalName || '',
    ).toLowerCase();

  if (
    extension &&
    (
      IMAGE_EXTENSIONS.has(
        extension,
      ) ||
      VIDEO_EXTENSIONS.has(
        extension,
      )
    )
  ) {
    return extension;
  }

  return '';
}

function extensionFromMimeType(
  mimeType: string,
): string {
  const normalized =
    mimeType
      .toLowerCase()
      .trim();

  const mapping: Record<
    string,
    string
  > = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg',

    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-m4v': '.m4v',
    'video/ogg': '.ogv',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
  };

  return (
    mapping[
      normalized
    ] ?? ''
  );
}

function safeFilename(
  filename: string,
): string {
  return basename(
    filename || '',
  );
}

function isSafeCoverFilename(
  filename: string,
): boolean {
  const clean =
    safeFilename(
      filename,
    );

  return (
    clean.length > 0 &&
    clean === filename &&
    clean !== '.' &&
    clean !== '..'
  );
}

function isLocalUploadedCoverUrl(
  bannerUrl:
    | string
    | null
    | undefined,
): boolean {
  if (
    !bannerUrl ||
    typeof bannerUrl !==
      'string'
  ) {
    return false;
  }

  return bannerUrl.startsWith(
    `${ORGANIZATION_COVER_ROUTE_PREFIX}/`,
  );
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel:
      Model<OrganizationDocument>,

    @InjectModel(Department.name)
    private readonly departmentModel:
      Model<DepartmentDocument>,

    @InjectModel(ChurchGroup.name)
    private readonly groupModel:
      Model<ChurchGroupDocument>,

    @InjectModel(ChurchEvent.name)
    private readonly eventModel:
      Model<ChurchEventDocument>,

    private readonly leadershipService:
      LeadershipService,

    private readonly branchesService:
      BranchesService,

    private readonly membersService:
      MembersService,

    private readonly departmentsService:
      DepartmentsService,

    private readonly groupsService:
      ChurchGroupsService,

    private readonly eventsService:
      ChurchEventsService,

    private readonly liveService:
      ChurchLiveService,

    private readonly attendanceService:
      AttendanceService,

    private readonly communicationService:
      ChurchCommunicationService,

    private readonly mediaService:
      ChurchMediaService,
  ) {}

  /* ==========================================================================
     ID HELPERS
  ========================================================================== */

  private toObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (
      !value ||
      !Types.ObjectId.isValid(
        value,
      )
    ) {
      throw new BadRequestException(
        `${fieldName} is invalid.`,
      );
    }

    return new Types.ObjectId(
      value,
    );
  }

  /* ==========================================================================
     ORGANIZATION LOOKUP
  ========================================================================== */

  private async getOrganization(
    organizationId: string,
  ): Promise<OrganizationDocument> {
    const objectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const organization =
      await this.organizationModel.findById(
        objectId,
      );

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    return organization;
  }

  private async getActiveOrganization(
    organizationId: string,
  ): Promise<OrganizationDocument> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    if (
      organization.status ===
      OrganizationStatus.Archived
    ) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    return organization;
  }

  /* ==========================================================================
     FOCKIS DOMAIN AVAILABILITY
  ========================================================================== */

  /**
   * Checks whether a Fockis organization domain is valid and available.
   *
   * This endpoint is intended for the organization creation UI.
   *
   * IMPORTANT:
   *
   * Availability is only an early UX check.
   *
   * The unique MongoDB index on Organization.domain remains the final
   * concurrency protection.
   */
  async checkDomainAvailability(
    domain: string,
  ) {
    const normalizedDomain =
      validateFockisOrganizationDomain(
        domain,
      );

    const existing =
      await this.organizationModel.exists({
        domain:
          normalizedDomain,
      });

    return {
      domain:
        normalizedDomain,

      available:
        !Boolean(existing),

      valid:
        true,

      suffix:
        FOCKIS_ORGANIZATION_DOMAIN_SUFFIXES.find(
          (item) =>
            normalizedDomain.endsWith(
              item,
            ),
        ) ?? null,

      prefix:
        getFockisDomainPrefix(
          normalizedDomain,
        ),
    };
  }

  /* ==========================================================================
     OWNER
  ========================================================================== */

  private getOwnerUserId(
    organization: OrganizationDocument,
  ): string | null {
    return organization.createdByUserId
      ? String(
          organization.createdByUserId,
        )
      : null;
  }

  private isOrganizationOwner(
    organization: OrganizationDocument,
    userId?: string,
  ): boolean {
    if (
      !userId ||
      !organization.createdByUserId
    ) {
      return false;
    }

    return (
      String(
        organization.createdByUserId,
      ) === String(userId)
    );
  }

  private requireRecordedOwner(
    organization: OrganizationDocument,
  ): Types.ObjectId {
    if (
      !organization.createdByUserId
    ) {
      throw new ForbiddenException(
        'This organization does not have a configured owner.',
      );
    }

    return this.toObjectId(
      String(
        organization.createdByUserId,
      ),
      'createdByUserId',
    );
  }

  private async repairOwnerMembership(
    organization: OrganizationDocument,
  ) {
    this.requireRecordedOwner(
      organization,
    );

    return this.membersService.ensureOwnerMembership(
      String(
        organization._id,
      ),
    );
  }

  /* ==========================================================================
     MEMBERSHIP
  ========================================================================== */

  private async requireActiveMembership(
    organizationId: string,
    actorUserId: string,
  ) {
    const membership =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    if (
      !membership ||
      membership.status !==
        MembershipStatus.Active
    ) {
      throw new ForbiddenException(
        'You do not have an active membership in this organization.',
      );
    }

    return membership;
  }

  private getMembershipPermissions(
    membership: any,
  ): ChurchPermission[] {
    if (
      !membership ||
      !Array.isArray(
        membership.permissions,
      )
    ) {
      return [];
    }

    const validPermissions =
      new Set<string>(
        Object.values(
          ChurchPermission,
        ),
      );

    return membership.permissions.filter(
      (
        permission: unknown,
      ): permission is ChurchPermission =>
        typeof permission ===
          'string' &&
        validPermissions.has(
          permission,
        ),
    );
  }

  private hasPermission(
    membership: any,
    permission: ChurchPermission,
  ): boolean {
    return this.getMembershipPermissions(
      membership,
    ).includes(
      permission,
    );
  }

  /**
   * Central organization authorization.
   *
   * OWNER:
   * Full authority.
   *
   * NON-OWNER:
   * ACTIVE membership + exact permission.
   */
  private async requirePermission(
    organization: OrganizationDocument,
    actorUserId: string,
    permission: ChurchPermission,
  ): Promise<void> {
    if (
      this.isOrganizationOwner(
        organization,
        actorUserId,
      )
    ) {
      await this.repairOwnerMembership(
        organization,
      );

      return;
    }

    const membership =
      await this.requireActiveMembership(
        String(
          organization._id,
        ),
        actorUserId,
      );

    if (
      !this.hasPermission(
        membership,
        permission,
      )
    ) {
      throw new ForbiddenException(
        `You do not have the ${permission} permission for this organization.`,
      );
    }
  }

  private async requireOwner(
    organization: OrganizationDocument,
    actorUserId: string,
  ): Promise<void> {
    if (
      !this.isOrganizationOwner(
        organization,
        actorUserId,
      )
    ) {
      throw new ForbiddenException(
        'Only the organization owner can perform this action.',
      );
    }

    await this.repairOwnerMembership(
      organization,
    );
  }

  /* ==========================================================================
     COVER MEDIA — FILE SYSTEM
  ========================================================================== */

  private getOrganizationCoverDirectory(
    organizationId: string,
  ): string {
    const objectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    return join(
      ORGANIZATION_COVER_DIRECTORY,
      String(objectId),
    );
  }

  private getCoverMediaUrl(
    organizationId: string,
    filename: string,
  ): string {
    return (
      `${ORGANIZATION_COVER_ROUTE_PREFIX}/` +
      `${encodeURIComponent(
        organizationId,
      )}/cover/media/` +
      `${encodeURIComponent(
        filename,
      )}`
    );
  }

  private async ensureCoverDirectory(
    organizationId: string,
  ): Promise<string> {
    const directory =
      this.getOrganizationCoverDirectory(
        organizationId,
      );

    await fs.mkdir(
      directory,
      {
        recursive: true,
      },
    );

    return directory;
  }

  private async deleteUploadedCoverFile(
    organization: OrganizationDocument,
  ): Promise<void> {
    if (
      organization.bannerMediaSource !==
      'upload'
    ) {
      return;
    }

    const bannerUrl =
      organization.bannerUrl;

    if (
      !bannerUrl ||
      !isLocalUploadedCoverUrl(
        bannerUrl,
      )
    ) {
      return;
    }

    try {
      const url =
        new URL(
          bannerUrl,
          'http://localhost',
        );

      const parts =
        url.pathname.split(
          '/',
        );

      const filename =
        decodeURIComponent(
          parts[
            parts.length - 1
          ] || '',
        );

      if (
        !isSafeCoverFilename(
          filename,
        )
      ) {
        return;
      }

      const organizationId =
        String(
          organization._id,
        );

      const root =
        resolve(
          this.getOrganizationCoverDirectory(
            organizationId,
          ),
        );

      const filePath =
        resolve(
          root,
          filename,
        );

      if (
        dirname(filePath) !==
        root
      ) {
        return;
      }

      await fs.unlink(
        filePath,
      );
    } catch (
      error: any
    ) {
      /**
       * A missing old cover file should not prevent replacing/deleting the
       * MongoDB reference.
       */
      if (
        error?.code !==
        'ENOENT'
      ) {
        // Intentionally do not fail the organization operation because the
        // database state is more important than a stale filesystem artifact.
      }
    }
  }

  private async saveUploadedCoverFile(
    organizationId: string,
    file: UploadedOrganizationCoverFile,
    mediaType: OrganizationCoverMediaType,
  ): Promise<{
    filename: string;
    url: string;
  }> {
    if (
      !file ||
      !Buffer.isBuffer(
        file.buffer,
      )
    ) {
      throw new BadRequestException(
        'Uploaded cover file is invalid.',
      );
    }

    if (
      file.buffer.length === 0
    ) {
      throw new BadRequestException(
        'Uploaded cover file is empty.',
      );
    }

    if (
      file.buffer.length >
      MAX_COVER_FILE_SIZE
    ) {
      throw new BadRequestException(
        'Organization cover file cannot exceed 100 MB.',
      );
    }

    const mimeType =
      String(
        file.mimetype ?? '',
      )
        .toLowerCase()
        .trim();

    const isImage =
      mimeType.startsWith(
        'image/',
      );

    const isVideo =
      mimeType.startsWith(
        'video/',
      );

    if (
      mediaType === 'image' &&
      !isImage
    ) {
      throw new BadRequestException(
        'The uploaded file is not an image.',
      );
    }

    if (
      mediaType === 'video' &&
      !isVideo
    ) {
      throw new BadRequestException(
        'The uploaded file is not a video.',
      );
    }

    const extension =
      extensionFromOriginalName(
        String(
          file.originalname ?? '',
        ),
      ) ||
      extensionFromMimeType(
        mimeType,
      );

    if (!extension) {
      throw new BadRequestException(
        'The uploaded cover file type is not supported.',
      );
    }

    const directory =
      await this.ensureCoverDirectory(
        organizationId,
      );

    const randomPart =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 12)}`;

    const filename =
      `cover-${randomPart}${extension}`;

    const safeName =
      safeFilename(
        filename,
      );

    if (
      !isSafeCoverFilename(
        safeName,
      )
    ) {
      throw new BadRequestException(
        'Unable to create a safe cover filename.',
      );
    }

    const root =
      resolve(
        directory,
      );

    const filePath =
      resolve(
        root,
        safeName,
      );

    if (
      dirname(filePath) !==
      root
    ) {
      throw new BadRequestException(
        'Invalid cover file path.',
      );
    }

    await fs.writeFile(
      filePath,
      file.buffer,
    );

    return {
      filename:
        safeName,

      url:
        this.getCoverMediaUrl(
          organizationId,
          safeName,
        ),
    };
  }

  /* ==========================================================================
     COVER MEDIA — UPLOAD
  ========================================================================== */

  async uploadCover(
    organizationId: string,
    file: UploadedOrganizationCoverFile,
    mediaType: OrganizationCoverMediaType,
    actorUserId: string,
  ) {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    await this.requirePermission(
      organization,
      actorUserId,
      ChurchPermission.ManageMedia,
    );

    const normalizedType =
      normalizeMediaType(
        mediaType,
      );

    const previousBannerUrl =
      organization.bannerUrl;

    const previousSource =
      organization.bannerMediaSource;

    const previousType =
      organization.bannerMediaType;

    const saved =
      await this.saveUploadedCoverFile(
        organizationId,
        file,
        normalizedType,
      );

    try {
      organization.bannerUrl =
        saved.url;

      organization.bannerMediaType =
        normalizedType;

      organization.bannerMediaSource =
        'upload';

      await organization.save();
    } catch (error) {
      try {
        const directory =
          this.getOrganizationCoverDirectory(
            organizationId,
          );

        const filePath =
          resolve(
            directory,
            saved.filename,
          );

        if (
          dirname(filePath) ===
          resolve(directory)
        ) {
          await fs.unlink(
            filePath,
          );
        }
      } catch {
        // Ignore rollback cleanup failure.
      }

      throw error;
    }

    if (
      previousSource ===
        'upload' &&
      previousBannerUrl &&
      previousBannerUrl !==
        saved.url
    ) {
      const previousOrganization =
        {
          ...organization.toObject(),
          bannerUrl:
            previousBannerUrl,
          bannerMediaType:
            previousType,
          bannerMediaSource:
            previousSource,
        } as OrganizationDocument;

      await this.deleteUploadedCoverFile(
        previousOrganization,
      );
    }

    return {
      success: true,

      organizationId,

      bannerUrl:
        organization.bannerUrl ??
        null,

      bannerMediaType:
        organization.bannerMediaType ??
        null,

      bannerMediaSource:
        organization.bannerMediaSource ??
        null,

      previousBannerUrl:
        previousBannerUrl ??
        null,

      updatedBy:
        actorUserId,
    };
  }

  /* ==========================================================================
     COVER MEDIA — EXTERNAL URL
  ========================================================================== */

  async setCoverUrl(
    organizationId: string,
    url: string,
    mediaType: OrganizationCoverMediaType,
    actorUserId: string,
  ) {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    await this.requirePermission(
      organization,
      actorUserId,
      ChurchPermission.ManageMedia,
    );

    const cleanUrl =
      String(
        url ?? '',
      ).trim();

    if (!cleanUrl) {
      throw new BadRequestException(
        'Cover URL is required.',
      );
    }

    if (
      cleanUrl.length >
      4000
    ) {
      throw new BadRequestException(
        'Cover URL is too long.',
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl =
        new URL(
          cleanUrl,
        );
    } catch {
      throw new BadRequestException(
        'Cover URL is invalid.',
      );
    }

    if (
      parsedUrl.protocol !==
        'http:' &&
      parsedUrl.protocol !==
        'https:'
    ) {
      throw new BadRequestException(
        'Cover URL must use HTTP or HTTPS.',
      );
    }

    const normalizedType =
      normalizeMediaType(
        mediaType,
      );

    const previousBannerUrl =
      organization.bannerUrl;

    const previousSource =
      organization.bannerMediaSource;

    const previousType =
      organization.bannerMediaType;

    organization.bannerUrl =
      cleanUrl;

    organization.bannerMediaType =
      normalizedType;

    organization.bannerMediaSource =
      'url';

    await organization.save();

    if (
      previousSource ===
        'upload' &&
      previousBannerUrl &&
      previousBannerUrl !==
        cleanUrl
    ) {
      const previousOrganization =
        {
          ...organization.toObject(),
          bannerUrl:
            previousBannerUrl,
          bannerMediaType:
            previousType,
          bannerMediaSource:
            previousSource,
        } as OrganizationDocument;

      await this.deleteUploadedCoverFile(
        previousOrganization,
      );
    }

    return {
      success: true,

      organizationId,

      bannerUrl:
        organization.bannerUrl ??
        null,

      bannerMediaType:
        organization.bannerMediaType ??
        null,

      bannerMediaSource:
        organization.bannerMediaSource ??
        null,

      previousBannerUrl:
        previousBannerUrl ??
        null,

      updatedBy:
        actorUserId,
    };
  }

  /* ==========================================================================
     COVER MEDIA — DELETE
  ========================================================================== */

  async deleteCover(
    organizationId: string,
    actorUserId: string,
  ) {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    await this.requirePermission(
      organization,
      actorUserId,
      ChurchPermission.ManageMedia,
    );

    const previousBannerUrl =
      organization.bannerUrl;

    const previousMediaType =
      organization.bannerMediaType;

    const previousMediaSource =
      organization.bannerMediaSource;

    organization.bannerUrl =
      null;

    organization.bannerMediaType =
      null;

    organization.bannerMediaSource =
      null;

    await organization.save();

    if (
      previousMediaSource ===
        'upload' &&
      previousBannerUrl
    ) {
      const previousOrganization =
        {
          ...organization.toObject(),
          bannerUrl:
            previousBannerUrl,
          bannerMediaType:
            previousMediaType,
          bannerMediaSource:
            previousMediaSource,
        } as OrganizationDocument;

      await this.deleteUploadedCoverFile(
        previousOrganization,
      );
    }

    return {
      success: true,

      organizationId,

      bannerUrl:
        null,

      bannerMediaType:
        null,

      bannerMediaSource:
        null,

      deletedBannerUrl:
        previousBannerUrl ??
        null,

      deletedMediaType:
        previousMediaType ??
        null,

      deletedMediaSource:
        previousMediaSource ??
        null,

      updatedBy:
        actorUserId,
    };
  }

  /* ==========================================================================
     COVER MEDIA — SERVE UPLOADED FILE
  ========================================================================== */

  async getCoverMedia(
    organizationId: string,
    filename: string,
  ): Promise<StreamableFile> {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    if (
      organization.bannerMediaSource !==
      'upload'
    ) {
      throw new NotFoundException(
        'This organization does not have an uploaded cover.',
      );
    }

    if (
      !organization.bannerUrl ||
      organization.bannerMediaSource !==
        'upload'
    ) {
      throw new NotFoundException(
        'Organization cover not found.',
      );
    }

    const cleanFilename =
      safeFilename(
        filename,
      );

    if (
      !isSafeCoverFilename(
        cleanFilename,
      )
    ) {
      throw new BadRequestException(
        'Invalid cover filename.',
      );
    }

    const expectedFilename =
      (() => {
        try {
          const url =
            new URL(
              organization.bannerUrl,
              'http://localhost',
            );

          const parts =
            url.pathname.split(
              '/',
            );

          return decodeURIComponent(
            parts[
              parts.length - 1
            ] || '',
          );
        } catch {
          return '';
        }
      })();

    if (
      expectedFilename !==
      cleanFilename
    ) {
      throw new NotFoundException(
        'Organization cover not found.',
      );
    }

    const directory =
      resolve(
        this.getOrganizationCoverDirectory(
          organizationId,
        ),
      );

    const filePath =
      resolve(
        directory,
        cleanFilename,
      );

    if (
      dirname(filePath) !==
      directory
    ) {
      throw new NotFoundException(
        'Organization cover not found.',
      );
    }

    if (
      !existsSync(
        filePath,
      )
    ) {
      throw new NotFoundException(
        'Organization cover file not found.',
      );
    }

    const extension =
      extname(
        cleanFilename,
      ).toLowerCase();

    const mediaType =
      organization.bannerMediaType;

    const mimeTypes: Record<
      string,
      string
    > = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',

      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.m4v': 'video/x-m4v',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.ogv': 'video/ogg',
    };

    const contentType =
      mimeTypes[
        extension
      ] ??
      (
        mediaType ===
        'video'
          ? 'video/mp4'
          : 'image/jpeg'
      );

    const stream =
      createReadStream(
        filePath,
      );

    return new StreamableFile(
      stream,
      {
        type:
          contentType,

        disposition:
          'inline',

        length:
          (
            await fs.stat(
              filePath,
            )
          ).size,
      },
    );
  }

  /* ==========================================================================
     PERMISSION MANAGEMENT
  ========================================================================== */

  async updateAdminPermissions(
    organizationId: string,
    targetUserId: string,
    permissions: ChurchPermission[],
    actorUserId: string,
  ) {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    await this.requireOwner(
      organization,
      actorUserId,
    );

    if (
      String(actorUserId) ===
      String(targetUserId)
    ) {
      throw new ForbiddenException(
        'Administrators cannot modify their own permissions.',
      );
    }

    if (
      !Array.isArray(
        permissions,
      )
    ) {
      throw new BadRequestException(
        'Permissions must be an array.',
      );
    }

    const validPermissions =
      new Set<string>(
        Object.values(
          ChurchPermission,
        ),
      );

    const invalidPermissions =
      permissions.filter(
        (permission) =>
          !validPermissions.has(
            String(permission),
          ),
      );

    if (
      invalidPermissions.length >
      0
    ) {
      throw new BadRequestException(
        `Invalid organization permission(s): ${invalidPermissions.join(', ')}`,
      );
    }

    const target =
      await this.membersService.getMembershipOrNull(
        organizationId,
        targetUserId,
      );

    if (!target) {
      throw new NotFoundException(
        'Target membership not found.',
      );
    }

    if (
      target.status !==
      MembershipStatus.Active
    ) {
      throw new BadRequestException(
        'Only active members can receive organization permissions.',
      );
    }

    if (
      this.isOrganizationOwner(
        organization,
        targetUserId,
      )
    ) {
      throw new ForbiddenException(
        'The organization owner always retains full authority.',
      );
    }

    if (
      !isAdministratorRole(
        target.role,
      )
    ) {
      throw new BadRequestException(
        'Permissions can only be assigned to an administrator.',
      );
    }

    const cleanPermissions =
      Array.from(
        new Set(
          permissions,
        ),
      );

    const updated =
      await (
        this.membersService as any
      ).updateMembershipPermissions?.(
        organizationId,
        targetUserId,
        cleanPermissions,
      );

    if (!updated) {
      throw new BadRequestException(
        'Membership permission update is not available. Add updateMembershipPermissions() to MembersService.',
      );
    }

    return {
      success: true,
      organizationId,
      userId:
        targetUserId,
      role:
        updated.role ??
        target.role,
      permissions:
        cleanPermissions,
      updatedBy:
        actorUserId,
    };
  }

  /* ==========================================================================
     GRANT PERMISSION
  ========================================================================== */

  async grantPermission(
    organizationId: string,
    targetUserId: string,
    permission: ChurchPermission,
    actorUserId: string,
  ) {
    if (
      !Object.values(
        ChurchPermission,
      ).includes(
        permission,
      )
    ) {
      throw new BadRequestException(
        'Invalid organization permission.',
      );
    }

    const target =
      await this.membersService.getMembershipOrNull(
        organizationId,
        targetUserId,
      );

    if (!target) {
      throw new NotFoundException(
        'Target membership not found.',
      );
    }

    const current =
      this.getMembershipPermissions(
        target,
      );

    if (
      current.includes(
        permission,
      )
    ) {
      return {
        success: true,
        alreadyGranted: true,
        permission,
      };
    }

    return this.updateAdminPermissions(
      organizationId,
      targetUserId,
      [
        ...current,
        permission,
      ],
      actorUserId,
    );
  }

  /* ==========================================================================
     REVOKE PERMISSION
  ========================================================================== */

  async revokePermission(
    organizationId: string,
    targetUserId: string,
    permission: ChurchPermission,
    actorUserId: string,
  ) {
    if (
      !Object.values(
        ChurchPermission,
      ).includes(
        permission,
      )
    ) {
      throw new BadRequestException(
        'Invalid organization permission.',
      );
    }

    const target =
      await this.membersService.getMembershipOrNull(
        organizationId,
        targetUserId,
      );

    if (!target) {
      throw new NotFoundException(
        'Target membership not found.',
      );
    }

    const current =
      this.getMembershipPermissions(
        target,
      );

    return this.updateAdminPermissions(
      organizationId,
      targetUserId,
      current.filter(
        (item) =>
          item !==
          permission,
      ),
      actorUserId,
    );
  }

  /* ==========================================================================
     BRANCH CREATION
  ========================================================================== */

  private normalizeBranchForCreation(
    branch: NonNullable<
      CreateOrganizationDto['branches']
    >[number],
    index: number,
  ) {
    return {
      name:
        branch.name?.trim() ||
        `Location ${
          index + 1
        }`,

      isMainLocation:
        index === 0,

      serviceTimes: [],

      ...(branch.address
        ? {
            address: {
              line1:
                branch.address.line1?.trim() ||
                '',

              line2:
                branch.address.line2?.trim() ||
                '',

              city:
                branch.address.city?.trim() ||
                '',

              state:
                branch.address.state?.trim() ||
                '',

              postalCode:
                branch.address.postalCode?.trim() ||
                '',

              country:
                branch.address.country?.trim() ||
                '',
            },
          }
        : {}),
    };
  }

  /* ==========================================================================
     SUMMARY
  ========================================================================== */

  private async toSummary(
    organization: OrganizationDocument,
    viewerUserId?: string,
  ) {
    const organizationId =
      String(
        organization._id,
      );

    const [
      memberCount,
      branches,
      membership,
    ] = await Promise.all([
      this.membersService.countByStatus(
        organizationId,
        MembershipStatus.Active,
      ),

      this.branchesService.listByOrganization(
        organizationId,
      ),

      viewerUserId
        ? this.membersService.getMembershipOrNull(
            organizationId,
            viewerUserId,
          )
        : null,
    ]);

    const mainBranch =
      branches.find(
        (branch) =>
          branch.isMainLocation,
      ) ??
      branches[0];

    const ownerUserId =
      this.getOwnerUserId(
        organization,
      );

    const currentUserIsOwner =
      this.isOrganizationOwner(
        organization,
        viewerUserId,
      );

    const currentUserPermissions =
      currentUserIsOwner
        ? Object.values(
            ChurchPermission,
          )
        : this.getMembershipPermissions(
            membership,
          );

    const currentUserIsActive =
      membership?.status ===
      MembershipStatus.Active;

    const canManage =
      currentUserIsOwner ||
      currentUserPermissions.some(
        (
          permission,
        ) =>
          permission ===
            ChurchPermission.UpdateOrganization ||
          permission ===
            ChurchPermission.ManageSettings ||
          permission ===
            ChurchPermission.ManageAdministrators ||
          permission ===
            ChurchPermission.ManageBranches ||
          permission ===
            ChurchPermission.ManageDepartments ||
          permission ===
            ChurchPermission.ManageGroups ||
          permission ===
            ChurchPermission.ManageEvents ||
          permission ===
            ChurchPermission.ManageLive ||
          permission ===
            ChurchPermission.ManageAttendance ||
          permission ===
            ChurchPermission.ManageCommunication ||
          permission ===
            ChurchPermission.ManageMedia ||
          permission ===
            ChurchPermission.ManageLeadership,
      );

    return {
      id:
        organizationId,

      slug:
        organization.slug,

      /**
       * Permanent Fockis organization namespace.
       */
      domain:
        organization.domain ??
        null,

      name:
        organization.name,

      organizationType:
        organization.organizationType,

      logoUrl:
        organization.logoUrl ??
        null,

      bannerUrl:
        organization.bannerUrl ??
        null,

      bannerMediaType:
        organization.bannerMediaType ??
        null,

      bannerMediaSource:
        organization.bannerMediaSource ??
        null,

      description:
        organization.description,

      website:
        organization.website,

      status:
        organization.status,

      createdByUserId:
        ownerUserId,

      currentUserIsOwner,

      currentUserIsActive,

      currentUserMembershipStatus:
        membership?.status ??
        null,

      currentUserRole:
        membership?.role ??
        null,

      currentUserPermissions,

      canManage,

      mainLocation:
        mainBranch?.address
          ? {
              city:
                mainBranch.address
                  .city,

              state:
                mainBranch.address
                  .state,

              country:
                mainBranch.address
                  .country,
            }
          : undefined,

      memberCount,
    };
  }

  /* ==========================================================================
     ORGANIZATION RESPONSE
  ========================================================================== */

  private async toOrganizationResponse(
    organization: OrganizationDocument,
    viewerUserId?: string,
  ) {
    const organizationId =
      String(
        organization._id,
      );

    const [
      leadership,
      branches,
      activeMembers,
      departments,
      groups,
      upcomingEvents,
      membership,
    ] = await Promise.all([
      this.leadershipService.listByOrganization(
        organizationId,
      ),

      this.branchesService.listByOrganization(
        organizationId,
      ),

      this.membersService.countByStatus(
        organizationId,
        MembershipStatus.Active,
      ),

      this.departmentModel.countDocuments({
        organizationId:
          organization._id,
      }),

      this.groupModel.countDocuments({
        organizationId:
          organization._id,
      }),

      this.eventModel.countDocuments({
        organizationId:
          organization._id,

        startsAt: {
          $gte:
            new Date(),
        },
      }),

      viewerUserId
        ? this.membersService.getMembershipOrNull(
            organizationId,
            viewerUserId,
          )
        : null,
    ]);

    const ownerUserId =
      this.getOwnerUserId(
        organization,
      );

    const currentUserIsOwner =
      this.isOrganizationOwner(
        organization,
        viewerUserId,
      );

    const currentUserPermissions =
      currentUserIsOwner
        ? Object.values(
            ChurchPermission,
          )
        : this.getMembershipPermissions(
            membership,
          );

    const currentUserIsActive =
      membership?.status ===
      MembershipStatus.Active;

    const currentUserIsAdmin =
      currentUserIsOwner ||
      (
        currentUserIsActive &&
        isManagementRole(
          membership?.role,
        )
      );

    const canManage =
      currentUserIsOwner ||
      currentUserPermissions.some(
        (
          permission,
        ) =>
          permission ===
            ChurchPermission.UpdateOrganization ||
          permission ===
            ChurchPermission.ManageSettings ||
          permission ===
            ChurchPermission.ManageAdministrators ||
          permission ===
            ChurchPermission.ManageBranches ||
          permission ===
            ChurchPermission.ManageDepartments ||
          permission ===
            ChurchPermission.ManageGroups ||
          permission ===
            ChurchPermission.ManageEvents ||
          permission ===
            ChurchPermission.ManageLive ||
          permission ===
            ChurchPermission.ManageAttendance ||
          permission ===
            ChurchPermission.ManageCommunication ||
          permission ===
            ChurchPermission.ManageMedia ||
          permission ===
            ChurchPermission.ManageLeadership,
      );

    return {
      id:
        organizationId,

      slug:
        organization.slug,

      /**
       * Permanent Fockis organization namespace.
       */
      domain:
        organization.domain ??
        null,

      name:
        organization.name,

      organizationType:
        organization.organizationType,

      logoUrl:
        organization.logoUrl ??
        null,

      bannerUrl:
        organization.bannerUrl ??
        null,

      bannerMediaType:
        organization.bannerMediaType ??
        null,

      bannerMediaSource:
        organization.bannerMediaSource ??
        null,

      description:
        organization.description,

      website:
        organization.website,

      contact:
        organization.contact,

      status:
        organization.status,

      createdByUserId:
        ownerUserId,

      currentUserIsOwner,

      currentUserIsAdmin,

      currentUserIsActive,

      currentUserPermissions,

      canManage,

      leadership,

      branches,

      counts: {
        members:
          activeMembers,

        departments,

        groups,

        branches:
          branches.length,

        upcomingEvents,
      },

      currentUserMembershipStatus:
        membership?.status ??
        null,

      currentUserRole:
        membership?.role ??
        null,

      createdAt:
        organization.createdAt,

      updatedAt:
        organization.updatedAt,
    };
  }

  /* ==========================================================================
     LIST
  ========================================================================== */

  async list(
    query: ListOrganizationsQuery = {},
    viewerUserId?: string,
  ) {
    const page =
      query.page &&
      Number.isInteger(
        query.page,
      ) &&
      query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize &&
      Number.isInteger(
        query.pageSize,
      ) &&
      query.pageSize > 0
        ? Math.min(
            query.pageSize,
            100,
          )
        : 20;

    const filter:
      OrganizationFilter = {
      status: {
        $ne:
          OrganizationStatus.Archived,
      },
    };

    if (
      query.organizationType
    ) {
      filter.organizationType =
        query.organizationType;
    }

    if (
      query.search?.trim()
    ) {
      filter.$text = {
        $search:
          query.search.trim(),
      };
    }

    if (query.mine) {
      if (!viewerUserId) {
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
        };
      }

      const ids =
        new Set<string>();

      const membershipIds =
        await this.membersService
          .listOrganizationIdsForUser(
            viewerUserId,
          );

      for (
        const id of membershipIds
      ) {
        ids.add(
          String(id),
        );
      }

      if (
        Types.ObjectId.isValid(
          viewerUserId,
        )
      ) {
        const owned =
          await this.organizationModel
            .find({
              createdByUserId:
                new Types.ObjectId(
                  viewerUserId,
                ),

              status: {
                $ne:
                  OrganizationStatus.Archived,
              },
            })
            .select('_id')
            .lean();

        for (
          const organization of owned
        ) {
          ids.add(
            String(
              organization._id,
            ),
          );
        }
      }

      if (
        ids.size === 0
      ) {
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
        };
      }

      const objectIds =
        Array.from(ids)
          .filter(
            (id) =>
              Types.ObjectId.isValid(
                id,
              ),
          )
          .map(
            (id) =>
              new Types.ObjectId(
                id,
              ),
          );

      if (
        objectIds.length === 0
      ) {
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
        };
      }

      filter._id = {
        $in: objectIds,
      };
    }

    const [
      docs,
      total,
    ] = await Promise.all([
      this.organizationModel
        .find(filter)
        .sort({
          name: 1,
        })
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(
          pageSize,
        )
        .exec(),

      this.organizationModel.countDocuments(
        filter,
      ),
    ]);

    const items =
      await Promise.all(
        docs.map(
          (doc) =>
            this.toSummary(
              doc,
              viewerUserId,
            ),
        ),
      );

    return {
      items,
      total,
      page,
      pageSize,
      hasMore:
        page * pageSize <
        total,
    };
  }

  /* ==========================================================================
     GET
  ========================================================================== */

  async getByIdOrSlug(
    idOrSlug: string,
    viewerUserId?: string,
  ) {
    const doc =
      await this.findByIdOrSlug(
        idOrSlug,
      );

    if (!doc) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    if (
      doc.status ===
      OrganizationStatus.Archived
    ) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    return this.toOrganizationResponse(
      doc,
      viewerUserId,
    );
  }

  private async findByIdOrSlug(
    idOrSlug: string,
  ): Promise<OrganizationDocument | null> {
    if (
      Types.ObjectId.isValid(
        idOrSlug,
      )
    ) {
      const byId =
        await this.organizationModel.findById(
          idOrSlug,
        );

      if (byId) {
        return byId;
      }
    }

    return this.organizationModel.findOne({
      slug:
        idOrSlug,
    });
  }

  /* ==========================================================================
     CREATE
  ========================================================================== */

  async create(
    dto: CreateOrganizationDto,
    creator: AuthUser,
  ) {
    const creatorObjectId =
      this.toObjectId(
        creator.id,
        'creator.id',
      );

    if (!dto.name?.trim()) {
      throw new BadRequestException(
        'Organization name is required.',
      );
    }

    /**
     * Domain validation is performed AGAIN here even if the controller DTO
     * already validates it.
     *
     * Never rely exclusively on frontend or controller validation.
     */
    const domain =
      validateFockisOrganizationDomain(
        dto.domain,
      );

    /**
     * Give the caller an immediate and useful conflict response before
     * attempting the MongoDB insert.
     *
     * The unique MongoDB index remains the final race-condition protection.
     */
    const existingDomain =
      await this.organizationModel.exists({
        domain,
      });

    if (existingDomain) {
      throw new ConflictException(
        `The Fockis domain "${domain}" is already in use.`,
      );
    }

    const baseSlug =
      slugify(
        dto.name,
      );

    let slug =
      baseSlug;

    let suffix = 1;

    while (
      await this.organizationModel.exists({
        slug,
      })
    ) {
      suffix += 1;

      slug =
        `${baseSlug}-${suffix}`;
    }

    let created:
      OrganizationDocument;

    try {
      created =
        await this.organizationModel.create({
          name:
            dto.name.trim(),

          slug,

          /**
           * Permanent Fockis organization namespace.
           */
          domain,

          organizationType:
            dto.organizationType,

          createdByUserId:
            creatorObjectId,

          logoUrl:
            dto.logoUrl ??
            null,

          bannerUrl:
            dto.bannerUrl ??
            null,

          bannerMediaType:
            dto.bannerUrl
              ? 'image'
              : null,

          bannerMediaSource:
            dto.bannerUrl
              ? 'url'
              : null,

          description:
            dto.description,

          website:
            dto.website,

          contact:
            dto.contact,

          status:
            OrganizationStatus.Active,
        });
    } catch (
      error: any
    ) {
      /**
       * MongoDB duplicate-key protection.
       *
       * This is especially important because two users could pass the
       * availability check at nearly the same time.
       */
      if (
        error?.code ===
        11000
      ) {
        const duplicateFields =
          Object.keys(
            error?.keyPattern ??
              error?.keyValue ??
              {},
          );

        if (
          duplicateFields.includes(
            'domain',
          ) ||
          error?.keyValue?.domain
        ) {
          throw new ConflictException(
            `The Fockis domain "${domain}" is already in use.`,
          );
        }

        if (
          duplicateFields.includes(
            'slug',
          ) ||
          error?.keyValue?.slug
        ) {
          throw new ConflictException(
            'An organization with this slug already exists.',
          );
        }

        throw new ConflictException(
          'An organization with the supplied information already exists.',
        );
      }

      throw error;
    }

    const organizationId =
      String(
        created._id,
      );

    try {
      await Promise.all([
        this.leadershipService.assignOwner(
          organizationId,
          creator,
        ),

        this.membersService.createOwnerMembership(
          organizationId,
          creator.id,
        ),

        dto.branches &&
        dto.branches.length > 0
          ? Promise.all(
              dto.branches.map(
                (
                  branch,
                  index,
                ) =>
                  this.branchesService.createMainBranch(
                    organizationId,
                    this.normalizeBranchForCreation(
                      branch,
                      index,
                    ),
                  ),
              ),
            )
          : this.branchesService.createMainBranch(
              organizationId,
              {
                name:
                  'Main Location',

                isMainLocation:
                  true,

                serviceTimes:
                  [],
              },
            ),
      ]);
    } catch (
      error
    ) {
      await Promise.allSettled([
        this.leadershipService.deleteAllForOrganization(
          organizationId,
        ),

        this.branchesService.deleteAllForOrganization(
          organizationId,
        ),

        this.membersService.deleteAllForOrganization(
          organizationId,
        ),

        this.organizationModel.deleteOne({
          _id:
            created._id,
        }),
      ]);

      throw error;
    }

    return this.toOrganizationResponse(
      created,
      creator.id,
    );
  }

  /* ==========================================================================
     OWNER RECOVERY
  ========================================================================== */

  async recoverOwner(
    organizationId: string,
    userId: string,
  ) {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    if (
      !organization.createdByUserId
    ) {
      throw new ForbiddenException(
        'This organization does not have a recorded owner.',
      );
    }

    if (
      !this.isOrganizationOwner(
        organization,
        userId,
      )
    ) {
      throw new ForbiddenException(
        'Only the original organization creator can recover ownership.',
      );
    }

    const membership =
      await this.membersService.ensureOwnerMembership(
        organizationId,
      );

    return {
      success: true,

      organizationId,

      ownerUserId:
        String(
          organization.createdByUserId,
        ),

      membership,

      currentUserIsOwner:
        true,

      currentUserIsAdmin:
        true,

      permissions:
        Object.values(
          ChurchPermission,
        ),

      message:
        'Organization ownership and administrator access have been restored.',
    };
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  async update(
    organizationId: string,
    dto: UpdateOrganizationDto,
    actorUserId: string,
  ) {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    await this.requirePermission(
      organization,
      actorUserId,
      ChurchPermission.UpdateOrganization,
    );

    if (
      dto.name !==
      undefined
    ) {
      const name =
        dto.name.trim();

      if (!name) {
        throw new BadRequestException(
          'Organization name cannot be empty.',
        );
      }

      organization.name =
        name;
    }

    if (
      dto.organizationType !==
      undefined
    ) {
      organization.organizationType =
        dto.organizationType;
    }

    if (
      dto.logoUrl !==
      undefined
    ) {
      organization.logoUrl =
        dto.logoUrl;
    }

    if (
      dto.bannerUrl !==
      undefined
    ) {
      /**
       * Legacy compatibility.
       *
       * Cover management should normally use:
       *
       *   uploadCover()
       *   setCoverUrl()
       *   deleteCover()
       *
       * If an old client updates bannerUrl directly, treat it as an external
       * image URL for backwards compatibility.
       */
      const nextBannerUrl =
        dto.bannerUrl;

      organization.bannerUrl =
        nextBannerUrl;

      if (
        nextBannerUrl
      ) {
        organization.bannerMediaType =
          'image';

        organization.bannerMediaSource =
          'url';
      } else {
        organization.bannerMediaType =
          null;

        organization.bannerMediaSource =
          null;
      }
    }

    if (
      dto.description !==
      undefined
    ) {
      organization.description =
        dto.description;
    }

    if (
      dto.website !==
      undefined
    ) {
      organization.website =
        dto.website;
    }

    if (
      dto.contact !==
      undefined
    ) {
      organization.contact = {
        ...organization.contact,
        ...dto.contact,
      } as any;
    }

    /**
     * IMPORTANT:
     *
     * Organization.domain intentionally is NOT updated here.
     *
     * The Fockis organization namespace is permanent after creation.
     *
     * If domain transfers/renames are introduced later, they should use a
     * dedicated owner-only domain management workflow with explicit
     * validation, conflict handling, audit logging, and namespace migration.
     */

    await organization.save();

    return this.toOrganizationResponse(
      organization,
      actorUserId,
    );
  }

  /* ==========================================================================
     STATUS
  ========================================================================== */

  async updateStatus(
    organizationId: string,
    status: OrganizationStatus,
    actorUserId: string,
  ) {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    if (
      !Object.values(
        OrganizationStatus,
      ).includes(
        status,
      )
    ) {
      throw new BadRequestException(
        'Invalid organization status.',
      );
    }

    if (
      organization.status ===
      OrganizationStatus.Archived
    ) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    if (
      status ===
      OrganizationStatus.Archived
    ) {
      await this.requireOwner(
        organization,
        actorUserId,
      );
    } else {
      await this.requirePermission(
        organization,
        actorUserId,
        ChurchPermission.UpdateOrganization,
      );
    }

    organization.status =
      status;

    await organization.save();

    return this.toOrganizationResponse(
      organization,
      actorUserId,
    );
  }

  /* ==========================================================================
     SETTINGS
  ========================================================================== */

  async updateSettings(
    organizationId: string,
    dto: {
      isDiscoverable?: boolean;
      requireApproval?: boolean;
    },
    actorUserId: string,
  ) {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    await this.requirePermission(
      organization,
      actorUserId,
      ChurchPermission.ManageSettings,
    );

    const nextSettings: any = {
      ...(organization.settings ??
        {}),
    };

    if (
      dto.isDiscoverable !==
      undefined
    ) {
      nextSettings.isDiscoverable =
        Boolean(
          dto.isDiscoverable,
        );
    }

    if (
      dto.requireApproval !==
      undefined
    ) {
      nextSettings.requireApproval =
        Boolean(
          dto.requireApproval,
        );
    }

    organization.settings =
      nextSettings;

    await organization.save();

    return {
      organizationId,

      isDiscoverable:
        organization.settings
          ?.isDiscoverable,

      requireApproval:
        organization.settings
          ?.requireApproval,

      updatedBy:
        actorUserId,
    };
  }

  /* ==========================================================================
     DELETE
  ========================================================================== */

  async remove(
    organizationId: string,
    actorUserId: string,
  ): Promise<void> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    await this.requireOwner(
      organization,
      actorUserId,
    );

    const id =
      String(
        organization._id,
      );

    /**
     * Delete the physical organization cover before deleting the organization
     * document.
     *
     * Failure to remove a stale physical file must not prevent deletion of the
     * organization itself.
     */
    await this.deleteUploadedCoverFile(
      organization,
    );

    await Promise.all([
      this.leadershipService.deleteAllForOrganization(
        id,
      ),

      this.branchesService.deleteAllForOrganization(
        id,
      ),

      this.membersService.deleteAllForOrganization(
        id,
      ),

      this.departmentsService.deleteAllForOrganization(
        id,
      ),

      this.groupsService.deleteAllForOrganization(
        id,
      ),

      this.eventsService.deleteAllForOrganization(
        id,
      ),

      this.liveService.deleteAllForOrganization(
        id,
      ),

      this.attendanceService.deleteAllForOrganization(
        id,
      ),

      this.communicationService.deleteAllForOrganization(
        id,
      ),

      this.mediaService.deleteAllForOrganization(
        id,
      ),
    ]);

    await this.organizationModel.deleteOne({
      _id:
        organization._id,
    });
  }

  /* ==========================================================================
     JOIN
  ========================================================================== */

  async join(
    organizationId: string,
    requester: AuthUser,
  ) {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    if (
      this.isOrganizationOwner(
        organization,
        requester.id,
      )
    ) {
      const restored =
        await this.membersService.ensureOwnerMembership(
          organizationId,
        );

      return {
        membershipStatus:
          restored.status,

        organizationId,

        requiresApproval:
          false,

        restoredOwner:
          true,
      };
    }

    const autoApprove =
      organization.settings
        ?.requireApproval ===
      false;

    const membership =
      await this.membersService.createJoinRequest(
        organizationId,
        requester,
        autoApprove,
      );

    return {
      membershipStatus:
        membership.status,

      organizationId,

      requiresApproval:
        !autoApprove,

      restoredOwner:
        false,
    };
  }

  /* ==========================================================================
     LEAVE
  ========================================================================== */

  async leave(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    if (
      this.isOrganizationOwner(
        organization,
        userId,
      )
    ) {
      throw new ForbiddenException(
        'The organization owner cannot leave the organization.',
      );
    }

    const membership =
      await this.membersService.getMembershipOrNull(
        organizationId,
        userId,
      );

    if (!membership) {
      throw new BadRequestException(
        'You are not a member of this organization.',
      );
    }

    await this.membersService.remove(
      organizationId,
      String(
        membership._id,
      ),
      userId,
    );
  }

  /* ==========================================================================
     ASSERT EXISTS
  ========================================================================== */

  async assertExists(
    organizationId: string,
  ): Promise<void> {
    await this.getActiveOrganization(
      organizationId,
    );
  }

  /* ==========================================================================
     VIEWER AUTHORIZATION
  ========================================================================== */

  async getViewerAuthorization(
    organizationId: string,
    viewerUserId?: string,
  ) {
    const organization =
      await this.getActiveOrganization(
        organizationId,
      );

    if (!viewerUserId) {
      return {
        isAuthenticated:
          false,

        isActiveMember:
          false,

        isOwner:
          false,

        isAdmin:
          false,

        role:
          null,

        permissions:
          [],
      };
    }

    const isOwner =
      this.isOrganizationOwner(
        organization,
        viewerUserId,
      );

    if (isOwner) {
      const membership =
        await this.repairOwnerMembership(
          organization,
        );

      return {
        isAuthenticated:
          true,

        isActiveMember:
          true,

        isOwner:
          true,

        isAdmin:
          true,

        role:
          membership?.role ??
          null,

        permissions:
          Object.values(
            ChurchPermission,
          ),
      };
    }

    const membership =
      await this.membersService.getMembershipOrNull(
        organizationId,
        viewerUserId,
      );

    if (!membership) {
      return {
        isAuthenticated:
          true,

        isActiveMember:
          false,

        isOwner:
          false,

        isAdmin:
          false,

        role:
          null,

        permissions:
          [],
      };
    }

    const isActive =
      membership.status ===
      MembershipStatus.Active;

    const permissions =
      isActive
        ? this.getMembershipPermissions(
            membership,
          )
        : [];

    return {
      isAuthenticated:
        true,

      isActiveMember:
        isActive,

      isOwner:
        false,

      isAdmin:
        isActive &&
        isManagementRole(
          membership.role,
        ),

      role:
        membership.role ??
        null,

      permissions,
    };
  }
}