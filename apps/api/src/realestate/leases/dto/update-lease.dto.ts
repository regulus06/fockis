import { PartialType } from '@nestjs/mapped-types';

import { CreateLeaseDto } from './create-lease.dto';



export class UpdateLeaseDto extends PartialType(
  CreateLeaseDto,
) {


  status?:
  | 'draft'
  | 'pending'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'renewed';



  renewalDate?: string;


}