import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  AiJob,
  AiJobSchema,
} from "./schemas/ai-job.schema";

import {
  AiCredits,
  AiCreditsSchema,
} from "./credits/ai-credits.schema";

import { AiController } from "./controllers/ai.controller";

import { AiService } from "./services/ai.service";
import { AiJobService } from "./services/ai-job.service";
import { AiVideoService } from "./services/ai-video.service";

import { AiCreditsService } from "./services/ai-credits.service";

import { AiProviderFactory } from "./providers/ai-provider.factory";
import { GoogleVeoVideoProvider } from "./providers/ai-video.provider";

import { AiVideoWorker } from "./workers/ai-video.worker";

import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AiJob.name,
        schema: AiJobSchema,
      },
      {
        name: AiCredits.name,
        schema: AiCreditsSchema,
      },
    ]),

    RedisModule,
  ],

  controllers: [
    AiController,
  ],

  providers: [
    AiService,

    AiJobService,

    AiVideoService,

    AiCreditsService,

    GoogleVeoVideoProvider,

    {
      provide:
        "AI_VIDEO_PROVIDER",

      useExisting:
        GoogleVeoVideoProvider,
    },

    AiProviderFactory,

    AiVideoWorker,
  ],

  exports: [
    AiService,

    AiJobService,

    AiVideoService,

    AiCreditsService,
  ],
})
export class AiModule {}