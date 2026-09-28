import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
} from "mongoose";

import {
  Notification,
  NotificationDocument,
} from "./schemas/notification.schema";

import {
  CreateNotificationDto,
} from "./dto/create-notification.dto";

import {
  NotificationsGateway,
} from "./gateways/notifications.gateway";



@Injectable()
export class NotificationsService {


  constructor(

    @InjectModel(Notification.name)

    private readonly notificationModel:
    Model<NotificationDocument>,


    private readonly notificationsGateway:
    NotificationsGateway,

  ){}




  async create(
    dto:CreateNotificationDto,
  ){


    const notification =
    await this.notificationModel.create({

      ...dto,

    });



    this.notificationsGateway.sendNotification(

      String(notification.recipientId),

      notification,

    );



    return notification;

  }





  async findAll(
    userId:string,
  ){


    return this.notificationModel

    .find({

      recipientId:userId,

    })

    .populate(
      "senderId",
      "username avatar"
    )

    .sort({

      createdAt:-1,

    })

    .limit(50)

    .exec();

  }






  async unreadCount(
    userId:string,
  ){


    const count =
    await this.notificationModel.countDocuments({

      recipientId:userId,

      read:false,

    });



    return {
      count,
    };

  }






  async markRead(

    userId:string,

    notificationId:string,

  ){


    const notification =
    await this.notificationModel.findOneAndUpdate(

      {

        _id:notificationId,

        recipientId:userId,

      },

      {

        read:true,

      },

      {

        new:true,

      }

    );



    if(!notification){

      throw new NotFoundException(
        "Notification not found"
      );

    }


    return notification;

  }






  async markAllRead(
    userId:string,
  ){


    return this.notificationModel.updateMany(

      {

        recipientId:userId,

        read:false,

      },

      {

        read:true,

      }

    );

  }






  async remove(

    userId:string,

    notificationId:string,

  ){


    const notification =
    await this.notificationModel.findOneAndDelete(

      {

        _id:notificationId,

        recipientId:userId,

      }

    );



    if(!notification){

      throw new NotFoundException(
        "Notification not found"
      );

    }



    return {

      success:true,

    };

  }



}