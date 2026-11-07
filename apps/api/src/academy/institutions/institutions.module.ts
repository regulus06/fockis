import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AcademyInstitution, AcademyInstitutionSchema } from "./schemas/institution.schema";
import { StudentApplication, StudentApplicationSchema } from "./schemas/student-application.schema";
import { InstitutionsService } from "./services/institutions.service";
import { InstitutionsAdminController, InstitutionsController } from "./controllers/institutions.controller";
import { CoursesModule } from "../courses/courses.module";

// Existing Fockis storage (signed links to proof documents), reused unchanged.
import { UploadsModule } from "../../uploads/uploads.module";

/** Schools on Fockis Academy: registration, admin review, staff, student logins. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AcademyInstitution.name, schema: AcademyInstitutionSchema },
      { name: StudentApplication.name, schema: StudentApplicationSchema },
    ]),
    CoursesModule, // Course + AcademyUser models
    UploadsModule,
  ],
  controllers: [InstitutionsController, InstitutionsAdminController],
  providers: [InstitutionsService],
  exports: [InstitutionsService, MongooseModule],
})
export class InstitutionsModule {}
