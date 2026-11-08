import { Body, Controller, Get, Param, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { mkdirSync } from "fs";
import { extname } from "path";
import { randomUUID } from "crypto";

import { AcademyJwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ReviewSubmissionDto } from "../dto/studio.dto";
import { AssignmentsService, MAX_SUBMISSION_BYTES, MAX_SUBMISSION_FILES } from "../services/assignments.service";
import type { AcademyActor } from "../services/studio.service";

type AuthedReq = { user: AcademyActor };

const TMP_DIR = "./uploads/academy-tmp";
const uploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(TMP_DIR, { recursive: true });
      cb(null, TMP_DIR);
    },
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_SUBMISSION_BYTES, files: MAX_SUBMISSION_FILES },
};

/** "1,2" → [1, 2] (positions of previously attached files the learner keeps). */
function parseKeep(value?: string): number[] {
  return String(value ?? "")
    .split(",")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < MAX_SUBMISSION_FILES);
}

/** Learner: hand in homework. */
@Controller("academy/learn")
@UseGuards(AcademyJwtAuthGuard)
export class LearnAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get(":code/lessons/:key/submission")
  mine(@Req() req: AuthedReq, @Param("code") code: string, @Param("key") key: string) {
    return this.assignments.mine(code, key, req.user);
  }

  /** multipart/form-data: text, keep ("0,1"), files (up to 3). */
  @Post(":code/lessons/:key/submission")
  @UseInterceptors(FilesInterceptor("files", MAX_SUBMISSION_FILES, uploadOptions))
  submit(
    @Req() req: AuthedReq,
    @Param("code") code: string,
    @Param("key") key: string,
    @Body() body: { text?: string; keep?: string },
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.assignments.submit(code, key, body?.text, parseKeep(body?.keep), files ?? [], req.user);
  }

  @Get("submissions/:id/files/:index")
  file(@Req() req: AuthedReq, @Param("id") id: string, @Param("index") index: string) {
    return this.assignments.fileUrl(id, Number(index), req.user);
  }
}

/** Class owner: review homework. */
@Controller("academy/studio")
@UseGuards(AcademyJwtAuthGuard)
export class StudioAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get("courses/:code/submissions")
  list(@Req() req: AuthedReq, @Param("code") code: string, @Query("status") status?: string) {
    return this.assignments.listForOwner(code, req.user, status);
  }

  @Post("courses/:code/submissions/:id/review")
  review(@Req() req: AuthedReq, @Param("code") code: string, @Param("id") id: string, @Body() dto: ReviewSubmissionDto) {
    return this.assignments.review(code, id, dto.action, dto.grade, dto.feedback, req.user);
  }

  @Get("courses/:code/submissions/:id/files/:index")
  file(@Req() req: AuthedReq, @Param("code") code: string, @Param("id") id: string, @Param("index") index: string) {
    return this.assignments.fileUrl(id, Number(index), req.user, code);
  }
}
