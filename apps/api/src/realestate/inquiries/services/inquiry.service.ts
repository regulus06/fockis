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
  Inquiry,
  InquiryDocument,
} from '../schemas/inquiry.schema';

import {
  CreateInquiryDto,
} from '../dto/create-inquiry.dto';

import {
  UpdateInquiryDto,
} from '../dto/update-inquiry.dto';



@Injectable()
export class InquiryService {


  constructor(
    @InjectModel(Inquiry.name)
    private readonly inquiryModel:
    Model<InquiryDocument>,
  ) {}



  async create(
    createInquiryDto: CreateInquiryDto,
  ) {

    const inquiry =
      new this.inquiryModel(
        createInquiryDto,
      );


    return inquiry.save();

  }



  async findAll() {

    return this.inquiryModel
      .find()
      .populate('user')
      .populate('property')
      .populate('agent')
      .populate('landlord')
      .exec();

  }



  async findOne(
    id: string,
  ) {

    const inquiry =
      await this.inquiryModel
        .findById(id)
        .populate('user')
        .populate('property')
        .populate('agent')
        .populate('landlord')
        .exec();


    if (!inquiry) {

      throw new NotFoundException(
        'Inquiry not found',
      );

    }


    return inquiry;

  }



  async update(
    id: string,
    updateInquiryDto: UpdateInquiryDto,
  ) {


    const inquiry =
      await this.inquiryModel
        .findByIdAndUpdate(
          id,
          updateInquiryDto,
          {
            new: true,
          },
        )
        .exec();



    if (!inquiry) {

      throw new NotFoundException(
        'Inquiry not found',
      );

    }


    return inquiry;

  }



  async remove(
    id: string,
  ) {

    const inquiry =
      await this.inquiryModel
        .findByIdAndDelete(id)
        .exec();


    if (!inquiry) {

      throw new NotFoundException(
        'Inquiry not found',
      );

    }


    return {
      message:
      'Inquiry deleted successfully',
    };

  }



  async assignAgent(
    id: string,
    agentId: string,
  ) {

    return this.inquiryModel
      .findByIdAndUpdate(
        id,
        {
          agent: agentId,
          status: 'contacted',
        },
        {
          new: true,
        },
      );

  }



  async assignLandlord(
    id: string,
    landlordId: string,
  ) {

    return this.inquiryModel
      .findByIdAndUpdate(
        id,
        {
          landlord: landlordId,
        },
        {
          new: true,
        },
      );

  }



  async updateStatus(
    id: string,
    status: string,
  ) {

    return this.inquiryModel
      .findByIdAndUpdate(
        id,
        {
          status,
        },
        {
          new: true,
        },
      );

  }



  async addMessage(
    id: string,
    sender: string,
    message: string,
  ) {


    return this.inquiryModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            conversations: {
              sender,
              message,
            },
          },
        },
        {
          new: true,
        },
      );

  }



  async convert(
    id: string,
    conversionType: string,
  ) {


    return this.inquiryModel
      .findByIdAndUpdate(
        id,
        {
          converted: true,
          conversionType,
          status: 'closed',
        },
        {
          new: true,
        },
      );

  }


}