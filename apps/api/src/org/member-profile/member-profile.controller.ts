/**
 * member-profile.controller.ts
 * -----------------------------------------------------------------------------
 * Church member profile dashboard.
 * Base: /church/organizations/:organizationId/members/:memberId/profile
 *
 *   GET    /                      everything the profile page shows
 *   PATCH  /                      personal / membership / spiritual / family
 *   POST   /ministries            assign to an existing ministry
 *   DELETE /ministries/:deptId    remove from a ministry
 *   POST   /history               add a milestone or record
 *   DELETE /history/:entryId
 *   POST   /notes                 administrative or pastoral note
 *   DELETE /notes/:noteId
 *   POST   /documents             multipart "file" (PDF / image) + fields
 *   DELETE /documents/:documentId
 *   POST   /certificates          issue a membership / baptism / confirmation certificate
 *
 * Name, contact, status, role and removal keep using the existing member
 * endpoints. Every permission check is in MemberProfileService.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
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

import { MEDIA_UPLOAD_ROOT } from "../media/services/church-media.service";
import {
  AddHistoryDto,
  AddNoteDto,
  AssignMinistryDto,
  CertificateDto,
  DocumentFieldsDto,
  UpdateMemberProfileDto,
} from "./member-profile.dto";
import { MemberProfileService } from "./member-profile.service";

const INCOMING = join(MEDIA_UPLOAD_ROOT, "_incoming");
const DOC_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function userIdOf(req: Request): string {
  const user = req.user as { id?: string; _id?: string } | undefined;
  const id = user?.id ?? user?._id;
  if (!id) throw new UnauthorizedException("Please sign in.");
  return String(id);
}

@Controller("organizations/:organizationId/members/:memberId/profile")
export class MemberProfileController {
  constructor(private readonly profiles: MemberProfileService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  get(@Param("organizationId") o: string, @Param("memberId") m: string, @Req() req: Request) {
    return this.profiles.getProfile(o, m, userIdOf(req));
  }

  @Patch()
  update(@Param("organizationId") o: string, @Param("memberId") m: string, @Body() dto: UpdateMemberProfileDto, @Req() req: Request) {
    return this.profiles.update(o, m, userIdOf(req), dto);
  }

  @Post("ministries")
  assign(@Param("organizationId") o: string, @Param("memberId") m: string, @Body() dto: AssignMinistryDto, @Req() req: Request) {
    return this.profiles.assignMinistry(o, m, userIdOf(req), dto);
  }

  @Delete("ministries/:departmentId")
  unassign(@Param("organizationId") o: string, @Param("memberId") m: string, @Param("departmentId") d: string, @Req() req: Request) {
    return this.profiles.removeMinistry(o, m, userIdOf(req), d);
  }

  @Post("history")
  addHistory(@Param("organizationId") o: string, @Param("memberId") m: string, @Body() dto: AddHistoryDto, @Req() req: Request) {
    return this.profiles.addHistory(o, m, userIdOf(req), dto);
  }

  @Delete("history/:entryId")
  removeHistory(@Param("organizationId") o: string, @Param("memberId") m: string, @Param("entryId") id: string, @Req() req: Request) {
    return this.profiles.removeHistory(o, m, userIdOf(req), id);
  }

  @Post("notes")
  addNote(@Param("organizationId") o: string, @Param("memberId") m: string, @Body() dto: AddNoteDto, @Req() req: Request) {
    return this.profiles.addNote(o, m, userIdOf(req), dto);
  }

  @Delete("notes/:noteId")
  removeNote(@Param("organizationId") o: string, @Param("memberId") m: string, @Param("noteId") id: string, @Req() req: Request) {
    return this.profiles.removeNote(o, m, userIdOf(req), id);
  }

  @Post("documents")
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
          const ext = DOC_EXT[String(file.mimetype ?? "").toLowerCase()];
          if (!/^[a-f0-9]{24}$/i.test(orgId) || !ext) {
            cb(new BadRequestException("This file cannot be uploaded."), "");
            return;
          }
          cb(null, `${orgId.toLowerCase()}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!DOC_EXT[String(file.mimetype ?? "").toLowerCase()]) {
          cb(new BadRequestException("Upload a PDF, JPG, PNG or WebP file."), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @Param("organizationId") o: string,
    @Param("memberId") m: string,
    @Body() dto: DocumentFieldsDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.profiles.uploadDocument(o, m, userIdOf(req), dto, file);
  }

  @Delete("documents/:documentId")
  removeDocument(@Param("organizationId") o: string, @Param("memberId") m: string, @Param("documentId") id: string, @Req() req: Request) {
    return this.profiles.removeDocument(o, m, userIdOf(req), id);
  }

  @Post("certificates")
  certificate(@Param("organizationId") o: string, @Param("memberId") m: string, @Body() dto: CertificateDto, @Req() req: Request) {
    return this.profiles.issueCertificate(o, m, userIdOf(req), dto);
  }
}
