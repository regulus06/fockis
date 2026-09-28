import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export type PropertyDocument = Property & Document;



@Schema({
  timestamps:true
})
export class Property {


  // BASIC INFORMATION

  @Prop({
    required:true
  })
  title!: string;



  @Prop({
    required:true
  })
  description!: string;



  @Prop({
    required:true
  })
  price!: number;



  @Prop()
  type?: string;



  @Prop()
  bedrooms?: number;



  @Prop()
  bathrooms?: number;



  @Prop()
  squareFeet?: number;



  @Prop()
  lotSize?: number;



  @Prop()
  yearBuilt?: number;



  @Prop()
  parking?: string;



  @Prop()
  heating?: string;



  @Prop()
  cooling?: string;



  @Prop()
  stories?: number;



  @Prop()
  hoa?: string;



  @Prop()
  propertyTax?: string;



  @Prop()
  mlsId?: string;





  // LOCATION


  @Prop()
  location?: string;



  @Prop()
  city?: string;



  @Prop()
  state?: string;



  @Prop()
  country?: string;



  @Prop()
  zipCode?: string;



  @Prop()
  latitude?: number;



  @Prop()
  longitude?: number;







  // MEDIA


  @Prop([
    String
  ])
  images!: string[];



  @Prop([
    String
  ])
  documents?: string[];







  // OWNER / AGENT


  @Prop({
    type:Types.ObjectId,
    ref:'User'
  })
  agent?: Types.ObjectId;







  // LISTING TYPE (sale vs rent)
  //
  // Kept separate from `status` below, which is the
  // moderation/approval workflow state, not the
  // buy/rent listing type.


  @Prop({
    default:'sale',
    enum:[
      'sale',
      'rent'
    ]
  })
  listingStatus!: string;







  // MARKET STATUS


  @Prop({
    default:'pending',
    enum:[
      'pending',
      'approved',
      'rejected',
      'suspended'
    ]
  })
  status!: string;



  @Prop({
    default:false
  })
  featured!: boolean;



  @Prop({
    default:false
  })
  verified!: boolean;







  // ANALYTICS


  @Prop({
    default:0
  })
  views!: number;



  @Prop({
    default:0
  })
  favorites!: number;



  @Prop({
    default:0
  })
  shares!: number;



  @Prop({
    default:0
  })
  inquiries!: number;



  @Prop({
    default:0
  })
  tourRequests!: number;







  // REPORTING


  @Prop({
    default:0
  })
  reports!: number;







  // MODERATION


  @Prop()
  rejectionReason?: string;



  @Prop()
  suspensionReason?: string;



  @Prop()
  approvedAt?: Date;



  @Prop({
    type:Types.ObjectId,
    ref:'User'
  })
  approvedBy?: Types.ObjectId;



}


export const PropertySchema =
SchemaFactory.createForClass(Property);