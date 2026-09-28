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
  Landlord,
  LandlordDocument,
} from '../schemas/landlord.schema';

import {
  CreateLandlordDto,
} from '../dto/create-landlord.dto';

import {
  UpdateLandlordDto,
} from '../dto/update-landlord.dto';


@Injectable()
export class LandlordService {

  constructor(
    @InjectModel(Landlord.name)
    private readonly landlordModel:
    Model<LandlordDocument>,
  ) {}


  async create(
    createLandlordDto: CreateLandlordDto,
  ) {

    const landlord =
      new this.landlordModel(
        createLandlordDto,
      );

    return landlord.save();
  }



  async findAll() {

    return this.landlordModel
      .find()
      .populate('user')
      .populate('properties')
      .exec();

  }



  async findOne(id: string) {

    const landlord =
      await this.landlordModel
        .findById(id)
        .populate('user')
        .populate('properties')
        .exec();


    if (!landlord) {

      throw new NotFoundException(
        'Landlord not found',
      );

    }


    return landlord;

  }



  async update(
    id: string,
    updateLandlordDto: UpdateLandlordDto,
  ) {

    const landlord =
      await this.landlordModel
        .findByIdAndUpdate(
          id,
          updateLandlordDto,
          {
            new: true,
          },
        )
        .exec();


    if (!landlord) {

      throw new NotFoundException(
        'Landlord not found',
      );

    }


    return landlord;

  }



  async remove(id: string) {

    const landlord =
      await this.landlordModel
        .findByIdAndDelete(id)
        .exec();


    if (!landlord) {

      throw new NotFoundException(
        'Landlord not found',
      );

    }


    return {
      message:
      'Landlord deleted successfully',
    };

  }



  async verify(id: string) {

    return this.landlordModel
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



  async addProperty(
    id: string,
    propertyId: string,
  ) {

    return this.landlordModel
      .findByIdAndUpdate(
        id,
        {
          $addToSet: {
            properties: propertyId,
          },

          $inc: {
            totalProperties: 1,
          },
        },
        {
          new: true,
        },
      );

  }

}