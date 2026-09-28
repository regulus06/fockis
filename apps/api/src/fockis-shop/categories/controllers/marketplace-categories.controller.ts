import {
  Controller,
  Get,
} from "@nestjs/common";

import { CategoriesService } from "../services/categories.service";
import { Public } from "../../../auth/public.decorator";


@Controller("marketplace/categories")
export class MarketplaceCategoriesController {

  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}


  @Public()
  @Get()
  getCategories() {
    return this.categoriesService.findAll();
  }

}