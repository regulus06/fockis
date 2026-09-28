import { Module } from '@nestjs/common';

import {
 MongooseModule,
} from '@nestjs/mongoose';


import {
 Document,
 DocumentSchema,
} from './schemas/document.schema';


import {
 DocumentsService,
} from './services/documents.service';


import {
 DocumentsController,
} from './controllers/documents.controller';



@Module({

imports:[

 MongooseModule.forFeature([
  {
   name:Document.name,
   schema:DocumentSchema,
  }
 ])

],


controllers:[
 DocumentsController,
],


providers:[
 DocumentsService,
],


exports:[
 DocumentsService,
],

})

export class DocumentsModule {}