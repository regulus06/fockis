import { Module } from '@nestjs/common';

import {
  MongooseModule,
} from '@nestjs/mongoose';


import {
  Contract,
  ContractSchema,
} from './schemas/contract.schema';


import {
  ContractsService,
} from './services/contracts.service';


import {
  ContractsController,
} from './controllers/contracts.controller';



@Module({

  imports: [

    MongooseModule.forFeature([

      {
        name: Contract.name,
        schema: ContractSchema,
      },

    ]),

  ],


  controllers: [

    ContractsController,

  ],


  providers: [

    ContractsService,

  ],


  exports: [

    ContractsService,

  ],

})
export class ContractsModule {}