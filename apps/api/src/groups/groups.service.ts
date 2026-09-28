import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Group,
  GroupDocument,
} from "./group.schema";

import { CreateGroupDto } from "./dto/create-group.dto";
import { SendGroupMessageDto } from "./dto/send-group-message.dto";



@Injectable()
export class GroupsService {


  constructor(

    @InjectModel(Group.name)
    private readonly groupModel:
      Model<GroupDocument>,

  ) {}



  // ============================================================
  // CREATE GROUP
  // ============================================================

  async createGroup(
    dto: CreateGroupDto,
    userId: string,
  ) {

    return this.groupModel.create({

      name: dto.name,

      members: [

        new Types.ObjectId(userId),

        ...(dto.members || []).map(
          (id) => new Types.ObjectId(id),
        ),

      ],

      admins: [

        new Types.ObjectId(userId),

      ],

      createdBy:
        new Types.ObjectId(userId),

    });

  }



  // ============================================================
  // GET MY GROUPS
  // ============================================================

  async getMyGroups(
    userId: string,
  ) {

    return this.groupModel

      .find({

        members:
          new Types.ObjectId(userId),

      })

      .populate(
        "members",
        "username email profilePicture",
      )

      .sort({
        createdAt: -1,
      });

  }



  // ============================================================
  // GET GROUP INVITE / JOIN REQUEST COUNT
  // ============================================================

  async getInviteCount(
    userId: string,
  ) {

    const count =
      await this.groupModel.countDocuments({

        pendingRequests:
          new Types.ObjectId(userId),

      });

    return {
      count,
    };

  }



  // ============================================================
  // EDIT GROUP NAME
  // ============================================================

  async updateGroup(
    id: string,
    name: string,
    userId: string,
  ) {

    const group =
      await this.groupModel.findById(id);

    if (!group) {

      throw new NotFoundException(
        "Group not found",
      );

    }



    const admin =
      group.admins.some(
        (a: any) =>
          a.toString() === userId,
      );

    if (!admin) {

      throw new ForbiddenException(
        "Only admin can edit",
      );

    }



    group.name = name;

    return group.save();

  }



  // ============================================================
  // DELETE GROUP
  // ============================================================

  async deleteGroup(
    id: string,
    userId: string,
  ) {

    const group =
      await this.groupModel.findById(id);

    if (!group) {

      throw new NotFoundException(
        "Group not found",
      );

    }



    if (
      group.createdBy.toString()
      !== userId
    ) {

      throw new ForbiddenException(
        "Only owner can delete",
      );

    }



    await group.deleteOne();

    return {
      message: "Group deleted",
    };

  }



  // ============================================================
  // JOIN GROUP
  // ============================================================

  async joinGroup(
    id: string,
    userId: string,
  ) {

    const group =
      await this.groupModel.findById(id);

    if (!group) {

      throw new NotFoundException(
        "Group not found",
      );

    }



    const already =
      group.members.some(
        (m: any) =>
          m.toString() === userId,
      );

    if (already) {

      return group;

    }



    if (
      group.joinMode === "open"
    ) {

      group.members.push(
        new Types.ObjectId(userId),
      );

    } else {

      const alreadyPending =
        group.pendingRequests.some(
          (m: any) =>
            m.toString() === userId,
        );

      if (!alreadyPending) {

        group.pendingRequests.push(
          new Types.ObjectId(userId),
        );

      }

    }



    return group.save();

  }



  // ============================================================
  // ACCEPT JOIN REQUEST
  // ============================================================

  async acceptJoin(
    id: string,
    userId: string,
    requestUser: string,
  ) {

    const group =
      await this.groupModel.findById(id);

    if (!group) {

      throw new NotFoundException(
        "Group not found",
      );

    }



    const admin =
      group.admins.some(
        (a: any) =>
          a.toString() === userId,
      );

    if (!admin) {

      throw new ForbiddenException(
        "Only admin",
      );

    }



    group.pendingRequests =
      group.pendingRequests.filter(

        (u: any) =>
          u.toString() !== requestUser,

      );



    const alreadyMember =
      group.members.some(
        (u: any) =>
          u.toString() === requestUser,
      );

    if (!alreadyMember) {

      group.members.push(
        new Types.ObjectId(requestUser),
      );

    }



    return group.save();

  }



  // ============================================================
  // LEAVE GROUP
  // ============================================================

  async leaveGroup(
    id: string,
    userId: string,
  ) {

    const group =
      await this.groupModel.findById(id);

    if (!group) {

      throw new NotFoundException(
        "Group not found",
      );

    }



    group.members =
      group.members.filter(

        (u: any) =>
          u.toString() !== userId,

      );



    return group.save();

  }



  // ============================================================
  // REMOVE MEMBER
  // ============================================================

  async removeMember(
    id: string,
    memberId: string,
    adminId: string,
  ) {

    const group =
      await this.groupModel.findById(id);

    if (!group) {

      throw new NotFoundException(
        "Group not found",
      );

    }



    const admin =
      group.admins.some(
        (a: any) =>
          a.toString() === adminId,
      );

    if (!admin) {

      throw new ForbiddenException(
        "Only admin",
      );

    }



    group.members =
      group.members.filter(

        (u: any) =>
          u.toString() !== memberId,

      );



    return group.save();

  }



  // ============================================================
  // SEND MESSAGE
  // ============================================================

  async sendMessage(
    dto: SendGroupMessageDto,
    userId: string,
  ) {

    const group =
      await this.groupModel.findById(
        dto.groupId,
      );

    if (!group) {

      throw new NotFoundException(
        "Group not found",
      );

    }



    group.messages.push({

      sender:
        new Types.ObjectId(userId),

      text:
        dto.text,

      mediaUrl:
        dto.mediaUrl,

      mediaType:
        dto.mediaType || "text",

      createdAt:
        new Date(),

    });



    return group.save();

  }



  // ============================================================
  // GET MESSAGES
  // ============================================================

  async getMessages(
    groupId: string,
  ) {

    const group =
      await this.groupModel

        .findById(groupId)

        .populate(
          "messages.sender",
          "username profilePicture",
        );



    if (!group) {

      throw new NotFoundException(
        "Group not found",
      );

    }



    return group.messages;

  }

}