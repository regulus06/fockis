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
  DocumentsService,
} from '../services/documents.service';

import {
  CreateDocumentDto,
} from '../dto/create-document.dto';

import {
  UpdateDocumentDto,
} from '../dto/update-document.dto';



@Controller('realestate/documents')
export class DocumentsController {


  constructor(
    private readonly documentsService:
    DocumentsService,
  ) {}



  @Post()
  create(
    @Body()
    createDocumentDto:
    CreateDocumentDto,
  ) {

    return this.documentsService.create(
      createDocumentDto,
    );

  }



  @Get()
  findAll() {

    return this.documentsService.findAll();

  }



  @Get(':id')
  findOne(
    @Param('id')
    id:string,
  ) {

    return this.documentsService.findOne(
      id,
    );

  }



  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId')
    propertyId:string,
  ) {

    return this.documentsService.findByProperty(
      propertyId,
    );

  }



  @Patch(':id')
  update(
    @Param('id')
    id:string,

    @Body()
    updateDocumentDto:
    UpdateDocumentDto,
  ) {

    return this.documentsService.update(
      id,
      updateDocumentDto,
    );

  }



  @Patch(':id/verify')
  verify(
    @Param('id')
    id:string,

    @Body()
    body:{
      status:
      'pending'
      |
      'verified'
      |
      'rejected';
    },
  ) {

    return this.documentsService.verify(
      id,
      body.status,
    );

  }



  @Delete(':id')
  remove(
    @Param('id')
    id:string,
  ) {

    return this.documentsService.remove(
      id,
    );

  }


}