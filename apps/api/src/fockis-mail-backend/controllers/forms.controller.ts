import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Req,
} from "@nestjs/common";
import { Types } from "mongoose";

import { FormsService } from "../services/forms.service";

import {
  CreateSignupFormDto,
  UpdateSignupFormDto,
} from "../dto/fockis-mail.dto";

import {
  userIdFrom,
  workspaceFrom,
} from "../services/helpers";

@Controller("fockis-mail/forms")
export class FormsController {
  constructor(
    private readonly formsService: FormsService,
  ) {}

  /**
   * GET /fockis-mail/forms
   */
  @Get()
  async list(@Req() req: any) {
    return this.formsService.list(
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * GET /fockis-mail/forms/:id
   */
  @Get(":id")
  async get(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.formsService.get(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * POST /fockis-mail/forms
   */
  @Post()
  async create(
    @Req() req: any,
    @Body() dto: CreateSignupFormDto,
  ) {
    return this.formsService.create(
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * PUT /fockis-mail/forms/:id
   */
  @Put(":id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateSignupFormDto,
  ) {
    return this.formsService.update(
      id,
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * DELETE /fockis-mail/forms/:id
   */
  @Delete(":id")
  async remove(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.formsService.remove(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }
}