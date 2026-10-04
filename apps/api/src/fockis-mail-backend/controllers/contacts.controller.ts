import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import { ContactsService } from '../services/contacts.service';

import {
  CreateContactDto,
  UpdateContactDto,
} from '../dto/fockis-mail.dto';

import {
  userIdFrom,
  workspaceFrom,
} from '../services/helpers';

@Controller('fockis-mail/contacts')
export class ContactsController {
  constructor(
    private readonly service: ContactsService,
  ) {}

  /**
   * List contacts.
   */
  @Get()
  list(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('audienceId') audienceId?: string,
    @Query('tagId') tagId?: string,
  ) {
    return this.service.list(
      userIdFrom(req),
      workspaceFrom(req),
      {
        q,
        status,
        audienceId,
        tagId,
      },
    );
  }

  /**
   * Audience/contact statistics.
   */
  @Get('stats')
  stats(@Req() req: any) {
    return this.service.stats(
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Import CSV.
   */
  @Post('import')
  importCsv(
    @Req() req: any,
    @Body()
    body: {
      csv?: string;
    },
  ) {
    return this.service.importCsv(
      body?.csv ?? '',
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Bulk contact actions.
   *
   * Supported:
   *
   * {
   *   ids: ["..."],
   *   action: {
   *     kind: "status",
   *     status: "subscribed"
   *   }
   * }
   *
   * {
   *   ids: ["..."],
   *   action: {
   *     kind: "delete"
   *   }
   * }
   *
   * Also accepts:
   *
   * {
   *   ids: ["..."],
   *   kind: "delete"
   * }
   */
  @Post('bulk')
  bulk(
    @Req() req: any,
    @Body()
    body: {
      ids?: string[];

      kind?:
        | 'status'
        | 'tag'
        | 'untag'
        | 'delete';

      status?: string;
      tagId?: string;

      action?: {
        kind?:
          | 'status'
          | 'tag'
          | 'untag'
          | 'delete';

        status?: string;
        tagId?: string;
      };
    },
  ) {
    const action =
      body?.action ??
      {
        kind: body?.kind,
        status: body?.status,
        tagId: body?.tagId,
      };

    return this.service.bulk(
      body?.ids ?? [],
      action,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Get one contact.
   */
  @Get(':id')
  get(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.service.get(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Create contact.
   */
  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateContactDto,
  ) {
    return this.service.create(
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Update contact.
   */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.service.update(
      id,
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Delete contact.
   */
  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.service.remove(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }
}