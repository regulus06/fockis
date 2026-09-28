import {
Controller,
Post,
Get,
Param,
Body,
Req,
UseGuards
} from '@nestjs/common';


import { InventoryService } from './inventory.service';

import {
JwtAuthGuard
} from '../../auth/jwt-auth.guard';



@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {



constructor(

private inventoryService:
InventoryService

){}







@Get(':productId')
get(

@Param('productId')
productId:string

){

return this.inventoryService.get(productId);

}









@Post(':productId/add')
add(


@Param('productId')
productId:string,


@Body('amount')
amount:number,


@Req()
req:any


){



const sellerId =
req.user?.id ||
req.user?.userId ||
req.user?.sub;



return this.inventoryService.add(


productId,


sellerId,


Number(amount)


);


}








@Post(':productId/remove')
remove(


@Param('productId')
productId:string,


@Body('amount')
amount:number,


@Req()
req:any


){



const sellerId =
req.user?.id ||
req.user?.userId ||
req.user?.sub;



return this.inventoryService.remove(


productId,


sellerId,


Number(amount)


);


}



}