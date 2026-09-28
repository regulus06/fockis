import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdmissionsService } from '../services/admissions.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { AcademyJwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('academy/admissions')
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  // Open — this is the "Start Your Application" submission itself.
  @Post('applications')
  create(@Body() dto: CreateApplicationDto) {
    return this.admissionsService.create(dto);
  }

  @Get('applications')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'admissions', 'staff')
  findAll() {
    return this.admissionsService.findAll();
  }

  @Get('applications/:id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'admissions', 'staff')
  findOne(@Param('id') id: string) {
    return this.admissionsService.findOne(id);
  }

  @Patch('applications/:id/status')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'admissions', 'staff')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.admissionsService.updateStatus(id, status);
  }
}
