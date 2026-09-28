import { IsIn } from 'class-validator';

export class UpdateContactMessageDto {
  @IsIn(['new', 'in_progress', 'resolved'])
  status: string;
}
