import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";


import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";
import { GroupsGateway } from "./groups.gateway";


import {
  Group,
  GroupSchema
} from "./group.schema";



@Module({

imports:[


MongooseModule.forFeature([

{
name: Group.name,
schema: GroupSchema
}

])


],



controllers:[

GroupsController

],



providers:[

GroupsService,

GroupsGateway

]



})
export class GroupsModule {}