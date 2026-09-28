import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FacultyService } from '../services/faculty.service';
import { CreateFacultyDto } from '../dto/create-faculty.dto';
import { UpdateFacultyDto } from '../dto/update-faculty.dto';
import { AcademyJwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('academy/faculty')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Get()
  findAll() {
    return this.facultyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facultyService.findOne(id);
  }

  @Post()
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  create(@Body() dto: CreateFacultyDto) {
    return this.facultyService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  update(@Param('id') id: string, @Body() dto: UpdateFacultyDto) {
    return this.facultyService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff')
  remove(@Param('id') id: string) {
    return this.facultyService.remove(id);
  }
}
