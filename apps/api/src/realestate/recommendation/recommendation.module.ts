import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Recommendation,
  RecommendationSchema,
} from './schemas/recommendation.schema';

import {
  RecommendationController,
} from './controllers/recommendation.controller';

import {
  RecommendationService,
} from './services/recommendation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Recommendation.name,
        schema: RecommendationSchema,
      },
    ]),
  ],
  controllers: [
    RecommendationController,
  ],
  providers: [
    RecommendationService,
  ],
  exports: [
    RecommendationService,
  ],
})
export class RecommendationModule {}