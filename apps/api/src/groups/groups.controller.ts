import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Param,
  Patch,
  Delete,
} from "@nestjs/common";

import { Request } from "express";

import { GroupsService } from "./groups.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { CreateGroupDto } from "./dto/create-group.dto";
import { SendGroupMessageDto } from "./dto/send-group-message.dto";



interface AuthRequest extends Request {
  user: any;
}



@Controller("groups")
@UseGuards(JwtAuthGuard)
export class GroupsController {


  constructor(
    private readonly groupsService: GroupsService,
  ) {}



  /*
  ============================================================
  CREATE GROUP

  POST /groups
  ============================================================
  */

  @Post()
  create(
    @Req() req: AuthRequest,
    @Body() dto: CreateGroupDto,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.createGroup(
      dto,
      userId,
    );

  }



  /*
  ============================================================
  GET MY GROUPS

  GET /groups
  ============================================================
  */

  @Get()
  myGroups(
    @Req() req: AuthRequest,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.getMyGroups(
      userId,
    );

  }



  /*
  ============================================================
  GET PENDING GROUP REQUEST COUNT

  GET /groups/invites/count
  ============================================================
  */

  @Get("invites/count")
  invitesCount(
    @Req() req: AuthRequest,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.getInviteCount(
      userId,
    );

  }



  /*
  ============================================================
  SEND MESSAGE

  POST /groups/message
  ============================================================
  */

  @Post("message")
  sendMessage(
    @Req() req: AuthRequest,
    @Body() dto: SendGroupMessageDto,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.sendMessage(
      dto,
      userId,
    );

  }



  /*
  ============================================================
  GET MESSAGES

  GET /groups/:id/messages
  ============================================================
  */

  @Get(":id/messages")
  messages(
    @Param("id") id: string,
  ) {

    return this.groupsService.getMessages(
      id,
    );

  }



  /*
  ============================================================
  JOIN GROUP

  POST /groups/:id/join
  ============================================================
  */

  @Post(":id/join")
  join(
    @Param("id") id: string,
    @Req() req: AuthRequest,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.joinGroup(
      id,
      userId,
    );

  }



  /*
  ============================================================
  ACCEPT JOIN REQUEST

  POST /groups/:id/accept
  ============================================================
  */

  @Post(":id/accept")
  accept(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.acceptJoin(
      id,
      userId,
      body.userId,
    );

  }



  /*
  ============================================================
  LEAVE GROUP

  POST /groups/:id/leave
  ============================================================
  */

  @Post(":id/leave")
  leave(
    @Param("id") id: string,
    @Req() req: AuthRequest,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.leaveGroup(
      id,
      userId,
    );

  }



  /*
  ============================================================
  REMOVE MEMBER

  POST /groups/:id/remove
  ============================================================
  */

  @Post(":id/remove")
  remove(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {

    const adminId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.removeMember(
      id,
      body.userId,
      adminId,
    );

  }



  /*
  ============================================================
  EDIT GROUP NAME

  PATCH /groups/:id
  ============================================================
  */

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.updateGroup(
      id,
      body.name,
      userId,
    );

  }



  /*
  ============================================================
  DELETE GROUP

  DELETE /groups/:id
  ============================================================
  */

  @Delete(":id")
  delete(
    @Param("id") id: string,
    @Req() req: AuthRequest,
  ) {

    const userId = String(
      req.user?.id ||
      req.user?.sub ||
      "",
    );


    return this.groupsService.deleteGroup(
      id,
      userId,
    );

  }

}