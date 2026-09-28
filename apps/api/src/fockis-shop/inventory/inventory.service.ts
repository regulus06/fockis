import {
 Injectable,
 NotFoundException
} from '@nestjs/common';


import { InjectModel } from '@nestjs/mongoose';


import {
 Model,
 Types
} from 'mongoose';



import {
 Inventory,
 InventoryDocument
} from './schemas/inventory.schema';





@Injectable()
export class InventoryService {



constructor(


@InjectModel(Inventory.name)

private inventoryModel:
Model<InventoryDocument>


){}








async get(
productId:string
){


const inventory =
await this.inventoryModel.findOne({


product:
new Types.ObjectId(productId)


});



if(!inventory)

throw new NotFoundException(
'Inventory not found'
);



return inventory;

}









async add(


productId:string,


sellerId:string,


amount:number


){



let inventory =
await this.inventoryModel.findOne({


product:
new Types.ObjectId(productId)


});





if(!inventory){



inventory =
await this.inventoryModel.create({


product:
new Types.ObjectId(productId),


seller:
new Types.ObjectId(sellerId),


quantity:amount,


reserved:0


});



return inventory;


}





inventory.quantity += amount;



await inventory.save();



return inventory;


}









async remove(


productId:string,


sellerId:string,


amount:number


){



const inventory =
await this.inventoryModel.findOne({


product:
new Types.ObjectId(productId)


});





if(!inventory)

throw new NotFoundException(
'Inventory not found'
);





inventory.quantity -= amount;




if(inventory.quantity < 0)

inventory.quantity = 0;




await inventory.save();



return inventory;


}









async reserve(


productId:string,


sellerId:string,


amount:number


){



let inventory =
await this.inventoryModel.findOne({


product:
new Types.ObjectId(productId)


});





// create missing inventory
if(!inventory){



inventory =
await this.inventoryModel.create({


product:
new Types.ObjectId(productId),


seller:
new Types.ObjectId(sellerId),


quantity:0,


reserved:0


});


}







if(

inventory.quantity -
inventory.reserved
<
amount

){


throw new NotFoundException(

'Not enough stock'

);


}







inventory.reserved += amount;



await inventory.save();



return inventory;


}









async release(


productId:string,


sellerId:string,


amount:number


){



const inventory =
await this.inventoryModel.findOne({


product:
new Types.ObjectId(productId)


});





if(!inventory)

throw new NotFoundException(
'Inventory not found'
);





inventory.reserved -= amount;




if(inventory.reserved < 0)

inventory.reserved = 0;




await inventory.save();



return inventory;


}



}