import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import {
  MusicPlatformRules,
  MusicPlatformRulesSchema,
} from './music-rules.schema';

import {
  MusicRulesController,
} from './music-rules.controller';

import {
  MusicRulesService,
} from './music-rules.service';

import {
  SuperAdminGuard,
} from '../safety/super-admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MusicPlatformRules.name,
        schema: MusicPlatformRulesSchema,
      },
    ]),
  ],

  controllers: [
    MusicRulesController,
  ],

  providers: [
    MusicRulesService,
    SuperAdminGuard,
  ],

  exports: [
    MusicRulesService,
  ],
})
export class MusicRulesModule {}