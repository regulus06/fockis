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
  Maintenance,
  MaintenanceDocument,
} from '../schemas/maintenance.schema';

import {
  CreateMaintenanceDto,
} from '../dto/create-maintenance.dto';

import {
  UpdateMaintenanceDto,
} from '../dto/update-maintenance.dto';



@Injectable()
export class MaintenanceService {


  constructor(
    @InjectModel(Maintenance.name)
    private readonly maintenanceModel:
    Model<MaintenanceDocument>,
  ) {}



  async create(
    createMaintenanceDto: CreateMaintenanceDto,
  ) {

    const request =
      new this.maintenanceModel(
        createMaintenanceDto,
      );


    return request.save();

  }



  async findAll() {

    return this.maintenanceModel
      .find()
      .populate('property')
      .populate('tenant')
      .populate('landlord')
      .populate('assignedAgent')
      .exec();

  }



  async findOne(
    id: string,
  ) {

    const request =
      await this.maintenanceModel
        .findById(id)
        .populate('property')
        .populate('tenant')
        .populate('assignedAgent')
        .exec();


    if (!request) {

      throw new NotFoundException(
        'Maintenance request not found',
      );

    }


    return request;

  }



  async findByTenant(
    tenantId: string,
  ) {

    return this.maintenanceModel
      .find({
        tenant: tenantId,
      })
      .populate('property')
      .exec();

  }



  async findByProperty(
    propertyId: string,
  ) {

    return this.maintenanceModel
      .find({
        property: propertyId,
      })
      .populate('tenant')
      .exec();

  }



  async assignAgent(
    id: string,
    agentId: string,
  ) {

    return this.maintenanceModel
      .findByIdAndUpdate(
        id,
        {
          assignedAgent: agentId,
          status: 'assigned',
        },
        {
          new: true,
        },
      );

  }



  async update(
    id: string,
    updateMaintenanceDto:
    UpdateMaintenanceDto,
  ) {

    return this.maintenanceModel
      .findByIdAndUpdate(
        id,
        updateMaintenanceDto,
        {
          new: true,
        },
      );

  }



  async updateStatus(
    id: string,
    status: string,
  ) {

    return this.maintenanceModel
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



  async complete(
    id: string,
    finalCost?: number,
  ) {

    return this.maintenanceModel
      .findByIdAndUpdate(
        id,
        {
          status: 'completed',
          finalCost,
          completedDate: new Date(),
        },
        {
          new: true,
        },
      );

  }



  async remove(
    id: string,
  ) {

    const request =
      await this.maintenanceModel
        .findByIdAndDelete(id);


    if (!request) {

      throw new NotFoundException(
        'Maintenance request not found',
      );

    }


    return {
      message:
      'Maintenance request deleted successfully',
    };

  }


}