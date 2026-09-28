import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JobsService } from '../services/jobs.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { ApplyJobDto } from '../dto/apply-job.dto';
import { AcademyJwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('academy/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll(@Query('type') type?: string) {
    return this.jobsService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Get(':id/applications')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff', 'employer')
  applications(@Param('id') id: string) {
    return this.jobsService.findApplicationsForJob(id);
  }

  // POST /academy/jobs/:id/apply — the "Apply" button. Open to any student, no admin role required.
  @Post(':id/apply')
  apply(@Param('id') id: string, @Body() dto: ApplyJobDto) {
    return this.jobsService.apply(id, dto);
  }

  @Post()
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff', 'employer')
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff', 'employer')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'staff', 'employer')
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }
}
