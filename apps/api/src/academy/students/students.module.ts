import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// ============================================================================
// SCHEMA
// ============================================================================

import {
  Student,
  StudentSchema,
} from "./schemas/student.schema";

// ============================================================================
// SERVICE
// ============================================================================

import { StudentsService } from "./services/students.service";

// ============================================================================
// CONTROLLER
// ============================================================================

import { StudentsController } from "./controllers/students.controller";

// ============================================================================
// COURSES
// ============================================================================

import { CoursesModule } from "../courses/courses.module";

@Module({
  imports: [
    // ========================================================================
    // STUDENT MODEL
    // ========================================================================

    MongooseModule.forFeature([
      {
        name: Student.name,
        schema: StudentSchema,
      },
    ]),

    // ========================================================================
    // COURSES
    // ========================================================================

    CoursesModule,
  ],

  controllers: [
    StudentsController,
  ],

  providers: [
    StudentsService,
  ],

  exports: [
    StudentsService,
  ],
})
export class StudentsModule {}