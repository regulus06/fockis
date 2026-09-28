import {
  Body,
  Controller,
  Param,
  Post,
  Req,
} from "@nestjs/common";

import { DocumentPdfService } from "../services/document-pdf.service";
import { CreatePdfDto } from "../dto/create-pdf.dto";

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
export class DocumentPdfController {
  constructor(
    private readonly pdfService: DocumentPdfService,
  ) {}

  @Post(":id/pdf")
  async createPdf(
    @Param("id") id: string,
    @Body() dto: CreatePdfDto,
    @Req() req: any,
  ) {
    return this.pdfService.createPdf(
      getUserId(req),
      id,
      dto.title,
    );
  }
}