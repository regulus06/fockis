import { Controller, Get, UseGuards } from '@nestjs/common';
import { EmployerManagementService } from './employer-management.service';
// Replace with the existing Fockis admin JWT + role guard before registering this module.
@Controller('admin/employer-management')
export class EmployerManagementController {
  constructor(private readonly service: EmployerManagementService) {}
  @Get('health') health() { return this.service.health(); }
}
