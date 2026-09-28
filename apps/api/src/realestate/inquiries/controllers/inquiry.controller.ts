import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

import { InquiryService } from '../services/inquiry.service';

import {
  CreateInquiryDto,
} from '../dto/create-inquiry.dto';

import {
  UpdateInquiryDto,
} from '../dto/update-inquiry.dto';



@Controller('realestate/inquiries')
export class InquiryController {


  constructor(
    private readonly inquiryService: InquiryService,
  ) {}



  @Post()
  create(
    @Body() createInquiryDto: CreateInquiryDto,
  ) {

    return this.inquiryService.create(
      createInquiryDto,
    );

  }



  @Get()
  findAll() {

    return this.inquiryService.findAll();

  }



  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {

    return this.inquiryService.findOne(id);

  }



  @Patch(':id')
  update(
    @Param('id') id: string,

    @Body() updateInquiryDto: UpdateInquiryDto,

  ) {

    return this.inquiryService.update(
      id,
      updateInquiryDto,
    );

  }



  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {

    return this.inquiryService.remove(id);

  }



  @Post(':id/agent/:agentId')
  assignAgent(
    @Param('id') id: string,

    @Param('agentId') agentId: string,

  ) {

    return this.inquiryService.assignAgent(
      id,
      agentId,
    );

  }



  @Post(':id/landlord/:landlordId')
  assignLandlord(
    @Param('id') id: string,

    @Param('landlordId') landlordId: string,

  ) {

    return this.inquiryService.assignLandlord(
      id,
      landlordId,
    );

  }



  @Patch(':id/status/:status')
  updateStatus(
    @Param('id') id: string,

    @Param('status') status: string,

  ) {

    return this.inquiryService.updateStatus(
      id,
      status,
    );

  }



  @Post(':id/message')
  addMessage(
    @Param('id') id: string,

    @Body()
    body: {
      sender: string;
      message: string;
    },

  ) {

    return this.inquiryService.addMessage(
      id,
      body.sender,
      body.message,
    );

  }



  @Post(':id/convert/:type')
  convert(
    @Param('id') id: string,

    @Param('type') type: string,

  ) {

    return this.inquiryService.convert(
      id,
      type,
    );

  }


}