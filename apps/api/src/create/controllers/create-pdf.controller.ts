import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiBearerAuth,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CreatePdfService } from '../services/create-pdf.service';
import { CreateAssetService } from '../services/create-asset.service';

import {
  Asset,
  AssetDocument,
  AssetType,
} from '../schemas/create-asset.schema';

import { StorageService } from '../utils/storage.service';
import { documentUploadOptions } from '../utils/upload.config';
import { InvalidScanException } from '../constants/errors';

import {
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';


/* ============================================================================
   LOCAL DTOs
============================================================================ */

export class CreatePdfFromImagesDto {
  @IsArray()
  @IsString({ each: true })
  assetIds!: string[];
}

export class MergePdfDto {
  @IsArray()
  @IsString({ each: true })
  assetIds!: string[];
}

export class ReorderPagesDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  pageOrder!: number[];
}

export class RotatePageDto {
  @Type(() => Number)
  @IsInt()
  @Min(-360)
  @Max(360)
  degrees!: number;
}


/* ============================================================================
   CONTROLLER
============================================================================ */

@ApiTags('create-pdf')
@ApiBearerAuth()
@Controller('create/pdf')
export class CreatePdfController {
  constructor(
    private readonly pdfService: CreatePdfService,

    private readonly assetService: CreateAssetService,

    private readonly storage: StorageService,

    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
  ) {}

  /* --------------------------------------------------------------------------
     UPLOAD PDF
  -------------------------------------------------------------------------- */

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor(
      'file',
      documentUploadOptions(),
    ),
  )
  async upload(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new InvalidScanException(
        'No file was uploaded',
      );
    }

    const saved = await this.storage.save(
      'exports',
      file.buffer,
      file.originalname,
    );

    let pageCount = 1;

    if (file.mimetype === 'application/pdf') {
      pageCount =
        await this.pdfService.getPageCount(
          saved.path,
        );
    }

    const asset =
      await this.assetModel.create({
        userId: new Types.ObjectId(userId),

        type: AssetType.OTHER,

        url: saved.url,

        filename: file.originalname,

        mimeType: file.mimetype,

        size: file.size,

        meta: {
          pageCount,
        },
      });

    return asset;
  }


  /* --------------------------------------------------------------------------
     CREATE PDF FROM IMAGES
  -------------------------------------------------------------------------- */

  @Post('from-images')
  async fromImages(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePdfFromImagesDto,
  ) {
    const assets =
      await this.resolveAssetPaths(
        dto.assetIds,
        userId,
      );

    const result =
      await this.pdfService.createFromImages(
        assets.map(
          (asset) => asset.diskPath,
        ),
      );

    return this.registerPdfAsset(
      userId,
      result,
    );
  }


  /* --------------------------------------------------------------------------
     MERGE PDFs
  -------------------------------------------------------------------------- */

  @Post('merge')
  async merge(
    @CurrentUser('userId') userId: string,
    @Body() dto: MergePdfDto,
  ) {
    const assets =
      await this.resolveAssetPaths(
        dto.assetIds,
        userId,
      );

    const result =
      await this.pdfService.merge(
        assets.map(
          (asset) => asset.diskPath,
        ),
      );

    return this.registerPdfAsset(
      userId,
      result,
    );
  }


  /* --------------------------------------------------------------------------
     REORDER PAGES
  -------------------------------------------------------------------------- */

  @Patch(':id/pages/reorder')
  async reorder(
    @CurrentUser('userId') userId: string,

    @Param('id')
    id: string,

    @Body()
    dto: ReorderPagesDto,
  ) {
    const asset =
      await this.assetService.findByIdForUser(
        id,
        userId,
      );

    const order =
      dto.pageOrder.map(
        (page) => Number(page),
      );

    const result =
      await this.pdfService.reorderPages(
        this.diskPathFromUrl(asset.url),
        order,
      );

    return this.registerPdfAsset(
      userId,
      result,
    );
  }


  /* --------------------------------------------------------------------------
     ROTATE PAGE
  -------------------------------------------------------------------------- */

  @Post(':id/pages/:pageId/rotate')
  async rotate(
    @CurrentUser('userId') userId: string,

    @Param('id')
    id: string,

    @Param('pageId')
    pageId: string,

    @Body()
    dto: RotatePageDto,
  ) {
    const asset =
      await this.assetService.findByIdForUser(
        id,
        userId,
      );

    const result =
      await this.pdfService.rotatePage(
        this.diskPathFromUrl(asset.url),
        Number(pageId),
        dto.degrees,
      );

    return this.registerPdfAsset(
      userId,
      result,
    );
  }


  /* --------------------------------------------------------------------------
     DELETE PAGE
  -------------------------------------------------------------------------- */

  @Delete(':id/pages/:pageId')
  async deletePage(
    @CurrentUser('userId') userId: string,

    @Param('id')
    id: string,

    @Param('pageId')
    pageId: string,
  ) {
    const asset =
      await this.assetService.findByIdForUser(
        id,
        userId,
      );

    const result =
      await this.pdfService.deletePage(
        this.diskPathFromUrl(asset.url),
        Number(pageId),
      );

    return this.registerPdfAsset(
      userId,
      result,
    );
  }


  /* ==========================================================================
     HELPERS
  ========================================================================== */

  private async resolveAssetPaths(
    assetIds: string[],
    userId: string,
  ) {
    const assets =
      await Promise.all(
        assetIds.map(
          (id) =>
            this.assetService.findByIdForUser(
              id,
              userId,
            ),
        ),
      );

    return assets.map(
      (asset) => ({
        ...asset,
        diskPath:
          this.diskPathFromUrl(
            asset.url,
          ),
      }),
    );
  }


  /**
   * Assets are stored using public URLs such as:
   *
   * /uploads/filename.pdf
   *
   * Convert that URL back into a local filesystem path.
   */
  private diskPathFromUrl(
    url: string,
  ): string {
    const root =
      process.env.UPLOAD_ROOT ||
      './uploads';

    return url.replace(
      /^\/?uploads/,
      root,
    );
  }


  private async registerPdfAsset(
    userId: string,
    result: {
      path: string;
      url: string;
    },
  ) {
    const fs =
      await import('fs/promises');

    const stat =
      await fs.stat(result.path);

    return this.assetModel.create({
      userId:
        new Types.ObjectId(userId),

      type: AssetType.OTHER,

      url: result.url,

      filename:
        result.path
          .split(/[\\/]/)
          .pop(),

      mimeType:
        'application/pdf',

      size: stat.size,
    });
  }
}