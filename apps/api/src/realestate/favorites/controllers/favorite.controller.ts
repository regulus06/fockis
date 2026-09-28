import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

import { FavoriteService } from '../services/favorite.service';

import { CreateFavoriteDto } from '../dto/create-favorite.dto';
import { UpdateFavoriteDto } from '../dto/update-favorite.dto';



@Controller('realestate/favorites')
export class FavoriteController {


  constructor(
    private readonly favoriteService: FavoriteService,
  ) {}



  @Post()
  create(
    @Body() createFavoriteDto: CreateFavoriteDto,
  ) {

    return this.favoriteService.create(
      createFavoriteDto,
    );

  }



  @Get()
  findAll() {

    return this.favoriteService.findAll();

  }



  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
  ) {

    return this.favoriteService.findByUser(
      userId,
    );

  }



  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {

    return this.favoriteService.findOne(
      id,
    );

  }



  @Patch(':id')
  update(
    @Param('id') id: string,

    @Body()
    updateFavoriteDto: UpdateFavoriteDto,

  ) {

    return this.favoriteService.update(
      id,
      updateFavoriteDto,
    );

  }



  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {

    return this.favoriteService.remove(
      id,
    );

  }



  @Patch(':id/status/:status')
  updateStatus(
    @Param('id') id: string,

    @Param('status') status: string,

  ) {

    return this.favoriteService.updateStatus(
      id,
      status,
    );

  }



  @Post(':id/contacted')
  markContacted(
    @Param('id') id: string,
  ) {

    return this.favoriteService.markContacted(
      id,
    );

  }



  @Post(':id/notified')
  markNotified(
    @Param('id') id: string,
  ) {

    return this.favoriteService.markNotified(
      id,
    );

  }


}