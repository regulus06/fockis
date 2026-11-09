import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CoursesModule } from "../courses/courses.module";
import { CertificatesModule } from "../certificates/certificates.module";
import { CertificateTemplate, CertificateTemplateSchema } from "../certificates/schemas/certificate-template.schema";
import { LessonContent, LessonContentSchema } from "./schemas/lesson-content.schema";
import { AcademyInstitution, AcademyInstitutionSchema } from "../institutions/schemas/institution.schema";
import { StudioService } from "./services/studio.service";
import { LearnController, StudioController } from "./controllers/studio.controller";
import { AssignmentSubmission, AssignmentSubmissionSchema } from "./schemas/assignment-submission.schema";
import { AssignmentsService } from "./services/assignments.service";
import { LearnAssignmentsController, StudioAssignmentsController } from "./controllers/assignments.controller";
import { AcademyMediaController } from "./controllers/media.controller";

// Existing Fockis infrastructure, reused unchanged:
//  - Payment model: read-only, to verify purchases made through /payments/create + /payments/confirm
//  - UploadsModule: exports CloudStorageService (Google Cloud Storage)
import { Payment, PaymentSchema } from "../../payments/schemas/payment.schema";
import { UploadsModule } from "../../uploads/uploads.module";
import { DomainBillingModule } from "../institutions/billing/domain-billing.module";

/** Fockis Academy Creator Studio: open marketplace for courses, seminars and live classes. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LessonContent.name, schema: LessonContentSchema },
      { name: CertificateTemplate.name, schema: CertificateTemplateSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: AcademyInstitution.name, schema: AcademyInstitutionSchema },
      { name: AssignmentSubmission.name, schema: AssignmentSubmissionSchema },
    ]),
    CoursesModule, // Course, Enrollment, AcademyUser models
    CertificatesModule, // CertificatesService (automatic certificates)
    UploadsModule,
    DomainBillingModule, // schools must have a paid Fockis domain to publish / take new learners
  ],
  // AcademyMediaController first: GET academy/learn/media/:token streams lesson files.
  controllers: [AcademyMediaController, StudioController, LearnController, StudioAssignmentsController, LearnAssignmentsController],
  providers: [StudioService, AssignmentsService],
})
export class StudioModule {}
