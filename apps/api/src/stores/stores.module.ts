import {
  Module,
} from "@nestjs/common";

import {
  MongooseModule,
} from "@nestjs/mongoose";

import {
  Store,
  StoreSchema,
} from "./schemas/store.schema";

import {
  StoresController,
} from "./stores.controller";

import {
  StoresDashboardController,
} from "./stores-dashboard.controller";

import {
  StoresService,
} from "./stores.service";

import {
  StoresDashboardService,
} from "./stores-dashboard.service";

import {
  SellerModule,
} from "../seller/seller.module";


@Module({

  imports: [

    SellerModule,

    MongooseModule.forFeature([

      {
        name: Store.name,
        schema: StoreSchema,
      },

    ]),

  ],

  controllers: [

    StoresController,

    StoresDashboardController,

  ],

  providers: [

    StoresService,

    StoresDashboardService,

  ],

  exports: [

    StoresService,

    StoresDashboardService,

  ],

})
export class StoresModule {}