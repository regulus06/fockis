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
  UseInterceptors,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";

import { diskStorage } from "multer";
import path from "path";
import fs from "fs";

import { DocumentScannerService } from "../services/document-scanner.service";
import { ScanDocumentDto } from "../dto/scan-document.dto";
import { UpdateDocumentDto } from "../dto/update-document.dto";

function getUserId(req: any): string {
  const userId =
    req.user?.userId ||
    req.user?.id ||
    req.user?._id;

  if (!userId) {
    throw new Error(
      "Authenticated user ID was not found",
    );
  }

  return String(userId);
}

const uploadDirectory =
  path.join(
    process.cwd(),
    "uploads",
    "documents",
  );

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

@Controller("document-scanner")
export class DocumentScannerController {
  constructor(
    private readonly scannerService: DocumentScannerService,
  ) {}

  @Post("scan")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: uploadDirectory,
        filename: (
          _req,
          file,
          callback,
        ) => {
          const extension =
            path.extname(
              file.originalname,
            );

          const name =
            `${Date.now()}-${Math.round(
              Math.random() * 1e9,
            )}${extension}`;

          callback(null, name);
        },
      }),
      limits: {
        fileSize:
          25 * 1024 * 1024,
      },
    }),
  )
  async scan(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ScanDocumentDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new Error(
        "A document file is required",
      );
    }

    return this.scannerService.create(
      getUserId(req),
      file,
      dto,
    );
  }

  @Get(":id")
  async get(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.scannerService.findById(
      getUserId(req),
      id,
    );
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    return this.scannerService.update(
      getUserId(req),
      id,
      dto,
    );
  }

  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.scannerService.delete(
      getUserId(req),
      id,
    );
  }
}