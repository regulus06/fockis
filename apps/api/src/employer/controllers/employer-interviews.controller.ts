import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/interviews')
@UseGuards(EmployerAuthGuard)
export class EmployerInterviewsController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
