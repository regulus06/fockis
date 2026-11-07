import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student } from '../schemas/student.schema';
import { Enrollment } from '../../courses/schemas/enrollment.schema';
import { Course } from '../../courses/schemas/course.schema';
import { CampusEvent } from '../../events/schemas/event.schema';
import { CoursesService } from '../../courses/services/courses.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(CampusEvent.name) private eventModel: Model<CampusEvent>,
    private readonly coursesService: CoursesService,
  ) {}

  /** Dashboard for the signed-in Academy user (GET /academy/students/dashboard). */
  async getMyDashboard(user: { userId: string; name: string; email: string; role: string }) {
    const courses = await this.coursesService.findStudentCourses(user.userId);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const events = await this.eventModel.find({ date: { $gte: now } }).sort({ date: 1 }).limit(6).lean().exec();

    const assignments = courses.flatMap((c) =>
      ((c as { assignments?: { title: string; dueDate: Date; status?: string }[] }).assignments ?? [])
        .filter((a) => a.status !== 'graded')
        .map((a) => ({ ...a, courseCode: c.code, courseName: c.name })),
    );

    const completed = courses.filter((c) => (c.progress ?? 0) >= 100).length;

    return {
      student: { _id: user.userId, name: user.name, email: user.email, role: user.role },
      courses,
      enrollments: courses.map((c) => ({ _id: c.enrollmentId, courseCode: c.code, progress: c.progress, grade: c.grade })),
      assignments,
      upcomingEvents: events.map((e) => ({
        _id: String(e._id),
        title: e.title,
        date: e.date,
        startDate: e.date,
        location: e.loc,
      })),
      stats: { courses: courses.length, completedCourses: completed },
    };
  }

  /** Admin-only: full student directory, for the Students admin page. */
  findAll() {
    return this.studentModel.find().sort({ name: 1 }).exec();
  }

  async findByIdOrSlug(idOrSlug: string) {
    const student = Types.ObjectId.isValid(idOrSlug)
      ? await this.studentModel.findById(idOrSlug).exec()
      : await this.studentModel.findOne({ slug: idOrSlug }).exec();
    if (!student) throw new NotFoundException(`Student "${idOrSlug}" not found`);
    return student;
  }

  create(dto: CreateStudentDto) {
    return this.studentModel.create(dto);
  }

  async update(idOrSlug: string, dto: UpdateStudentDto) {
    const student = await this.findByIdOrSlug(idOrSlug);
    Object.assign(student, dto);
    await student.save();
    return student;
  }

  async remove(idOrSlug: string) {
    const student = await this.findByIdOrSlug(idOrSlug);
    await this.enrollmentModel.deleteMany({ studentId: student._id }).exec();
    await student.deleteOne();
    return { deleted: true };
  }

  async getCourseCards(idOrSlug: string) {
    const student = await this.findByIdOrSlug(idOrSlug);
    const enrollments = await this.enrollmentModel.find({ studentId: student._id }).exec();
    const codes = enrollments.map((e) => e.courseCode);
    const courses = await this.courseModel.find({ code: { $in: codes } }).exec();
    const courseByCode = new Map(courses.map((c) => [c.code, c]));

    return enrollments.map((e) => ({
      code: e.courseCode,
      name: courseByCode.get(e.courseCode)?.name ?? e.courseCode,
      progress: e.progress,
      grade: e.grade,
    }));
  }

  async getDashboard(idOrSlug: string) {
    const student = await this.findByIdOrSlug(idOrSlug);
    const enrollments = await this.enrollmentModel.find({ studentId: student._id }).exec();
    return {
      name: student.name,
      gpa: student.gpa,
      creditsCompleted: student.creditsCompleted,
      attendancePct: student.attendancePct,
      currentCourseCount: enrollments.length,
    };
  }
}
