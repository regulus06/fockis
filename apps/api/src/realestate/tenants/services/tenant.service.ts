import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  Tenant,
  TenantDocument,
} from '../schemas/tenant.schema';

import {
  CreateTenantDto,
} from '../dto/create-tenant.dto';

import {
  UpdateTenantDto,
} from '../dto/update-tenant.dto';


@Injectable()
export class TenantService {

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel:
    Model<TenantDocument>,
  ) {}



  async create(
    createTenantDto: CreateTenantDto,
  ) {

    const tenant =
      new this.tenantModel(
        createTenantDto,
      );

    return tenant.save();

  }



  async findAll() {

    return this.tenantModel
      .find()
      .populate('user')
      .populate('leases')
      .populate('rentedProperties')
      .exec();

  }



  async findOne(id: string) {

    const tenant =
      await this.tenantModel
        .findById(id)
        .populate('user')
        .populate('leases')
        .populate('rentedProperties')
        .exec();


    if (!tenant) {

      throw new NotFoundException(
        'Tenant not found',
      );

    }


    return tenant;

  }



  async update(
    id: string,
    updateTenantDto: UpdateTenantDto,
  ) {

    const tenant =
      await this.tenantModel
        .findByIdAndUpdate(
          id,
          updateTenantDto,
          {
            new: true,
          },
        )
        .exec();


    if (!tenant) {

      throw new NotFoundException(
        'Tenant not found',
      );

    }


    return tenant;

  }



  async remove(id: string) {

    const tenant =
      await this.tenantModel
        .findByIdAndDelete(id)
        .exec();


    if (!tenant) {

      throw new NotFoundException(
        'Tenant not found',
      );

    }


    return {
      message:
      'Tenant deleted successfully',
    };

  }



  async verify(id: string) {

    return this.tenantModel
      .findByIdAndUpdate(
        id,
        {
          verified: true,
        },
        {
          new: true,
        },
      );

  }



  async addLease(
    id: string,
    leaseId: string,
  ) {

    return this.tenantModel
      .findByIdAndUpdate(
        id,
        {
          $addToSet: {
            leases: leaseId,
          },
        },
        {
          new: true,
        },
      );

  }



  async addRentalProperty(
    id: string,
    propertyId: string,
  ) {

    return this.tenantModel
      .findByIdAndUpdate(
        id,
        {
          $addToSet: {
            rentedProperties: propertyId,
          },
        },
        {
          new: true,
        },
      );

  }



  async updateRentPaid(
    id: string,
    amount: number,
  ) {

    return this.tenantModel
      .findByIdAndUpdate(
        id,
        {
          $inc: {
            totalRentPaid: amount,
          },
        },
        {
          new: true,
        },
      );

  }

}