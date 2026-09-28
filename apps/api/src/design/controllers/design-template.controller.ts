import { Controller, Get, Param, Query } from '@nestjs/common';
import { DesignTemplateService } from '../services/design-template.service';
import type { DesignCategory } from '../types/design.types';

@Controller('document-scanner/design/templates')
export class DesignTemplateController {
  constructor(private readonly service: DesignTemplateService) {}
  @Get() list(@Query('category') category?: DesignCategory, @Query('search') search?: string, @Query('premium') premium?: string, @Query('popular') popular?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list({ category, search, premium: premium === undefined ? undefined : premium === 'true', popular: popular === undefined ? undefined : popular === 'true', page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }
  @Get(':id') get(@Param('id') id: string) { return this.service.findByIdOrSlug(id); }
}
