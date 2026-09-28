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
  BadRequestException,
} from "@nestjs/common";

import type { Request } from "express";

import {
  FileInterceptor,
} from "@nestjs/platform-express";

import {
  diskStorage,
} from "multer";

import {
  extname,
} from "path";

import {
  existsSync,
  mkdirSync,
} from "fs";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

import {
  AdvertisementService,
} from "../services/advertisement.service";

import {
  AnalyticsService,
} from "../services/analytics.service";

import {
  CreateAdDto,
} from "../dto/create-ad.dto";

import {
  UpdateAdDto,
} from "../dto/update-ad.dto";

import {
  AdEventType,
} from "../schemas/ad-event.schema";


/* ============================================================
   AD UPLOAD DIRECTORY
============================================================ */

const uploadDirectory =
  "./uploads/ads";


if (
  !existsSync(
    uploadDirectory,
  )
) {
  mkdirSync(
    uploadDirectory,
    {
      recursive:
        true,
    },
  );
}


/* ============================================================
   CREATE SAFE FILE NAME
============================================================ */

function createFileName(
  file: Express.Multer.File,
): string {

  const extension =
    extname(
      file.originalname,
    ).toLowerCase();


  const timestamp =
    Date.now();


  const random =
    Math.round(
      Math.random() *
        1e9,
    );


  return `${timestamp}-${random}${extension}`;
}


/* ============================================================
   ADS CONTROLLER
============================================================ */

@Controller(
  "marketing/ads",
)
@UseGuards(
  JwtAuthGuard,
)
export class AdsController {

  constructor(
    private readonly advertisementService:
      AdvertisementService,

    private readonly analyticsService:
      AnalyticsService,
  ) {}


  /* ==========================================================
     UPLOAD ADVERTISEMENT MEDIA

     POST /marketing/ads/upload

     Supported:

       JPG
       JPEG
       PNG
       WebP
       MP4
       WebM
       MOV

     Maximum:

       50 MB
  ========================================================== */

  @Post("upload")
  @UseInterceptors(
    FileInterceptor(
      "file",
      {
        storage:
          diskStorage({
            destination:
              uploadDirectory,

            filename:
              (
                _req,
                file,
                callback,
              ) => {

                callback(
                  null,
                  createFileName(
                    file,
                  ),
                );

              },
          }),

        limits: {
          fileSize:
            50 *
            1024 *
            1024,
        },

        fileFilter:
          (
            _req,
            file,
            callback,
          ) => {

            const allowedMimeTypes = [

              "image/jpeg",

              "image/png",

              "image/webp",

              "video/mp4",

              "video/webm",

              "video/quicktime",

            ];


            if (
              !allowedMimeTypes.includes(
                file.mimetype,
              )
            ) {

              return callback(
                new BadRequestException(
                  "Unsupported advertisement file type. Use JPG, PNG, WebP, MP4, WebM, or MOV.",
                ),
                false,
              );

            }


            callback(
              null,
              true,
            );

          },
      },
    ),
  )
  async uploadMedia(
    @Req()
    req: Request,

    @UploadedFile()
    file:
      Express.Multer.File,
  ) {

    if (!file) {

      throw new BadRequestException(
        "Advertisement media file is required.",
      );

    }


    const host =
      req.get(
        "host",
      );


    const protocol =
      req.protocol;


    const baseUrl =
      `${protocol}://${host}`;


    const mediaUrl =
      `${baseUrl}/uploads/ads/${file.filename}`;


    const isVideo =
      file.mimetype.startsWith(
        "video/",
      );


    const isImage =
      file.mimetype.startsWith(
        "image/",
      );


    return {

      success:
        true,

      url:
        mediaUrl,

      mediaUrl:
        mediaUrl,

      fileUrl:
        mediaUrl,

      filename:
        file.filename,

      originalName:
        file.originalname,

      mimeType:
        file.mimetype,

      size:
        file.size,

      type:
        isVideo
          ? "VIDEO"
          : isImage
            ? "IMAGE"
            : "UNKNOWN",

    };

  }


  /* ==========================================================
     CREATE ADVERTISEMENT

     POST /marketing/ads

     MULTI-PLACEMENT

     Example request:

     {
       "campaignId": "...",
       "name": "Summer Campaign",
       "type": "VIDEO",
       "headline": "Shop Now",
       "placements": [
         "FEED",
         "FEED_RAIL",
         "STORY",
         "MARKETPLACE_BANNER"
       ]
     }

     One advertisement can therefore be delivered
     to multiple Fockis surfaces.
  ========================================================== */

  @Post()
  async create(
    @Req()
    req: Request,

    @Body()
    dto: CreateAdDto,
  ) {

    return this.advertisementService.create(

      this.getUserId(
        req,
      ),

      dto,

    );

  }


  /* ==========================================================
     GET MY ADVERTISEMENTS

     GET /marketing/ads
  ========================================================== */

  @Get()
  async findMine(
    @Req()
    req: Request,
  ) {

    return this.advertisementService.findMine(

      this.getUserId(
        req,
      ),

    );

  }


  /* ==========================================================
     GET ADS FOR CAMPAIGN

     GET /marketing/ads/campaign/:campaignId
  ========================================================== */

  @Get(
    "campaign/:campaignId",
  )
  async findByCampaign(

    @Req()
    req: Request,

    @Param(
      "campaignId",
    )
    campaignId: string,

  ) {

    return this.advertisementService.findByCampaign(

      this.getUserId(
        req,
      ),

      campaignId,

    );

  }


  /* ==========================================================
     GET ONE ADVERTISEMENT

     GET /marketing/ads/:id
  ========================================================== */

  @Get(
    ":id",
  )
  async findOne(

    @Req()
    req: Request,

    @Param(
      "id",
    )
    adId: string,

  ) {

    return this.advertisementService.findOne(

      this.getUserId(
        req,
      ),

      adId,

    );

  }


  /* ==========================================================
     UPDATE ADVERTISEMENT

     PATCH /marketing/ads/:id
  ========================================================== */

  @Patch(
    ":id",
  )
  async update(

    @Req()
    req: Request,

    @Param(
      "id",
    )
    adId: string,

    @Body()
    dto: UpdateAdDto,

  ) {

    return this.advertisementService.update(

      this.getUserId(
        req,
      ),

      adId,

      dto,

    );

  }


  /* ==========================================================
     ACTIVATE ADVERTISEMENT

     POST /marketing/ads/:id/activate
  ========================================================== */

  @Post(
    ":id/activate",
  )
  async activate(

    @Req()
    req: Request,

    @Param(
      "id",
    )
    adId: string,

  ) {

    return this.advertisementService.activate(

      this.getUserId(
        req,
      ),

      adId,

    );

  }


  /* ==========================================================
     PAUSE ADVERTISEMENT

     POST /marketing/ads/:id/pause
  ========================================================== */

  @Post(
    ":id/pause",
  )
  async pause(

    @Req()
    req: Request,

    @Param(
      "id",
    )
    adId: string,

  ) {

    return this.advertisementService.pause(

      this.getUserId(
        req,
      ),

      adId,

    );

  }


  /* ==========================================================
     DELETE ADVERTISEMENT

     DELETE /marketing/ads/:id
  ========================================================== */

  @Delete(
    ":id",
  )
  async remove(

    @Req()
    req: Request,

    @Param(
      "id",
    )
    adId: string,

  ) {

    return this.advertisementService.remove(

      this.getUserId(
        req,
      ),

      adId,

    );

  }


  /* ==========================================================
     RECORD AD EVENT

     POST /marketing/ads/:id/event
  ========================================================== */

  @Post(
    ":id/event",
  )
  async recordEvent(

    @Req()
    req: Request,

    @Param(
      "id",
    )
    adId: string,

    @Body()
    body: {

      campaignId:
        string;

      type:
        AdEventType;

      sessionId?:
        string;

      placement?:
        string;

      source?:
        string;

      deviceType?:
        string;

      country?:
        string;

      state?:
        string;

      city?:
        string;

      cost?:
        number;

      revenue?:
        number;

      metadata?:
        Record<
          string,
          unknown
        >;

    },

  ) {

    return this.analyticsService.recordEvent({

      adId,

      userId:
        this.getUserId(
          req,
        ),

      ...body,

    });

  }


  /* ==========================================================
     AUTHENTICATED USER ID
  ========================================================== */

  private getUserId(
    req: Request,
  ): string {

    const user =
      req.user as
        | {

            id?:
              string;

            _id?:
              string;

            userId?:
              string;

            sub?:
              string;

          }
        | undefined;


    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;


    if (
      !userId
    ) {

      throw new Error(
        "Authenticated user ID is missing from the request.",
      );

    }


    return String(
      userId,
    );

  }

}