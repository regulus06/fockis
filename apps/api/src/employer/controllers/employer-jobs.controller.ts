import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/jobs')
@UseGuards(EmployerAuthGuard)
export class EmployerJobsController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
