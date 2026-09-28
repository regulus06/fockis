import { Module } from "@nestjs/common";

import { MongooseModule } from "@nestjs/mongoose";

import {
  Category,
  CategorySchema,
} from "./categories.schema";

import { AdminCategoriesController } from "./controllers/categories.controller";
import { MarketplaceCategoriesController } from "./controllers/marketplace-categories.controller";

import { CategoriesService } from "./services/categories.service";


@Module({

  imports: [

    MongooseModule.forFeature([

      {
        name: Category.name,
        schema: CategorySchema,
      },

    ]),

  ],


  controllers: [

    AdminCategoriesController,

    MarketplaceCategoriesController,

  ],


  providers: [

    CategoriesService,

  ],


  exports: [

    CategoriesService,

  ],

})


export class CategoriesModule {}