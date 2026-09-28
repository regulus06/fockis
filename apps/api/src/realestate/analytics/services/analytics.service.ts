import {
  Injectable,
} from '@nestjs/common';


import {
  InjectModel,
} from '@nestjs/mongoose';


import {
  Model,
} from 'mongoose';


import {
  Analytics,
  AnalyticsDocument,
} from '../schemas/analytics.schema';


import {
  CreateAnalyticsDto,
} from '../dto/create-analytics.dto';



@Injectable()
export class AnalyticsService {


  constructor(

    @InjectModel(Analytics.name)

    private readonly analyticsModel:
    Model<AnalyticsDocument>,

  ) {}



  async create(
    dto:CreateAnalyticsDto,
  ){

    const event =
    new this.analyticsModel(dto);


    return event.save();

  }




  async findAll(){

    return this.analyticsModel
      .find()
      .populate('property')
      .populate('agent')
      .populate('user')
      .exec();

  }




  async propertyStats(
    propertyId:string,
  ){

    const views =
    await this.analyticsModel.countDocuments({

      property:propertyId,

      eventType:'view',

    });



    const inquiries =
    await this.analyticsModel.countDocuments({

      property:propertyId,

      eventType:'inquiry',

    });



    const favorites =
    await this.analyticsModel.countDocuments({

      property:propertyId,

      eventType:'favorite',

    });



    return {

      propertyId,

      views,

      inquiries,

      favorites,

    };

  }





  async agentStats(
    agentId:string,
  ){

    const events =
    await this.analyticsModel.aggregate([

      {
        $match:{
          agent:agentId,
        },
      },


      {
        $group:{

          _id:'$eventType',

          total:{
            $sum:1,
          },

        },

      },

    ]);



    return events;

  }





  async popularLocations(){

    return this.analyticsModel.aggregate([

      {
        $match:{
          location:{
            $exists:true,
          },
        },
      },


      {
        $group:{

          _id:'$location',

          searches:{
            $sum:1,
          },

        },

      },


      {
        $sort:{
          searches:-1,
        },
      },

    ]);

  }





  async dashboard(){

    const totalViews =
    await this.analyticsModel.countDocuments({

      eventType:'view',

    });


    const totalInquiries =
    await this.analyticsModel.countDocuments({

      eventType:'inquiry',

    });


    const totalTours =
    await this.analyticsModel.countDocuments({

      eventType:'tour',

    });



    return {

      totalViews,

      totalInquiries,

      totalTours,

    };

  }


}