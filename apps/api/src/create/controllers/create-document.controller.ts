import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { Type } from 'class-transformer';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CreateDocumentService } from '../services/create-document.service';
import { CreateVersionService } from '../services/create-version.service';

import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { AutosaveDocumentDto } from '../dto/autosave-document.dto';

import { DocumentStatus } from '../schemas/create-document.schema';

import {
  CreateToolType,
  DocumentContent,
} from '../interfaces/editor.interfaces';


/* ============================================================================
   QUERY DTOs
============================================================================ */

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}


export class DocumentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsEnum(CreateToolType)
  type?: CreateToolType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}


/* ============================================================================
   CONTROLLER
============================================================================ */

@ApiTags('create-documents')
@ApiBearerAuth()
@Controller('create/documents')
export class CreateDocumentController {

  constructor(
    private readonly documentService: CreateDocumentService,
    private readonly versionService: CreateVersionService,
  ) {}


  /* ==========================================================================
     RECENT
  ========================================================================== */

  @Get('recent')
  recent(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentService.findRecent(
      userId,
      limit ? Number(limit) : undefined,
    );
  }


  /* ==========================================================================
     SEARCH
  ========================================================================== */

  @Get('search')
  search(
    @CurrentUser('userId') userId: string,
    @Query('q') q: string,
    @Query() query: DocumentQueryDto,
  ) {
    return this.documentService.search(
      userId,
      q,
      {
        page: query.page,
        limit: query.limit,
        type: query.type,
        status: query.status,
        favorite: query.favorite,
      },
    );
  }


  /* ==========================================================================
     LIST
  ========================================================================== */

  @Get()
  list(
    @CurrentUser('userId') userId: string,
    @Query() query: DocumentQueryDto,
  ) {
    return this.documentService.list(
      userId,
      {
        page: query.page,
        limit: query.limit,
        type: query.type,
        status: query.status,
        favorite: query.favorite,
      },
    );
  }


  /* ==========================================================================
     CREATE
  ========================================================================== */

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    let content: DocumentContent | undefined;

    if (dto.content) {
      content = {
        fields: dto.content.fields ?? {},
        elements: dto.content.elements ?? [],
      };
    }

    return this.documentService.create(
      userId,
      {
        title: dto.title,
        templateId: dto.templateId,
        type: dto.type,
        content,
      },
    );
  }


  /* ==========================================================================
     FIND ONE
  ========================================================================== */

  @Get(':id')
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentService.findById(
      id,
      userId,
      true,
    );
  }


  /* ==========================================================================
     UPDATE
  ========================================================================== */

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }

    if (dto.content !== undefined) {
      updateData.content = {
        fields: dto.content.fields ?? {},
        elements: dto.content.elements ?? [],
      };
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    return this.documentService.update(
      id,
      userId,
      updateData,
    );
  }


  /* ==========================================================================
     AUTOSAVE
  ========================================================================== */

  @Patch(':id/autosave')
  autosave(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AutosaveDocumentDto,
  ) {
    const autosaveData: {
      title?: string;
      content?: DocumentContent;
    } = {};

    if (dto.content !== undefined) {
      autosaveData.content = {
        fields: dto.content.fields ?? {},
        elements: dto.content.elements ?? [],
      };
    }

    return this.documentService.autosave(
      id,
      userId,
      autosaveData,
    );
  }


  /* ==========================================================================
     DELETE
  ========================================================================== */

  @Delete(':id')
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentService.remove(
      id,
      userId,
    );
  }


  /* ==========================================================================
     ARCHIVE
  ========================================================================== */

  @Post(':id/archive')
  archive(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentService.archive(
      id,
      userId,
    );
  }


  /* ==========================================================================
     RESTORE
  ========================================================================== */

  @Post(':id/restore')
  restore(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentService.restore(
      id,
      userId,
    );
  }


  /* ==========================================================================
     FAVORITE
  ========================================================================== */

  @Post(':id/favorite')
  favorite(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentService.setFavorite(
      id,
      userId,
      true,
    );
  }


  @Delete(':id/favorite')
  unfavorite(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentService.setFavorite(
      id,
      userId,
      false,
    );
  }


  /* ==========================================================================
     VERSIONS
  ========================================================================== */

  @Get(':id/versions')
  listVersions(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.versionService.listForDocument(
      id,
      userId,
    );
  }


  @Post(':id/versions')
  async createVersion(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const document =
      await this.documentService.findById(
        id,
        userId,
      );

    return this.versionService.snapshot(
      document,
      document.content,
    );
  }


  @Get(':id/versions/:versionId')
  getVersion(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionService.getVersion(
      id,
      versionId,
      userId,
    );
  }


  @Post(':id/versions/:versionId/restore')
  restoreVersion(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionService.restoreVersion(
      id,
      versionId,
      userId,
    );
  }
}