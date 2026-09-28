import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  ========================================================================== */

  @Public()
  @Get()
  getAll() {
    return this.businessesService.findPublic();
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
  ========================================================================== */

  @Public()
  @Get(":id")
  getOne(
    @Param("id") id: string,
  ) {
    return this.businessesService.findOne(
      id,
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
    );
  }


  /* ==========================================================================
     PUBLISH BUSINESS

     POST:
       /businesses/:id/publish

     Publishes the selected business.

     No request body is required.

     The service receives:
       published = true
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

     Removes the selected business from the public/Feed publishing state.

     No request body is required.

     The service receives:
       published = false
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
    FileInterceptor(
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
              extension ||
              ".jpg";

            const filename =
              `cover-${Date.now()}-${Math.round(
                Math.random() *
                  1_000_000,
              )}${safeExtension}`;

            callback(
              null,
              filename,
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

          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ];

          if (
            allowedTypes.includes(
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
            new Error(
              "Only JPG, PNG, WEBP, and GIF images are allowed.",
            ),
            false,
          );
        },
      },
    ),
  )
  async uploadCoverImage(
    @Req() req: any,
    @Param("id") businessId: string,
    @UploadedFile()
    file: Express.Multer.File,
  ) {

    if (!file) {
      return {
        success: false,
        message:
          "Please select an image.",
      };
    }

    return this.businessesService.setCoverImage(
      req.user.id,
      businessId,
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

     The business ID is included in the route so the frontend can update
     a deal belonging to the selected business.
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
    );
  }


  /* ==========================================================================
     TRACK BUSINESS VIEW
  ========================================================================== */

  @Post(":id/view")
  trackView(
    @Param("id") id: string,
  ) {
    return this.businessesService.trackView(
      id,
    );
  }


  /* ==========================================================================
     TRACK WEBSITE CLICK
  ========================================================================== */

  @Post(":id/website-click")
  trackWebsiteClick(
    @Param("id") id: string,
  ) {
    return this.businessesService.trackWebsiteClick(
      id,
    );
  }
}