import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import { PropertyService } from '../services/property.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('realestate/properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.propertyService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertyService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.propertyService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.propertyService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.propertyService.delete(id);
  }

  // 🟣 IMAGE UPLOAD ENDPOINT — writes real files to disk with
  // real generated filenames, instead of relying on Multer's
  // default in-memory storage (which never sets file.filename,
  // producing "/uploads/undefined").
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.propertyService.uploadImages(files);
  }
}