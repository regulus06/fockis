import {
  Body,
  Controller,
  Param,
  Post,
  BadRequestException,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CreateDocumentService } from '../services/create-document.service';

import { CreateExportService } from '../services/create-export.service';

import { ExportDocumentDto } from '../dto/export-document.dto';


type ExportFormat =
  | 'png'
  | 'jpg'
  | 'pdf'
  | 'docx';


@ApiTags('create-export')
@ApiBearerAuth()
@Controller('create/documents/:id/export')
export class CreateExportController {
  constructor(
    private readonly documentService: CreateDocumentService,
    private readonly exportService: CreateExportService,
  ) {}


  @Post()
  async export(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ExportDocumentDto,
  ) {
    /*
     * Validate the format before passing it to the service.
     *
     * This also narrows the TypeScript type from
     * string | undefined to ExportFormat.
     */
    const allowedFormats: ExportFormat[] = [
      'png',
      'jpg',
      'pdf',
      'docx',
    ];

    if (
      !dto.format ||
      !allowedFormats.includes(
        dto.format as ExportFormat,
      )
    ) {
      throw new BadRequestException(
        'format must be one of: png, jpg, pdf, docx',
      );
    }

    const format =
      dto.format as ExportFormat;


    /*
     * Verify that the document belongs to the
     * authenticated user.
     */
    const document =
      await this.documentService.findById(
        id,
        userId,
      );


    /*
     * format is now safely narrowed to:
     * 'png' | 'jpg' | 'pdf' | 'docx'
     */
    const result =
      await this.exportService.export(
        document,
        format,
      );


    return {
      format,
      url: result.url,
    };
  }
}