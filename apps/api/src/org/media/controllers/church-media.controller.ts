/**
 * church-media.controller.ts
 * -----------------------------------------------------------------------------
 * Documents & Media library, under /organizations/:organizationId/media.
 *
 *   GET    /                list (what the viewer may see; managers get drafts)
 *   GET    /:mediaId        one item
 *   POST   /upload          multipart "file" → { fileUrl, fileName, mimeType,
 *                           fileSize, mediaType }   (managers)
 *   POST   /                create from an uploaded file or a web link
 *   PATCH  /:mediaId        edit (managers)
 *   PUT    /:mediaId        same as PATCH (older web screens)
 *   DELETE /:mediaId        delete, with its uploaded files (managers)
 *
 * Authorization is checked in ChurchMediaService.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { mkdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

import type { Request } from "express";

import {
  ChurchMediaService,
  MEDIA_MAX_BYTES,
  MEDIA_UPLOAD_ROOT,
  MEDIA_UPLOAD_TYPES,
  type ListMediaQuery,
} from "../services/church-media.service";

import { CreateMediaDto } from "../dto/create-media.dto";
import { UpdateMediaDto } from "../dto/update-media.dto";

const INCOMING = join(MEDIA_UPLOAD_ROOT, "_incoming");

function optionalUserId(req: Request): string | undefined {
  const user = (req as any).user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = user?.id ?? user?._id ?? user?.userId;
  return id ? String(id) : undefined;
}

function requiredUserId(req: Request): string {
  const id = optionalUserId(req);
  if (!id) throw new UnauthorizedException("Sign in to continue.");
  return id;
}

@Controller("organizations/:organizationId/media")
export class ChurchMediaController {
  constructor(private readonly mediaService: ChurchMediaService) {}

  @Get()
  list(@Param("organizationId") organizationId: string, @Query() query: ListMediaQuery & Record<string, string>, @Req() req: Request) {
    return this.mediaService.listByOrganization(
      organizationId,
      {
        page: query.page ? Number(query.page) : undefined,
        pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        search: query.search,
        mediaType: query.mediaType,
        category: query.category,
        status: query.status,
      },
      optionalUserId(req),
    );
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            mkdirSync(INCOMING, { recursive: true });
            cb(null, INCOMING);
          } catch (error) {
            cb(error as Error, INCOMING);
          }
        },
        filename: (req, file, cb) => {
          const orgId = String((req.params as Record<string, string>).organizationId ?? "");
          const kind = MEDIA_UPLOAD_TYPES[String(file.mimetype ?? "").toLowerCase()];
          if (!/^[a-f0-9]{24}$/i.test(orgId) || !kind) {
            cb(new BadRequestException("This file cannot be uploaded."), "");
            return;
          }
          cb(null, `${orgId.toLowerCase()}-${Date.now()}-${randomBytes(4).toString("hex")}.${kind.ext}`);
        },
      }),
      limits: { fileSize: MEDIA_MAX_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!MEDIA_UPLOAD_TYPES[String(file.mimetype ?? "").toLowerCase()]) {
          cb(
            new BadRequestException(
              "Supported files: photos (JPG, PNG, WebP, GIF, HEIC), videos (MP4, WebM, MOV), audio (MP3, M4A, WAV, OGG) and documents (PDF, Word, PowerPoint, Excel, TXT, CSV).",
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@Param("organizationId") organizationId: string, @UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.mediaService.storeUpload(organizationId, requiredUserId(req), file);
  }

  @Get(":mediaId")
  getOne(@Param("organizationId") organizationId: string, @Param("mediaId") mediaId: string, @Req() req: Request) {
    return this.mediaService.getById(organizationId, mediaId, optionalUserId(req));
  }

  @Post()
  create(@Param("organizationId") organizationId: string, @Body() dto: CreateMediaDto, @Req() req: Request) {
    return this.mediaService.create(organizationId, dto, requiredUserId(req));
  }

  @Patch(":mediaId")
  update(@Param("organizationId") organizationId: string, @Param("mediaId") mediaId: string, @Body() dto: UpdateMediaDto, @Req() req: Request) {
    return this.mediaService.update(organizationId, mediaId, dto, requiredUserId(req));
  }

  @Put(":mediaId")
  replace(@Param("organizationId") organizationId: string, @Param("mediaId") mediaId: string, @Body() dto: UpdateMediaDto, @Req() req: Request) {
    return this.mediaService.update(organizationId, mediaId, dto, requiredUserId(req));
  }

  @Delete(":mediaId")
  remove(@Param("organizationId") organizationId: string, @Param("mediaId") mediaId: string, @Req() req: Request) {
    return this.mediaService.remove(organizationId, mediaId, requiredUserId(req));
  }
}
