import { Controller, Get, UseGuards } from '@nestjs/common';
import { EmployerService } from './employer.service';
// IMPORTANT: Replace this placeholder guard with the project's existing JWT/auth guard
// plus an employer membership/permission guard before mounting this module.
import { EmployerAuthGuard } from './guards/employer-auth.guard';

@Controller('employer')
@UseGuards(EmployerAuthGuard)
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  @Get('health')
  health() {
    return this.employerService.health();
  }
}
