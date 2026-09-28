import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CareerController } from "./controllers/career.controller";
import { ApplicationsController } from "./controllers/applications.controller";
import { SavedJobsController } from "./controllers/saved-jobs.controller";

import { CareerService } from "./services/career.service";
import { ApplicationsService } from "./services/applications.service";
import { SavedJobsService } from "./services/saved-jobs.service";

import {
  Job,
  JobSchema,
} from "./schemas/job.schema";

import {
  Application,
  ApplicationSchema,
} from "./schemas/application.schema";

import {
  SavedJob,
  SavedJobSchema,
} from "./schemas/saved-job.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Job.name,
        schema: JobSchema,
      },
      {
        name: Application.name,
        schema: ApplicationSchema,
      },
      {
        name: SavedJob.name,
        schema: SavedJobSchema,
      },
    ]),
  ],

  controllers: [
    CareerController,
    ApplicationsController,
    SavedJobsController,
  ],

  providers: [
    CareerService,
    ApplicationsService,
    SavedJobsService,
  ],

  exports: [
    CareerService,
    ApplicationsService,
    SavedJobsService,
  ],
})
export class CareersModule {}