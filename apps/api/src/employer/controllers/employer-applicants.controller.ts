import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/applicants')
@UseGuards(EmployerAuthGuard)
export class EmployerApplicantsController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
