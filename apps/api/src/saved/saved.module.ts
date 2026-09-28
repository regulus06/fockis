import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
Saved,
SavedSchema,
} from "./schemas/saved.schema";

import { SavedService } from "./saved.service";
import { SavedController } from "./saved.controller";


@Module({

imports:[
MongooseModule.forFeature([
{
name:Saved.name,
schema:SavedSchema,
},
]),
],


providers:[
SavedService,
],


controllers:[
SavedController,
],


exports:[
SavedService,
],

})


export class SavedModule{}