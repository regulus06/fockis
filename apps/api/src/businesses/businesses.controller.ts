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
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";

import {
  FileInterceptor,
} from "@nestjs/platform-express";

import {
  diskStorage,
} from "multer";

import {
  extname,
  join,
} from "path";

import {
  existsSync,
  mkdirSync,
} from "fs";

import {
  BusinessesService,
  type BusinessViewer,
} from "./businesses.service";

import {
  CreateBusinessDto,
} from "./dto/create-business.dto";

import {
  UpdateBusinessDto,
} from "./dto/update-business.dto";

import {
  CreateBusinessDealDto,
} from "./dto/create-business-deal.dto";

import {
  UpdateBusinessDealDto,
} from "./dto/update-business-deal.dto";

import {
  JwtAuthGuard,
} from "../auth/jwt-auth.guard";

import {
  OptionalJwtAuthGuard,
} from "../auth/optional-jwt-auth.guard";

import {
  Public,
} from "../auth/public.decorator";

import {
  BusinessImageSource,
} from "./schemas/business.schema";


/* ============================================================================
   UPLOAD DIRECTORY
============================================================================ */

const businessUploadDirectory =
  join(
    process.cwd(),
    "uploads",
    "businesses",
  );


if (
  !existsSync(
    businessUploadDirectory,
  )
) {
  mkdirSync(
    businessUploadDirectory,
    {
      recursive: true,
    },
  );
}


const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
];


/*
 * Shared multer configuration for business logo and cover uploads.
 */
function businessImageUpload(
  prefix: "logo" | "cover",
) {
  return FileInterceptor(
    "file",
    {
      storage: diskStorage({
        destination:
          businessUploadDirectory,

        filename: (
          _request,
          file,
          callback,
        ) => {

          const extension =
            extname(
              file.originalname,
            ).toLowerCase();

          const safeExtension =
            ALLOWED_IMAGE_EXTENSIONS.includes(
              extension,
            )
              ? extension
              : ".jpg";

          callback(
            null,
            `${prefix}-${Date.now()}-${Math.round(
              Math.random() *
                1_000_000,
            )}${safeExtension}`,
          );
        },
      }),

      limits: {
        fileSize:
          10 *
          1024 *
          1024,
      },

      fileFilter: (
        _request,
        file,
        callback,
      ) => {

        if (
          ALLOWED_IMAGE_TYPES.includes(
            file.mimetype,
          )
        ) {
          callback(
            null,
            true,
          );

          return;
        }

        callback(
          new BadRequestException(
            "Only JPG, PNG, WEBP, and GIF images are allowed.",
          ),
          false,
        );
      },
    },
  );
}


/* ============================================================================
   REQUEST USER
============================================================================ */

function normalizeRole(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}


/*
 * Mirrors the super admin rule in admin/safety/super-admin.guard.ts.
 */
function isAdminUser(
  user: any,
): boolean {
  if (!user) {
    return false;
  }

  if (user.isSuperAdmin === true) {
    return true;
  }

  if (
    normalizeRole(user.role) ===
    "super_admin"
  ) {
    return true;
  }

  return (
    Array.isArray(user.roles) &&
    user.roles.some(
      (role: unknown) =>
        normalizeRole(role) ===
        "super_admin",
    )
  );
}


function toViewer(
  req: any,
): BusinessViewer | undefined {
  const user = req?.user;

  if (!user) {
    return undefined;
  }

  const id =
    user.id ??
    user._id ??
    user.userId ??
    user.sub;

  return {
    id:
      id ? String(id) : undefined,

    isAdmin:
      isAdminUser(user),
  };
}


/* ============================================================================
   CONTROLLER
============================================================================ */

@Controller("businesses")
export class BusinessesController {

  constructor(
    private readonly businessesService: BusinessesService,
  ) {}


  /* ==========================================================================
     PUBLIC BUSINESSES

     GET /businesses
     Optional query: q, category, city, sort (featured|newest|name),
     page, limit (max 100).
  ========================================================================== */

  @Public()
  @Get()
  getAll(
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("city") city?: string,
    @Query("sort") sort?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.businessesService.findPublic({
      q,
      category,
      city,
      sort,
      page:
        page ? Number(page) : undefined,
      limit:
        limit ? Number(limit) : undefined,
    });
  }


  @Public()
  @Get("spotlight")
  getSpotlight() {
    return this.businessesService.getSpotlight();
  }


  /* ==========================================================================
     MY BUSINESSES
  ========================================================================== */

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  getMine(
    @Req() req: any,
  ) {
    return this.businessesService.findMine(
      req.user.id,
    );
  }


  /* ==========================================================================
     GET ONE

     Public for published businesses. When a token is sent, the owner can
     also preview an unpublished business.
  ========================================================================== */

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(":id")
  getOne(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.businessesService.findOne(
      id,
      toViewer(req),
    );
  }


  /* ==========================================================================
     CREATE BUSINESS
  ========================================================================== */

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: any,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.businessesService.create(
      req.user.id,
      dto,
    );
  }


  /* ==========================================================================
     UPDATE BUSINESS
  ========================================================================== */

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(
      req.user.id,
      id,
      dto,
      toViewer(req),
    );
  }


  /* ==========================================================================
     PUBLISH BUSINESS

     POST:
       /businesses/:id/publish
  ========================================================================== */

  @Post(":id/publish")
  @UseGuards(JwtAuthGuard)
  publish(
    @Req() req: any,
    @Param("id") businessId: string,
  ) {
    return this.businessesService.publishToFeed(
      req.user.id,
      businessId,
      true,
    );
  }


  /* ==========================================================================
     UNPUBLISH BUSINESS

     DELETE:
       /businesses/:id/publish
  ========================================================================== */

  @Delete(":id/publish")
  @UseGuards(JwtAuthGuard)
  unpublish(
    @Req() req: any,
    @Param("id") businessId: string,
  ) {
    return this.businessesService.publishToFeed(
      req.user.id,
      businessId,
      false,
    );
  }


  /* ==========================================================================
     COVER IMAGE UPLOAD
  ========================================================================== */

  @Post(":id/cover-image")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    businessImageUpload("cover"),
  )
  async uploadCoverImage(
    @Req() req: any,
    @Param("id") businessId: string,
    @UploadedFile()
    file: Express.Multer.File,
  ) {

    if (!file) {
      throw new BadRequestException(
        "Please select an image.",
      );
    }

    return this.businessesService.setImage(
      req.user.id,
      businessId,
      "cover",
      {
        url:
          `/uploads/businesses/${file.filename}`,

        source:
          BusinessImageSource.UPLOAD,
      },
    );
  }


  /* ==========================================================================
     LOGO UPLOAD
  ========================================================================== */

  @Post(":id/logo")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    businessImageUpload("logo"),
  )
  async uploadLogo(
    @Req() req: any,
    @Param("id") businessId: string,
    @UploadedFile()
    file: Express.Multer.File,
  ) {

    if (!file) {
      throw new BadRequestException(
        "Please select an image.",
      );
    }

    return this.businessesService.setImage(
      req.user.id,
      businessId,
      "logo",
      {
        url:
          `/uploads/businesses/${file.filename}`,

        source:
          BusinessImageSource.UPLOAD,
      },
    );
  }


  /* ==========================================================================
     DELETE BUSINESS
  ========================================================================== */

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.businessesService.remove(
      req.user.id,
      id,
    );
  }


  /* ==========================================================================
     CREATE DEAL
  ========================================================================== */

  @Post(":id/deals")
  @UseGuards(JwtAuthGuard)
  createDeal(
    @Req() req: any,
    @Param("id") businessId: string,
    @Body() dto: CreateBusinessDealDto,
  ) {
    return this.businessesService.createDeal(
      req.user.id,
      businessId,
      dto,
    );
  }


  /* ==========================================================================
     UPDATE DEAL

     PATCH:
       /businesses/:id/deals/:dealId
  ========================================================================== */

  @Patch(":id/deals/:dealId")
  @UseGuards(JwtAuthGuard)
  updateDeal(
    @Req() req: any,
    @Param("id") businessId: string,
    @Param("dealId") dealId: string,
    @Body() dto: UpdateBusinessDealDto,
  ) {
    return this.businessesService.updateDeal(
      req.user.id,
      dealId,
      dto,
      businessId,
    );
  }


  /* ==========================================================================
     DELETE DEAL

     DELETE:
       /businesses/:id/deals/:dealId
  ========================================================================== */

  @Delete(":id/deals/:dealId")
  @UseGuards(JwtAuthGuard)
  deleteDeal(
    @Req() req: any,
    @Param("id") businessId: string,
    @Param("dealId") dealId: string,
  ) {
    return this.businessesService.deleteDeal(
      req.user.id,
      dealId,
      businessId,
    );
  }


  /* ==========================================================================
     ANALYTICS

     Public so visitors who are not signed in are counted too. Each call
     only increments a counter on a published business.
  ========================================================================== */

  @Public()
  @Post(":id/view")
  trackView(
    @Param("id") id: string,
  ) {
    return this.businessesService.trackView(
      id,
    );
  }


  @Public()
  @Post(":id/website-click")
  trackWebsiteClick(
    @Param("id") id: string,
  ) {
    return this.businessesService.trackWebsiteClick(
      id,
    );
  }


  @Public()
  @Post(":id/store-click")
  trackStoreClick(
    @Param("id") id: string,
  ) {
    return this.businessesService.trackStoreClick(
      id,
    );
  }
}
