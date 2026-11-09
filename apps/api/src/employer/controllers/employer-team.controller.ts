import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/team')
@UseGuards(EmployerAuthGuard)
export class EmployerTeamController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
