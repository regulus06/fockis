import {
  Controller,
  Post,
  Get,
  Body,
  Param,
} from '@nestjs/common';


import {
  AnalyticsService,
} from '../services/analytics.service';


import {
  CreateAnalyticsDto,
} from '../dto/create-analytics.dto';



@Controller('realestate/analytics')
export class AnalyticsController {


  constructor(
    private readonly analyticsService:
    AnalyticsService,
  ) {}



  @Post()
  create(
    @Body()
    createAnalyticsDto:
    CreateAnalyticsDto,
  ){

    return this.analyticsService.create(
      createAnalyticsDto,
    );

  }





  @Get()
  findAll(){

    return this.analyticsService.findAll();

  }





  @Get('property/:id')
  propertyStats(
    @Param('id')
    id:string,
  ){

    return this.analyticsService.propertyStats(
      id,
    );

  }





  @Get('agent/:id')
  agentStats(
    @Param('id')
    id:string,
  ){

    return this.analyticsService.agentStats(
      id,
    );

  }





  @Get('locations')
  popularLocations(){

    return this.analyticsService.popularLocations();

  }





  @Get('dashboard')
  dashboard(){

    return this.analyticsService.dashboard();

  }


}