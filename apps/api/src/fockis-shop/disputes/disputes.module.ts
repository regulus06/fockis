import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';


import {
 Dispute,
 DisputeSchema
} from './schemas/dispute.schema';


import { AdminDisputesController, DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';


@Module({

imports:[

MongooseModule.forFeature([

{
 name: Dispute.name,
 schema: DisputeSchema
}

])

],


controllers:[
 DisputesController,
 AdminDisputesController
],


providers:[
 DisputesService
],


exports:[
 DisputesService
]


})

export class DisputesModule {}