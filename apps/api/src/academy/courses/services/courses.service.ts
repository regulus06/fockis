import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  HydratedDocument,
  Model,
  Types,
} from "mongoose";

import {
  Course,
} from "../schemas/course.schema";

import {
  Enrollment,
} from "../schemas/enrollment.schema";

import {
  CreateCourseDto,
} from "../dto/create-course.dto";

import {
  UpdateCourseDto,
} from "../dto/update-course.dto";

import {
  AcademyUser,
} from "../../auth/schemas/academy-user.schema";

type AcademyUserDocument =
  HydratedDocument<AcademyUser>;

type EnrollmentDocument =
  HydratedDocument<Enrollment> & {
    createdAt?: Date;
    updatedAt?: Date;
  };

type CourseModuleInput = {
  order: number;
  title: string;
};

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,

    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<Enrollment>,

    @InjectModel(AcademyUser.name)
    private readonly userModel: Model<AcademyUser>,
  ) {}

  async findAll() {
    return this.courseModel
      .find()
      .populate(
        "instructorId",
        "name email role",
      )
      .sort({ code: 1 })
      .lean()
      .exec();
  }

  async findByInstructor(
    instructorId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        instructorId,
      )
    ) {
      throw new BadRequestException(
        "Invalid instructor ID.",
      );
    }

    return this.courseModel
      .find({
        instructorId:
          new Types.ObjectId(
            instructorId,
          ),
      })
      .populate(
        "instructorId",
        "name email role",
      )
      .sort({ code: 1 })
      .lean()
      .exec();
  }

  async findByCode(
    code: string,
  ) {
    const normalizedCode =
      this.normalizeCode(code);

    const course =
      await this.courseModel
        .findOne({
          code: normalizedCode,
        })
        .populate(
          "instructorId",
          "name email role",
        )
        .lean()
        .exec();

    if (!course) {
      throw new NotFoundException(
        `Course "${normalizedCode}" not found.`,
      );
    }

    return course;
  }

  async getModuleTitles(
    code: string,
  ) {
    const course =
      await this.findByCode(code);

    return [...(course.modules ?? [])]
      .sort(
        (a, b) =>
          a.order - b.order,
      )
      .map(
        (module) =>
          module.title,
      );
  }

  async getAssignments(
    code: string,
  ) {
    const course =
      await this.findByCode(code);

    return course.assignments ?? [];
  }

  async findAllEnrollments() {
    const enrollments =
      await this.enrollmentModel
        .find()
        .populate("studentId")
        .sort({
          createdAt: -1,
        })
        .lean()
        .exec();

    if (!enrollments.length) {
      return [];
    }

    const codes = [
      ...new Set(
        enrollments.map(
          (enrollment) =>
            enrollment.courseCode,
        ),
      ),
    ];

    const courses =
      await this.courseModel
        .find({
          code: {
            $in: codes,
          },
        })
        .populate(
          "instructorId",
          "name email role",
        )
        .lean()
        .exec();

    const courseByCode =
      new Map(
        courses.map(
          (course) => [
            course.code,
            course,
          ],
        ),
      );

    return enrollments.map(
      (enrollment) => {
        const course =
          courseByCode.get(
            enrollment.courseCode,
          );

        const typedEnrollment =
          enrollment as typeof enrollment & {
            createdAt?: Date;
          };

        return {
          _id: enrollment._id,
          student:
            enrollment.studentId,
          courseCode:
            enrollment.courseCode,
          courseName:
            course?.name ??
            enrollment.courseCode,
          instructor:
            course?.instructorId ??
            null,
          progress:
            enrollment.progress,
          grade:
            enrollment.grade,
          completedModuleOrders:
            enrollment.completedModuleOrders ??
            [],
          createdAt:
            typedEnrollment.createdAt ??
            null,
        };
      },
    );
  }

  async create(
    dto: CreateCourseDto,
    userId: string,
    role: string,
  ) {
    const currentUser =
      await this.getUser(userId);

    const code =
      this.normalizeCode(dto.code);

    const existing =
      await this.courseModel
        .findOne({
          code,
        })
        .lean()
        .exec();

    if (existing) {
      throw new ConflictException(
        `Course "${code}" already exists.`,
      );
    }

    const instructor =
      await this.resolveInstructor(
        dto.instructorId,
        currentUser,
        role,
      );

    const instructorId =
      this.getUserObjectId(
        instructor,
      );

    const course =
      await this.courseModel.create({
        code,
        name: dto.name.trim(),
        programId:
          dto.programId || undefined,
        instructorId,
        instructor:
          instructor.name,
        description:
          dto.description?.trim() ||
          undefined,
        modules:
          this.normalizeModules(
            dto.modules,
          ),
        assignments:
          dto.assignments ?? [],
      });

    return this.courseModel
      .findById(course._id)
      .populate(
        "instructorId",
        "name email role",
      )
      .lean()
      .exec();
  }

  async update(
    code: string,
    dto: UpdateCourseDto,
    userId: string,
    role: string,
  ) {
    const normalizedCode =
      this.normalizeCode(code);

    const course =
      await this.courseModel
        .findOne({
          code: normalizedCode,
        })
        .exec();

    if (!course) {
      throw new NotFoundException(
        `Course "${normalizedCode}" not found.`,
      );
    }

    const isPrivileged =
      role === "administrator" ||
      role === "staff";

    const isOwner =
      course.instructorId?.toString() ===
      userId;

    if (
      role === "instructor" &&
      !isOwner
    ) {
      throw new ForbiddenException(
        "You can only manage courses assigned to you.",
      );
    }

    if (
      !isPrivileged &&
      !isOwner
    ) {
      throw new ForbiddenException(
        "You do not have permission to manage this course.",
      );
    }

    const update: Record<
      string,
      unknown
    > = {};

    if (dto.name !== undefined) {
      const name =
        dto.name.trim();

      if (!name) {
        throw new BadRequestException(
          "Course name is required.",
        );
      }

      update.name = name;
    }

    if (
      dto.description !== undefined
    ) {
      update.description =
        dto.description.trim() ||
        undefined;
    }

    if (
      dto.programId !== undefined
    ) {
      update.programId =
        dto.programId || undefined;
    }

    if (dto.modules !== undefined) {
      update.modules =
        this.normalizeModules(
          dto.modules,
        );
    }

    if (
      dto.assignments !== undefined
    ) {
      update.assignments =
        dto.assignments;
    }

    if (
      isPrivileged &&
      dto.instructorId !== undefined
    ) {
      const instructor =
        await this.resolveInstructor(
          dto.instructorId,
          course.instructorId,
          role,
        );

      update.instructorId =
        this.getUserObjectId(
          instructor,
        );

      update.instructor =
        instructor.name;
    }

    return this.courseModel
      .findOneAndUpdate(
        {
          code: normalizedCode,
        },
        update,
        {
          new: true,
          runValidators: true,
        },
      )
      .populate(
        "instructorId",
        "name email role",
      )
      .lean()
      .exec();
  }

  async remove(
    code: string,
  ) {
    const normalizedCode =
      this.normalizeCode(code);

    const course =
      await this.courseModel
        .findOneAndDelete({
          code: normalizedCode,
        })
        .exec();

    if (!course) {
      throw new NotFoundException(
        `Course "${normalizedCode}" not found.`,
      );
    }

    await this.enrollmentModel
      .deleteMany({
        courseCode:
          normalizedCode,
      })
      .exec();

    return {
      deleted: true,
      courseCode:
        normalizedCode,
    };
  }

  async completeModule(
    studentId: string,
    courseCode: string,
    moduleOrder: number,
  ) {
    if (
      !Types.ObjectId.isValid(
        studentId,
      )
    ) {
      throw new BadRequestException(
        "Invalid student ID.",
      );
    }

    const course =
      await this.findByCode(
        courseCode,
      );

    return this._completeModule(
      studentId,
      course,
      moduleOrder,
    );
  }

  private async _completeModule(
    studentId: string,
    course: any,
    moduleOrder: number,
  ) {
    if (
      !Number.isInteger(
        moduleOrder,
      ) ||
      moduleOrder < 1
    ) {
      throw new BadRequestException(
        "Invalid module order.",
      );
    }

    const moduleExists =
      (course.modules ?? []).some(
        (module: {
          order: number;
        }) =>
          module.order ===
          moduleOrder,
      );

    if (!moduleExists) {
      throw new NotFoundException(
        "Course module not found.",
      );
    }

    const studentObjectId =
      new Types.ObjectId(
        studentId,
      );

    let enrollment =
      await this.enrollmentModel
        .findOne({
          studentId:
            studentObjectId,
          courseCode:
            course.code,
        })
        .exec();

    if (!enrollment) {
      enrollment =
        await this.enrollmentModel.create({
          studentId:
            studentObjectId,
          courseCode:
            course.code,
          progress: 0,
          grade: "—",
          completedModuleOrders: [],
        });
    }

    if (
      !enrollment.completedModuleOrders.includes(
        moduleOrder,
      )
    ) {
      enrollment.completedModuleOrders.push(
        moduleOrder,
      );
    }

    const totalModules =
      course.modules?.length || 1;

    enrollment.progress =
      Math.min(
        100,
        Math.round(
          (enrollment
            .completedModuleOrders
            .length /
            totalModules) *
            100,
        ),
      );

    await enrollment.save();

    return enrollment;
  }

  private normalizeCode(
    code: string,
  ): string {
    const normalized =
      String(code ?? "")
        .trim()
        .toUpperCase();

    if (!normalized) {
      throw new BadRequestException(
        "Course code is required.",
      );
    }

    return normalized;
  }

  private normalizeModules(
    modules:
      | CourseModuleInput[]
      | undefined,
  ) {
    if (!modules) {
      return [];
    }

    const normalized =
      modules.map(
        (module) => ({
          order: Number(
            module.order,
          ),
          title:
            String(
              module.title ?? "",
            ).trim(),
        }),
      );

    if (
      normalized.some(
        (module) =>
          !Number.isInteger(
            module.order,
          ) ||
          module.order < 1 ||
          !module.title,
      )
    ) {
      throw new BadRequestException(
        "Each course module requires a positive order and title.",
      );
    }

    const orders =
      normalized.map(
        (module) =>
          module.order,
      );

    if (
      new Set(orders).size !==
      orders.length
    ) {
      throw new BadRequestException(
        "Course module order values must be unique.",
      );
    }

    return normalized.sort(
      (a, b) =>
        a.order - b.order,
    );
  }

  private async resolveInstructor(
    requestedInstructorId:
      | string
      | undefined,
    fallbackUser:
      | AcademyUser
      | Types.ObjectId,
    role: string,
  ): Promise<AcademyUserDocument> {
    let instructorId: string;

    if (
      requestedInstructorId &&
      (
        role ===
          "administrator" ||
        role === "staff"
      )
    ) {
      instructorId =
        requestedInstructorId;
    } else if (
      fallbackUser instanceof
      Types.ObjectId
    ) {
      instructorId =
        fallbackUser.toString();
    } else {
      instructorId =
        this.getUserObjectId(
          fallbackUser,
        ).toString();
    }

    if (
      !Types.ObjectId.isValid(
        instructorId,
      )
    ) {
      throw new BadRequestException(
        "Invalid instructor ID.",
      );
    }

    const instructor =
      await this.userModel
        .findOne({
          _id:
            new Types.ObjectId(
              instructorId,
            ),
          role: "instructor",
        })
        .exec();

    if (!instructor) {
      throw new NotFoundException(
        "Selected instructor was not found.",
      );
    }

    return instructor as AcademyUserDocument;
  }

  private async getUser(
    userId: string,
  ): Promise<AcademyUserDocument> {
    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new NotFoundException(
        "Invalid Academy user.",
      );
    }

    const user =
      await this.userModel
        .findById(userId)
        .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    return user as AcademyUserDocument;
  }

  private getUserObjectId(
    user: AcademyUser,
  ): Types.ObjectId {
    const document =
      user as AcademyUser & {
        _id: Types.ObjectId;
      };

    if (
      !document._id ||
      !Types.ObjectId.isValid(
        document._id,
      )
    ) {
      throw new NotFoundException(
        "Academy user has an invalid database ID.",
      );
    }

    return document._id;
  }
}