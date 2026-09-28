import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import {
  Property,
  PropertyDocument,
} from '../../schemas/property.schema';


import {
  PropertyAudit,
  PropertyAuditDocument,
} from '../schemas/property-audit.schema';



@Injectable()
export class AdminPropertyService {


  constructor(

    @InjectModel(Property.name)
    private readonly propertyModel:
    Model<PropertyDocument>,


    @InjectModel(PropertyAudit.name)
    private readonly auditModel:
    Model<PropertyAuditDocument>,


  ) {}





  async dashboard() {

    const [
      total,
      pending,
      approved,
      rejected,
      featured,
      suspended,

    ] = await Promise.all([

      this.propertyModel.countDocuments(),

      this.propertyModel.countDocuments({
        status:'pending'
      }),

      this.propertyModel.countDocuments({
        status:'approved'
      }),

      this.propertyModel.countDocuments({
        status:'rejected'
      }),

      this.propertyModel.countDocuments({
        featured:true
      }),

      this.propertyModel.countDocuments({
        status:'suspended'
      }),

    ]);


    return {
      total,
      pending,
      approved,
      rejected,
      featured,
      suspended,
    };

  }





  async findAll(query:any = {}) {


    return this.propertyModel

      .find(query)

      .populate('agent')

      .sort({
        createdAt:-1
      });

  }





  async findOne(id:string) {


    const property =
      await this.propertyModel

      .findById(id)

      .populate('agent');



    if(!property){

      throw new NotFoundException(
        'Property not found'
      );

    }


    return property;

  }







  async approve(id:string){


    const property =
      await this.updateStatus(
        id,
        {
          status:'approved',
          verified:true,
        },
        'APPROVED'
      );


    return property;

  }







  async reject(
    id:string,
    reason?:string
  ){


    return this.updateStatus(

      id,

      {
        status:'rejected',
        rejectionReason:reason,
      },

      'REJECTED',

      reason

    );

  }







  async suspend(
    id:string,
    reason?:string
  ){


    return this.updateStatus(

      id,

      {
        status:'suspended',
        suspensionReason:reason,
      },

      'SUSPENDED',

      reason

    );

  }







  async feature(id:string){


    const property =
      await this.findOne(id);



    property.featured =
      !property.featured;



    await property.save();



    await this.createAudit(
      id,
      property.featured
      ? 'FEATURED'
      : 'UNFEATURED'
    );



    return property;

  }







  async remove(id:string){


    await this.findOne(id);


    await this.propertyModel
      .findByIdAndDelete(id);



    await this.createAudit(
      id,
      'DELETED'
    );



    return {
      success:true
    };

  }







  async auditHistory(id:string){


    return this.auditModel

      .find({
        propertyId:id
      })

      .sort({
        createdAt:-1
      });

  }







  private async updateStatus(

    id:string,

    update:any,

    action:string,

    reason?:string

  ){


    const property =
      await this.propertyModel
      .findByIdAndUpdate(

        id,

        update,

        {
          new:true
        }

      );



    if(!property){

      throw new NotFoundException(
        'Property not found'
      );

    }



    await this.createAudit(
      id,
      action,
      reason
    );



    return property;

  }








  private async createAudit(

    propertyId:string,

    action:string,

    reason?:string

  ){


    return this.auditModel.create({

      propertyId,

      action,

      reason,

    });

  }



}