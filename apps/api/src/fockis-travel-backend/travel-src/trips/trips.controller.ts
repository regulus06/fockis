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
  ApiTags,
} from '@nestjs/swagger';

import {
  JwtAuthGuard,
} from '../common/auth.guard';

import {
  AddTripItemDto,
  CreateTripDto,
  UpdateTripStatusDto,
} from './dto';

import {
  TripsService,
} from './trips.service';

@ApiTags('trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('travel/trips')
export class TripsController {
  constructor(
    private readonly service: TripsService,
  ) {}

  /* ==========================================================================
     CREATE
  ========================================================================== */

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateTripDto,
  ) {
    return this.service.create(
      req.user.sub,
      dto,
    );
  }

  /* ==========================================================================
     LIST MY TRIPS
  ========================================================================== */

  @Get()
  list(
    @Req() req: any,
  ) {
    return this.service.list(
      req.user.sub,
    );
  }

  /* ==========================================================================
     GET ONE TRIP
  ========================================================================== */

  @Get(':id')
  one(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.service.one(
      req.user.sub,
      id,
    );
  }

  /* ==========================================================================
     ADD ITEM
  ========================================================================== */

  @Post(':id/items')
  add(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddTripItemDto,
  ) {
    return this.service.addItem(
      req.user.sub,
      id,
      dto,
    );
  }

  /* ==========================================================================
     REMOVE ITEM
  ========================================================================== */

  @Delete(':id/items/:index')
  remove(
    @Req() req: any,
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.service.removeItem(
      req.user.sub,
      id,
      Number(index),
    );
  }

  /* ==========================================================================
     UPDATE STATUS
  ========================================================================== */

  @Patch(':id/status')
  status(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTripStatusDto,
  ) {
    return this.service.updateStatus(
      req.user.sub,
      id,
      dto.status,
    );
  }
}