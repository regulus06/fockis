import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

import { LeaseService } from '../services/lease.service';

import { CreateLeaseDto } from '../dto/create-lease.dto';
import { UpdateLeaseDto } from '../dto/update-lease.dto';



@Controller('realestate/leases')
export class LeaseController {


  constructor(
    private readonly leaseService: LeaseService,
  ) {}



  @Post()
  create(
    @Body()
    createLeaseDto: CreateLeaseDto,
  ) {

    return this.leaseService.create(
      createLeaseDto,
    );

  }



  @Get()
  findAll() {

    return this.leaseService.findAll();

  }



  @Get('active')
  activeLeases() {

    return this.leaseService.activeLeases();

  }



  @Get('tenant/:tenantId')
  findByTenant(
    @Param('tenantId') tenantId: string,
  ) {

    return this.leaseService.findByTenant(
      tenantId,
    );

  }



  @Get('landlord/:landlordId')
  findByLandlord(
    @Param('landlordId') landlordId: string,
  ) {

    return this.leaseService.findByLandlord(
      landlordId,
    );

  }



  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {

    return this.leaseService.findOne(
      id,
    );

  }



  @Get('expiring/:date')
  expiringLeases(
    @Param('date') date: string,
  ) {

    return this.leaseService.expiringLeases(
      new Date(date),
    );

  }



  @Patch(':id')
  update(
    @Param('id') id: string,

    @Body()
    updateLeaseDto: UpdateLeaseDto,

  ) {

    return this.leaseService.update(
      id,
      updateLeaseDto,
    );

  }



  @Patch(':id/status/:status')
  updateStatus(
    @Param('id') id: string,

    @Param('status') status: string,

  ) {

    return this.leaseService.updateStatus(
      id,
      status,
    );

  }



  @Post(':id/renew')
  renew(
    @Param('id') id: string,

    @Body()
    body: {
      renewalDate: string;
    },

  ) {

    return this.leaseService.renew(
      id,
      new Date(body.renewalDate),
    );

  }



  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {

    return this.leaseService.remove(
      id,
    );

  }


}