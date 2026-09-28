import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CampusEvent, CampusEventSchema } from './schemas/event.schema';
import { EventsService } from './services/events.service';
import { EventsController } from './controllers/events.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: CampusEvent.name, schema: CampusEventSchema }])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
