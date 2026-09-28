import { PartialType } from '@nestjs/mapped-types';

import { CreateTourDto } from './create-tour.dto';


export class UpdateTourDto extends PartialType(
  CreateTourDto,
) {


  status?: 
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';



  reminderSent?: boolean;



  agentMessage?: string;

}