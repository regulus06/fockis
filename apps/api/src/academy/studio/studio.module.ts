import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CoursesModule } from "../courses/courses.module";
import { CertificatesModule } from "../certificates/certificates.module";
import { CertificateTemplate, CertificateTemplateSchema } from "../certificates/schemas/certificate-template.schema";
import { LessonContent, LessonContentSchema } from "./schemas/lesson-content.schema";
import { AcademyInstitution, AcademyInstitutionSchema } from "../institutions/schemas/institution.schema";
import { StudioService } from "./services/studio.service";
import { LearnController, StudioController } from "./controllers/studio.controller";

// Existing Fockis infrastructure, reused unchanged:
//  - Payment model: read-only, to verify purchases made through /payments/create + /payments/confirm
//  - UploadsModule: exports CloudStorageService (Google Cloud Storage)
import { Payment, PaymentSchema } from "../../payments/schemas/payment.schema";
import { UploadsModule } from "../../uploads/uploads.module";

/** Fockis Academy Creator Studio: open marketplace for courses, seminars and live classes. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LessonContent.name, schema: LessonContentSchema },
      { name: CertificateTemplate.name, schema: CertificateTemplateSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: AcademyInstitution.name, schema: AcademyInstitutionSchema },
    ]),
    CoursesModule, // Course, Enrollment, AcademyUser models
    CertificatesModule, // CertificatesService (automatic certificates)
    UploadsModule,
  ],
  controllers: [StudioController, LearnController],
  providers: [StudioService],
})
export class StudioModule {}
