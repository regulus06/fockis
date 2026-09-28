import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';


import {
  RecommendationService,
} from '../services/recommendation.service';


import {
  CreateRecommendationDto,
} from '../dto/create-recommendation.dto';



@Controller('realestate/recommendation')
export class RecommendationController {


  constructor(
    private readonly recommendationService:
    RecommendationService,
  ) {}



  @Post()
  create(
    @Body()
    createRecommendationDto:
    CreateRecommendationDto,
  ) {

    return this.recommendationService.create(
      createRecommendationDto,
    );

  }





  @Get()
  findAll() {

    return this.recommendationService.findAll();

  }





  @Get('user/:userId')
  findByUser(
    @Param('userId')
    userId:string,
  ) {

    return this.recommendationService.findByUser(
      userId,
    );

  }





  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId')
    propertyId:string,
  ) {

    return this.recommendationService.findByProperty(
      propertyId,
    );

  }





  @Get('top')
  topRecommendations(
    @Query('limit')
    limit?:string,
  ) {

    return this.recommendationService.topRecommendations(
      limit ? Number(limit) : 10,
    );

  }





  @Delete(':id')
  remove(
    @Param('id')
    id:string,
  ) {

    return this.recommendationService.remove(
      id,
    );

  }


}