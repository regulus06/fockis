import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";

import { CategoriesService } from "../services/categories.service";
import { JwtAuthGuard } from "../../../auth/jwt-auth.guard";


@Controller("admin/categories")
@UseGuards(JwtAuthGuard)
export class AdminCategoriesController {

  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}


  @Post()
  createCategory(
    @Body() data: any,
  ) {
    return this.categoriesService.create(data);
  }


  @Patch(":id")
  updateCategory(
    @Param("id") id: string,
    @Body() data: any,
  ) {
    return this.categoriesService.update(
      id,
      data,
    );
  }


  @Delete(":id")
  deleteCategory(
    @Param("id") id: string,
  ) {
    return this.categoriesService.remove(id);
  }

}