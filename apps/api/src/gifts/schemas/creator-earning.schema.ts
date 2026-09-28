import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";


export type CreatorEarningDocument =
  CreatorEarning & Document;



@Schema({
  timestamps: true,
})
export class CreatorEarning {



  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
  })
  creatorId!: Types.ObjectId;



  /*
    Total coins received
    from gifts
  */

  @Prop({
    default: 0,
  })
  coinsReceived!: number;



  /*
    Platform conversion value

    Example:
    100000 coins = $1000
  */

  @Prop({
    default: 0,
  })
  estimatedValue!: number;



  /*
    Amount available
    for withdrawal
  */

  @Prop({
    default: 0,
  })
  availableBalance!: number;



  /*
    Total withdrawn
  */

  @Prop({
    default: 0,
  })
  withdrawnAmount!: number;



}



export const CreatorEarningSchema =
  SchemaFactory.createForClass(CreatorEarning);