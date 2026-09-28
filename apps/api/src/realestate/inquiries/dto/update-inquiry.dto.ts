import { PartialType } from '@nestjs/mapped-types';
import { CreateInquiryDto } from './create-inquiry.dto';


export class UpdateInquiryDto extends PartialType(
  CreateInquiryDto,
) {


  status?: string;


  converted?: boolean;


  conversionType?: string;

}