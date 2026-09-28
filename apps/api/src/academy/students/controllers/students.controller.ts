import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { StudentsService } from '../services/students.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { AcademyJwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('academy/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff', 'advisor')
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':idOrSlug')
  dashboard(@Param('idOrSlug') idOrSlug: string) {
    return this.studentsService.getDashboard(idOrSlug);
  }

  @Get(':idOrSlug/courses')
  courses(@Param('idOrSlug') idOrSlug: string) {
    return this.studentsService.getCourseCards(idOrSlug);
  }

  @Post()
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff', 'advisor')
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Patch(':idOrSlug')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff', 'advisor')
  update(@Param('idOrSlug') idOrSlug: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(idOrSlug, dto);
  }

  @Delete(':idOrSlug')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  remove(@Param('idOrSlug') idOrSlug: string) {
    return this.studentsService.remove(idOrSlug);
  }
}
