import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';

import { CreateCategoryService } from '../services/create-category.service';


@ApiTags('create-categories')
@Controller('create/categories')
export class CreateCategoryController {

  constructor(
    private readonly categoryService: CreateCategoryService,
  ) {}


  /* ==========================================================================
     LIST CATEGORIES
  ========================================================================== */

  @Public()
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }


  /* ==========================================================================
     FIND BY SLUG
  ========================================================================== */

  @Public()
  @Get('slug/:slug')
  findBySlug(
    @Param('slug')
    slug: string,
  ) {
    return this.categoryService.findBySlug(slug);
  }


  /* ==========================================================================
     FIND BY ID
  ========================================================================== */

  @Public()
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.categoryService.findById(id);
  }

}