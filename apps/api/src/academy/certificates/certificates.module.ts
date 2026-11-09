import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CertificateTemplate, CertificateTemplateSchema } from "./schemas/certificate-template.schema";
import { IssuedCertificate, IssuedCertificateSchema } from "./schemas/issued-certificate.schema";
import { CampusEvent, CampusEventSchema } from "../events/schemas/event.schema";
import { CoursesModule } from "../courses/courses.module";
import { AcademyInstitution, AcademyInstitutionSchema } from "../institutions/schemas/institution.schema";
import { CertificatesService } from "./services/certificates.service";
import { CertificatesController } from "./controllers/certificates.controller";

/** Fockis Academy certificates: templates, issuing, student wallet, public verification. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CertificateTemplate.name, schema: CertificateTemplateSchema },
      { name: IssuedCertificate.name, schema: IssuedCertificateSchema },
      { name: CampusEvent.name, schema: CampusEventSchema },
      // used to check "staff of an approved school" before designing certificates
      { name: AcademyInstitution.name, schema: AcademyInstitutionSchema },
    ]),
    // exports the Course, Enrollment and AcademyUser models
    CoursesModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
