import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  Course,
  CourseSchema,
} from "./schemas/course.schema";

import {
  Enrollment,
  EnrollmentSchema,
} from "./schemas/enrollment.schema";

import {
  AcademyUser,
  AcademyUserSchema,
} from "../auth/schemas/academy-user.schema";

import { CoursesService } from "./services/courses.service";
import { DomainBillingModule } from "../institutions/billing/domain-billing.module";

import { CoursesController } from "./controllers/courses.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Course.name,
        schema: CourseSchema,
      },
      {
        name: Enrollment.name,
        schema: EnrollmentSchema,
      },
      {
        name: AcademyUser.name,
        schema: AcademyUserSchema,
      },
    ]),
    // Hides classes of organizations whose Fockis domain isn't paid.
    DomainBillingModule,
  ],

  controllers: [
    CoursesController,
  ],

  providers: [
    CoursesService,
  ],

  exports: [
    CoursesService,
    MongooseModule,
  ],
})
export class CoursesModule {}