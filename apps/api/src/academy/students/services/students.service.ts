import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student } from '../schemas/student.schema';
import { Enrollment } from '../../courses/schemas/enrollment.schema';
import { Course } from '../../courses/schemas/course.schema';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
  ) {}

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
