import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/profile')
@UseGuards(EmployerAuthGuard)
export class EmployerProfileController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
