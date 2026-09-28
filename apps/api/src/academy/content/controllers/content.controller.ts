import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ContentService } from '../services/content.service';

import { CreateContentItemDto } from '../dto/create-content-item.dto';
import { UpdateContentItemDto } from '../dto/update-content-item.dto';

import { AcademyJwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('academy/content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
  ) {}

  // ==========================================================================
  // ADMIN / STAFF
  // ==========================================================================

  /**
   * List all Academy content sections.
   *
   * GET /academy/content/sections
   *
   * Requires:
   * - Academy JWT
   * - administrator OR staff
   */
  @Get('sections')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  listSections() {
    return this.contentService.listSections();
  }

  /**
   * Create Academy content.
   *
   * POST /academy/content
   *
   * Requires:
   * - Academy JWT
   * - administrator OR staff
   */
  @Post()
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  create(
    @Body() dto: CreateContentItemDto,
  ) {
    return this.contentService.create(dto);
  }

  /**
   * Update Academy content.
   *
   * PATCH /academy/content/:id
   *
   * Requires:
   * - Academy JWT
   * - administrator OR staff
   */
  @Patch(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContentItemDto,
  ) {
    return this.contentService.update(id, dto);
  }

  /**
   * Delete Academy content.
   *
   * DELETE /academy/content/:id
   *
   * Requires:
   * - Academy JWT
   * - administrator OR staff
   */
  @Delete(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  remove(
    @Param('id') id: string,
  ) {
    return this.contentService.remove(id);
  }

  // ==========================================================================
  // PUBLIC ACADEMY CONTENT
  // ==========================================================================

  /**
   * Get a public Academy content section.
   *
   * Examples:
   *
   * GET /academy/content/academics-categories
   * GET /academy/content/admissions-steps
   * GET /academy/content/admissions-faq
   * GET /academy/content/about-pillars
   * GET /academy/content/about-facts
   * GET /academy/content/about-leadership
   *
   * IMPORTANT:
   * NO authentication guard is applied here.
   */
  @Get(':section')
  findBySection(
    @Param('section') section: string,
  ) {
    return this.contentService.findBySection(section);
  }
}