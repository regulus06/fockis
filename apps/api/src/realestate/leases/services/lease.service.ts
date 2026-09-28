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
  Lease,
  LeaseDocument,
} from '../schemas/lease.schema';

import {
  CreateLeaseDto,
} from '../dto/create-lease.dto';

import {
  UpdateLeaseDto,
} from '../dto/update-lease.dto';



@Injectable()
export class LeaseService {


  constructor(
    @InjectModel(Lease.name)
    private readonly leaseModel:
    Model<LeaseDocument>,
  ) {}



  async create(
    createLeaseDto: CreateLeaseDto,
  ) {

    const lease =
      new this.leaseModel(
        createLeaseDto,
      );


    return lease.save();

  }



  async findAll() {

    return this.leaseModel
      .find()
      .populate('property')
      .populate('tenant')
      .populate('landlord')
      .populate('agent')
      .exec();

  }



  async findOne(
    id: string,
  ) {

    const lease =
      await this.leaseModel
        .findById(id)
        .populate('property')
        .populate('tenant')
        .populate('landlord')
        .populate('agent')
        .exec();


    if (!lease) {

      throw new NotFoundException(
        'Lease not found',
      );

    }


    return lease;

  }



  async findByTenant(
    tenantId: string,
  ) {

    return this.leaseModel
      .find({
        tenant: tenantId,
      })
      .populate('property')
      .exec();

  }



  async findByLandlord(
    landlordId: string,
  ) {

    return this.leaseModel
      .find({
        landlord: landlordId,
      })
      .populate('property')
      .populate('tenant')
      .exec();

  }



  async activeLeases() {

    return this.leaseModel
      .find({
        status: 'active',
      })
      .populate('property')
      .populate('tenant')
      .exec();

  }



  async expiringLeases(
    date: Date,
  ) {

    return this.leaseModel
      .find({
        endDate: {
          $lte: date,
        },

        status: 'active',
      })
      .populate('tenant')
      .populate('property')
      .exec();

  }



  async update(
    id: string,
    updateLeaseDto: UpdateLeaseDto,
  ) {

    return this.leaseModel
      .findByIdAndUpdate(
        id,
        updateLeaseDto,
        {
          new: true,
        },
      );

  }



  async updateStatus(
    id: string,
    status: string,
  ) {

    return this.leaseModel
      .findByIdAndUpdate(
        id,
        {
          status,
        },
        {
          new: true,
        },
      );

  }



  async renew(
    id: string,
    renewalDate: Date,
  ) {

    return this.leaseModel
      .findByIdAndUpdate(
        id,
        {
          status: 'renewed',
          renewalDate,
        },
        {
          new: true,
        },
      );

  }



  async remove(
    id: string,
  ) {

    const lease =
      await this.leaseModel
        .findByIdAndDelete(id);


    if (!lease) {

      throw new NotFoundException(
        'Lease not found',
      );

    }


    return {
      message:
      'Lease deleted successfully',
    };

  }


}