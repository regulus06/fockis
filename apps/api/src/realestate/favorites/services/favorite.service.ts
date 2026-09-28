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
  Favorite,
  FavoriteDocument,
} from '../schemas/favorite.schema';

import {
  CreateFavoriteDto,
} from '../dto/create-favorite.dto';

import {
  UpdateFavoriteDto,
} from '../dto/update-favorite.dto';



@Injectable()
export class FavoriteService {


  constructor(
    @InjectModel(Favorite.name)
    private readonly favoriteModel:
    Model<FavoriteDocument>,
  ) {}



  async create(
    createFavoriteDto: CreateFavoriteDto,
  ) {

    const favorite =
      new this.favoriteModel(
        createFavoriteDto,
      );


    return favorite.save();

  }



  async findAll() {

    return this.favoriteModel
      .find()
      .populate('user')
      .populate('property')
      .exec();

  }



  async findByUser(
    userId: string,
  ) {

    return this.favoriteModel
      .find({
        user: userId,
      })
      .populate('property')
      .exec();

  }



  async findOne(
    id: string,
  ) {

    const favorite =
      await this.favoriteModel
        .findById(id)
        .populate('user')
        .populate('property')
        .exec();


    if (!favorite) {

      throw new NotFoundException(
        'Favorite not found',
      );

    }


    return favorite;

  }



  async update(
    id: string,
    updateFavoriteDto: UpdateFavoriteDto,
  ) {

    return this.favoriteModel
      .findByIdAndUpdate(
        id,
        updateFavoriteDto,
        {
          new: true,
        },
      );

  }



  async remove(
    id: string,
  ) {

    const favorite =
      await this.favoriteModel
        .findByIdAndDelete(id)
        .exec();


    if (!favorite) {

      throw new NotFoundException(
        'Favorite not found',
      );

    }


    return {
      message:
      'Favorite removed successfully',
    };

  }



  async updateStatus(
    id: string,
    status: string,
  ) {

    return this.favoriteModel
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



  async markContacted(
    id: string,
  ) {

    return this.favoriteModel
      .findByIdAndUpdate(
        id,
        {
          contactedOwner: true,
        },
        {
          new: true,
        },
      );

  }



  async markNotified(
    id: string,
  ) {

    return this.favoriteModel
      .findByIdAndUpdate(
        id,
        {
          notified: true,
        },
        {
          new: true,
        },
      );

  }


}