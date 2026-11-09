import { Controller, UseGuards } from '@nestjs/common';
import { EmployerAuthGuard } from '../guards/employer-auth.guard';

@Controller('employer/billing')
@UseGuards(EmployerAuthGuard)
export class EmployerBillingController {
  // Add validated routes only after the corresponding service and ownership guards are implemented.
}
