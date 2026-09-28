import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

import { TenantService } from '../services/tenant.service';

import {
  CreateTenantDto,
} from '../dto/create-tenant.dto';

import {
  UpdateTenantDto,
} from '../dto/update-tenant.dto';



@Controller('realestate/tenants')
export class TenantController {


  constructor(
    private readonly tenantService: TenantService,
  ) {}



  @Post()
  create(
    @Body() createTenantDto: CreateTenantDto,
  ) {

    return this.tenantService.create(
      createTenantDto,
    );

  }



  @Get()
  findAll() {

    return this.tenantService.findAll();

  }



  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {

    return this.tenantService.findOne(id);

  }



  @Patch(':id')
  update(
    @Param('id') id: string,

    @Body() updateTenantDto: UpdateTenantDto,

  ) {

    return this.tenantService.update(
      id,
      updateTenantDto,
    );

  }



  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {

    return this.tenantService.remove(id);

  }



  @Post(':id/verify')
  verify(
    @Param('id') id: string,
  ) {

    return this.tenantService.verify(id);

  }



  @Post(':id/leases/:leaseId')
  addLease(
    @Param('id') id: string,

    @Param('leaseId') leaseId: string,

  ) {

    return this.tenantService.addLease(
      id,
      leaseId,
    );

  }



  @Post(':id/properties/:propertyId')
  addRentalProperty(
    @Param('id') id: string,

    @Param('propertyId') propertyId: string,

  ) {

    return this.tenantService.addRentalProperty(
      id,
      propertyId,
    );

  }



  @Patch(':id/rent/:amount')
  updateRentPaid(
    @Param('id') id: string,

    @Param('amount') amount: string,

  ) {

    return this.tenantService.updateRentPaid(
      id,
      Number(amount),
    );

  }

}