import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/notifications')
@UseGuards(EmployerAuthGuard)
export class EmployerNotificationsController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
