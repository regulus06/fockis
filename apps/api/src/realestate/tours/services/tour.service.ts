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
  Tour,
  TourDocument,
} from '../schemas/tour.schema';

import {
  CreateTourDto,
} from '../dto/create-tour.dto';

import {
  UpdateTourDto,
} from '../dto/update-tour.dto';



@Injectable()
export class TourService {


  constructor(
    @InjectModel(Tour.name)
    private readonly tourModel:
    Model<TourDocument>,
  ) {}



  async create(
    createTourDto: CreateTourDto,
  ) {

    const tour =
      new this.tourModel(
        createTourDto,
      );


    return tour.save();

  }



  async findAll() {

    return this.tourModel
      .find()
      .populate('property')
      .populate('tenant')
      .populate('agent')
      .exec();

  }



  async findOne(
    id: string,
  ) {

    const tour =
      await this.tourModel
        .findById(id)
        .populate('property')
        .populate('tenant')
        .populate('agent')
        .exec();


    if (!tour) {

      throw new NotFoundException(
        'Tour not found',
      );

    }


    return tour;

  }



  async findByTenant(
    tenantId: string,
  ) {

    return this.tourModel
      .find({
        tenant: tenantId,
      })
      .populate('property')
      .populate('agent')
      .exec();

  }



  async findByAgent(
    agentId: string,
  ) {

    return this.tourModel
      .find({
        agent: agentId,
      })
      .populate('property')
      .populate('tenant')
      .exec();

  }



  async update(
    id: string,
    updateTourDto: UpdateTourDto,
  ) {

    return this.tourModel
      .findByIdAndUpdate(
        id,
        updateTourDto,
        {
          new: true,
        },
      );

  }



  async updateStatus(
    id: string,
    status: string,
  ) {

    return this.tourModel
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



  async sendReminder(
    id: string,
  ) {

    return this.tourModel
      .findByIdAndUpdate(
        id,
        {
          reminderSent: true,
        },
        {
          new: true,
        },
      );

  }



  async remove(
    id: string,
  ) {

    const tour =
      await this.tourModel
        .findByIdAndDelete(id);


    if (!tour) {

      throw new NotFoundException(
        'Tour not found',
      );

    }


    return {
      message:
      'Tour deleted successfully',
    };

  }


}