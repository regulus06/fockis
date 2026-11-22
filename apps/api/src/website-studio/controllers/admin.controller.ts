import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../admin/rbac/roles.decorator';
import { Role } from '../../admin/rbac/roles.enum';
import {
  AdminCategoryDto,
  AdminCreateTemplateDto,
  AdminUpdateTemplateDto,
  ReorderDto,
  SaveDraftDto,
  SetDefaultDto,
  SuspendDto,
} from '../dto/website-studio.dto';
import { TemplatesService } from '../templates/templates.service';
import { WebsitesService } from '../websites/websites.service';
import { SubmissionsService } from '../business/submissions.service';

/**
 * Website Studio Administration Center.
 * Protected by the existing global RBAC guard: only admin / super_admin.
 * Adding templates and categories never requires frontend code changes.
 */
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('website-studio/admin')
export class WebsiteStudioAdminController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly websites: WebsitesService,
    private readonly submissions: SubmissionsService,
  ) {}

  /* ---------------- categories ---------------- */
  @Get('categories')
  categories() {
    return this.templates.listCategories(true);
  }

  @Post('categories')
  createCategory(@Body() dto: AdminCategoryDto) {
    return this.templates.adminCreateCategory(dto);
  }

  @Post('categories/reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.templates.adminReorderCategories(dto.ids);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: AdminCategoryDto) {
    return this.templates.adminUpdateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.templates.adminDeleteCategory(id);
  }

  /* ---------------- templates ---------------- */
  @Get('templates')
  listTemplates() {
    return this.templates.adminList();
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.templates.adminGet(id);
  }

  @Post('templates')
  createTemplate(@Body() dto: AdminCreateTemplateDto) {
    return this.templates.adminCreate(dto);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: AdminUpdateTemplateDto) {
    return this.templates.adminUpdate(id, dto);
  }

  @Post('templates/:id/duplicate')
  duplicateTemplate(@Param('id') id: string) {
    return this.templates.adminDuplicate(id);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.templates.adminDelete(id);
  }

  @Put('templates/:id/draft')
  saveTemplateDraft(@Param('id') id: string, @Body() dto: SaveDraftDto) {
    return this.templates.adminSaveDraft(id, dto.content, dto.revision);
  }

  @Post('templates/:id/publish')
  publishTemplate(@Param('id') id: string) {
    return this.templates.adminPublish(id);
  }

  @Post('templates/:id/default')
  setDefault(@Param('id') id: string, @Body() dto: SetDefaultDto) {
    return this.templates.adminSetDefault(id, dto.categoryId);
  }

  @Get('usage')
  usage() {
    return this.templates.usage();
  }

  /* ---------------- websites ---------------- */
  @Get('websites')
  websitesList(@Query('q') q?: string, @Query('status') status?: string) {
    return this.websites.adminList(q, status);
  }

  @Post('websites/:id/suspend')
  suspend(@Param('id') id: string, @Body() dto: SuspendDto) {
    return this.websites.adminSuspend(id, dto.suspended, dto.reason);
  }

  @Get('reports')
  reports() {
    return this.submissions.adminReports();
  }

  @Post('reports/:id/resolve')
  resolve(@Param('id') id: string) {
    return this.submissions.resolveReport(id);
  }
}
