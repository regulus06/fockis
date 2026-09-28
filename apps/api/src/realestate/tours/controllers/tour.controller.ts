import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

import { TourService } from '../services/tour.service';

import { CreateTourDto } from '../dto/create-tour.dto';
import { UpdateTourDto } from '../dto/update-tour.dto';



@Controller('realestate/tours')
export class TourController {


  constructor(
    private readonly tourService: TourService,
  ) {}



  @Post()
  create(
    @Body()
    createTourDto: CreateTourDto,
  ) {

    return this.tourService.create(
      createTourDto,
    );

  }



  @Get()
  findAll() {

    return this.tourService.findAll();

  }



  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {

    return this.tourService.findOne(
      id,
    );

  }



  @Get('tenant/:tenantId')
  findByTenant(
    @Param('tenantId') tenantId: string,
  ) {

    return this.tourService.findByTenant(
      tenantId,
    );

  }



  @Get('agent/:agentId')
  findByAgent(
    @Param('agentId') agentId: string,
  ) {

    return this.tourService.findByAgent(
      agentId,
    );

  }



  @Patch(':id')
  update(
    @Param('id') id: string,

    @Body()
    updateTourDto: UpdateTourDto,

  ) {

    return this.tourService.update(
      id,
      updateTourDto,
    );

  }



  @Patch(':id/status/:status')
  updateStatus(
    @Param('id') id: string,

    @Param('status') status: string,

  ) {

    return this.tourService.updateStatus(
      id,
      status,
    );

  }



  @Post(':id/reminder')
  sendReminder(
    @Param('id') id: string,
  ) {

    return this.tourService.sendReminder(
      id,
    );

  }



  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {

    return this.tourService.remove(
      id,
    );

  }


}