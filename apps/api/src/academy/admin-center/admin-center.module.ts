import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CoursesModule } from "../courses/courses.module";
import { CertificatesModule } from "../certificates/certificates.module";
import { InstitutionsModule } from "../institutions/institutions.module";
import { IssuedCertificate, IssuedCertificateSchema } from "../certificates/schemas/issued-certificate.schema";
import { AcademyAdminCenterController } from "./admin-center.controller";
import { AcademyAdminCenterService } from "./admin-center.service";

/**
 * Academy inside the Fockis admin center (/admin/academy/*), for Fockis
 * administrators with academy.view / academy.manage.
 */
@Module({
  imports: [
    CoursesModule, // Course, Enrollment, AcademyUser models
    CertificatesModule,
    InstitutionsModule, // InstitutionsService + AcademyInstitution model
    MongooseModule.forFeature([{ name: IssuedCertificate.name, schema: IssuedCertificateSchema }]),
  ],
  controllers: [AcademyAdminCenterController],
  providers: [AcademyAdminCenterService],
})
export class AcademyAdminCenterModule {}
