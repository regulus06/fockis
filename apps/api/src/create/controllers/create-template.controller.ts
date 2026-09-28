import { Controller, Get, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CreateTemplateService } from '../services/create-template.service';
import { PaginationQueryDto } from '../dto/pagination.dto';
import { CreateToolType } from '../interfaces/editor.interfaces';

export class TemplateQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsEnum(CreateToolType) type?: CreateToolType;
  @IsOptional() @Type(() => Boolean) @IsBoolean() premium?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() featured?: boolean;
  @IsOptional() @IsString() search?: string;
}

@ApiTags('create-templates')
@Controller('create/templates')
export class CreateTemplateController {
  constructor(private readonly templateService: CreateTemplateService) {}

  @Public()
  @Get()
  list(@Query() query: TemplateQueryDto) {
    return this.templateService.list(query);
  }

  @Public()
  @Get('featured')
  featured(@Query('limit') limit?: string) {
    return this.templateService.findFeatured(limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('popular')
  popular(@Query('limit') limit?: string) {
    return this.templateService.findPopular(limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('recent')
  recent(@Query('limit') limit?: string) {
    return this.templateService.findRecent(limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('search')
  search(@Query('q') q: string, @Query() query: TemplateQueryDto) {
    return this.templateService.search(q, query);
  }

  @Public()
  @Get('category/:categoryId')
  byCategory(@Param('categoryId') categoryId: string, @Query() query: TemplateQueryDto) {
    return this.templateService.findByCategory(categoryId, query);
  }

  @Public()
  @Get('slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.templateService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  byId(@Param('id') id: string) {
    return this.templateService.findById(id);
  }
}
