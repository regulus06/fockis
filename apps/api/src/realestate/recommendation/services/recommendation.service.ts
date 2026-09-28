import {
  Injectable,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  Recommendation,
  RecommendationDocument,
} from '../schemas/recommendation.schema';

import {
  CreateRecommendationDto,
} from '../dto/create-recommendation.dto';

@Injectable()
export class RecommendationService {

  constructor(

    @InjectModel(Recommendation.name)
    private readonly recommendationModel:
    Model<RecommendationDocument>,

  ) {}



  async create(
    dto: CreateRecommendationDto,
  ) {

    const recommendation =
      new this.recommendationModel(dto);

    return recommendation.save();

  }



  async findAll() {

    return this.recommendationModel
      .find()
      .populate('user')
      .populate('property')
      .exec();

  }



  async findByUser(
    userId: string,
  ) {

    return this.recommendationModel
      .find({
        user: userId,
      })
      .sort({
        score: -1,
      })
      .populate('property')
      .exec();

  }



  async findByProperty(
    propertyId: string,
  ) {

    return this.recommendationModel
      .find({
        property: propertyId,
      })
      .populate('user')
      .exec();

  }



  async topRecommendations(
    limit = 10,
  ) {

    return this.recommendationModel
      .find()
      .sort({
        score: -1,
      })
      .limit(limit)
      .populate('property')
      .populate('user')
      .exec();

  }



  async remove(
    id: string,
  ) {

    return this.recommendationModel.findByIdAndDelete(
      id,
    );

  }

}