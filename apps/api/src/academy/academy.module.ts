import { Module } from "@nestjs/common";

// ============================================================================
// ACADEMY AUTH
// ============================================================================

import { AcademyAuthModule } from "./auth/auth.module";

// ============================================================================
// ACADEMY FEATURES
// ============================================================================

import { ProgramsModule } from "./programs/programs.module";
import { AdmissionsModule } from "./admissions/admissions.module";
import { CoursesModule } from "./courses/courses.module";
import { StudentsModule } from "./students/students.module";
import { CareerModule } from "./career/career.module";
import { FacultyModule } from "./faculty/faculty.module";
import { NewsModule } from "./news/news.module";
import { EventsModule } from "./events/events.module";
import { ContactModule } from "./contact/contact.module";

// ============================================================================
// ACADEMY CONTENT
// ============================================================================

import { ContentModule } from "./content.module";

// ============================================================================
// ACADEMY DASHBOARD
// ============================================================================

import { DashboardModule } from "./dashboard.module";

/**
 * ============================================================================
 * FOCKIS ACADEMY MODULE
 * ============================================================================
 *
 * Academy is a feature module inside the main Fockis NestJS application.
 *
 * Main application:
 *
 *   http://localhost:3000
 *
 * Academy API:
 *
 *   http://localhost:3000/academy/...
 *
 * Academy has its own authentication system:
 *
 *   AcademyJwtAuthGuard
 *   Academy "academy-jwt" strategy
 *   ACADEMY_JWT_SECRET
 *
 * The global Fockis JwtAuthGuard explicitly bypasses /academy/*
 * routes so Academy controllers can decide whether a route is:
 *
 *   - public
 *   - Academy-authenticated
 *   - Academy-role protected
 *
 * ============================================================================
 */

@Module({
  imports: [
    // ========================================================================
    // AUTH
    // ========================================================================

    AcademyAuthModule,

    // ========================================================================
    // ACADEMY FEATURES
    // ========================================================================

    ProgramsModule,
    AdmissionsModule,
    CoursesModule,
    StudentsModule,
    CareerModule,
    FacultyModule,
    NewsModule,
    EventsModule,
    ContactModule,

    // ========================================================================
    // CONTENT
    // ========================================================================

    ContentModule,

    // ========================================================================
    // ADMIN / DASHBOARD
    // ========================================================================

    DashboardModule,
  ],
})
export class AcademyModule {}