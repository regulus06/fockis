import {
  Body,
  Controller,
  Param,
  Post,
  Req,
} from "@nestjs/common";

import { DocumentOcrService } from "../services/document-ocr.service";
import { OcrDocumentDto } from "../dto/ocr-document.dto";

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

@Controller("document-scanner")
export class DocumentOcrController {
  constructor(
    private readonly ocrService: DocumentOcrService,
  ) {}

  @Post(":id/ocr")
  async ocr(
    @Param("id") id: string,
    @Body() dto: OcrDocumentDto,
    @Req() req: any,
  ) {
    return this.ocrService.process(
      getUserId(req),
      id,
      dto.language || "eng",
    );
  }

  @Post(":id/handwriting-ocr")
  async handwritingOcr(
    @Param("id") id: string,
    @Body() dto: OcrDocumentDto,
    @Req() req: any,
  ) {
    return this.ocrService.process(
      getUserId(req),
      id,
      dto.language || "eng",
    );
  }
}