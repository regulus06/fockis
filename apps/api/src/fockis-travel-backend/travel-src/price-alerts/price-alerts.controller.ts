import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/auth.guard';

import { PriceAlertsService } from './price-alerts.service';

@ApiTags('price-alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('travel/price-alerts')
export class PriceAlertsController {
  constructor(
    private readonly service: PriceAlertsService,
  ) {}

  // ==========================================================================
  // GET
  // ==========================================================================

  @Get()
  @ApiOperation({
    summary: 'Get the authenticated user price alerts',
  })
  list(@Req() request: any) {
    return this.service.list(
      request.user.sub,
    );
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  @Post()
  @ApiOperation({
    summary: 'Create a price alert',
  })
  create(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.create(
      request.user.sub,
      data,
    );
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a price alert',
  })
  update(
    @Req() request: any,
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.update(
      request.user.sub,
      id,
      data,
    );
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a price alert',
  })
  remove(
    @Req() request: any,
    @Param('id') id: string,
  ) {
    return this.service.remove(
      request.user.sub,
      id,
    );
  }
}