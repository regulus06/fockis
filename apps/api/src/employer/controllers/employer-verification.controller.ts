import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/verification')
@UseGuards(EmployerAuthGuard)
export class EmployerVerificationController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
