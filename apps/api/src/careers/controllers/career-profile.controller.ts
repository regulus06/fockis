import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request } from "express";

import {
  CareerProfileService,
  RESUME_MAX_BYTES,
  type UploadedResumeFile,
} from "../services/career-profile.service";

import { CreateJobAlertDto, UpdateCareerProfileDto } from "../dto/career-profile.dto";

type AuthenticatedRequest = Request & {
  user?: { id?: string; _id?: string; userId?: string; sub?: string };
};

/**
 * JOB SEEKER CAREER PROFILE
 *
 * GET    /careers/profile
 * PUT    /careers/profile
 * POST   /careers/profile/resume            (multipart "file")
 * GET    /careers/profile/resume/url        (short-lived signed link)
 * DELETE /careers/profile/resume
 * GET    /careers/profile/alerts
 * POST   /careers/profile/alerts
 * PATCH  /careers/profile/alerts/:id/viewed
 * DELETE /careers/profile/alerts/:id
 *
 * Authentication comes from the global JwtAuthGuard.
 */
@Controller("careers/profile")
export class CareerProfileController {
  constructor(private readonly profiles: CareerProfileService) {}

  @Get()
  getMine(@Req() req: AuthenticatedRequest) {
    return this.profiles.getMine(this.userId(req));
  }

  @Put()
  update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateCareerProfileDto) {
    return this.profiles.update(this.userId(req), dto);
  }

  @Post("resume")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: RESUME_MAX_BYTES, files: 1 },
    }),
  )
  uploadResume(@Req() req: AuthenticatedRequest, @UploadedFile() file?: UploadedResumeFile) {
    return this.profiles.uploadResume(this.userId(req), file);
  }

  @Get("resume/url")
  resumeUrl(@Req() req: AuthenticatedRequest) {
    return this.profiles.resumeUrl(this.userId(req));
  }

  @Delete("resume")
  deleteResume(@Req() req: AuthenticatedRequest) {
    return this.profiles.deleteResume(this.userId(req));
  }

  @Get("alerts")
  alerts(@Req() req: AuthenticatedRequest) {
    return this.profiles.listAlerts(this.userId(req));
  }

  @Post("alerts")
  createAlert(@Req() req: AuthenticatedRequest, @Body() dto: CreateJobAlertDto) {
    return this.profiles.createAlert(this.userId(req), dto);
  }

  @Patch("alerts/:id/viewed")
  markViewed(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.profiles.markAlertViewed(this.userId(req), id);
  }

  @Delete("alerts/:id")
  deleteAlert(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.profiles.deleteAlert(this.userId(req), id);
  }

  private userId(req: AuthenticatedRequest) {
    const id = req.user?.id ?? req.user?._id ?? req.user?.userId ?? req.user?.sub;
    if (typeof id !== "string" || !id.trim()) {
      throw new UnauthorizedException("You must be logged in to use your career profile.");
    }
    return id.trim();
  }
}
