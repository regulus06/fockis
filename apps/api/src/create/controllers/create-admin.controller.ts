import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import {
  CreateTemplateService,
  TemplateListQuery,
} from '../services/create-template.service';

import { CreateCategoryService } from '../services/create-category.service';

import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { PaginationQueryDto } from '../dto/pagination.dto';


/**
 * All routes here require the ADMIN role.
 *
 * Reuses the application's existing JWT authentication
 * plus a role check on top.
 */
@ApiTags('create-admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('create/admin')
export class CreateAdminController {

  constructor(
    private readonly templateService: CreateTemplateService,
    private readonly categoryService: CreateCategoryService,
  ) {}


  /* ==========================================================================
     TEMPLATES
  ========================================================================== */

  @Get('templates')
  listTemplates(
    @Query()
    query: PaginationQueryDto & TemplateListQuery,
  ) {
    return this.templateService.list({
      ...query,
      includeInactive: true,
    });
  }


  @Post('templates')
  createTemplate(
    @CurrentUser('userId')
    adminId: string,

    @Body()
    dto: CreateTemplateDto,
  ) {
    return this.templateService.create(
      dto,
      adminId,
    );
  }


  @Patch('templates/:id')
  updateTemplate(
    @CurrentUser('userId')
    adminId: string,

    @Param('id')
    id: string,

    @Body()
    dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(
      id,
      dto,
      adminId,
    );
  }


  @Delete('templates/:id')
  deleteTemplate(
    @Param('id')
    id: string,
  ) {
    return this.templateService.remove(id);
  }


  @Post('templates/:id/publish')
  publish(
    @Param('id')
    id: string,
  ) {
    return this.templateService.publish(id);
  }


  @Post('templates/:id/unpublish')
  unpublish(
    @Param('id')
    id: string,
  ) {
    return this.templateService.unpublish(id);
  }


  @Post('templates/:id/feature')
  feature(
    @Param('id')
    id: string,

    @Query('value')
    value?: string,
  ) {
    return this.templateService.feature(
      id,
      value !== 'false',
    );
  }


  @Post('templates/:id/premium')
  premium(
    @Param('id')
    id: string,

    @Query('value')
    value?: string,
  ) {
    return this.templateService.setPremium(
      id,
      value !== 'false',
    );
  }


  @Get('templates/:id/versions')
  listTemplateVersions(
    @Param('id')
    id: string,
  ) {
    return this.templateService.listVersions(id);
  }


  /* ==========================================================================
     CATEGORIES
  ========================================================================== */

  @Get('categories')
  listCategories() {
    return this.categoryService.findAll(true);
  }


  @Post('categories')
  createCategory(
    @Body()
    dto: CreateCategoryDto,
  ) {
    return this.categoryService.create(dto);
  }


  @Patch('categories/:id')
  updateCategory(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(
      id,
      dto,
    );
  }


  @Delete('categories/:id')
  deleteCategory(
    @Param('id')
    id: string,
  ) {
    return this.categoryService.remove(id);
  }

}