import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Behavior, BehaviorSchema } from './behavior.schema';
import { BehaviorService } from './behavior.service';
import { BehaviorController } from './behavior.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Behavior.name, schema: BehaviorSchema },
    ]),
  ],
  controllers: [BehaviorController],
  providers: [BehaviorService],
  exports: [BehaviorService],
})
export class BehaviorModule {}