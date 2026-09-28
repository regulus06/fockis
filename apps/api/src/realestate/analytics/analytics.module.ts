import { Module } from '@nestjs/common';

import {
  MongooseModule,
} from '@nestjs/mongoose';


import {
  Analytics,
  AnalyticsSchema,
} from './schemas/analytics.schema';


import {
  AnalyticsService,
} from './services/analytics.service';


import {
  AnalyticsController,
} from './controllers/analytics.controller';



@Module({

  imports:[

    MongooseModule.forFeature([

      {
        name: Analytics.name,
        schema: AnalyticsSchema,
      },

    ]),

  ],


  controllers:[

    AnalyticsController,

  ],


  providers:[

    AnalyticsService,

  ],


  exports:[

    AnalyticsService,

  ],

})
export class AnalyticsModule {}