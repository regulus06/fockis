import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';


import {
  InjectModel,
} from '@nestjs/mongoose';


import {
  Model,
} from 'mongoose';


import {
  Contract,
  ContractDocument,
} from '../schemas/contract.schema';


import {
  CreateContractDto,
} from '../dto/create-contract.dto';


import {
  UpdateContractDto,
} from '../dto/update-contract.dto';



@Injectable()
export class ContractsService {


  constructor(

    @InjectModel(Contract.name)

    private readonly contractModel:
    Model<ContractDocument>,

  ) {}



  async create(
    dto: CreateContractDto,
  ) {

    const contract =
      new this.contractModel(dto);


    return contract.save();

  }



  async findAll() {

    return this.contractModel

      .find()

      .populate('property')

      .populate('tenant')

      .populate('landlord')

      .populate('agent')

      .exec();

  }



  async findOne(
    id:string,
  ) {

    const contract =
      await this.contractModel

      .findById(id)

      .populate('property')

      .populate('tenant')

      .populate('landlord')

      .populate('agent')

      .exec();



    if(!contract){

      throw new NotFoundException(
        'Contract not found',
      );

    }


    return contract;

  }



  async findByProperty(
    propertyId:string,
  ){

    return this.contractModel.find({
      property:propertyId,
    });

  }



  async findByTenant(
    tenantId:string,
  ){

    return this.contractModel.find({
      tenant:tenantId,
    });

  }



  async update(
    id:string,
    dto:UpdateContractDto,
  ){

    return this.contractModel
      .findByIdAndUpdate(
        id,
        dto,
        {
          new:true,
        },
      );

  }



  async activate(
    id:string,
  ){

    return this.contractModel

      .findByIdAndUpdate(

        id,

        {
          status:'active',
          signedDate:new Date(),
        },

        {
          new:true,
        },

      );

  }



  async terminate(
    id:string,
  ){

    return this.contractModel

      .findByIdAndUpdate(

        id,

        {
          status:'terminated',
        },

        {
          new:true,
        },

      );

  }



  async remove(
    id:string,
  ){

    const contract =
      await this.contractModel
      .findByIdAndDelete(id);



    if(!contract){

      throw new NotFoundException(
        'Contract not found',
      );

    }



    return {
      message:
      'Contract deleted successfully',
    };

  }


}