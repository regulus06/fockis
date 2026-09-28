import {
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CreateOcrService } from '../services/create-ocr.service';

import { OcrDocumentDto } from '../dto/ocr-document.dto';

@ApiTags('create-ocr')
@ApiBearerAuth()
@Controller('create/ocr')
export class CreateOcrController {
  constructor(
    private readonly ocrService: CreateOcrService,
  ) {}

  /**
   * Run OCR on a scan.
   */
  @Post(':id')
  async runOcr(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: OcrDocumentDto,
  ) {
    return this.ocrService.runOcr(
      id,
      userId,
      dto.language,
    );
  }

  /**
   * Run handwriting OCR on a scan.
   */
  @Post(':id/handwriting')
  async runHandwriting(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: OcrDocumentDto,
  ) {
    return this.ocrService.runHandwriting(
      id,
      userId,
      dto.language,
    );
  }

  /**
   * Get OCR/scan result.
   */
  @Post(':id/result')
  async getResult(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.ocrService.getById(
      id,
      userId,
    );
  }
}