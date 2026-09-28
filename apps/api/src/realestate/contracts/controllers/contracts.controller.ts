import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';


import {
  ContractsService,
} from '../services/contracts.service';


import {
  CreateContractDto,
} from '../dto/create-contract.dto';


import {
  UpdateContractDto,
} from '../dto/update-contract.dto';



@Controller('realestate/contracts')
export class ContractsController {


  constructor(
    private readonly contractsService:
    ContractsService,
  ) {}



  @Post()
  create(
    @Body()
    createContractDto:
    CreateContractDto,
  ) {

    return this.contractsService.create(
      createContractDto,
    );

  }



  @Get()
  findAll() {

    return this.contractsService.findAll();

  }



  @Get(':id')
  findOne(
    @Param('id')
    id:string,
  ) {

    return this.contractsService.findOne(
      id,
    );

  }



  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId')
    propertyId:string,
  ) {

    return this.contractsService.findByProperty(
      propertyId,
    );

  }



  @Get('tenant/:tenantId')
  findByTenant(
    @Param('tenantId')
    tenantId:string,
  ) {

    return this.contractsService.findByTenant(
      tenantId,
    );

  }



  @Patch(':id')
  update(
    @Param('id')
    id:string,

    @Body()
    updateContractDto:
    UpdateContractDto,
  ) {

    return this.contractsService.update(
      id,
      updateContractDto,
    );

  }



  @Patch(':id/activate')
  activate(
    @Param('id')
    id:string,
  ) {

    return this.contractsService.activate(
      id,
    );

  }



  @Patch(':id/terminate')
  terminate(
    @Param('id')
    id:string,
  ) {

    return this.contractsService.terminate(
      id,
    );

  }



  @Delete(':id')
  remove(
    @Param('id')
    id:string,
  ) {

    return this.contractsService.remove(
      id,
    );

  }


}