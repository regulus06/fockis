import {
  Body,
  Controller,
  Param,
  Post,
  Req,
} from "@nestjs/common";

import { DocumentProcessingService } from "../services/document-processing.service";
import { EnhanceDocumentDto } from "../dto/enhance-document.dto";

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
export class DocumentProcessingController {
  constructor(
    private readonly processingService: DocumentProcessingService,
  ) {}

  @Post(":id/enhance")
  async enhance(
    @Param("id") id: string,
    @Body() dto: EnhanceDocumentDto,
    @Req() req: any,
  ) {
    return this.processingService.enhance(
      getUserId(req),
      id,
      dto,
    );
  }

  @Post(":id/crop")
  async crop(
    @Param("id") id: string,
    @Body()
    body: {
      left: number;
      top: number;
      width: number;
      height: number;
    },
    @Req() req: any,
  ) {
    return this.processingService.crop(
      getUserId(req),
      id,
      body.left,
      body.top,
      body.width,
      body.height,
    );
  }

  @Post(":id/background-removal")
  async backgroundRemoval(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.processingService.removeBackground(
      getUserId(req),
      id,
    );
  }
}