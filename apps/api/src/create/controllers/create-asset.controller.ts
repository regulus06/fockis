import {
  Controller,
  Delete,
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

import { CreateAssetService } from '../services/create-asset.service';

import { AssetType } from '../schemas/create-asset.schema';

import { imageUploadOptions } from '../utils/upload.config';


@ApiTags('create-assets')
@ApiBearerAuth()
@Controller('create/documents/:documentId/assets')
export class CreateAssetController {

  constructor(
    private readonly assetService: CreateAssetService,
  ) {}


  /* ==========================================================================
     UPLOAD ASSET
  ========================================================================== */

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor(
      'file',
      imageUploadOptions(),
    ),
  )
  upload(
    @CurrentUser('userId')
    userId: string,

    @Param('documentId')
    documentId: string,

    @UploadedFile()
    file: Express.Multer.File,

    @Query('type')
    type?: AssetType,
  ) {
    return this.assetService.uploadForDocument(
      documentId,
      userId,
      file,
      type,
    );
  }


  /* ==========================================================================
     LIST ASSETS
  ========================================================================== */

  @Get()
  list(
    @CurrentUser('userId')
    userId: string,

    @Param('documentId')
    documentId: string,
  ) {
    return this.assetService.listForDocument(
      documentId,
      userId,
    );
  }


  /* ==========================================================================
     DELETE ASSET
  ========================================================================== */

  @Delete(':assetId')
  remove(
    @CurrentUser('userId')
    userId: string,

    @Param('documentId')
    documentId: string,

    @Param('assetId')
    assetId: string,
  ) {
    return this.assetService.remove(
      documentId,
      assetId,
      userId,
    );
  }

}