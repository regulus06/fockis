import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { Request } from "express";

import { CoursesService } from "../services/courses.service";

import { CreateCourseDto } from "../dto/create-course.dto";
import { UpdateCourseDto } from "../dto/update-course.dto";

import { AcademyJwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";

interface AcademyRequest
  extends Request {
  user: {
    id: string;
    userId: string;
    sub: string;
    email: string;
    name: string;
    role: string;
  };
}

@Controller("academy/courses")
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
  ) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get("mine")
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles("instructor")
  findMyCourses(
    @Req() req: AcademyRequest,
  ) {
    return this.coursesService.findByInstructor(
      req.user.userId,
    );
  }

  @Get("enrollments/all")
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    "administrator",
    "staff",
    "advisor",
    "instructor",
  )
  findAllEnrollments() {
    return this.coursesService.findAllEnrollments();
  }

  @Get(":code/modules")
  getModules(
    @Param("code") code: string,
  ) {
    return this.coursesService.getModuleTitles(
      code,
    );
  }

  @Get(":code/assignments")
  getAssignments(
    @Param("code") code: string,
  ) {
    return this.coursesService.getAssignments(
      code,
    );
  }

  @Get(":code")
  findOne(
    @Param("code") code: string,
  ) {
    return this.coursesService.findByCode(
      code,
    );
  }

  @Post(":code/modules/:order/complete")
  @UseGuards(AcademyJwtAuthGuard)
  completeModule(
    @Req() req: AcademyRequest,
    @Param("code") code: string,
    @Param("order") order: string,
  ) {
    return this.coursesService.completeModule(
      req.user.userId,
      code,
      Number(order),
    );
  }

  @Post()
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    "administrator",
    "staff",
    "instructor",
  )
  create(
    @Req() req: AcademyRequest,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coursesService.create(
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(":code")
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    "administrator",
    "staff",
    "instructor",
  )
  update(
    @Req() req: AcademyRequest,
    @Param("code") code: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(
      code,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(":code")
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    "administrator",
    "staff",
  )
  remove(
    @Param("code") code: string,
  ) {
    return this.coursesService.remove(code);
  }
}