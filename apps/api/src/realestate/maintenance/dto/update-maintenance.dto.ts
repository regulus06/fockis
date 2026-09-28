import { PartialType } from '@nestjs/mapped-types';

import {
  CreateMaintenanceDto,
} from './create-maintenance.dto';



export class UpdateMaintenanceDto extends PartialType(
  CreateMaintenanceDto,
) {


  priority?:
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';



  status?:
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';



  technicianName?: string;



  finalCost?: number;



  completedDate?: string;


}