import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';



export type MaintenanceDocument =
  HydratedDocument<Maintenance>;



@Schema({
  timestamps: true,
})
export class Maintenance {


  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  property: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  tenant: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  landlord?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Agent',
  })
  assignedAgent?: Types.ObjectId;



  @Prop({
    required: true,
  })
  title: string;



  @Prop({
    required: true,
  })
  description: string;



  @Prop({
    enum: [
      'low',
      'medium',
      'high',
      'urgent',
    ],
    default: 'medium',
  })
  priority: string;



  @Prop({
    enum: [
      'open',
      'assigned',
      'in_progress',
      'completed',
      'cancelled',
    ],
    default: 'open',
  })
  status: string;



  @Prop([
    String,
  ])
  images?: string[];



  @Prop()
  technicianName?: string;



  @Prop()
  estimatedCost?: number;



  @Prop()
  finalCost?: number;



  @Prop()
  completedDate?: Date;



  @Prop()
  notes?: string;


}


export const MaintenanceSchema =
  SchemaFactory.createForClass(
    Maintenance,
  );