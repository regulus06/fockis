import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";

import {
  FilesInterceptor,
} from "@nestjs/platform-express";

import type {
  Request,
} from "express";

import {
  UploadsService,
} from "./uploads.service";

import {
  multerMessageOptions,
} from "./uploads/multer.config";

import {
  JwtAuthGuard,
} from "../auth/jwt-auth.guard";

@Controller("messages/uploads")
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor(
      "files",
      10,
      multerMessageOptions,
    ),
  )
  upload(
    @Req() _req: Request,

    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    if (
      !files ||
      files.length === 0
    ) {
      throw new BadRequestException(
        "No files uploaded",
      );
    }

    const attachments = files.map(
      (file) => {
        const kind =
          this.uploadsService.validateFile(
            file,
          );

        return this.uploadsService.buildAttachment(
          file,
          kind,
        );
      },
    );

    /*
     * The frontend currently uploads one
     * voice file at a time and expects one
     * attachment object.
     *
     * Keep the endpoint compatible with
     * multiple uploads while returning a
     * single attachment for a single file.
     */
    if (attachments.length === 1) {
      return attachments[0];
    }

    return attachments;
  }
}