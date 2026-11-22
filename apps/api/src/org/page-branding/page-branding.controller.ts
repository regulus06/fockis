/**
 * page-branding.controller.ts
 * -----------------------------------------------------------------------------
 * Per-page thumbnails, banners and logos.
 * Base: /church/organizations/:organizationId/page-branding
 *
 *   GET    /                         published look of every page   (public)
 *   GET    /manage                   drafts + canEdit               (signed in)
 *   POST   /upload                   multipart "file" (image)       (editors)
 *   PUT    /:pageKey                 save draft  { resourceId?, content }
 *   POST   /:pageKey/publish         publish     { resourceId?, content? }
 *   POST   /:pageKey/restore         restore the previous version
 *   POST   /:pageKey/discard         drop unpublished changes
 *   POST   /:pageKey/reset           back to the default icon (restorable)
 *
 * Permission checks happen in PageBrandingService.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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

import { Public } from "../../auth/public.decorator";
import { MEDIA_UPLOAD_ROOT } from "../media/services/church-media.service";
import { PageBrandingBodyDto, PageBrandingTargetDto } from "./page-branding.dto";
import { PageBrandingService } from "./page-branding.service";

const INCOMING = join(MEDIA_UPLOAD_ROOT, "_incoming");
/** Browser-renderable images only (the editor always uploads one of these). */
const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function userIdOf(req: Request): string {
  const user = req.user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = user?.id ?? user?.userId ?? user?._id;
  if (!id || String(id).trim() === "") throw new UnauthorizedException("Please sign in.");
  return String(id);
}

@Controller("organizations/:organizationId/page-branding")
export class PageBrandingController {
  constructor(private readonly branding: PageBrandingService) {}

  @Public()
  @Get()
  published(@Param("organizationId") organizationId: string) {
    return this.branding.listPublished(organizationId);
  }

  @Get("manage")
  manage(@Param("organizationId") organizationId: string, @Req() req: Request) {
    return this.branding.listManaged(organizationId, userIdOf(req));
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
          const ext = IMAGE_EXT[String(file.mimetype ?? "").toLowerCase()];
          if (!/^[a-f0-9]{24}$/i.test(orgId) || !ext) {
            cb(new BadRequestException("This image cannot be uploaded."), "");
            return;
          }
          cb(null, `${orgId.toLowerCase()}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`);
        },
      }),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_EXT[String(file.mimetype ?? "").toLowerCase()]) {
          cb(new BadRequestException("Choose a JPG, PNG, WebP or GIF image."), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@Param("organizationId") organizationId: string, @UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.branding.upload(organizationId, userIdOf(req), file);
  }

  @Put(":pageKey")
  saveDraft(@Param("organizationId") o: string, @Param("pageKey") k: string, @Body() body: PageBrandingBodyDto, @Req() req: Request) {
    return this.branding.saveDraft(o, userIdOf(req), k, body.resourceId, body.content);
  }

  @Post(":pageKey/publish")
  publish(@Param("organizationId") o: string, @Param("pageKey") k: string, @Body() body: PageBrandingBodyDto, @Req() req: Request) {
    return this.branding.publish(o, userIdOf(req), k, body.resourceId, body.content);
  }

  @Post(":pageKey/restore")
  restore(@Param("organizationId") o: string, @Param("pageKey") k: string, @Body() body: PageBrandingTargetDto, @Req() req: Request) {
    return this.branding.restorePrevious(o, userIdOf(req), k, body.resourceId);
  }

  @Post(":pageKey/discard")
  discard(@Param("organizationId") o: string, @Param("pageKey") k: string, @Body() body: PageBrandingTargetDto, @Req() req: Request) {
    return this.branding.discardDraft(o, userIdOf(req), k, body.resourceId);
  }

  @Post(":pageKey/reset")
  reset(@Param("organizationId") o: string, @Param("pageKey") k: string, @Body() body: PageBrandingTargetDto, @Req() req: Request) {
    return this.branding.resetToDefault(o, userIdOf(req), k, body.resourceId);
  }
}
