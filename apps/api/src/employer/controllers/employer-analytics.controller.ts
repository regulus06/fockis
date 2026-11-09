import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/analytics')
@UseGuards(EmployerAuthGuard)
export class EmployerAnalyticsController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
