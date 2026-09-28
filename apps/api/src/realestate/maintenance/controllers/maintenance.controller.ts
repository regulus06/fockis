import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

import {
  MaintenanceService,
} from '../services/maintenance.service';

import {
  CreateMaintenanceDto,
} from '../dto/create-maintenance.dto';

import {
  UpdateMaintenanceDto,
} from '../dto/update-maintenance.dto';



@Controller('realestate/maintenance')
export class MaintenanceController {


  constructor(
    private readonly maintenanceService:
    MaintenanceService,
  ) {}



  @Post()
  create(
    @Body()
    createMaintenanceDto:
    CreateMaintenanceDto,
  ) {

    return this.maintenanceService.create(
      createMaintenanceDto,
    );

  }



  @Get()
  findAll() {

    return this.maintenanceService.findAll();

  }



  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {

    return this.maintenanceService.findOne(
      id,
    );

  }



  @Get('tenant/:tenantId')
  findByTenant(
    @Param('tenantId')
    tenantId: string,
  ) {

    return this.maintenanceService.findByTenant(
      tenantId,
    );

  }



  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId')
    propertyId: string,
  ) {

    return this.maintenanceService.findByProperty(
      propertyId,
    );

  }



  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updateMaintenanceDto:
    UpdateMaintenanceDto,
  ) {

    return this.maintenanceService.update(
      id,
      updateMaintenanceDto,
    );

  }



  @Patch(':id/assign/:agentId')
  assignAgent(
    @Param('id')
    id: string,

    @Param('agentId')
    agentId: string,
  ) {

    return this.maintenanceService.assignAgent(
      id,
      agentId,
    );

  }



  @Patch(':id/status/:status')
  updateStatus(
    @Param('id')
    id: string,

    @Param('status')
    status: string,
  ) {

    return this.maintenanceService.updateStatus(
      id,
      status,
    );

  }



  @Patch(':id/complete')
  complete(
    @Param('id')
    id: string,

    @Body()
    body: {
      finalCost?: number;
    },
  ) {

    return this.maintenanceService.complete(
      id,
      body.finalCost,
    );

  }



  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {

    return this.maintenanceService.remove(
      id,
    );

  }


}