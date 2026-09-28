import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Program, ProgramSchema } from './programs/schemas/program.schema';
import { Course, CourseSchema } from './courses/schemas/course.schema';
import { Enrollment, EnrollmentSchema } from './courses/schemas/enrollment.schema';
import { Faculty, FacultySchema } from './faculty/schemas/faculty.schema';
import { Student, StudentSchema } from './students/schemas/student.schema';
import { CampusEvent, CampusEventSchema } from './events/schemas/event.schema';
import { NewsItem, NewsItemSchema } from './news/schemas/news.schema';
import { Application, ApplicationSchema } from './admissions/schemas/application.schema';
import { Job, JobSchema } from './career/schemas/job.schema';
import { JobApplication, JobApplicationSchema } from './career/schemas/job-application.schema';
import { ContactMessage, ContactMessageSchema } from './contact/schemas/contact-message.schema';
import { DashboardService } from './dashboard/services/dashboard.service';
import { DashboardController } from './dashboard/controllers/dashboard.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Program.name, schema: ProgramSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Faculty.name, schema: FacultySchema },
      { name: Student.name, schema: StudentSchema },
      { name: CampusEvent.name, schema: CampusEventSchema },
      { name: NewsItem.name, schema: NewsItemSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Job.name, schema: JobSchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: ContactMessage.name, schema: ContactMessageSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
