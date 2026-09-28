import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NewsService } from '../services/news.service';
import { CreateNewsDto } from '../dto/create-news.dto';
import { UpdateNewsDto } from '../dto/update-news.dto';
import { AcademyJwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('academy/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // Public visitors only ever see published items.
  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.newsService.findAll(limit ? Number(limit) : undefined, false);
  }

  // Admin listing — includes unpublished drafts. Guarded, since the public
  // endpoint above deliberately never exposes drafts via a query param.
  @Get('admin/all')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  findAllForAdmin() {
    return this.newsService.findAll(1000, true);
  }

  @Post()
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  create(@Body() dto: CreateNewsDto) {
    return this.newsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  update(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
