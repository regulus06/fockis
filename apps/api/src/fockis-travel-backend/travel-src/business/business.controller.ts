import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/auth.guard';
import { BusinessService } from './business.service';

@ApiTags('travel-business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('travel/business')
export class BusinessController {
  constructor(
    private readonly service: BusinessService,
  ) {}

  /**
   * ==========================================================================
   * BUSINESS DASHBOARD
   * ==========================================================================
   *
   * GET /travel/business/dashboard
   *
   * Requires authentication.
   */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Get business travel dashboard',
    description:
      'Returns business travel statistics, employees, current trip, and travel policy for the authenticated user.',
  })
  async dashboard(@Req() req: any) {
    return this.service.dashboard(req.user.sub);
  }
}