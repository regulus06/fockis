import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Favorite,
  FavoriteSchema,
} from './schemas/favorite.schema';

import { FavoriteService } from './services/favorite.service';
import { FavoriteController } from './controllers/favorite.controller';


@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Favorite.name,
        schema: FavoriteSchema,
      },
    ]),
  ],

  controllers: [
    FavoriteController,
  ],

  providers: [
    FavoriteService,
  ],

  exports: [
    FavoriteService,
  ],
})
export class FavoritesModule {}