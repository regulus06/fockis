
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { UploadsModule } from "../uploads/uploads.module";

import { CareerController } from "./controllers/career.controller";
import { ApplicationsController } from "./controllers/applications.controller";
import { SavedJobsController } from "./controllers/saved-jobs.controller";
import { EmployerController } from "./controllers/employer.controller";
import { CareerProfileController } from "./controllers/career-profile.controller";
import { CompaniesController } from "./controllers/companies.controller";

import { CareerService } from "./services/career.service";
import { ApplicationsService } from "./services/applications.service";
import { SavedJobsService } from "./services/saved-jobs.service";
import { EmployerService } from "./services/employer.service";
import { CareerProfileService } from "./services/career-profile.service";

import {
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

import {
  EmployerCompany,
  EmployerCompanySchema,
} from "./schemas/employer-company.schema";

import {
  EmployerInterview,
  EmployerInterviewSchema,
} from "./schemas/employer-interview.schema";

import {
  CareerProfile,
  CareerProfileSchema,
} from "./schemas/career-profile.schema";

@Module({
  imports: [
    AuthModule,
    UploadsModule,

    MongooseModule.forFeature([
      {
        name: "FockisCareerJob",
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
      {
        name: EmployerCompany.name,
        schema: EmployerCompanySchema,
      },
      {
        name: EmployerInterview.name,
        schema: EmployerInterviewSchema,
      },
      {
        name: CareerProfile.name,
        schema: CareerProfileSchema,
      },
    ]),
  ],

  controllers: [
    ApplicationsController,
    SavedJobsController,
    CareerProfileController,
    CompaniesController,
    EmployerController,
    CareerController,
  ],

  providers: [
    CareerService,
    ApplicationsService,
    SavedJobsService,
    EmployerService,
    CareerProfileService,
  ],

  exports: [
    CareerService,
    ApplicationsService,
    SavedJobsService,
    EmployerService,
    CareerProfileService,
  ],
})
export class CareersModule {}
