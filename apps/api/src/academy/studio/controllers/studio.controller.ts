import {
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
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { mkdirSync } from "fs";
import { extname } from "path";
import { randomUUID } from "crypto";

import { AcademyJwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { OptionalAcademyAuthGuard } from "../guards/optional-academy-auth.guard";
import { AcademyActor, StudioService } from "../services/studio.service";
import { ClaimPaymentDto, CreatorApplyDto, QuizAnswersDto, SaveStudioCourseDto } from "../dto/studio.dto";

type AuthedReq = { user: AcademyActor };
type MaybeReq = { user: AcademyActor | null };

const TMP_DIR = "./uploads/academy-tmp";

/**
 * Creator Studio — any signed-in Academy account (a person or a business such
 * as "Bell Bakery") can publish courses, seminars, workshops and live classes.
 * Ownership is enforced in StudioService.
 */
@Controller("academy/studio")
@UseGuards(AcademyJwtAuthGuard)
export class StudioController {
  constructor(private readonly studio: StudioService) {}

  /** Am I allowed to teach? (approved creator, or staff of an approved school) */
  @Get("creator")
  creator(@Req() req: AuthedReq) {
    return this.studio.creatorAccess(req.user);
  }

  /** Apply to become a creator; a Fockis administrator reviews it. */
  @Post("creator/apply")
  apply(@Req() req: AuthedReq, @Body() dto: CreatorApplyDto) {
    return this.studio.applyAsCreator(dto, req.user);
  }

  @Get("schools")
  schools(@Req() req: AuthedReq) {
    return this.studio.mySchools(req.user);
  }

  @Get("courses")
  mine(@Req() req: AuthedReq) {
    return this.studio.listMine(req.user);
  }

  @Post("courses")
  create(@Req() req: AuthedReq, @Body() dto: SaveStudioCourseDto) {
    return this.studio.create(dto, req.user);
  }

  @Get("courses/:code")
  get(@Req() req: AuthedReq, @Param("code") code: string) {
    return this.studio.getForEditor(code, req.user);
  }

  @Patch("courses/:code")
  update(@Req() req: AuthedReq, @Param("code") code: string, @Body() dto: SaveStudioCourseDto) {
    return this.studio.update(code, dto, req.user);
  }

  @Delete("courses/:code")
  remove(@Req() req: AuthedReq, @Param("code") code: string) {
    return this.studio.remove(code, req.user);
  }

  @Get("courses/:code/learners")
  learners(@Req() req: AuthedReq, @Param("code") code: string) {
    return this.studio.learners(code, req.user);
  }

  /** multipart/form-data, field "file"; ?kind=video|pdf|image */
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(TMP_DIR, { recursive: true });
          cb(null, TMP_DIR);
        },
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB
    }),
  )
  upload(@Req() req: AuthedReq, @UploadedFile() file: Express.Multer.File, @Query("kind") kind: string) {
    return this.studio.upload(file, String(kind || ""), req.user);
  }
}

/** Learner side of Creator Studio classes. */
@Controller("academy/learn")
export class LearnController {
  constructor(private readonly studio: StudioService) {}

  @Get("mine")
  @UseGuards(AcademyJwtAuthGuard)
  mine(@Req() req: AuthedReq) {
    return this.studio.myLearning(req.user);
  }

  @Get(":code")
  @UseGuards(OptionalAcademyAuthGuard)
  page(@Req() req: MaybeReq, @Param("code") code: string) {
    return this.studio.coursePage(code, req.user ?? null);
  }

  @Post(":code/enroll")
  @UseGuards(AcademyJwtAuthGuard)
  enroll(@Req() req: AuthedReq, @Param("code") code: string) {
    return this.studio.enrollFree(code, req.user);
  }

  @Post(":code/checkout")
  @UseGuards(AcademyJwtAuthGuard)
  checkout(@Req() req: AuthedReq, @Param("code") code: string) {
    return this.studio.checkoutInfo(code, req.user);
  }

  @Post(":code/claim")
  @UseGuards(AcademyJwtAuthGuard)
  claim(@Req() req: AuthedReq, @Param("code") code: string, @Body() dto: ClaimPaymentDto) {
    return this.studio.claim(code, dto.paymentIntentId, req.user);
  }

  @Post(":code/lessons/:key/complete")
  @UseGuards(AcademyJwtAuthGuard)
  complete(@Req() req: AuthedReq, @Param("code") code: string, @Param("key") key: string) {
    return this.studio.completeLesson(code, key, req.user);
  }

  @Post(":code/lessons/:key/quiz")
  @UseGuards(AcademyJwtAuthGuard)
  quiz(@Req() req: AuthedReq, @Param("code") code: string, @Param("key") key: string, @Body() dto: QuizAnswersDto) {
    return this.studio.submitQuiz(code, key, dto.answers, req.user);
  }

  @Get(":code/lessons/:key/file")
  @UseGuards(OptionalAcademyAuthGuard)
  file(@Req() req: MaybeReq, @Param("code") code: string, @Param("key") key: string, @Query("download") download?: string) {
    return this.studio.fileUrl(code, key, download === "1", req.user ?? null);
  }
}
