import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  memoryStorage,
} from 'multer';

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

import { Request } from 'express';

import {
  OrganizationsService,
} from '../services/organizations.service';

import {
  OrganizationStatus,
} from '../../enums/organization-status.enum';

import {
  OrganizationType,
} from '../../enums/organization-type.enum';

import {
  ChurchPermission,
} from '../../enums/permission.enum';

import {
  AuthUser,
} from '../../members/services/members.service';

/* ============================================================================
   AUTHENTICATED REQUEST
============================================================================ */

type AuthenticatedRequest = Request & {
  user?: AuthUser & {
    id?: string;
    _id?: string;
    userId?: string;
    [key: string]: unknown;
  };
};

/* ============================================================================
   COVER TYPES
============================================================================ */

export enum OrganizationCoverMediaType {
  Image = 'image',
  Video = 'video',
}

export enum OrganizationCoverMediaSource {
  Upload = 'upload',
  Url = 'url',
}

/* ============================================================================
   FOCKIS DOMAIN CONFIGURATION
============================================================================ */

/**
 * Every organization domain must remain inside the Fockis namespace.
 *
 * Allowed:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 *   springfieldchurch.fockis.net
 *   springfieldchurch.fockis.edu
 *   springfieldchurch.fockis.church
 *   springfieldchurch.fockis.co
 *   springfieldchurch.fockis.io
 *
 * Not allowed:
 *
 *   springfieldchurch.com
 *   springfieldchurch.org
 *   fockis.com
 */

const FOCKIS_DOMAIN_SUFFIXES = [
  '.fockis.com',
  '.fockis.org',
  '.fockis.net',
  '.fockis.edu',
  '.fockis.church',
  '.fockis.co',
  '.fockis.io',
] as const;

type FockisDomainSuffix =
  (typeof FOCKIS_DOMAIN_SUFFIXES)[number];

/* ============================================================================
   DOMAIN NORMALIZATION
============================================================================ */

/**
 * Normalize a complete organization domain.
 *
 * Examples:
 *
 *   SpringfieldChurch.Fockis.Com
 *   https://springfieldchurch.fockis.com/
 *   www.springfieldchurch.fockis.org
 *
 * become:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 */

function normalizeOrganizationDomain(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .replace(/\.$/, '');
}

/* ============================================================================
   DOMAIN VALIDATION
============================================================================ */

/**
 * Returns true when the complete domain belongs
 * to one of the supported Fockis namespaces.
 */
function isFockisOrganizationDomain(
  domain: string,
): domain is `${string}${FockisDomainSuffix}` {
  if (!domain) {
    return false;
  }

  return FOCKIS_DOMAIN_SUFFIXES.some(
    (suffix) => {
      if (!domain.endsWith(suffix)) {
        return false;
      }

      const prefix =
        domain.slice(
          0,
          -suffix.length,
        );

      return (
        prefix.length >= 2 &&
        prefix.length <= 63 &&
        /^[a-z0-9-]+$/.test(prefix) &&
        !prefix.startsWith('-') &&
        !prefix.endsWith('-')
      );
    },
  );
}

/**
 * Validate the complete organization domain.
 *
 * This is intentionally strict.
 */
function validateFockisOrganizationDomain(
  value: string,
): string {
  if (!value || !value.trim()) {
    throw new BadRequestException(
      'Organization domain is required.',
    );
  }

  const domain =
    normalizeOrganizationDomain(value);

  if (!domain) {
    throw new BadRequestException(
      'Organization domain is required.',
    );
  }

  /*
   * The root Fockis domains themselves cannot
   * become organization domains.
   *
   * Examples:
   *
   *   fockis.com
   *   fockis.org
   *   fockis.net
   */
  if (
    FOCKIS_DOMAIN_SUFFIXES.some(
      (suffix) =>
        domain === suffix.slice(1),
    )
  ) {
    throw new BadRequestException(
      'The Fockis root domain cannot be used as an organization domain.',
    );
  }

  /*
   * Reject public domains outside Fockis.
   */
  if (!domain.includes('.fockis.')) {
    throw new BadRequestException(
      'Organization domain must be a Fockis domain, such as springfieldchurch.fockis.com.',
    );
  }

  /*
   * Validate supported Fockis suffix.
   */
  if (
    !isFockisOrganizationDomain(domain)
  ) {
    throw new BadRequestException(
      'The organization domain uses an unsupported Fockis domain extension.',
    );
  }

  return domain;
}

/* ============================================================================
   DTOs
============================================================================ */

/**
 * CREATE ORGANIZATION
 *
 * Domain is REQUIRED.
 *
 * Example:
 *
 * {
 *   "name": "Springfield Church",
 *   "organizationType": "church",
 *   "description": "Springfield Church",
 *   "domain": "springfieldchurch.fockis.com"
 * }
 */
export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEnum(OrganizationType)
  organizationType!: OrganizationType;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /**
   * Complete Fockis organization domain.
   *
   * The frontend should send:
   *
   *   springfieldchurch.fockis.com
   *
   * NOT:
   *
   *   springfieldchurch
   *
   * and NOT:
   *
   *   springfieldchurch.com
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  @Matches(
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i,
    {
      message:
        'Organization domain must be a valid Fockis domain such as springfieldchurch.fockis.com.',
    },
  )
  domain!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;
}

export class UpdateOrganizationStatusDto {
  @IsEnum(OrganizationStatus)
  status!: OrganizationStatus;
}

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsBoolean()
  isDiscoverable?: boolean;

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;
}

/**
 * Set an external organization cover URL.
 */
export class SetOrganizationCoverDto {
  @IsString()
  @MaxLength(4000)
  url!: string;

  @IsEnum(OrganizationCoverMediaType)
  mediaType!: OrganizationCoverMediaType;
}

export class AdminPermissionsDto {
  @IsString()
  userId!: string;

  @IsArray()
  permissions!: ChurchPermission[];
}

export class GrantPermissionDto {
  @IsString()
  userId!: string;

  @IsEnum(ChurchPermission)
  permission!: ChurchPermission;
}

export class RevokePermissionDto {
  @IsString()
  userId!: string;

  @IsEnum(ChurchPermission)
  permission!: ChurchPermission;
}

/* ============================================================================
   CONTROLLER
============================================================================ */

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService:
      OrganizationsService,
  ) {}

  /* ==========================================================================
     AUTH USER HELPER
  ========================================================================== */

  private getUserId(
    req: AuthenticatedRequest,
  ): string {
    const userId =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId;

    if (!userId) {
      throw new BadRequestException(
        'Authenticated user ID is missing.',
      );
    }

    return String(userId);
  }

  /* ==========================================================================
     LIST ORGANIZATIONS

     GET /church/organizations
  ========================================================================== */

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,

    @Query('page')
    page?: string,

    @Query('pageSize')
    pageSize?: string,

    @Query('search')
    search?: string,

    @Query('organizationType')
    organizationType?: OrganizationType,

    @Query('mine')
    mine?: string,
  ) {
    const viewerUserId =
      req.user
        ? this.getUserId(req)
        : undefined;

    return this.organizationsService.list(
      {
        page:
          page !== undefined
            ? Number(page)
            : undefined,

        pageSize:
          pageSize !== undefined
            ? Number(pageSize)
            : undefined,

        search,

        organizationType,

        mine:
          mine === 'true'
            ? true
            : mine === 'false'
              ? false
              : undefined,
      },
      viewerUserId,
    );
  }

  /* ==========================================================================
     VIEWER AUTHORIZATION

     GET /church/organizations/:organizationId/authorization
  ========================================================================== */

  @Get(':organizationId/authorization')
  async getViewerAuthorization(
    @Param('organizationId')
    organizationId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const viewerUserId =
      req.user
        ? this.getUserId(req)
        : undefined;

    return this.organizationsService
      .getViewerAuthorization(
        organizationId,
        viewerUserId,
      );
  }

  /* ==========================================================================
     GET ORGANIZATION

     GET /church/organizations/:organizationId
  ========================================================================== */

  @Get(':organizationId')
  async getById(
    @Param('organizationId')
    organizationId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const viewerUserId =
      req.user
        ? this.getUserId(req)
        : undefined;

    return this.organizationsService
      .getByIdOrSlug(
        organizationId,
        viewerUserId,
      );
  }

  /* ==========================================================================
     CREATE ORGANIZATION

     POST /church/organizations

     REQUIRED:

     {
       "name": "Springfield Church",
       "organizationType": "church",
       "domain": "springfieldchurch.fockis.com"
     }

     The organization cannot be created without a domain.
  ========================================================================== */

  @Post()
  async create(
    @Body()
    dto: CreateOrganizationDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new BadRequestException(
        'Authenticated user is required.',
      );
    }

    /*
     * Validate the complete domain before
     * passing it to the service.
     */
    const normalizedDomain =
      validateFockisOrganizationDomain(
        dto.domain,
      );

    /*
     * Create a clean DTO so the service
     * always receives the normalized domain.
     */
    const createDto: CreateOrganizationDto = {
      ...dto,

      name: dto.name.trim(),

      domain: normalizedDomain,

      description:
        dto.description?.trim() || undefined,

      website:
        dto.website?.trim() || undefined,
    };

    return this.organizationsService.create(
      createDto,
      req.user,
    );
  }

  /* ==========================================================================
     UPDATE ORGANIZATION

     PATCH /church/organizations/:organizationId
  ========================================================================== */

  @Patch(':organizationId')
  async update(
    @Param('organizationId')
    organizationId: string,

    @Body()
    dto: UpdateOrganizationDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    return this.organizationsService.update(
      organizationId,
      dto as any,
      actorUserId,
    );
  }

  /* ==========================================================================
     ORGANIZATION COVER — UPLOAD PHOTO / VIDEO

     POST /church/organizations/:organizationId/cover

     multipart/form-data

     Field:
       file

     Supported:
       image/*
       video/*

     Maximum:
       100 MB

     Authorization:
       Owner OR ManageMedia permission
  ========================================================================== */

  @Post(':organizationId/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: {
        fileSize:
          100 * 1024 * 1024,
      },

      fileFilter: (
        _req,
        file,
        callback,
      ) => {
        const mimeType =
          file.mimetype
            ?.toLowerCase()
            .trim() || '';

        const isImage =
          mimeType.startsWith(
            'image/',
          );

        const isVideo =
          mimeType.startsWith(
            'video/',
          );

        if (!isImage && !isVideo) {
          return callback(
            new BadRequestException(
              'Organization cover must be an image or video file.',
            ),
            false,
          );
        }

        callback(
          null,
          true,
        );
      },
    }),
  )
  async uploadCover(
    @Param('organizationId')
    organizationId: string,

    @UploadedFile()
    file: Express.Multer.File,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    if (!file) {
      throw new BadRequestException(
        'Please select an organization cover photo or video.',
      );
    }

    const mimeType =
      file.mimetype
        ?.toLowerCase()
        .trim() || '';

    const mediaType =
      mimeType.startsWith('video/')
        ? OrganizationCoverMediaType.Video
        : OrganizationCoverMediaType.Image;

    return this.organizationsService
      .uploadCover(
        organizationId,
        file,
        mediaType,
        actorUserId,
      );
  }

  /* ==========================================================================
     ORGANIZATION COVER — EXTERNAL URL

     PATCH /church/organizations/:organizationId/cover
  ========================================================================== */

  @Patch(':organizationId/cover')
  async setCoverUrl(
    @Param('organizationId')
    organizationId: string,

    @Body()
    dto: SetOrganizationCoverDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    const url =
      dto.url?.trim();

    if (!url) {
      throw new BadRequestException(
        'A cover URL is required.',
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl =
        new URL(url);
    } catch {
      throw new BadRequestException(
        'Please provide a valid cover URL.',
      );
    }

    if (
      parsedUrl.protocol !== 'http:' &&
      parsedUrl.protocol !== 'https:'
    ) {
      throw new BadRequestException(
        'Cover URL must use HTTP or HTTPS.',
      );
    }

    return this.organizationsService
      .setCoverUrl(
        organizationId,
        url,
        dto.mediaType,
        actorUserId,
      );
  }

  /* ==========================================================================
     ORGANIZATION COVER — DELETE

     DELETE /church/organizations/:organizationId/cover
  ========================================================================== */

  @Delete(':organizationId/cover')
  async deleteCover(
    @Param('organizationId')
    organizationId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    return this.organizationsService
      .deleteCover(
        organizationId,
        actorUserId,
      );
  }

  /* ==========================================================================
     UPDATE STATUS

     PATCH /church/organizations/:organizationId/status
  ========================================================================== */

  @Patch(':organizationId/status')
  async updateStatus(
    @Param('organizationId')
    organizationId: string,

    @Body()
    dto: UpdateOrganizationStatusDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    return this.organizationsService
      .updateStatus(
        organizationId,
        dto.status,
        actorUserId,
      );
  }

  /* ==========================================================================
     UPDATE SETTINGS

     PATCH /church/organizations/:organizationId/settings
  ========================================================================== */

  @Patch(':organizationId/settings')
  async updateSettings(
    @Param('organizationId')
    organizationId: string,

    @Body()
    dto: UpdateOrganizationSettingsDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    return this.organizationsService
      .updateSettings(
        organizationId,
        dto,
        actorUserId,
      );
  }

  /* ==========================================================================
     DELETE ORGANIZATION

     DELETE /church/organizations/:organizationId
  ========================================================================== */

  @Delete(':organizationId')
  async remove(
    @Param('organizationId')
    organizationId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    return this.organizationsService.remove(
      organizationId,
      actorUserId,
    );
  }

  /* ==========================================================================
     JOIN

     POST /church/organizations/:organizationId/join
  ========================================================================== */

  @Post(':organizationId/join')
  async join(
    @Param('organizationId')
    organizationId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new BadRequestException(
        'Authenticated user is required.',
      );
    }

    return this.organizationsService.join(
      organizationId,
      req.user,
    );
  }

  /* ==========================================================================
     LEAVE

     POST /church/organizations/:organizationId/leave
  ========================================================================== */

  @Post(':organizationId/leave')
  async leave(
    @Param('organizationId')
    organizationId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const userId =
      this.getUserId(req);

    return this.organizationsService.leave(
      organizationId,
      userId,
    );
  }

  /* ==========================================================================
     OWNER RECOVERY

     POST /church/organizations/:organizationId/recover-owner
  ========================================================================== */

  @Post(':organizationId/recover-owner')
  async recoverOwner(
    @Param('organizationId')
    organizationId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const userId =
      this.getUserId(req);

    return this.organizationsService
      .recoverOwner(
        organizationId,
        userId,
      );
  }

  /* ==========================================================================
     UPDATE ADMIN PERMISSIONS

     PATCH /church/organizations/:organizationId/admin-permissions
  ========================================================================== */

  @Patch(':organizationId/admin-permissions')
  async updateAdminPermissions(
    @Param('organizationId')
    organizationId: string,

    @Body()
    dto: AdminPermissionsDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    return this.organizationsService
      .updateAdminPermissions(
        organizationId,
        dto.userId,
        dto.permissions,
        actorUserId,
      );
  }

  /* ==========================================================================
     GRANT PERMISSION

     POST /church/organizations/:organizationId/admin-permissions/grant
  ========================================================================== */

  @Post(':organizationId/admin-permissions/grant')
  async grantPermission(
    @Param('organizationId')
    organizationId: string,

    @Body()
    dto: GrantPermissionDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    return this.organizationsService
      .grantPermission(
        organizationId,
        dto.userId,
        dto.permission,
        actorUserId,
      );
  }

  /* ==========================================================================
     REVOKE PERMISSION

     POST /church/organizations/:organizationId/admin-permissions/revoke
  ========================================================================== */

  @Post(':organizationId/admin-permissions/revoke')
  async revokePermission(
    @Param('organizationId')
    organizationId: string,

    @Body()
    dto: RevokePermissionDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const actorUserId =
      this.getUserId(req);

    return this.organizationsService
      .revokePermission(
        organizationId,
        dto.userId,
        dto.permission,
        actorUserId,
      );
  }
}