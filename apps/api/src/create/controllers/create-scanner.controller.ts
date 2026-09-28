import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiBearerAuth,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CreateScannerService } from '../services/create-scanner.service';
import { CreateOcrService } from '../services/create-ocr.service';
import { CreatePassportPhotoService } from '../services/create-passport-photo.service';
import { CreateBackgroundRemovalService } from '../services/create-background-removal.service';

import { ScanDocumentDto } from '../dto/scan-document.dto';
import { PassportPhotoDto } from '../dto/passport-photo.dto';
import { BackgroundRemovalDto } from '../dto/background-removal.dto';
import { HandwritingDto } from '../dto/handwriting.dto';

import {
  documentUploadOptions,
  imageUploadOptions,
} from '../utils/upload.config';

@ApiTags('create-scanner')
@ApiBearerAuth()
@Controller('create/scanner')
export class CreateScannerController {
  constructor(
    private readonly scannerService: CreateScannerService,
    private readonly ocrService: CreateOcrService,
    private readonly passportPhotoService: CreatePassportPhotoService,
    private readonly backgroundRemovalService: CreateBackgroundRemovalService,
  ) {}

  @Get()
  list(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.scannerService.listForUser(
      userId,
      limit ? Number(limit) : undefined,
    );
  }

  @Post('scan')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', documentUploadOptions()),
  )
  scan(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ScanDocumentDto,
  ) {
    return this.scannerService.createScan(
      userId,
      file,
      dto.type,
    );
  }

  @Get(':scanId')
  getScan(
    @CurrentUser('userId') userId: string,
    @Param('scanId') scanId: string,
  ) {
    return this.scannerService.getById(
      scanId,
      userId,
    );
  }

  @Post(':scanId/extract')
  extract(
    @CurrentUser('userId') userId: string,
    @Param('scanId') scanId: string,
  ) {
    return this.scannerService.extract(
      scanId,
      userId,
    );
  }

  @Post(':scanId/create-document')
  createDocument(
    @CurrentUser('userId') userId: string,
    @Param('scanId') scanId: string,
  ) {
    return this.scannerService.createDocumentFromScan(
      scanId,
      userId,
    );
  }

  @Post('handwriting')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', documentUploadOptions()),
  )
  async handwriting(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: HandwritingDto,
  ) {
    const scan =
      await this.scannerService.createScan(
        userId,
        file,
        'handwriting' as any,
      );

    return this.ocrService.runHandwriting(
      scan._id.toString(),
      userId,
      dto.language,
    );
  }

  @Post('passport-photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', imageUploadOptions()),
  )
  passportPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PassportPhotoDto,
  ) {
    return this.passportPhotoService.process(
      file,
      dto,
    );
  }

  @Post('remove-background')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', imageUploadOptions()),
  )
  removeBackground(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: BackgroundRemovalDto,
  ) {
    // CreateBackgroundRemovalService currently accepts
    // only the uploaded file.
    return this.backgroundRemovalService.removeBackground(
      file,
    );
  }
}